/**
 * @module l5r4-enhanced
 * @description The system's entry module, the one place that wires the system into Foundry. During `init` it
 * registers the settings, the document classes, the Roll & Keep die, the CONFIG values, the GM queries, the data
 * models, CONFIG.l5r4 and the status effects, the sheets, the templates and Handlebars helpers, the text enrichers,
 * and every hook. When Quench is active it loads the test batches; during `ready` a GM runs the data migrations
 * when the system version changed.
 */
import { SYS_ID } from "../module/config/constants.js";
import { 
  ARROWS, 
  SIZES, 
  RINGS, 
  RINGS_WITH_NONE, 
  SPELL_RINGS, 
  TRAITS, 
  NPC_TRAITS, 
  SKILL_TYPES, 
  ACTION_TYPES, 
  KIHO_TYPES, 
  ADVANTAGE_TYPES 
} from "../module/config/localization.js";
import { NPC_NUMBER_WOUND_LEVELS } from "../module/config/game-mechanics.js";
import { STATUS_EFFECTS } from "../module/config/status-effects.js";
import { EXPIRY_ACTION, EXPIRY_EVENTS } from "../module/config/expiry-events.js";
import { CORE_TYPE_DATA_MODELS, DATA_MODELS } from "../module/data/models.js";
import L5R4ActiveEffect from "../module/documents/active-effect.js";
import L5R4Actor from "../module/documents/actor.js";
import L5R4Combat from "../module/documents/combat.js";
import L5R4Combatant from "../module/documents/combatant.js";
import L5R4Item from "../module/documents/item.js";
import { spendInitiativeVoidPoints } from "../module/services/initiative.js";
import L5R4Die from "../module/services/dice/roll-keep-die.js";
import { registerEffectQueries } from "../module/services/effects/apply.js";
import { registerPromptQueries } from "../module/services/effects/prompts.js";
import { COMBAT_EVENTS, registerCombatQueries } from "../module/services/effects/combat-events.js";
import { registerDamageQueries } from "../module/services/combat/damage.js";
import { registerFlowQueries } from "../module/services/combat/flow.js";
import L5R4ItemSheet from "../module/sheets/item-sheet.js";
import L5R4PcSheet from "../module/sheets/pc-sheet.js";
import L5R4NpcSheet from "../module/sheets/npc-sheet.js";
import L5R4ActiveEffectConfig from "../module/sheets/active-effect-config.js";
import { registerTemplates } from "../module/setup/preload-templates.js";
import { migrateWorld } from "../module/setup/migrations.js";
import { registerSettings } from "../module/setup/settings/register-all.js";
import { registerHandlebarsHelpers } from "../module/setup/register-handlebars.js";
import { registerEnrichers } from "../module/setup/enrichers.js";
import { registerAllHooks } from "../module/hooks/register-all.js";

// The item types the item sheet opens. "bow" is the legacy subtype kept until the bow-to-weapon migration converts it
// (module/data/item/bow-data.js); with no core sheet in 14.370 it needs this one to open.
const ITEM_SHEET_TYPES = Object.freeze([
  "advantage",
  "armor",
  "bow",
  "clan",
  "commonItem",
  "disadvantage",
  "family",
  "school",
  "kata",
  "kiho",
  "skill",
  "spell",
  "tattoo",
  "technique",
  "weapon"
]);


/**
 * Foundry VTT Init Hook
 * Executes during Foundry's initialization phase before world data loads.
 * Registers all system configuration, document classes, sheets, and services, in order.
 * This hook fires once per session when Foundry starts.
 *
 * @listens Hooks#init
 */
Hooks.once("init", async () => {
  registerSettings();
  registerDocumentClasses();
  registerCoreConfig();
  registerQueries();
  registerDataModels();
  registerSystemConfig();
  registerSheets();

  registerTemplates();
  registerHandlebarsHelpers();

  // Text links: @Check, @Damage, @Condition, @Fear in journals, item descriptions, and chat (roadmap/STAGE-14)
  registerEnrichers();

  // Register all system hooks via central registry
  registerAllHooks();
});

/**
 * Register the Quench test batches. Quench calls `quenchReady` from its `setup` hook, after this module has
 * loaded, so worlds without Quench never import anything from tests/. A failed import or registration
 * surfaces in the console instead of leaving the batches silently missing.
 *
 * @listens Hooks#quenchReady
 */
Hooks.once("quenchReady", async quench => {
  // eslint-disable-next-line no-restricted-syntax -- the release zip leaves out tests/ (release.yml -x "tests/*"), so only a world with Quench loads it
  const { registerQuenchTests } = await import("../tests/quench/index.js");
  await registerQuenchTests(quench);
});

/**
 * Foundry VTT Ready Hook
 * Executes after Foundry completes initialization and world data is loaded.
 * Executes data migrations for GMs.
 * This hook fires once per session after all modules and systems are ready.
 * 
 * **Migration System:**
 * Only executes for GM users to prevent concurrent migration conflicts.
 * Compares system.version against lastMigratedVersion setting to detect updates.
 * Respects runMigration and forceMigration settings for migration control.
 * Updates lastMigratedVersion on completion and clears forceMigration flag.
 *
 * @listens Hooks#ready
 */
