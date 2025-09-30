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
 * @version 1.0.2
 * @see {@link https://foundryvtt.com/api/|Foundry VTT v13 API Documentation}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html|Document}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html|ApplicationV2}
 */

import { l5r4, SYS_ID, iconPath } from "./module/config.js";
import { T, F } from "./module/utils.js";
import L5R4Actor from "./module/documents/actor.js";
import L5R4Item from "./module/documents/item.js";
import L5R4ItemSheet from "./module/sheets/item-sheet.js";
import L5R4PcSheet from "./module/sheets/pc-sheet.js";
import L5R4NpcSheet from "./module/sheets/npc-sheet.js";
import { TenDiceRule, roll_parser } from "./module/services/dice.js";
import { preloadTemplates } from "./module/setup/preload-templates.js";
import { runMigrations } from "./module/setup/migrations.js";
import { registerSettings } from "./module/setup/register-settings.js";
import { onCreateActiveEffect, onUpdateActiveEffect, onDeleteActiveEffect, initializeStanceService } from "./module/services/stance.js";

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
  // Clone frozen config to allow runtime extensions and template aliases
  CONFIG.l5r4 = foundry.utils.duplicate(l5r4);

  // Configure status effects for token HUD integration
  CONFIG.statusEffects = l5r4.statusEffects;

  // Create template compatibility aliases for legacy references
  CONFIG.l5r4.TRAIT_CHOICES = CONFIG.l5r4.traits;

  // Phase 4: Configure L5R4 initiative system with Ten Dice Rule integration
  // Important: Foundry v13 expects a STRING here, not a function. We'll override
  // Combatant.prototype.getInitiativeRoll to build a dynamic formula.
  CONFIG.Combat.initiative = { formula: "1d10", decimals: 0 };

  // Override Combatant.getInitiativeRoll to compute L5R4 initiative safely
  try {
    const { Combatant } = foundry.documents;
    const __origGetInit = Combatant.prototype.getInitiativeRoll;
    Combatant.prototype.getInitiativeRoll = function(formula) {
      try {
        const a = this.actor;
        if (!a) return new Roll(CONFIG.Combat.initiative.formula);
        const toInt = (v) => Number.isFinite(+v) ? Math.trunc(Number(v)) : 0;
        // Start with PC values
        let roll  = toInt(a.system?.initiative?.roll);
        let keep  = toInt(a.system?.initiative?.keep);
        if (a.type === "npc") {
          const effR = toInt(a.system?.initiative?.effRoll);
          const effK = toInt(a.system?.initiative?.effKeep);
          if (effR > 0) roll = effR;
          if (effK > 0) keep = effK;
        }
        let bonus = toInt(a.system?.initiative?.totalMod);

        // Ten Dice Rule inline
        let extras = 0;
        if (roll > 10) { extras = roll - 10; roll = 10; }
        while (extras >= 3) { keep += 2; extras -= 3; }
        while (keep > 10) { keep -= 2; bonus += 2; }
        if (keep === 10 && extras >= 0) { bonus += extras * 2; }

        const diceRoll = (Number.isFinite(roll) && roll > 0) ? roll : 1;
        const diceKeep = (Number.isFinite(keep) && keep > 0) ? keep : 1;
        const flat     = Number.isFinite(bonus) ? bonus : 0;
        const flatStr  = flat === 0 ? "" : (flat > 0 ? `+${flat}` : `${flat}`);

        // Foundry core syntax: keep highest = kh, exploding d10s = !10
        const formulaStr = `${diceRoll}d10kh${diceKeep}!10${flatStr}`;
        return new Roll(formulaStr);
      } catch (e) {
        return __origGetInit.call(this, formula);
      }
    };
  } catch (e) {
    console.warn(`${SYS_ID} | Unable to patch Combatant.getInitiativeRoll`, e);
  }

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

  // Phase 7: Initialize stance service (hooks and automation)
  initializeStanceService();
});

// =============================================================================
// SYSTEM READY - POST-INITIALIZATION TASKS
// =============================================================================


// =============================================================================
// CHAT INTEGRATION - INLINE ROLL PARSING & DAMAGE BUTTONS
// =============================================================================

