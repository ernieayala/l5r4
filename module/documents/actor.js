/**
 * L5R4 Actor document implementation for Foundry VTT v13+.
 * 
 * This class extends the base Foundry Actor document to provide L5R4-specific
 * functionality including derived data computation, experience tracking, and
 * token configuration.
 *
 * ## Core Responsibilities:
 * - **Token Configuration**: Set appropriate defaults for PC/NPC tokens on creation
 * - **Derived Data Computation**: Calculate all derived statistics during data preparation
 * - **Experience Tracking**: Automatic XP cost calculation and logging for character advancement
 * - **Wound System**: Complex wound level tracking with penalties and healing rates
 * - **Family/School Integration**: Handle creation bonuses and trait modifications
 *
 * ## Derived Data Features:
 * ### Player Characters (PC):
 * - **Rings**: Computed from trait pairs (Air=Ref+Awa, Earth=Sta+Wil, etc.)
 * - **Initiative**: Roll=InsightRank+Reflexes+mods, Keep=Reflexes+mods
 * - **Armor TN**: Base=5×Reflexes+5, plus armor bonuses (stackable via setting)
 * - **Wounds**: Earth-based thresholds, current level tracking, penalties, heal rate
 * - **Insight**: Points from rings×10 + skills×1, optional auto-rank calculation
 * - **Experience**: Comprehensive XP tracking with automatic cost calculation
 *
 * ### Non-Player Characters (NPC):
 * - **Simplified Wounds**: Earth-based with optional manual max override
 * - **Initiative**: Effective values with fallbacks to Reflexes
 * - **Shared Logic**: Uses same trait/ring calculations as PCs
 *
 * ## API References:
 * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html|Actor Document}
 * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#prototypeToken|Prototype Token}
 * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#applyActiveEffects|Active Effects}
 *
 * ## Code Navigation Guide:
 * 1. `_preCreate()` - Token defaults and initial actor image setup
 * 2. `_preUpdate()` - XP delta tracking for trait/void/skill changes
 * 3. `prepareDerivedData()` - Main entry point, branches to PC/NPC preparation
 * 4. `_preparePc()` - PC-specific derived data (traits, rings, initiative, armor, wounds, insight)
 * 5. `_preparePcExperience()` - XP totals and breakdown calculation
 * 6. `_prepareNpc()` - NPC-specific derived data (simplified wound system)
 * 7. `_prepareTraitsAndRings()` - Shared trait normalization and ring calculation
 * 8. `_calculateInsightRank()` - Insight points to rank conversion
 * 9. `_creationFreeBonus()` - Family/School bonus detection and summation
 * 10. `_xpStepCostForTrait()` - XP cost calculation for trait advancement
 *
 * ## Trait Key Glossary:
 * - `sta`: Stamina, `wil`: Willpower, `str`: Strength, `per`: Perception
 * - `ref`: Reflexes, `awa`: Awareness, `agi`: Agility, `int`: Intelligence
 */

import { SYS_ID, iconPath } from "../config.js";
import { toInt } from "../utils.js";
import { applyStanceAutomation } from "../services/stance.js";

/**
 * Type definition for the L5R4 actor system data structure.
 * This represents the shape of `actor.system` as used by this document class.
 * Intentionally partial - only includes properties accessed in this file.
 * 
 * @typedef {object} L5R4ActorSystem
 * @property {Record<string, number|{rank?: number}>} traits - Character traits (sta, wil, str, per, ref, awa, agi, int)
 * @property {object} rings - Elemental rings derived from traits
 * @property {number} rings.air - Air ring (min of Reflexes and Awareness)
 * @property {number} rings.earth - Earth ring (min of Stamina and Willpower)
 * @property {number} rings.fire - Fire ring (min of Agility and Intelligence)
 * @property {number} rings.water - Water ring (min of Strength and Perception)
 * @property {object} [rings.void] - Void ring (user-controlled)
 * @property {number} [rings.void.rank] - Void ring rank
 * @property {number} [rings.void.value] - Current void points
 * @property {number} [rings.void.max] - Maximum void points
 * @property {object} [initiative] - Initiative calculation data
 * @property {number} [initiative.roll] - Initiative roll dice
 * @property {number} [initiative.keep] - Initiative keep dice
 * @property {number} [initiative.rollMod] - Roll modifier
 * @property {number} [initiative.keepMod] - Keep modifier
 * @property {object} [armorTn] - Armor Target Number data
 * @property {number} [armorTn.base] - Base TN from Reflexes
 * @property {number} [armorTn.bonus] - Armor bonus to TN
 * @property {number} [armorTn.reduction] - Damage reduction from armor
 * @property {number} [armorTn.current] - Final effective TN
 * @property {number} [armorTn.mod] - Manual TN modifier
 * @property {object} [wounds] - Wound tracking data
 * @property {number} [wounds.max] - Maximum wound points
 * @property {number} [wounds.value] - Current wound points
 * @property {number} [wounds.healRate] - Daily healing rate
 * @property {number} [wounds.mod] - Healing rate modifier
 * @property {number} [wounds.penalty] - Current wound penalty
 * @property {Record<string, WoundLevel>} [woundLevels] - Individual wound level thresholds
 * @property {number} [suffered] - Total damage suffered
 * @property {object} [insight] - Insight rank and points
 * @property {number} [insight.points] - Total insight points
 * @property {number} [insight.rank] - Current insight rank
 * @property {number} [woundsPenaltyMod] - Global wound penalty modifier
 * @property {number} [woundsMultiplier] - Wound threshold multiplier
 * @property {number} [woundsMod] - Wound threshold additive modifier
 * @property {string} [school] - Current school name (derived from items)
 * @property {object} [_derived] - Computed derived data (non-persistent)
 * @property {Record<string, number>} [_derived.traitsEff] - Effective trait values post-AE
 * @property {object} [_xp] - Experience point breakdown (computed during prep)
 */

