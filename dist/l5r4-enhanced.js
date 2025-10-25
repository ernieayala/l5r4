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
import { NPC_NUMBER_WOUND_LVLS, STATUS_EFFECTS } from "../module/config/game-data.js";
import L5R4Actor from "../module/documents/actor.js";
import L5R4Item from "../module/documents/item.js";
import L5R4ItemSheet from "../module/sheets/item-sheet.js";
import L5R4PcSheet from "../module/sheets/pc-sheet.js";
import L5R4NpcSheet from "../module/sheets/npc-sheet.js";
import { preloadTemplates } from "../module/setup/preload-templates.js";
import { runMigrations } from "../module/setup/migrations.js";
import { registerSettings } from "../module/setup/register-settings.js";
import { registerHandlebarsHelpers } from "../module/setup/register-handlebars.js";
import { initializeStanceService } from "../module/services/stance/initialize.js";
import { initializeChatService } from "../module/services/chat.js";
import { initializeInitiativeSystem } from "../module/services/initiative.js";
import { initializeWoundProneAutomation } from "../module/services/wound-prone-automation.js";

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

  const { DocumentSheetConfig } = foundry.applications.apps;
  const { Item, Actor } = foundry.documents;

  try { DocumentSheetConfig.unregisterSheet(Item, "core", foundry.applications.sheets.ItemSheetV2); } catch (_e) { }

  DocumentSheetConfig.registerSheet(Item, SYS_ID, L5R4ItemSheet, {
    makeDefault: true,
    types: [
      "advantage",
      "armor",
      "clan",
      "commonItem",
      "disadvantage",
      "family",
      "school",
      "item",
      "kata",
      "kiho",
      "skill",
      "spell",
      "tattoo",
      "technique",
      "weapon"
    ]
  });

  try { DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.applications.sheets.ActorSheetV2, { types: ["pc", "npc"] }); } catch (_e) { }

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

  initializeStanceService();
  initializeChatService();
  initializeWoundProneAutomation();
});

/**
 * Register Quench Integration Tests
 * Registers system integration tests with the Quench testing module if available.
 * Uses defensive registration with flag to prevent duplicate registration across hooks.
 * Called from both quenchReady and ready hooks to handle unpredictable hook timing.
 * 
 * **Registration Strategy:**
 * - Checks for globalThis.quench API availability
 * - Verifies Quench module is active in game.modules
 * - Uses _l5r4Registered flag to prevent duplicate registration
 * - Silently returns if already registered or Quench unavailable
 * 
 * **Hook Timing:**
 * Primary registration occurs in quenchReady hook when Quench signals readiness.
 * Fallback registration occurs in ready hook if quenchReady already fired.
 * This dual-hook pattern ensures reliable registration regardless of module load order.
 * 
 * @async
 * @returns {Promise<void>}
 */
async function registerQuenchIfAvailable() {
  const quench = globalThis.quench;
  const quenchModule = game.modules.get("quench");
  
  if (!quench || !quenchModule?.active || quenchModule._l5r4Registered) {
    return;
  }

  try {
    // Dynamic import - only load tests when Quench is available
    const { registerQuenchTests } = await import("../tests/integration/quench-integration.js");
    await registerQuenchTests(quench);
    quenchModule._l5r4Registered = true;
  } catch (err) { }
}

/**
 * Quench Ready Hook
 * Fires when Quench testing module signals it's ready to accept test registrations.
 * Primary hook for registering L5R4 integration tests.
 * 
 * @listens Hooks#quenchReady
 */
Hooks.once("quenchReady", registerQuenchIfAvailable);

/**
 * Foundry VTT Ready Hook
 * Executes after Foundry completes initialization and world data is loaded.
 * Handles fallback Quench registration and executes data migrations for GMs.
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

  await registerQuenchIfAvailable();

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