// Handle damage button clicks in chat messages
Hooks.on("renderChatMessageHTML", (app, html, data) => {
  html.querySelectorAll(".l5r4-damage-button").forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const button = event.currentTarget;
      const weaponId = button.dataset.weaponId;
      const actorId = button.dataset.actorId;
      const weaponName = button.dataset.weaponName;
      const damageRoll = parseInt(button.dataset.damageRoll) || 0;
      const damageKeep = parseInt(button.dataset.damageKeep) || 0;

      // Find the actor
      const actor = game.actors.get(actorId);
      if (!actor) {
        ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.actorNotFound"));
        return;
      }

      // Check permissions - only allow if user owns the actor or is GM
      if (!actor.isOwner && !game.user.isGM) {
        ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.noPermissionDamage"));
        return;
      }

      // Import WeaponRoll from dice service
      const { WeaponRoll } = await import("./module/services/dice.js");
      
      // Roll weapon damage
      return WeaponRoll({
        diceRoll: damageRoll,
        diceKeep: damageKeep,
        weaponName: weaponName,
        askForOptions: event.shiftKey
      });
    });
  });
});

Hooks.on("chatMessage", (chatlog, message, _chatData) => {
  const rollCmd = /^\/(r(oll)?|gmr(oll)?|br(oll)?|sr(oll)?)\s/i;
  if (rollCmd.test(message)) return true;

  // Handle complete inline roll messages: [[3k2+1]]
  const whole = /^\[\[(.*)\]\]$/;
  if (whole.test(message)) {
    const token = message.substring(2, message.length - 2);
    const kxy   = /(u|e)?\d+k\d+(x\d+)?([+]\d+)?/;
    const result = token.replace(kxy, roll_parser(token));
    chatlog.processMessage(result);
    return false;
  }

  // Handle mixed text with embedded inline rolls: "I roll [[3k2+1]] for damage"
  const inline = /\[\[(.*?)\]\]/g;
  const kxy = /(u|e)?\d+k\d+(x\d+)?([+]\d+)?/;
  if (inline.test(message)) {
    const result = message.replace(inline, (match, token) => {
      if (!kxy.test(token)) return match;
      return match.replace(kxy, roll_parser(token));
    });
    chatlog.processMessage(result);
    return false;
  }

  return true;
});

// =============================================================================
// HANDLEBARS TEMPLATE SYSTEM
// =============================================================================

/**
 * Register custom Handlebars helpers for L5R4 templates.
 * Provides utility functions for mathematical operations, comparisons,
 * and L5R4-specific formatting used throughout the template system.
 * 
 * **Available Helpers:**
 * - **Comparison**: eq, ne, and, or (logical operations)
 * - **Math**: math (arithmetic and comparison operations)
 * - **Utility**: coalesce (null coalescing), concat (string joining)
 * - **L5R4 Specific**: iconPath (asset path resolution)
 * 
 * @returns {void}
 * 
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html|HandlebarsApplicationMixin}
 */
function registerHandlebarsHelpers() {
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("ne", (a, b) => a !== b);
  Handlebars.registerHelper("and", (a, b) => a && b);
  Handlebars.registerHelper("or", (a, b) => a || b);
  Handlebars.registerHelper("coalesce", (...args) => {
    const A = args.slice(0, -1);
    for (const v of A) if (v != null) return v;
    return null;
  });
  Handlebars.registerHelper("iconPath", (n) => iconPath(n));
  Handlebars.registerHelper("math", function (L, op, R) {
    const n = (v) => (v === true || v === false) ? (v ? 1 : 0) : Number(v ?? 0);
    const a = n(L), b = n(R);
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : 0;
      case "%": return b !== 0 ? a % b : 0;
      case ">": return a > b;
      case "<": return a < b;
      case ">=": return a >= b;
      case "<=": return a <= b;
      case "==": return a == b;
      case "===": return a === b;
      case "!=": return a != b;
      case "!==": return a !== b;
      case "floor": return Math.floor(a);
      case "ceil": return Math.ceil(a);
      case "round": return Math.round(a);
      default: return 0;
    }
  });
  Handlebars.registerHelper("concat", function (...args) {
    return args.slice(0, -1).filter(a => typeof a !== "object").join("");
  });
}

// =============================================================================
// COMBAT STANCE ENFORCEMENT
// =============================================================================

/**
 * L5R4 Combat Stance Management System.
 * Enforces mutually exclusive stance mechanics where only one combat stance
 * can be active on an actor at any time. Automatically removes conflicting
 * stances when a new stance is applied.
 * 
 * **Supported Stances:**
 * - Attack Stance: Bonus to attack rolls, penalty to defense
 * - Full Attack Stance: Greater attack bonus, greater defense penalty
 * - Defense Stance: Bonus to defense, penalty to attacks
 * - Full Defense Stance: Greater defense bonus, cannot attack
 * - Center Stance: Balanced stance with no bonuses or penalties
 * 
 * **Integration Points:**
 * - Token HUD status effect toggles
 * - ActiveEffect document creation/updates
 * - Item-granted stance effects
 * - Macro-applied status effects
 * 
 * **Safety Features:**
 * - Handles both v11+ statuses Set and legacy statusId flags
 * - Preserves newly created effects during cleanup
 * - Error isolation prevents stance conflicts from breaking other systems
 * 
 * @see {@link https://foundryvtt.com/api/functions/hookEvents.applyTokenStatusEffect.html|applyTokenStatusEffect}
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.Actor.html#deleteEmbeddedDocuments|Actor.deleteEmbeddedDocuments}
 */