/**
 * Individual wound level definition.
 * @typedef {object} WoundLevel
 * @property {number} value - Damage threshold for this level
 * @property {number} penalty - Dice penalty at this level
 * @property {boolean} current - Whether this is the character's current level
 * @property {number} [penaltyEff] - Effective penalty including modifiers
 */

export default class L5R4Actor extends Actor {
  /**
   * Configure token defaults and initial actor image on creation.
   * Sets appropriate token bars, display modes, and disposition based on actor type.
   * 
   * @param {object} data - The initial data object provided to the document creation
   * @param {object} options - Additional options which modify the creation request
   * @param {User} user - The User requesting the document creation
   * @returns {Promise<void>}
   * @override
   */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);

    if (this.type === "pc") {
      this.prototypeToken.updateSource({
        bar1: { attribute: "wounds" },
        bar2: { attribute: "suffered" },
        displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        name: this.name,
        vision: true,
        actorLink: true
      });
      this.updateSource({ img: iconPath("helm.png") });
    } else {
      this.prototypeToken.updateSource({
        bar1: { attribute: "wounds" },
        bar2: { attribute: "suffered" },
        displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
      });
      this.updateSource({ img: iconPath("ninja.png") });
    }
  }

  /**
   * Track experience point expenditure automatically when traits or void increase.
   * Calculates XP costs for trait/void advancement and logs them to the actor's flags
   * for display in the experience log. Handles Family/School bonuses and discounts.
   * 
   * @param {object} changed - The differential data that is being updated
   * @param {object} options - Additional options which modify the update request
   * @param {User} user - The User requesting the document update
   * @returns {Promise<void>}
   * @override
   * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#_preUpdate|Document._preUpdate}
   */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    try {
      const ns = this.flags?.[SYS_ID] ?? {};
      const freeTraitBase  = ns.xpFreeTraitBase ?? {};
      const traitDiscounts = ns.traitDiscounts ?? {};
      const oldSys = this.system ?? {};

      let spent = Array.isArray(ns.xpSpent) ? foundry.utils.duplicate(ns.xpSpent) : [];
      const pushNote = (delta, note) => spent.push({ id: foundry.utils.randomID(), delta, note, ts: Date.now() });

      // Traits delta → XP
      if (changed?.system?.traits) {
        const toInt = n => Number.isFinite(+n) ? Number(n) : 0;
        const oldSys = /** @type {any} */ (this.system);
        const traitDiscounts = this.flags?.[SYS_ID]?.traitDiscounts ?? {};
        const freeTraitBase = this.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

        for (const [k, v] of Object.entries(changed.system.traits)) {
          const newBase = toInt(v);
          const oldBase = toInt(oldSys?.traits?.[k]);
          if (!Number.isFinite(newBase) || newBase <= oldBase) continue;

          const freeBase = toInt(freeTraitBase?.[k] ?? 0);
          const freeEff  = freeBase > 0 ? 0 : toInt(this._creationFreeBonus(k));
          const disc     = toInt(traitDiscounts?.[k] ?? 0);

          let deltaXP = 0;
          let stepFreeEff = freeEff;
          let consumedFreeBase = false;
          for (let r = oldBase + 1; r <= newBase; r++) {
            // If a Family/School creation bonus (+1) exists as an AE (stepFreeEff > 0)
            // and it is not yet baked into base (freeBase === 0), make the 2→3 step free
            // and convert it into a base freebie so future steps price correctly.
            if (!consumedFreeBase && freeBase === 0 && stepFreeEff > 0 && r === 3) {
              foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpFreeTraitBase.${k}`, (freeTraitBase?.[k] ?? 0) + 1);
              consumedFreeBase = true;
              stepFreeEff = 0;
              continue;
            }
            deltaXP += this._xpStepCostForTrait(r, stepFreeEff, disc);
          }

          if (deltaXP > 0) {
            // Create localized log entry for experience tracking
            const label = game.i18n?.localize?.(`l5r4.mechanics.traits.${k}`) || k.toUpperCase();
            pushNote(deltaXP, game.i18n.format("l5r4.character.experience.log.traitChange", { label, from: oldBase, to: newBase }));
          }
        }
      }

      // Void
      const newVoid = changed?.system?.rings?.void?.rank ?? changed?.system?.rings?.void?.value;
      if (newVoid !== undefined) {
        const oldVoid = toInt(oldSys?.rings?.void?.rank ?? oldSys?.rings?.void?.value ?? oldSys?.rings?.void);
        const next = toInt(newVoid);
        if (Number.isFinite(next) && next > oldVoid) {
          const baselineVoid = 2 + toInt(freeTraitBase?.void ?? 0);
          let deltaXP = 0;
          for (let r = Math.max(oldVoid, baselineVoid) + 1; r <= next; r++) {
            const step = 6 * r + toInt(traitDiscounts?.void ?? 0);
            deltaXP += Math.max(0, step);
          }
          if (deltaXP > 0) {
            pushNote(deltaXP, game.i18n.format("l5r4.character.experience.log.voidChange", { from: oldVoid, to: next }));
          }
        }
      }

      if (spent.length !== (ns.xpSpent?.length ?? 0)) {
        foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpSpent`, spent);
      }
    } catch (err) {
      console.warn("L5R4", "Actor._preUpdate xp delta failed", { err });
    }
  }

  /**
   * Compute all derived data for the actor based on type.
   * Called automatically by Foundry after Active Effects are applied.
   * Branches to PC or NPC-specific preparation methods.
   * 
   * @returns {void}
   * @override
   * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#prepareDerivedData|Actor.prepareDerivedData}
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    /** @type {L5R4ActorSystem} */
    const sys = this.system ?? {};

    if (this.type === "pc") {
      this._preparePc(sys);
      this._preparePcExperience(sys);
    } else if (this.type === "npc") {
      this._prepareNpc(sys);
    }
  }

  /**
   * Compute effective traits and elemental rings from base trait values.
   * Shared logic between PC and NPC preparation to ensure consistency.
   * 
   * **Trait Processing:**
   * - Extracts effective trait values after Active Effects are applied
   * - Stores normalized values in `sys._derived.traitsEff` for sheet access
   * - Handles both simple numeric values and `{rank: number}` objects
   * 
   * **Ring Calculation:**
   * - Air = min(Reflexes, Awareness)
   * - Earth = min(Stamina, Willpower) 
   * - Fire = min(Agility, Intelligence)
   * - Water = min(Strength, Perception)
   * - Void remains user-controlled (not derived)
   * 
   * @param {L5R4ActorSystem} sys - The actor's system data object
   * @returns {void}
   * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#applyActiveEffects|Actor.applyActiveEffects}
   */
  _prepareTraitsAndRings(sys) {
    const TRAIT_KEYS = ["sta","wil","str","per","ref","awa","agi","int"];
    const TR = k => {
      const v = sys.traits?.[k];
      return toInt(v?.rank ?? v);
    };

    // Effective traits mirror: expose for sheets
    sys._derived = sys._derived || {};
    const traitsEff = {};
    for (const k of TRAIT_KEYS) {
      const base = sys.traits?.[k];
      traitsEff[k] = toInt(base?.rank ?? base);
    }
    sys._derived.traitsEff = traitsEff;

    // Rings from traits
    sys.rings = {
      ...sys.rings,
      air:   Math.min(TR("ref"), TR("awa")),
      earth: Math.min(TR("sta"), TR("wil")),
      fire:  Math.min(TR("agi"), TR("int")),
      water: Math.min(TR("str"), TR("per"))
    };
    sys.rings.void = sys.rings.void ?? {
      rank: toInt(sys.rings?.void?.rank ?? 0),
      value: toInt(sys.rings?.void?.value ?? 0),
      max: toInt(sys.rings?.void?.max ?? 0)
    };
  }

  /**
   * Compute all derived data specific to Player Characters.
   * Handles complex PC mechanics including Family bonuses, initiative, armor TN,
   * wound system, insight calculation, and school name derivation.
   * 
   * **Major Computations:**
   * - School name from embedded school item
   * - Family trait bonuses (via Active Effects or legacy flags)
   * - Initiative: roll = Insight Rank + Reflexes + mods, keep = Reflexes + mods
   * - Armor TN: base = 5×Reflexes + 5, plus armor bonuses (stacking configurable)
   * - Wound system: Earth-based thresholds, current level, penalties, heal rate
   * - Insight: rings×10 + skills×1, optional auto-rank from points
   * 
   * @param {L5R4ActorSystem} sys - The actor's system data object
   * @returns {void}
   */
  _preparePc(sys) {
    /**
     * Derive school name from embedded school item for header display.
     * This is computed during data preparation to ensure the header updates
     * immediately when school items are added/removed. Not persisted to database.
     * 
     * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#prepareDerivedData|Actor.prepareDerivedData}
     */
    try {
      const schoolItem = (this.items?.contents ?? this.items).find(i => i.type === "school");
      sys.school = schoolItem?.name ?? "";
    } catch (err) {
      console.warn("L5R4", "Failed to derive school name in _preparePc", { err });
      sys.school = sys.school ?? "";
    }

    const TRAIT_KEYS = ["sta","wil","str","per","ref","awa","agi","int"];
    /**
     * Normalize various trait identifier formats to standard system keys.
     * Handles multiple input formats for maximum compatibility with different
     * data sources and user input methods.
     * 
     * **Supported Input Formats:**
     * - Short keys: "ref", "awa", "sta", etc.
     * - English labels: "Reflexes", "Awareness", "Stamina", etc.
     * - Localization keys: "l5r4.mechanics.traits.ref", etc.
     * - Localized labels: Any language via game.i18n.localize
     * 
     * @param {string} raw - The trait identifier to normalize
     * @returns {string} Standard trait key ("sta"|"wil"|"str"|"per"|"ref"|"awa"|"agi"|"int") or "" if unknown
     */
    const normalizeTraitKey = (raw) => {
      const known = ["sta","wil","str","per","ref","awa","agi","int"];
      if (raw === null || raw === undefined) { return ""; }
      let k = String(raw).trim();

      // If given an i18n key like "l5r4.traits.ref"
      const m = /^l5r4\.mechanics\.traits\.(\w+)$/i.exec(k);
      if (m && known.includes(m[1].toLowerCase())) {
        return m[1].toLowerCase();
      }

      // Plain short key
      if (known.includes(k.toLowerCase())) {
        return k.toLowerCase();
      }

      // English labels -> keys
      const english = {
        stamina: "sta",
        willpower: "wil",
        strength: "str",
        perception: "per",
        reflexes: "ref",
        awareness: "awa",
        agility: "agi",
        intelligence: "int"
      };
      if (english[k.toLowerCase()]) {
        return english[k.toLowerCase()];
      }

      // Localized labels (any language): compare against localized names
      try {
        for (const key of known) {
          const label = game.i18n?.localize?.(`l5r4.mechanics.traits.${key}`) ?? "";
          if (label && label.toLowerCase() === k.toLowerCase()) {
            return key;
          }
        }
      } catch (_) { /* i18n not ready: ignore */ }

      return "";
    };

    /**
     * Resolve Family trait bonuses from multiple sources with fallback chain.
     * Prioritizes live Family item references to ensure real-time updates when
     * Family items are modified. Falls back to cached flags for compatibility.
     * 
     * **Resolution Priority:**
     * 1. Live Family item via UUID (preferred - reflects real-time changes)
     * 2. Cached family bonus flags (compatibility with older actors)
     * 3. First embedded family item (legacy fallback)
     * 
     * **Family Bonus Integration:**
     * Family bonuses should be implemented as Active Effects on the Family item
     * that transfer to the actor, rather than being handled here directly.
     * 
     * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#getFlag|Document.getFlag}
     * @see {@link https://foundryvtt.com/api/functions/global.html#fromUuidSync|fromUuidSync}
     */
    let fam = {};
    try {
      const uuid = /** @type {string|undefined} */ (this.getFlag(SYS_ID, "familyItemUuid"));
      if (uuid && globalThis.fromUuidSync) {
        const doc = /** @type {any} */ (fromUuidSync(uuid));
        const key = normalizeTraitKey(doc?.system?.trait);
        const amt = Number(doc?.system?.bonus ?? 1);
        if (key && sys.traits && (key in sys.traits) && Number.isFinite(amt) && amt !== 0) {
          fam = { [key]: amt };
        }
      }
    } catch { /* unresolved family reference: continue to flag-based fallback */ }
    if (!fam || Object.keys(fam).length === 0) {
      const fb = this.flags?.[SYS_ID]?.familyBonus;
      if (fb && typeof fb === "object" && Object.keys(fb).length) {
        // Sanitize old flags that may be keyed by full trait names
        const norm = {};
        for (const [k, v] of Object.entries(fb)) {
          const nk = normalizeTraitKey(k);
          if (nk) { norm[nk] = toInt(v); }
        }
        if (Object.keys(norm).length) {
          fam = norm;
        }
      }
    }
    if (!fam || Object.keys(fam).length === 0) {
      // Final fallback for older actors: use the first embedded Family item
      const it = this.items.find(i => i.type === "family");
      const key = normalizeTraitKey(it?.system?.trait);
      const amt = Number(it?.system?.bonus ?? 0);
      if (key && sys.traits && (key in sys.traits) && Number.isFinite(amt) && amt !== 0) {
        fam = { [key]: amt };
      }
    }

    // Expose effective traits = post-AE system values
    // (Family bonuses must be modeled as transferred Active Effects on the Family Item)
    sys._derived = sys._derived || {};
    const traitsEff = {};
    for (const k of TRAIT_KEYS) {
      const base = sys.traits?.[k];
      traitsEff[k] = toInt(base?.rank ?? base);
    }
    sys._derived.traitsEff = traitsEff;

    /**
     * Extract effective trait values after Active Effects processing.
     * Foundry applies Active Effects before calling prepareDerivedData, so
     * system.traits contains the final effective values including all bonuses.
     * 
     * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#applyActiveEffects|Actor.applyActiveEffects}
     */
    const TR = k => toInt(sys.traits?.[k]);

    // Shared traits & rings logic
    this._prepareTraitsAndRings(sys);

    // Initiative
    sys.initiative = sys.initiative || {};
    sys.initiative.roll = toInt(sys.insight?.rank) + TR("ref") + toInt(sys.initiative.rollMod);
    sys.initiative.keep = TR("ref") + toInt(sys.initiative.keepMod);

    // Armor TN
    sys.armorTn = sys.armorTn || {};
    const ref = TR("ref");
    const baseTN = 5 * ref + 5;
    const modTN  = toInt(sys.armorTn.mod);

    /**
     * Calculate armor bonuses with configurable stacking behavior.
     * Some gaming tables prefer stacking all armor bonuses, while others use
     * only the highest bonus. Behavior controlled by world setting.
     * 
     * **Stacking Modes:**
     * - Enabled: Sum all equipped armor bonuses and reductions
     * - Disabled (default): Use highest armor bonus and reduction only
     * 
     * @see {@link https://foundryvtt.com/api/classes/client.settings.Settings.html#register|Settings.register}
     */
    let allowStack = false;
    try {
      allowStack = game.settings.get(SYS_ID, "allowArmorStacking");
    } catch (_) {
      /* setting not registered: default false */
    }

    let bonusTN = 0;
    let reduction = 0;

    for (const it of this.items) {
      if (it.type !== "armor") continue;
      const a = it.system ?? {};
      if (!a?.equipped) continue;
      const b = toInt(a.bonus);
      const r = toInt(a.reduction);
      if (allowStack) {
        bonusTN += b;
        reduction += r;
      } else {
        bonusTN = Math.max(bonusTN, b);
        reduction = Math.max(reduction, r);
      }
    }

    sys.armorTn.base = baseTN;
    sys.armorTn.bonus = bonusTN;
    sys.armorTn.reduction = reduction;
    sys.armorTn.current = baseTN + modTN + bonusTN;

    // Apply stance automation effects
    applyStanceAutomation(this, sys);

    // Wound thresholds
    const earth = sys.rings.earth;
    const mult  = toInt(sys.woundsMultiplier);
    const add   = toInt(sys.woundsMod);

    sys.woundLevels = sys.woundLevels || {};
    const order = ["healthy","nicked","grazed","hurt","injured","crippled","down","out"];
    let prev = 0;
    for (const key of order) {
      const lvl = sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });
      if (key === "healthy") {
        lvl.value = 5 * earth + add;
      } else {
        lvl.value = earth * mult + prev + add;
      }
      prev = lvl.value;
    }

    // Wounds state and penalty (with effective penalties)
    sys.wounds = sys.wounds || {};
    sys.wounds.max = sys.woundLevels.out.value;
    sys.wounds.value = toInt(sys.wounds.max) - toInt(sys.suffered);

    // Cap damage at the "Out" threshold to prevent overflow in wound level calculations
    const outMax = toInt(sys.woundLevels?.out?.value);
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

    // Determine current wound level based on damage suffered
    // Character is at the first level whose threshold encompasses their current damage
    let current = sys.woundLevels.healthy;
    let lastVal = -1;
    for (const key of order) {
      const lvl = sys.woundLevels[key];
      const upper = toInt(lvl.value);
      // Current level if damage is within this threshold range
      const within = sCapped <= upper && sCapped > lastVal;
      lvl.current = within;
      if (within) {
        current = lvl;
      }
      lastVal = upper;
    }
    // Calculate effective wound penalties including global modifiers
    sys.woundsPenaltyMod = toInt(sys.woundsPenaltyMod);
    for (const [, lvl] of Object.entries(sys.woundLevels ?? {})) {
      const eff = toInt(lvl.penalty) + toInt(sys.woundsPenaltyMod);
      // Store effective penalty for UI display, minimum 0
      lvl.penaltyEff = Math.max(0, eff);
    }
    sys.currentWoundLevel = current;
    // Set current wound penalty for rolls (effective penalty, minimum 0)
    const curEffPenalty = Math.max(0, toInt(current.penalty) + toInt(sys.woundsPenaltyMod));
    sys.woundPenalty = curEffPenalty;
    sys.wounds.penalty = curEffPenalty;

    // Heal rate
    sys.wounds.healRate = (TR("sta") * 2) + toInt(sys.insight?.rank) + toInt(sys.wounds?.mod);

    // Insight
    const ringsTotal =
      toInt(sys.rings.air) + toInt(sys.rings.earth) + toInt(sys.rings.fire) +
      toInt(sys.rings.water) + toInt(sys.rings?.void?.rank);

    // Skill points = sum of skill ranks
    let skillTotal = 0;
    for (const it of this.items) {
      if (it.type !== "skill") {
        continue;
      }
      skillTotal += toInt(it.system?.rank);
    }

    sys.insight = sys.insight || {};
    sys.insight.points = (ringsTotal * 10) + (skillTotal * 1);

    if (game.settings.get(SYS_ID, "calculateRank")) {
      sys.insight.rank = this._calculateInsightRank(sys.insight.points);
    }
  }

  /**
   * Calculate comprehensive experience point totals and breakdown for PCs.
   * Computes XP from all sources (base, disadvantages, manual adjustments) and
   * calculates spent XP across all advancement categories with proper cost formulas.
   * 
   * **XP Sources:**
   * - Base XP (typically 40 at character creation)
   * - Disadvantage XP (capped at +10 total)
   * - Manual adjustments from GM or special circumstances
   * 
   * **XP Expenditure Categories:**
   * - Traits: 4 × new effective rank per step, with Family/School bonuses
   * - Void: 6 × new rank per step
   * - Skills: Triangular progression (1+2+3+...+rank), School skills get rank 1 free
   * - Emphases: 2 XP each (comma/semicolon separated)
   * - Advantages: Direct cost from item
   * 
   * Results stored in `sys._xp` for sheet display (not persisted to database).
   * 
   * @param {L5R4ActorSystem} sys - The actor's system data object
   * @returns {void}
   * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#prepareData|Actor.prepareData}
   */
  _preparePcExperience(sys) {
    const flags = this.flags?.[SYS_ID] ?? {};

    // Base total XP
    const xpBase = Number.isFinite(+flags.xpBase) ? Number(flags.xpBase) : 40;

    // Manual adjustments
    const xpManual = Array.isArray(flags.xpManual) ? flags.xpManual : [];
    const manualSum = xpManual.reduce((a, e) => a + toInt(e?.delta), 0);

    // Disadvantage granted XP, capped at +10
    let disadvGranted = 0;
    for (const it of this.items) {
      if (it.type !== "disadvantage") {
        continue;
      }
      disadvGranted += Math.max(0, -toInt(it.system?.cost));
    }
    const disadvCap = Math.min(10, disadvGranted);

    // Traits (not Void): cost per purchased step = 4 × new effective rank (see sheet logger for same logic)
    const TRAITS = /** @type {const} */ (["sta","wil","str","per","ref","awa","agi","int"]);
    const traitDiscounts = this.flags?.[SYS_ID]?.traitDiscounts ?? {};
    const freeTraitBase  = this.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

    let traitsXP = 0;
    for (const k of Object.keys(sys.traits ?? {})) {
      // Foundry sys.traits.* is post-AE (includes Family); remove freebies when summing.
      const effCur   = toInt(sys?.traits?.[k]);                           // effective (post-AE)
      const freeBase = toInt(freeTraitBase?.[k] ?? 0);                    // baked into base at creation
      const freeEff  = freeBase > 0 ? 0 : toInt(this._creationFreeBonus(k)); // AE freebies (Family/School) only
      const disc     = toInt(traitDiscounts?.[k] ?? 0);

      /** Work in *base* space so Family +1 is free by RAW. */
      const baseline = 2 + freeBase;
      const baseCur  = Math.max(baseline, effCur - freeEff);
      for (let r = baseline + 1; r <= baseCur; r++) {
        traitsXP += this._xpStepCostForTrait(r, freeEff, disc);
      }
    }

    // Void: cost per purchased step = 6 × new rank, after baseline
    const voidCur = toInt(sys?.rings?.void?.rank ?? sys?.rings?.void?.value ?? sys?.rings?.void ?? 0);
    const voidBaseline = 2 + toInt(freeTraitBase?.void ?? 0);
    let voidXP = 0;
    if (voidCur > voidBaseline) {
      for (let r = voidBaseline + 1; r <= voidCur; r++) {
        const step = 6 * r + toInt(traitDiscounts?.void ?? 0);
        voidXP += Math.max(0, step);
      }
    }

    // Skills: sum of next-rank costs above baseline; School skill gets first rank free
    let skillsXP = 0;
    for (const it of this.items) {
      if (it.type !== "skill") {
        continue;
      }
      const r = toInt(it.system?.rank);
      const baseline = it.system?.school ? 1 : 0;
      if (r > baseline) {
        skillsXP += (r * (r + 1)) / 2 - (baseline * (baseline + 1)) / 2;
      }
      // Emphases: 2 XP each, split on comma/semicolon
      const emph = String(it.system?.emphasis ?? "").trim();
      if (emph) {
        const count = emph.split(/[,;]+/).map(s => s.trim()).filter(Boolean).length;
        skillsXP += 2 * count;
      }
    }

    // Advantages: their cost counts as spent
    let advantagesXP = 0;
    for (const it of this.items) {
      if (it.type !== "advantage") {
        continue;
      }
      advantagesXP += toInt(it.system?.cost);
    }

    const total = xpBase + disadvCap + manualSum;
    const spent = traitsXP + voidXP + skillsXP + advantagesXP;
    const available = total - spent;

    sys._xp = {
      total,
      spent,
      available,
      breakdown: {
        base: xpBase,
        manual: manualSum,
        disadvantagesGranted: disadvCap,
        traits: traitsXP,
        void: voidXP,
        skills: skillsXP,
        advantages: advantagesXP
      }
    };
  }

  /**
   * Compute derived data specific to Non-Player Characters.
   * Uses simplified mechanics compared to PCs while maintaining compatibility
   * with the same core systems (traits, rings, wounds).
   * 
   * **NPC-Specific Features:**
   * - Initiative: Manual roll/keep values with Reflexes fallback
   * - Wounds: Earth-based calculation with optional manual max override
   * - Scaling: Wound thresholds scale proportionally if manual max is set
   * - Simplified: No XP tracking, insight calculation, or armor stacking
   * 
   * @param {L5R4ActorSystem} sys - The actor's system data object
   * @returns {void}
   */
  _prepareNpc(sys) {
    // Keep NPC traits and rings identical to PCs
    this._prepareTraitsAndRings(sys);

    // Initiative (NPC): leave roll/keep empty unless user sets them; compute effective values; normalize totalMod
    sys.initiative = sys.initiative || {};
    const ref = toInt(sys.traits?.ref);
    sys.initiative.effRoll = toInt(sys.initiative.roll) > 0 ? toInt(sys.initiative.roll) : ref;
    sys.initiative.effKeep = toInt(sys.initiative.keep) > 0 ? toInt(sys.initiative.keep) : ref;
    sys.initiative.totalMod = toInt(sys.initiative.totalMod);

    // Calculate wound thresholds using same formula as PCs for consistency
    const earth = sys.rings.earth;
    const mult = toInt(sys.woundsMultiplier) || 2; // Default multiplier for NPCs
    const add = toInt(sys.woundsMod) || 0;

    sys.woundLevels = sys.woundLevels || {};
    const order = ["healthy", "nicked", "grazed", "hurt", "injured", "crippled", "down", "out"];
    let prev = 0;
    for (const key of order) {
      const lvl = sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });
      if (key === "healthy") {
        lvl.value = 5 * earth + add;
      } else {
        lvl.value = earth * mult + prev + add;
      }
      prev = lvl.value;
    }

    // Scale wound thresholds if NPC has manual max wounds override
    // This allows NPCs to have custom wound totals while maintaining proper level progression
    const npcMax = toInt(sys.wounds?.max);
    const outDerived = toInt(sys.woundLevels.out?.value);
    if (npcMax > 0 && outDerived > 0) {
      const factor = npcMax / outDerived;
      let prevScaled = 0;
      for (const key of order) {
        const lvl = sys.woundLevels[key];
        const orig = toInt(lvl.value);
        let scaled = Math.ceil(orig * factor);
        // Ensure thresholds remain strictly increasing and positive
        scaled = key === "healthy" ? Math.max(1, scaled) : Math.max(prevScaled + 1, scaled);
        lvl.value = scaled;
        prevScaled = scaled;
      }
    }

    // Calculate current wound state and penalties
    sys.wounds = sys.wounds || {};
    // Use manual max if set, otherwise use calculated 'out' threshold
    const effMax = npcMax > 0 ? npcMax : outDerived;
    sys.wounds.value = toInt(effMax) - toInt(sys.suffered);

    // Determine current wound level (same logic as PCs)
    const outMax = toInt(sys.woundLevels.out.value);
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

    let current = sys.woundLevels.healthy;
    let lastVal = -1;
    for (const key of order) {
      const lvl = sys.woundLevels[key];
      const upper = toInt(lvl.value);
      const within = sCapped <= upper && sCapped > lastVal;
      lvl.current = within;
      if (within) {
        current = lvl;
      }
      lastVal = upper;
    }

    // Calculate effective wound penalties including global modifier
    sys.woundsPenaltyMod = toInt(sys.woundsPenaltyMod);
    for (const [, lvl] of Object.entries(sys.woundLevels ?? {})) {
      const eff = toInt(lvl.penalty) + toInt(sys.woundsPenaltyMod);
      lvl.penaltyEff = Math.max(0, eff);
    }

    // Set current wound penalty for rolls
    const curEffPenalty = Math.max(0, toInt(current.penalty) + toInt(sys.woundsPenaltyMod));
    sys.woundPenalty = curEffPenalty;
    sys.wounds.penalty = curEffPenalty;

    // Apply stance automation effects for NPCs
    applyStanceAutomation(this, sys);
  }

  /**
   * Convert insight points to insight rank using L5R4 progression table.
   * Uses the standard thresholds with accelerating progression after rank 4.
   * 
   * **Rank Thresholds:**
   * - Rank 1: 0-149 points
   * - Rank 2: 150-174 points  
   * - Rank 3: 175-199 points
   * - Rank 4: 200-224 points
   * - Rank 5+: Every 25 points above 225
   * 
   * @param {number} insight - Total insight points
   * @returns {number} Corresponding insight rank (minimum 1)
   */
  _calculateInsightRank(insight) {
    const t = [150, 175, 200, 225];
    let rank = 1;
    for (let i = 0; i < t.length; i++) {
      if (insight >= t[i]) {
        rank = i + 2;
      }
    }
    if (insight >= 225) {
      rank += Math.floor((insight - 225) / 25);
    }
    return rank;
  }

  /**
   * Calculate total creation bonuses for a specific trait from Family/School items.
   * Handles both modern Active Effect transfers and legacy direct bonuses with
   * deduplication to prevent double-counting items seen via multiple paths.
   * 
   * **Resolution Priority:**
   * 1. Active Effects that transfer and ADD to system.traits.<key>
   * 2. Legacy direct bonuses from item.system.trait + item.system.bonus
   * 
   * **Sources Checked:**
   * - Flagged Family/School items via UUID (preferred)
   * - Embedded Family/School items (fallback for older actors)
   * 
   * @param {string} key - Trait key to check bonuses for ("sta", "ref", etc.)
   * @returns {number} Total bonus amount from all creation sources
   * @see {@link https://foundryvtt.com/api/classes/documents.ActiveEffect.html|ActiveEffect}
   * @see {@link https://foundryvtt.com/api/functions/client.fromUuidSync.html|fromUuidSync}
   */
  _creationFreeBonus(key) {
    try {
      let sum = 0;
      const seen = new Set();

      const addFromDoc = doc => {
        if (!doc) return;
        const did = doc.uuid ?? doc.id ?? null;
        if (did && seen.has(did)) return;
        if (did) seen.add(did);

        // Prefer transferred AEs that ADD to the trait
        let ae = 0;
        for (const eff of (doc.effects ?? [])) {
          if (eff?.transfer !== true) continue;
          for (const ch of (eff?.changes ?? [])) {
            if (ch?.key === `system.traits.${key}` && ch?.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
              const v = Number(ch?.value ?? 0);
              if (Number.isFinite(v)) ae += v;
            }
          }
        }
        if (ae !== 0) { sum += ae; return; }

        // Legacy fallback
        const tKey = String(doc?.system?.trait ?? "").toLowerCase();
        const amt  = Number(doc?.system?.bonus ?? NaN);
        if (tKey === key && Number.isFinite(amt)) sum += amt;
      };

      // Flagged docs
      for (const flagKey of ["familyItemUuid", "schoolItemUuid"]) {
        const uuid = this.getFlag(SYS_ID, flagKey);
        if (!uuid || !globalThis.fromUuidSync) continue;
        addFromDoc(fromUuidSync(uuid));
      }

      // Embedded docs (older actors)
      for (const it of this.items ?? []) {
        if (it.type === "family" || it.type === "school") addFromDoc(it);
      }

      return sum || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate experience cost for advancing a trait to a specific rank.
   * Uses L5R4 trait advancement formula: 4 × effective new rank, with bonuses and discounts.
   * 
   * **Cost Calculation:**
   * - Base cost: 4 × (new base rank + creation bonuses)
   * - Modified by: per-step discounts (can be negative)
   * - Minimum: 0 XP (free if discounts exceed base cost)
   * 
   * **Example:** 
   * Family +1 bonus via AE, buying base rank 3:
   * Cost = 4 × (3 + 1) = 16 XP
   * 
   * @param {number} r - New base rank being purchased (typically 3+)
   * @param {number} freeEff - Creation bonuses from Family/School (0 if already baked into base)
   * @param {number} discount - Per-step cost modifier (negative reduces cost)
   * @returns {number} XP cost for this advancement step (minimum 0)
   * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#prepareData|Actor.prepareData}
   */
  _xpStepCostForTrait(r, freeEff, discount) {
    const d = Number.isFinite(+discount) ? Number(discount) : 0;
    return Math.max(0, 4 * (r + freeEff) + d);
  }
}
