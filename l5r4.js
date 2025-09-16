/**
 * L5R4 System bootstrap - Foundry VTT v13
 *
 * Responsibilities
 * - Wire CONFIG, document classes, sheets, and settings.
 * - Register helpers and preload templates.
 * - Provide initiative formula.
 * - Chat parsing for inline KxY rolls.
 *
 * API index: https://foundryvtt.com/api/
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

/* ---------------------------------- */
/* Init                               */
/* ---------------------------------- */

Hooks.once("init", async () => {
  console.log(`${SYS_ID} | Initializing Legend of the Five Rings 4e`);

  // Settings first so data prep can read them on startup
  registerSettings();

  // Wire document classes
  CONFIG.Item.documentClass  = L5R4Item;
  CONFIG.Actor.documentClass = L5R4Actor;

  // Clone the frozen config into CONFIG.l5r4 so it’s extensible for aliases
  // Avoids: "Cannot add property TRAIT_CHOICES, object is not extensible"
  CONFIG.l5r4 = foundry.utils.duplicate(l5r4);

  // Status effects from your config
  CONFIG.statusEffects = l5r4.statusEffects;

  // Alias used by some templates (eg family-sheet.hbs uses config.TRAIT_CHOICES)
  CONFIG.l5r4.TRAIT_CHOICES = CONFIG.l5r4.traits;

  // Initiative per combatant, built from actor system fields
  // https://foundryvtt.com/api/classes/documents.Combatant.html#_getInitiativeFormula
  CONFIG.Combat.initiative = {
    formula: (combatant) => {
      const a = combatant.actor;
      if (!a) return "1d10";
      const roll  = a.system?.initiative?.roll ?? 0;
      const keep  = a.system?.initiative?.keep ?? 0;
      const bonus = a.system?.initiative?.totalMod ?? 0;
      const { diceRoll, diceKeep, bonus: flat } = TenDiceRule(roll, keep, bonus);
      return `${diceRoll}d10k${diceKeep}x10+${flat}`;
    }
  };

  // V2 sheet registration
  const { DocumentSheetConfig } = foundry.applications.apps;
  const { Item, Actor } = foundry.documents;

  // Item sheet
  try {
    DocumentSheetConfig.unregisterSheet(Item, "core", foundry.applications.sheets.ItemSheetV2);
  } catch (_e) { /* already unregistered is fine */ }

  /** Register our Item sheet for all item types, including School.
   *  @see https://foundryvtt.com/api/foundry.applications.apps.DocumentSheetConfig.html#registerSheet
   */
  DocumentSheetConfig.registerSheet(Item, SYS_ID, L5R4ItemSheet, {
    makeDefault: true,
    types: [
      "advantage",
      "armor",
      "bow",
      "clan",
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

  // Actor sheets
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

  // Templates and helpers
  preloadTemplates();
  registerHandlebarsHelpers();
});

/* ---------------------------------- */
/* Ready                              */
/* ---------------------------------- */

Hooks.once("ready", async () => {
  console.log(`${SYS_ID} | Ready`);

  // If setup migration ran, commit the world flag now (only GM may write)
  if (CONFIG[SYS_ID]?.__needsMigrateFlag && game.user?.isGM) {
    try { await game.settings.set(SYS_ID, "migratedCommonItemTypes", true); }
    catch (e) { console.error(`${SYS_ID} | failed to set migration flag`, e); }
    finally { CONFIG[SYS_ID].__needsMigrateFlag = false; }
  }

  // Optional asset image path migration
  if (game.user?.isGM) {
    const currentVersion = game.system?.version ?? "0.0.0";
    const last = game.settings.get(SYS_ID, "lastMigratedVersion") ?? "0.0.0";
    const runFlag = game.settings.get(SYS_ID, "runMigration") ?? false;
    const newer = (foundry?.utils?.isNewerVersion?.(currentVersion, last)) ?? (currentVersion !== last);
    if (runFlag && newer) {
      try {
        await runMigrations(last, currentVersion);
      } catch (e) {
        console.warn(`${SYS_ID}`, "runMigrations failed", e);
      } finally {
        try { await game.settings.set(SYS_ID, "lastMigratedVersion", currentVersion); } catch (_e) {}
        try { await game.settings.set(SYS_ID, "runMigration", false); } catch (_e) {}
      }
    }
  }
});

/* ---------------------------------- */
/* Chat message parsing for inline KxY */
/* ---------------------------------- */

Hooks.on("chatMessage", (chatlog, message, _chatData) => {
  const rollCmd = /^\/(r(oll)?|gmr(oll)?|br(oll)?|sr(oll)?)\s/i;
  if (rollCmd.test(message)) return true;

  // Entire message is an inline roll like '[[3k2+1]]'
  const whole = /^\[\[(.*)\]\]$/;
  if (whole.test(message)) {
    const token = message.substring(2, message.length - 2);
    const kxy   = /(u|e)?\d+k\d+(x\d+)?([+]\d+)?/;
    const result = token.replace(kxy, roll_parser(token));
    chatlog.processMessage(result);
    return false;
  }

  // Mixed text plus inline KxY
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

/* ---------------------------------- */
/* Handlebars helpers                 */
/* ---------------------------------- */

/**
 * Register Handlebars helpers used by L5R4 sheets and cards.
 * Only helpers referenced in templates are registered to keep things lean.
 * @see https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html
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

/**
 * Enforce mutually exclusive L5R stances.
 * Only one of the stance status effects may be active on an actor at a time.
 *
 * Foundry API refs:
 * - TokenDocument.hasStatusEffect / toggleStatusEffect example: https://foundryvtt.com/api/classes/foundry.documents.TokenDocument.html  (see example using toggleStatusEffect)
 * - Hook applyTokenStatusEffect(token, statusId, active): https://foundryvtt.com/api/functions/hookEvents.applyTokenStatusEffect.html
 * - Generic document hooks: https://foundryvtt.com/api/modules/hookEvents.html
 * - Actor.deleteEmbeddedDocuments("ActiveEffect", ids): https://foundryvtt.com/api/classes/foundry.documents.Actor.html
 */
(function enforceExclusiveStances() {
  /** All stance status IDs we consider mutually exclusive. */
  const STANCE_IDS = new Set([
    "attackStance",
    "fullAttackStance",
    "defenseStance",
    "fullDefenseStance",
    "centerStance"
  ]);

  /**
   * Helper: get one or more status IDs represented by an ActiveEffect.
   * Supports both the v11+ statuses Set and the legacy core.statusId flag.
   * @param {ActiveEffect} eff
   * @returns {string[]} ids
   */
  function getEffectStatusIds(eff) {
    const ids = [];
    // v11+ preferred
    if (eff?.statuses?.size) ids.push(...eff.statuses);
    // legacy flag used by Token HUD toggles and some modules
    const legacy = eff?.getFlag?.("core", "statusId");
    if (legacy) ids.push(legacy);
    return ids.filter(Boolean);
  }

  /**
   * Remove any other active stance effects on the same actor.
   * @param {documents.Actor|null} actor
   * @param {string} chosenId The stance we are enabling
   * @param {string} [keepEffectId] Optional effect id to keep (the one just created)
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

  /**
   * Case 1: Token HUD or similar is applying a status by its id.
   * Fire-and-forget. When turning a stance on, delete the others.
   */
  Hooks.on("applyTokenStatusEffect", (token, statusId, active) => {
    if (!active || !STANCE_IDS.has(statusId)) return;
    const actor = token?.actor ?? null;
    // No await here since hook listeners are not awaited.
    removeOtherStances(actor, statusId).catch(console.error);
  });

  /**
   * Case 2: An ActiveEffect is created that carries a stance status.
   * Handle effects created by items, macros, or the HUD.
   */
  Hooks.on("createActiveEffect", (effect, _opts, _userId) => {
    const actor = effect?.parent;
    const ids = getEffectStatusIds(effect);
    const chosen = ids.find(id => STANCE_IDS.has(id));
    if (!chosen) return;
    removeOtherStances(actor, chosen, effect.id).catch(console.error);
  });

  /**
   * Case 3: An existing effect is re-enabled (disabled -> false).
   * Keep it simple and reuse the same exclusivity rule.
   */
  Hooks.on("updateActiveEffect", (effect, changes, _opts, _userId) => {
    // Only react when an effect becomes enabled
    if (changes?.disabled !== false) return;
    const actor = effect?.parent;
    const ids = getEffectStatusIds(effect);
    const chosen = ids.find(id => STANCE_IDS.has(id));
    if (!chosen) return;
    removeOtherStances(actor, chosen, effect.id).catch(console.error);
  });
})();

/**
 * One-time v12 → v13 fix:
 * Convert legacy Item type "commonItem" to the valid generic type "item".
 * - Works for embedded Actor Items by updating the raw source with {recursive:false}
 *   (this is required when the Item type changes).
 * - Also handles any world-level Items (not embedded).
 *
 * References:
 * - Document.update: https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update
 * - Update options (recursive=false): https://foundryvtt.com/api/classes/foundry.data.fields.SchemaField.html#_updateDiff
 */
Hooks.once("setup", async () => {
  try {
    if (!game.user?.isGM) return;
    const already = game.settings.get(SYS_ID, "migratedCommonItemTypes");
    if (already) return;

    let changed = 0;

    // --- Embedded Items on Actors (patch the source) ---
    for (const actor of game.actors) {
      const srcItems = actor?._source?.items ?? [];
      const updates = srcItems
        .filter(si => si.type === "commonItem")
        .map(si => ({ _id: si._id, type: "item" })); // only flip the type

      if (updates.length) {
        // IMPORTANT: recursive:false when changing document type
        await actor.update({ items: updates }, { recursive: false });
        changed += updates.length;
      }
    }

    // --- World-level Items (not embedded) ---
    for (const it of game.items) {
      if (it.type === "commonItem") {
        await it.update({ type: "item" }, { recursive: false });
        changed += 1;
      }
    }

    if (changed > 0) ui.notifications?.info(F("l5r4.system.migration.itemTypeChangeInfo", { count: changed }));
    // Defer the world-scoped write until "ready"
    CONFIG[SYS_ID] ??= {};
    CONFIG[SYS_ID].__needsMigrateFlag = true;
  } catch (err) {
    console.error(`${SYS_ID} | migration error`, err);
    ui.notifications?.error(T("l5r4.system.migration.itemTypeChangeError"));
  }
});