(function enforceExclusiveStances() {
  // Define all L5R4 combat stances that are mutually exclusive
  const STANCE_IDS = new Set([
    "attackStance",
    "fullAttackStance",
    "defenseStance",
    "fullDefenseStance",
    "centerStance"
  ]);

  /**
   * Extract status IDs from an ActiveEffect document.
   * Handles both modern statuses Set (v11+) and legacy statusId flag
   * for maximum compatibility with different Foundry versions and modules.
   * 
   * @param {ActiveEffect} eff - ActiveEffect document to analyze
   * @returns {string[]} Array of status IDs associated with the effect
   */
  function getEffectStatusIds(eff) {
    const ids = [];
    // Modern approach: statuses Set (Foundry v11+)
    if (eff?.statuses?.size) ids.push(...eff.statuses);
    // Legacy approach: core.statusId flag (pre-v11 compatibility)
    const legacy = eff?.getFlag?.("core", "statusId");
    if (legacy) ids.push(legacy);
    return ids.filter(Boolean);
  }

  /**
   * Remove conflicting stance effects from an actor.
   * Finds and deletes all active stance effects except the newly chosen one,
   * ensuring only one stance remains active at a time.
   * 
   * @param {Actor|null} actor - Actor to clean up stance effects on
   * @param {string} chosenId - Status ID of the stance being activated
   * @param {string} [keepEffectId] - Effect ID to preserve (newly created effect)
   * @returns {Promise<void>}
   */
  async function removeOtherStances(actor, chosenId, keepEffectId) {
    if (!actor || !chosenId) return;
    const toDelete = actor.effects
      .filter(e => !e.disabled && e.id !== keepEffectId)
      .filter(e => {
        const ids = getEffectStatusIds(e);
        return ids.some(id => STANCE_IDS.has(id)) && !ids.includes(chosenId);
      })
      .map(e => e.id)
      .filter(Boolean);

    if (toDelete.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);
    }
  }

  // Hook: Token HUD status effect application
  // Handles direct status toggles from token HUD or similar interfaces
  Hooks.on("applyTokenStatusEffect", (token, statusId, active) => {
    if (!active || !STANCE_IDS.has(statusId)) return;
    const actor = token?.actor ?? null;
    // Fire-and-forget cleanup (hook listeners are not awaited)
    removeOtherStances(actor, statusId).catch(console.error);
  });

  // Hook: ActiveEffect creation with stance status
  // Handles effects created by items, macros, or other systems
  Hooks.on("createActiveEffect", (effect, _opts, _userId) => {
    const actor = effect?.parent;
    const ids = getEffectStatusIds(effect);
    const chosen = ids.find(id => STANCE_IDS.has(id));
    if (!chosen) return;
    removeOtherStances(actor, chosen, effect.id).catch(console.error);
    
    // Apply stance automation
    onCreateActiveEffect(effect, _opts, _userId);
  });

  // Hook: ActiveEffect re-enablement
  // Handles existing effects being re-enabled after being disabled
  Hooks.on("updateActiveEffect", (effect, changes, _opts, _userId) => {
    // Only process when disabled flag changes from true to false
    if (changes?.disabled !== false) return;
    const actor = effect?.parent;
    const ids = getEffectStatusIds(effect);
    const chosen = ids.find(id => STANCE_IDS.has(id));
    if (!chosen) return;
    removeOtherStances(actor, chosen, effect.id).catch(console.error);
    
    // Apply stance automation
    onUpdateActiveEffect(effect, changes, _opts, _userId);
  });

  // Hook: ActiveEffect deletion
  // Handles stance effects being removed
  Hooks.on("deleteActiveEffect", (effect, _opts, _userId) => {
    const actor = effect?.parent;
    const ids = getEffectStatusIds(effect);
    const hasStance = ids.some(id => STANCE_IDS.has(id));
    if (!hasStance) return;
    
    // Apply stance automation cleanup
    onDeleteActiveEffect(effect, _opts, _userId);
  });
})();

// =============================================================================
// LEGACY MIGRATION - FOUNDRY v12 → v13 COMPATIBILITY
// =============================================================================


Hooks.once("ready", async () => {
  console.log(`${SYS_ID} | Ready`);

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
