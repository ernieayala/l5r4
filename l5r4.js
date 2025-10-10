/**
 * @fileoverview L5R4 System Bootstrap - Main Entry Point for Foundry VTT v13+
 * 
 * This is the primary system initialization module that coordinates all L5R4 system
 * components during Foundry VTT startup. It handles configuration, registration,
 * and integration with Foundry's core systems to provide a complete Legend of the
 * Five Rings 4th Edition gaming experience with full mechanics support.
 *
 * **Core Responsibilities:**
 * - **System Configuration**: Wire CONFIG objects, document classes, and sheet registrations
 * - **Template Management**: Preload Handlebars templates and register custom helpers
 * - **Initiative System**: Custom initiative formula with L5R4-specific rolls and Ten Dice Rule
 * - **Chat Integration**: Parse inline roll notation (KxY format) in chat messages
 * - **Migration Management**: Handle data structure updates and legacy compatibility
 * - **Status Effect Logic**: Enforce mutually exclusive stance mechanics and combat states
 * - **Hook Management**: Coordinate system lifecycle with Foundry's hook system
 *
 * **System Architecture:**
 * The L5R4 system follows a modular architecture with clear separation of concerns:
 * - **Documents**: Actor and Item classes with L5R4-specific data models
 * - **Sheets**: ApplicationV2-based user interfaces for all document types
 * - **Services**: Dice rolling, chat integration, and stance management
 * - **Utils**: Shared helper functions and data processing utilities
 * - **Config**: Centralized configuration and constants
 *
 * **Initialization Sequence:**
 * 1. **Init Hook**: Register settings, configure documents, preload templates
 * 2. **Setup Hook**: Handle one-time legacy item type migrations
 * 3. **Ready Hook**: Execute data migrations and finalize system state
 * 4. **Combat Hooks**: Initialize stance tracking and combat integration
 * 5. **Chat Hooks**: Enable inline roll parsing and message processing
 *
 * **Key Features:**
 * - **L5R4 Initiative**: Actor-specific initiative rolls with Ten Dice Rule integration
 * - **Inline Roll Parsing**: Converts "3k2+1" notation to proper Foundry rolls automatically
 * - **Stance Enforcement**: Automatically removes conflicting combat stances
 * - **Sheet Registration**: Configures custom actor and item sheets for all types
 * - **Migration Safety**: Handles version updates with comprehensive data structure changes
 * - **Active Effects**: Full integration with Foundry's Active Effects system
 * - **Compendium Support**: Seamless integration with system compendium packs
 *
 * **Chat Integration System:**
 * Advanced chat message processing with L5R4-specific features:
 * - **Roll Notation**: Automatic parsing of KxY+Z roll expressions
 * - **Inline Rolls**: Seamless integration with Foundry's roll system
 * - **Message Enhancement**: Rich formatting for L5R4 roll results
 * - **Error Handling**: Graceful fallback for malformed roll expressions
 *
 * **Performance Optimizations:**
 * - **Template Preloading**: All templates cached during initialization for faster rendering
 * - **Settings Registration**: Early registration ensures availability during data preparation
 * - **Migration Batching**: Efficient batch processing of data structure updates
 * - **Hook Optimization**: Minimal performance impact from system hook registration
 * - **Lazy Loading**: Non-critical components loaded only when needed
 *
 * **Integration Points:**
 * - **Foundry Core**: Deep integration with document system, sheets, and hooks
 * - **Combat System**: Custom initiative and stance management
 * - **Chat System**: Inline roll parsing and message enhancement
 * - **Settings System**: Comprehensive configuration options
 * - **Migration System**: Automatic data structure updates
 *
 * **Error Handling:**
 * - **Graceful Degradation**: System continues functioning with partial failures
 * - **Console Logging**: Detailed error reporting for troubleshooting
 * - **User Feedback**: Clear notifications for configuration issues
 * - **Recovery Procedures**: Automatic fallbacks for common failure scenarios
 *
 * **Usage Examples:**
 * ```javascript
 * // System is automatically initialized by Foundry
 * // Access system configuration
 * console.log(CONFIG.l5r4);
 * 
 * // Use inline rolls in chat
 * // Type: "I roll [[3k2+1]] for my attack"
 * 
 * // Access system utilities
 * import { T, F } from "systems/l5r4/module/utils.js";
 * ```
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/|Foundry VTT v13 API Documentation}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html|Document}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html|ApplicationV2}
 */

import { SYS_ID } from "./module/config/constants.js";
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
} from "./module/config/localization.js";
import { NPC_NUMBER_WOUND_LVLS, STATUS_EFFECTS } from "./module/config/game-data.js";
import L5R4Actor from "./module/documents/actor.js";
import L5R4Item from "./module/documents/item.js";
import L5R4ItemSheet from "./module/sheets/item-sheet.js";
import L5R4PcSheet from "./module/sheets/pc-sheet.js";
import L5R4NpcSheet from "./module/sheets/npc-sheet.js";
import { preloadTemplates } from "./module/setup/preload-templates.js";
import { runMigrations } from "./module/setup/migrations.js";
import { registerSettings } from "./module/setup/register-settings.js";
import { registerHandlebarsHelpers } from "./module/setup/register-handlebars.js";
import { initializeStanceService } from "./module/services/stance/initialize.js";
import { initializeChatService } from "./module/services/chat.js";
import { initializeInitiativeSystem } from "./module/services/initiative.js";
import { registerQuenchTests } from "./tests/integration/quench-integration.js";