Hooks.once("ready", async () => {
  if (game.user?.isGM) {
    const currentVersion = game.system?.version ?? "0.0.0";
    const last = game.settings.get(SYS_ID, "lastMigratedVersion") ?? "0.0.0";
    const runFlag = game.settings.get(SYS_ID, "runMigration") ?? false;
    const forceFlag = game.settings.get(SYS_ID, "forceMigration") ?? false;
    const newer = (foundry?.utils?.isNewerVersion?.(currentVersion, last)) ?? (currentVersion !== last);

    if (runFlag && (newer || forceFlag)) {
      try {
        await migrateWorld(last, currentVersion);
      } catch (e) {
        console.warn(`${SYS_ID}`, "migrateWorld failed", e);
      } finally {
        try {
          await game.settings.set(SYS_ID, "lastMigratedVersion", currentVersion);
          if (forceFlag) {
            await game.settings.set(SYS_ID, "forceMigration", false);
          }
        } catch {}
      }
    }
  }
});

/**
 * Register the system's document classes.
 */
function registerDocumentClasses() {
  CONFIG.Item.documentClass  = L5R4Item;
  CONFIG.Actor.documentClass = L5R4Actor;
  CONFIG.ActiveEffect.documentClass = L5R4ActiveEffect;
  CONFIG.Combat.documentClass = L5R4Combat;
  CONFIG.Combatant.documentClass = L5R4Combatant;
}

/**
 * Register the CONFIG values core reads for dice, effect expiry, and Initiative, and the slots L5R4Combat fills
 * from services.
 */
function registerCoreConfig() {
  // The d10 that explodes each die into its own total before the keep (module/services/dice/roll-keep-die.js)
  // game-rules/26_special_dice_rules.md, p.77
  CONFIG.Dice.terms.d = L5R4Die;

  // Expired effects are deleted; Fear ends on the system's encounterEnd event (module/config/expiry-events.js)
  CONFIG.ActiveEffect.expiryAction = EXPIRY_ACTION;
  Object.assign(CONFIG.ActiveEffect.expiryEvents, EXPIRY_EVENTS);

  // Initiative is the Roll & Keep pool rolled by L5R4Combatant; core's formula is only the fallback for a
  // combatant with no actor. Scores are whole numbers.
  CONFIG.Combat.initiative = { formula: "1d10", decimals: 0 };
  // Documents do not import services, so the Void Point prompt and the effect services reach L5R4Combat here
  L5R4Combat.askInitiativeBonuses = spendInitiativeVoidPoints;
  L5R4Combat.EVENTS = COMBAT_EVENTS;
}

/**
 * Register what a player's client asks the active GM to do: apply a condition to an actor the player does not own,
 * end a Concentration, settle Center Stance when a player ends the Round, apply or undo damage, run a combat flow
 * step.
 */
function registerQueries() {
  registerEffectQueries();
  registerPromptQueries();
  registerCombatQueries();
  registerDamageQueries();
  registerFlowQueries();
}

/**
 * Register one data model per subtype declared in system.json documentTypes, plus models for core types, which are
 * not declared. Core labels each subtype with its TYPES.<Document>.<type> key from lang/*.json.
 */
function registerDataModels() {
  for (const registry of [DATA_MODELS, CORE_TYPE_DATA_MODELS]) {
    for (const [documentName, models] of Object.entries(registry)) {
      Object.assign(CONFIG[documentName].dataModels, models);
    }
  }
}

/**
 * Register CONFIG.l5r4, the option lists templates read, and the system's status effects in place of core's.
 */
function registerSystemConfig() {
  CONFIG.l5r4 = {
    arrows: ARROWS,
    sizes: SIZES,
    rings: RINGS,
    ringsWithNone: RINGS_WITH_NONE,
    spellRings: SPELL_RINGS,
    traits: TRAITS,
    npcTraits: NPC_TRAITS,
    skillTypes: SKILL_TYPES,
    actionTypes: ACTION_TYPES,
    kihoTypes: KIHO_TYPES,
    advantageTypes: ADVANTAGE_TYPES,
    npcNumberWoundLevels: NPC_NUMBER_WOUND_LEVELS,
    statusEffects: STATUS_EFFECTS
  };

  // CONFIG.statusEffects is an array also keyed by id [src: client/config.mjs:1690-1718]; assigning the whole property
  // goes through a setter deprecated in v14 [src: client/client.mjs:29-39]. Replace core's entries with the system's.
  CONFIG.statusEffects.length = 0;
  for (const status of STATUS_EFFECTS) {
    CONFIG.statusEffects[status.id] = status;
  }

  CONFIG.l5r4.TRAIT_CHOICES = CONFIG.l5r4.traits;
}

/**
 * Register the system's sheets. Core 14.370 registers no Actor or Item sheet, so these are the only ones and nothing
 * is unregistered [src: client/applications/sheets/_module.mjs:83-128].
 */
function registerSheets() {
  const { DocumentSheetConfig } = foundry.applications.apps;
  const { Item, Actor } = foundry.documents;

  DocumentSheetConfig.registerSheet(Item, SYS_ID, L5R4ItemSheet, {
    makeDefault: true,
    types: [...ITEM_SHEET_TYPES]
  });

  DocumentSheetConfig.registerSheet(Actor, SYS_ID, L5R4PcSheet, {
    types: ["pc"],
    makeDefault: true
  });
  DocumentSheetConfig.registerSheet(Actor, SYS_ID, L5R4NpcSheet, {
    types: ["npc"],
    makeDefault: true
  });

  // Core's Active Effect sheet with a Rules tab for system.rules; core's stays selectable
  DocumentSheetConfig.registerSheet(foundry.documents.ActiveEffect, SYS_ID, L5R4ActiveEffectConfig, {
    makeDefault: true,
    label: "l5r4.ui.rules.effectSheet"
  });
}
