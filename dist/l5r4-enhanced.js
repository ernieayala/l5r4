/**
 * L5R4 Enhanced System Bootstrap
 * Main entry point for Legend of the Five Rings 4th Edition system initialization.
 * Coordinates system registration with Foundry VTT v13+ using Application v2 architecture.
 * 
 * **Initialization Sequence:**
 * 1. Register system settings for data preparation
 * 2. Configure document classes (Actor/Item) with L5R4 implementations
 * 3. Build CONFIG.l5r4 namespace with game data (rings, traits, stances, status effects)
 * 4. Initialize L5R4 initiative system with Insight/Reflexes rolls
 * 5. Register Application v2 sheets for all actor and item types
 * 6. Preload Handlebars templates and register custom helpers
 * 7. Initialize services (stance management, chat integration)
 * 8. Dynamically load Quench integration tests if module active
 * 9. Execute data migrations on version changes
 * 
 * **L5R4 Game Mechanics Integration:**
 * - Initiative rolls use Insight Rank and Reflexes (Insight/Reflexes keep Reflexes)
 * - Status effects implement mutually exclusive stance system (Attack, Full Attack, Defense, Full Defense, Center)
 * - Wound penalties apply TN increases per wound rank (Nicked +3, Grazed +5, Hurt +10, etc.)
 * - Combat stances affect Armor TN calculations and available actions per turn
 * 
 * **Foundry VTT Integration:**
 * - Requires Foundry VTT v13+ for Application v2 sheet system
 * - Uses DocumentSheetConfig for sheet registration (replaces deprecated ActorSheet.register)
 * - Leverages Foundry's hook system for lifecycle management
 * - Integrates with CONFIG.statusEffects for token HUD display
 * 
 * @module l5r4-enhanced
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/|Foundry VTT v13 API Documentation}
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
import { NPC_NUMBER_WOUND_LVLS } from "../module/config/game-mechanics.js";
import { STATUS_EFFECTS } from "../module/config/status-effects.js";
import { DATA_MODELS } from "../module/data/index.js";
import L5R4Actor from "../module/documents/actor.js";
import L5R4Item from "../module/documents/item.js";
import L5R4ItemSheet from "../module/sheets/item-sheet.js";
import L5R4PcSheet from "../module/sheets/pc-sheet.js";
import L5R4NpcSheet from "../module/sheets/npc-sheet.js";
import { preloadTemplates } from "../module/setup/preload-templates.js";
import { runMigrations } from "../module/setup/migrations.js";
import { registerSettings } from "../module/setup/register-settings.js";
import { registerHandlebarsHelpers } from "../module/setup/register-handlebars.js";
import { initializeInitiativeSystem } from "../module/services/initiative.js";
import { registerAllHooks } from "../module/hooks/register-all.js";


/**
 * Foundry VTT Init Hook
 * Executes during Foundry's initialization phase before world data loads.
 * Registers all system configuration, document classes, sheets, and services.
 * This hook fires once per session when Foundry starts.
 * 
 * @async
 * @listens Hooks#init
 */
Hooks.once("init", async () => {
  console.log(`${SYS_ID} | Initializing Legend of the Five Rings 4e`);

  registerSettings();

  CONFIG.Item.documentClass  = L5R4Item;
  CONFIG.Actor.documentClass = L5R4Actor;

  // One data model per subtype declared in system.json documentTypes. Core labels each subtype with its
  // TYPES.<Document>.<type> key from lang/*.json.
  for (const [documentName, models] of Object.entries(DATA_MODELS)) {
    Object.assign(CONFIG[documentName].dataModels, models);
  }

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
    npcNumberWoundLvls: NPC_NUMBER_WOUND_LVLS,
    statusEffects: STATUS_EFFECTS
  };

  CONFIG.statusEffects = STATUS_EFFECTS;

  CONFIG.l5r4.TRAIT_CHOICES = CONFIG.l5r4.traits;

  initializeInitiativeSystem();

  // Core 14.370 registers no Actor or Item sheet, so these are the only ones and nothing is unregistered
  // (client/applications/sheets/_module.mjs:83-128).
  const { DocumentSheetConfig } = foundry.applications.apps;
  const { Item, Actor } = foundry.documents;

  // "bow" is the legacy subtype kept until the bow-to-weapon migration converts it (module/data/item/BowData.js);
  // with no core sheet in 14.370 it needs this one to open.
  DocumentSheetConfig.registerSheet(Item, SYS_ID, L5R4ItemSheet, {
    makeDefault: true,
    types: [
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
    ]
  });

  DocumentSheetConfig.registerSheet(Actor, SYS_ID, L5R4PcSheet, {
    types: ["pc"],
    makeDefault: true
  });
  DocumentSheetConfig.registerSheet(Actor, SYS_ID, L5R4NpcSheet, {
    types: ["npc"],
    makeDefault: true
  });

  preloadTemplates();
  registerHandlebarsHelpers();

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
 * @async
 * @listens Hooks#ready
 */
Hooks.once("ready", async () => {
  console.log(`${SYS_ID} | Ready`);

  if (game.user?.isGM) {
    const currentVersion = game.system?.version ?? "0.0.0";
    const last = game.settings.get(SYS_ID, "lastMigratedVersion") ?? "0.0.0";
    const runFlag = game.settings.get(SYS_ID, "runMigration") ?? false;
    const forceFlag = game.settings.get(SYS_ID, "forceMigration") ?? false;
    const newer = (foundry?.utils?.isNewerVersion?.(currentVersion, last)) ?? (currentVersion !== last);

    if (runFlag && (newer || forceFlag)) {
      try {
        console.log(`${SYS_ID}`, "Running migrations", { 
          from: last, 
          to: currentVersion, 
          forced: forceFlag,
          versionChanged: newer 
        });
        await runMigrations(last, currentVersion);
      } catch (e) {
        console.warn(`${SYS_ID}`, "runMigrations failed", e);
      } finally {
        try {
          await game.settings.set(SYS_ID, "lastMigratedVersion", currentVersion);
          if (forceFlag) {
            await game.settings.set(SYS_ID, "forceMigration", false);
          }
        } catch (_e) {}
      }
    }
  }
});