// =============================================================================
// SYSTEM INITIALIZATION
// =============================================================================

Hooks.once("init", async () => {
  console.log(`${SYS_ID} | Initializing Legend of the Five Rings 4e`);

  // Phase 1: Register system settings (must be first for data preparation)
  registerSettings();

  // Phase 2: Configure Foundry document classes
  CONFIG.Item.documentClass  = L5R4Item;
  CONFIG.Actor.documentClass = L5R4Actor;

  // Phase 3: Setup system configuration objects
  // Build config object from direct imports for template compatibility
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

  // Configure status effects for token HUD integration
  CONFIG.statusEffects = STATUS_EFFECTS;

  // Create template compatibility aliases for legacy references
  CONFIG.l5r4.TRAIT_CHOICES = CONFIG.l5r4.traits;

  // Phase 4: Configure L5R4 initiative system with Ten Dice Rule integration
  initializeInitiativeSystem();

  // Phase 5: Register custom document sheets (Foundry v13 ApplicationV2 system)
  const { DocumentSheetConfig } = foundry.applications.apps;
  const { Item, Actor } = foundry.documents;

  // Unregister default item sheet and register L5R4 custom sheet
  try {
    DocumentSheetConfig.unregisterSheet(Item, "core", foundry.applications.sheets.ItemSheetV2);
  } catch (_e) { /* already unregistered is fine */ }

  // Register L5R4 item sheet for all supported item types
  // Note: "item" included as defensive fallback for edge cases (imports, legacy data)
  // while "commonItem" is the official registered type per system.json
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
      "item",        // Generic fallback (not in system.json but covers edge cases)
      "kata",
      "kiho",
      "skill",
      "spell",
      "tattoo",
      "technique",
      "weapon"
    ]
  });

  // Unregister default actor sheets and register L5R4 custom sheets
  try {
    DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.applications.sheets.ActorSheetV2, {
      types: ["pc", "npc"]
    });
  } catch (_e) { /* ignore */ }

  DocumentSheetConfig.registerSheet(Actor, SYS_ID, L5R4PcSheet, {
    types: ["pc"],
    makeDefault: true
  });
  DocumentSheetConfig.registerSheet(Actor, SYS_ID, L5R4NpcSheet, {
    types: ["npc"],
    makeDefault: true
  });

  // Phase 6: Initialize template system and Handlebars helpers
  preloadTemplates();
  registerHandlebarsHelpers();

  // Phase 7: Initialize services (hooks and automation)
  initializeStanceService();
  initializeChatService();
});

// =============================================================================
// QUENCH INTEGRATION - INTEGRATION TEST REGISTRATION
// =============================================================================

Hooks.once("quenchReady", async () => {
  console.log(`${SYS_ID} | quenchReady hook fired`);
  
  try {
    // Quench exposes its API via globalThis.quench
    const quench = globalThis.quench;
    if (!quench) {
      console.error(`${SYS_ID} | globalThis.quench not found`);
      return;
    }
    
    console.log(`${SYS_ID} | Registering Quench integration tests...`);
    await registerQuenchTests(quench);
    
    // Mark as registered to prevent duplicate registration
    const quenchModule = game.modules.get("quench");
    if (quenchModule) quenchModule._l5r4Registered = true;
    
    console.log(`${SYS_ID} | ✓ Successfully registered Quench tests`);
  } catch (err) {
    console.error(`${SYS_ID} | ✗ Failed to register Quench tests:`, err);
    console.error(`${SYS_ID} | Error details:`, err.message);
    console.error(`${SYS_ID} | Stack trace:`, err.stack);
  }
});

// =============================================================================
// SYSTEM READY - POST-INITIALIZATION AND MIGRATION
// =============================================================================

Hooks.once("ready", async () => {
  console.log(`${SYS_ID} | Ready`);
  
  // Alternative: Register tests if Quench already loaded (fallback if quenchReady already fired)
  const quenchModule = game.modules.get("quench");
  const quench = globalThis.quench;
  
  if (quenchModule?.active && quench && !quenchModule._l5r4Registered) {
    console.log(`${SYS_ID} | Quench detected, attempting late registration...`);
    try {
      await registerQuenchTests(quench);
      quenchModule._l5r4Registered = true;
      console.log(`${SYS_ID} | ✓ Successfully registered Quench tests (late registration)`);
    } catch (err) {
      console.error(`${SYS_ID} | ✗ Failed to register Quench tests (late registration):`, err);
      console.error(`${SYS_ID} | Error details:`, err.message);
    }
  }

  // Execute data migrations if system version has changed or forced
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
        try { await game.settings.set(SYS_ID, "lastMigratedVersion", currentVersion); } catch (_e) {}
        try { await game.settings.set(SYS_ID, "runMigration", false); } catch (_e) {}
        if (forceFlag) {
          try { await game.settings.set(SYS_ID, "forceMigration", false); } catch (_e) {}
        }
      }
    }
  }
});
