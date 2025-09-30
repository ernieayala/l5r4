/**
 * @fileoverview L5R4 Actor Document Implementation for Foundry VTT v13+
 * 
 * This class extends the base Foundry Actor document to provide L5R4-specific
 * functionality including derived data computation, experience tracking, and
 * token configuration for both Player Characters and Non-Player Characters.
 * Implements the complete L5R4 character mechanics with automatic calculations.
 *
 * **Core Responsibilities:**
 * - **Token Configuration**: Set appropriate defaults for PC/NPC tokens on creation
 * - **Derived Data Computation**: Calculate all derived statistics during data preparation
 * - **Experience Tracking**: Automatic XP cost calculation and logging for character advancement
 * - **Wound System**: Complex wound level tracking with penalties and healing rates
 * - **Family/School Integration**: Handle creation bonuses and trait modifications
 * - **Active Effects Integration**: Full support for trait/ring/skill modifications
 * - **Stance Automation**: Combat stance effects and mutual exclusion
 *
 * **System Architecture:**
 * The actor document follows L5R4's hierarchical data model:
 * - **Base Traits**: Eight primary attributes (Stamina, Willpower, etc.)
 * - **Rings**: Derived from trait pairs with minimum values
 * - **Skills**: Individual skill ranks with emphasis specializations
 * - **Derived Stats**: Initiative, Armor TN, Wounds, Insight automatically calculated
 * - **Experience**: Comprehensive XP tracking with automatic cost computation
 *
 * **Derived Data Features:**
 * 
 * **Player Characters (PC):**
 * - **Rings**: Computed from trait pairs (Air=min(Ref,Awa), Earth=min(Sta,Wil), etc.)
 * - **Initiative**: Roll=InsightRank+Reflexes+mods, Keep=Reflexes+mods
 * - **Armor TN**: Base=5×Reflexes+5, plus armor bonuses (stackable via setting)
 * - **Wounds**: Earth-based thresholds, current level tracking, penalties, heal rate
 * - **Insight**: Points from rings×10 + skills×1, optional auto-rank calculation
 * - **Experience**: Comprehensive XP tracking with automatic cost calculation
 * - **Void Points**: Maximum equals Void Ring, current tracking with recovery
 *
 * **Non-Player Characters (NPC):**
 * - **Simplified Wounds**: Earth-based with optional manual max override
 * - **Initiative**: Effective values with fallbacks to Reflexes
 * - **Shared Logic**: Uses same trait/ring calculations as PCs
 * - **Streamlined Interface**: Reduced complexity for GM ease of use
 *
 * **Experience Point System:**
 * Advanced XP tracking with automatic cost calculation:
 * - **Trait Advancement**: Progressive costs (4×new_rank XP per step)
 * - **Void Advancement**: Fixed costs with family/school bonuses
 * - **Free Bonuses**: Family traits and school skills reduce costs
 * - **Discount System**: Flexible cost reduction for special circumstances
 * - **Audit Trail**: Complete log of all XP expenditures with timestamps
 *
 * **Active Effects Integration:**
 * Full support for Foundry's Active Effects system:
 * - **Trait Modifications**: Direct trait value adjustments
 * - **Ring Bonuses**: Computed ring values include effect modifications
 * - **Skill Bonuses**: Roll/keep/total bonuses for individual skills
 * - **Combat Bonuses**: Initiative, Armor TN, damage modifications
 * - **Wound Penalties**: Automatic wound penalty application
 *
 * **Code Navigation Guide:**
 * 1. **Creation/Update Hooks** (`_preCreate()`, `_preUpdate()`) - Token setup and XP tracking
 * 2. **Main Preparation** (`prepareDerivedData()`) - Entry point, branches to PC/NPC
 * 3. **PC Preparation** (`_preparePc()`) - Complete PC stat calculation
 * 4. **NPC Preparation** (`_prepareNpc()`) - Simplified NPC stat calculation
 * 5. **Shared Logic** (`_prepareTraitsAndRings()`) - Common trait/ring computation
 * 6. **Experience System** (`_preparePcExperience()`, `_xpStepCostForTrait()`) - XP calculations
 * 7. **Utility Methods** (`_calculateInsightRank()`, `_creationFreeBonus()`) - Helper functions
 *
 * **Performance Optimizations:**
 * - **Computed Properties**: Derived data cached during preparation phase
 * - **Efficient Loops**: Optimized iteration over traits, rings, and skills
 * - **Conditional Calculation**: PC/NPC branching avoids unnecessary computation
 * - **Active Effects**: Leverages Foundry's built-in AE system for modifications
 *
 * **Integration Points:**
 * - **Dice Service**: Provides trait/ring values for roll calculations
 * - **Sheet Classes**: Supplies prepared data for template rendering
 * - **Chat System**: Roll results include actor-specific bonuses and penalties
 * - **Combat System**: Initiative and wound tracking integration
 * - **XP Manager**: Experience point data and cost calculations
 *
 * **Error Handling:**
 * - **Graceful Degradation**: Functions with missing or invalid data
 * - **Type Safety**: Robust type checking and conversion
 * - **Console Warnings**: Detailed logging for troubleshooting
 * - **Fallback Values**: Safe defaults for all calculations
 *
 * **Trait Key Glossary:**
 * - `sta`: Stamina, `wil`: Willpower, `str`: Strength, `per`: Perception
 * - `ref`: Reflexes, `awa`: Awareness, `agi`: Agility, `int`: Intelligence
 *
 * **Usage Examples:**
 * ```javascript
 * // Access derived data
 * const actor = game.actors.get(actorId);
 * const earthRing = actor.system.rings.earth; // Computed from Sta+Wil
 * const armorTN = actor.system.armorTn.current; // Includes all bonuses
 * 
 * // Experience tracking
 * const xpBreakdown = actor.system._xp; // Detailed XP analysis
 * const totalSpent = xpBreakdown.spent; // Total XP expenditure
 * ```
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 1.0.2
 * @extends {Actor}
 * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html|Actor Document}
 * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#prototypeToken|Prototype Token}
 * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#applyActiveEffects|Active Effects}
 * @see {@link ../services/stance.js|Stance Service} - Combat stance automation
 * @see {@link ../apps/xp-manager.js|XP Manager} - Experience point management interface
 */

import { SYS_ID, iconPath } from "../config.js";
import { toInt, normalizeTraitKey } from "../utils.js";
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
   * Standard wound level order for L5R4 system.
   * @type {string[]}
   * @static
   */
  static WOUND_LEVEL_ORDER = ["healthy", "nicked", "grazed", "hurt", "injured", "crippled", "down", "out"];

  /**
   * Default wound penalty values for manual wound system.
   * @type {Object<string, number>}
   * @static
   */
  static DEFAULT_WOUND_PENALTIES = { 
    healthy: 0, nicked: 3, grazed: 5, hurt: 10, 
    injured: 15, crippled: 20, down: 40, out: 40 
  };

  /**
   * Default wound threshold values for manual wound system.
   * @type {Object<string, number>}
   * @static
   */
  static DEFAULT_WOUND_THRESHOLDS = { 
    healthy: 15, nicked: 20, grazed: 25, hurt: 30, 
    injured: 35, crippled: 40, down: 43, out: 45 
  };

  /**
   * Get wound levels for specified count, always ending with "out".
   * @param {number} nrWoundLvls - Number of wound levels (1-8)
   * @returns {string[]} Array of wound level keys
   * @static
   */
  static getWoundLevelsForCount(nrWoundLvls) {
    const count = Math.max(1, Math.min(8, nrWoundLvls || 3));
    
    if (count === 1) {
      return ["healthy", "out"];
    } else if (count === 2) {
      return ["healthy", "nicked", "out"];
    } else {
      // For 3+ levels, show first N levels, but always include "out" as the final level
      const levels = this.WOUND_LEVEL_ORDER.slice(0, count);
      if (!levels.includes("out")) {
        levels[levels.length - 1] = "out"; // Replace last with "out"
      }
      return levels;
    }
  }

  /**
   * Calculate effective penalties for all wound levels.
   * Computes penaltyEff for UI display (always positive) while preserving
   * original penalty values for roll calculations (applied as negative).
   * 
   * @param {L5R4ActorSystem} sys - Actor system data containing woundLevels and woundsPenaltyMod
   * @static
   */
  static calculateWoundPenalties(sys) {
    const penaltyMod = toInt(sys.woundsPenaltyMod);
    for (const [, lvl] of Object.entries(sys.woundLevels ?? {})) {
      const eff = toInt(lvl.penalty) + penaltyMod;
      // Store effective penalty for UI display (positive values, negative applied in rolls)
      lvl.penaltyEff = Math.abs(eff);
    }
  }

  /**
   * Initialize wound state data for both PC and NPC actors.
   * Sets wounds.max to the "Out" threshold and calculates remaining wound capacity.
   * 
   * In Manual mode for NPCs:
   * - If wounds.max is set (user configured), it acts as the ceiling for wound tracking
   * - If wounds.max is not set, defaults to "Out" threshold value
   * 
   * In Formula mode for NPCs and all PC modes:
   * - wounds.max is always set to "Out" threshold value (computed from Earth Ring)
   * 
   * @param {L5R4ActorSystem} sys - Actor system data containing woundLevels
   * @param {number} suffered - Current wounds suffered by the actor
   * @static
   */
  static initializeWoundState(sys, suffered) {
    sys.wounds = sys.wounds || {};
    const outMax = toInt(sys.woundLevels.out?.value) || 0;
    
    // In Manual mode, respect user-configured max wounds if set; otherwise use Out threshold
    // In Formula mode, always use computed Out threshold
    const isManualMode = sys.woundMode === "manual";
    const userMaxWounds = toInt(sys.wounds.max);
    
    if (isManualMode && userMaxWounds > 0) {
      // Manual mode with user-configured max wounds - use as ceiling
      sys.wounds.max = userMaxWounds;
    } else {
      // Formula mode or Manual mode without configured max - use Out threshold
      sys.wounds.max = outMax;
    }
    
    sys.wounds.value = Math.max(0, sys.wounds.max - toInt(suffered));
  }

  /**
   * Find current wound level based on suffered damage.
   * @param {object} sys - Actor system data
   * @param {string[]} levelsToCheck - Wound levels to check
   * @param {number} sCapped - Capped suffered damage
   * @returns {object} Current wound level object
   * @static
   */
  static findCurrentWoundLevel(sys, levelsToCheck, sCapped) {
    let current = sys.woundLevels.healthy;
    let lastVal = -1;

    for (const key of levelsToCheck) {
      const lvl = sys.woundLevels[key];
      if (!lvl) continue;
      
      const upper = toInt(lvl.value);
      const within = sCapped <= upper && sCapped > lastVal;
      lvl.current = within;
      if (within) {
        current = lvl;
      }
      lastVal = upper;
    }
    
    return current;
  }

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
      // NPC creation: set default wound mode from global setting
      let defaultWoundMode = "manual"; // Fallback default
      try {
        defaultWoundMode = game.settings.get(SYS_ID, "defaultNpcWoundMode") || "manual";
      } catch (err) {
        console.warn(`${SYS_ID}`, "Failed to read defaultNpcWoundMode setting during NPC creation, using manual mode", { 
          err, 
          actorId: this.id, 
          actorName: this.name 
        });
      }
      
      this.prototypeToken.updateSource({
        bar1: { attribute: "wounds" },
        bar2: { attribute: "suffered" },
        displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
      });
      
      // Set default wound mode and image for new NPCs
      try {
        this.updateSource({ 
          img: iconPath("ninja.png"),
          "system.woundMode": defaultWoundMode
        });
        
        // Debug logging for NPC creation
        if (CONFIG.debug?.l5r4?.wounds) {
          console.log(`${SYS_ID} | NPC Created with wound mode:`, {
            actorId: this.id,
            actorName: this.name,
            woundMode: defaultWoundMode
          });
        }
      } catch (err) {
        console.warn(`${SYS_ID}`, "Failed to set default wound mode during NPC creation", { 
          err, 
          actorId: this.id, 
          actorName: this.name,
          defaultWoundMode 
        });
      }
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
      // Build a set of existing keys to prevent duplicate entries when _preUpdate fires multiple times
      /** @type {Set<string>} */
      const existingEntries = new Set();
      try {
        for (const e of spent) {
          if (e && e.type && e.note) existingEntries.add(`${e.type}:${e.note}`);
        }
      } catch (err) {
        console.warn(`${SYS_ID}`, "Failed to build existing XP entry index", { err });
      }
      /**
       * Push an XP note if not already present.
       * Uses a unique key of `${type}:${note}` to de-duplicate entries across rapid successive updates.
       * @param {number} delta
       * @param {string} note
       * @param {object} extraData - Should include a stable `type` for correct de-duplication
       */
      const pushNote = (delta, note, extraData = {}) => {
        const t = String(extraData?.type || "");
        const key = `${t}:${note}`;
        if (existingEntries.has(key)) return; // Skip duplicates
        spent.push({
          id: foundry.utils.randomID(),
          delta,
          note,
          ts: Date.now(),
          ...extraData
        });
        existingEntries.add(key);
      };

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
            const label = game.i18n?.localize?.(`l5r4.ui.mechanics.traits.${k}`) || k.toUpperCase();
            pushNote(deltaXP, game.i18n.format("l5r4.character.experience.traitChange", { label, from: oldBase, to: newBase }), {
              type: "trait",
              traitKey: k,
              traitLabel: label,
              fromValue: oldBase,
              toValue: newBase
            });
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
            pushNote(deltaXP, game.i18n.format("l5r4.character.experience.voidChange", { from: oldVoid, to: next }), {
              type: "void",
              fromValue: oldVoid,
              toValue: next
            });
          }
        }
      }

      if (spent.length !== (ns.xpSpent?.length ?? 0)) {
        foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpSpent`, spent);
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Actor._preUpdate xp delta failed", { err });
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
      console.warn(`${SYS_ID}`, "Failed to derive school name in _preparePc", { err });
      sys.school = sys.school ?? "";
    }

    const TRAIT_KEYS = ["sta","wil","str","per","ref","awa","agi","int"];
    // Use normalizeTraitKey from utils.js (imported above) for trait normalization

    /**
     * Family Bonus Integration:
     * Family trait bonuses are applied via Active Effects that transfer from Family items.
     * Foundry applies Active Effects before calling prepareDerivedData, so system.traits
     * already contains final effective values including family bonuses.
     * 
     * For XP cost calculations that need to know creation bonuses, use the
     * _creationFreeBonus() method which properly resolves family/school bonuses.
     * 
     * @see {@link _creationFreeBonus} For querying family/school creation bonuses
     * @see {@link https://foundryvtt.com/api/classes/documents.Actor.html#applyActiveEffects|Actor.applyActiveEffects}
     */

    // Expose effective traits = post-AE system values
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
    const add = toInt(sys.woundsMod);

    sys.woundLevels = sys.woundLevels || {};
    const order = L5R4Actor.WOUND_LEVEL_ORDER;
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

    // Initialize wound state using unified method
    L5R4Actor.initializeWoundState(sys, sys.suffered);

    // Cap damage at the "Out" threshold to prevent overflow in wound level calculations
    const outMax = toInt(sys.woundLevels?.out?.value);
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

    // Find current wound level using unified method
    const current = L5R4Actor.findCurrentWoundLevel(sys, order, sCapped);

    // Calculate effective wound penalties using unified method
    sys.woundsPenaltyMod = toInt(sys.woundsPenaltyMod);
    L5R4Actor.calculateWoundPenalties(sys);
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
   * - Skills: Triangular progression (1+2+3+...+rank), free ranks reduce cost regardless of School status
   * - Emphases: 2 XP each (comma/semicolon separated), free emphasis reduces cost independently
   * - Advantages: Direct cost from item
   * - Disadvantages: Grant XP (capped at +10 total)
   * - Kata: Direct cost from item
   * - Kiho: Direct cost from item
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
      // Disadvantage costs are displayed as positive but contribute negative XP
      // Convert positive cost to negative XP contribution (up to 10 total)
      disadvGranted += Math.max(0, toInt(it.system?.cost));
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

    // Skills: sum of next-rank costs above baseline; free ranks reduce XP cost regardless of School status
    let skillsXP = 0;
    for (const it of this.items) {
      if (it.type !== "skill") {
        continue;
      }
      const r = toInt(it.system?.rank);
      const freeRanks = Math.max(0, toInt(it.system?.freeRanks ?? 0));
      if (r > freeRanks) {
        skillsXP += (r * (r + 1)) / 2 - (freeRanks * (freeRanks + 1)) / 2;
      }
      // Emphases: 2 XP each, split on comma/semicolon, minus free emphasis
      const emph = String(it.system?.emphasis ?? "").trim();
      if (emph) {
        const emphases = emph.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        const freeEmphasis = Math.max(0, toInt(it.system?.freeEmphasis ?? 0));
        const paidEmphases = Math.max(0, emphases.length - freeEmphasis);
        skillsXP += 2 * paidEmphases;
      }
    }

    // Advantages, Kata, and Kiho: calculate separately for proper categorization
    let advantagesXP = 0;
    let kataXP = 0;
    let kihoXP = 0;
    for (const it of this.items) {
      if (it.type === "advantage") {
        advantagesXP += toInt(it.system?.cost);
      } else if (it.type === "kata") {
        kataXP += toInt(it.system?.cost);
      } else if (it.type === "kiho") {
        kihoXP += toInt(it.system?.cost);
      }
    }

    const total = xpBase + disadvCap + manualSum;
    const spent = traitsXP + voidXP + skillsXP + advantagesXP + kataXP + kihoXP;
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
        advantages: advantagesXP,
        kata: kataXP,
        kiho: kihoXP
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
   * - Wounds: Configurable calculation mode (Formula vs Manual)
   * - Global Default: Uses system setting "defaultNpcWoundMode" for new NPCs
   * - Individual Override: Each NPC can override the global default via Wound Configuration
   * - Scaling: Wound thresholds scale proportionally if manual max is set
   * - Simplified: No XP tracking, insight calculation, or armor stacking
   * 
   * **Wound Mode Selection:**
   * 1. Individual NPC setting (sys.woundMode) takes priority if set
   * 2. Falls back to global setting (game.settings "defaultNpcWoundMode")
   * 3. Final fallback to "manual" if global setting unavailable
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

    // Initialize wound system based on mode
    sys.woundLevels = sys.woundLevels || {};
    sys.manualWoundLevels = sys.manualWoundLevels || {};
    const order = L5R4Actor.WOUND_LEVEL_ORDER;
    
    // Determine wound mode using global setting as default for new NPCs
    let globalDefault = "manual"; // Fallback default
    try {
      globalDefault = game.settings.get(SYS_ID, "defaultNpcWoundMode") || "manual";
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to read defaultNpcWoundMode setting, using manual mode", { 
        err, 
        actorId: this.id, 
        actorName: this.name 
      });
    }
    
    const woundMode = sys.woundMode || globalDefault;
    
    // Debug logging for wound mode selection
    if (CONFIG.debug?.l5r4?.wounds) {
      console.log(`${SYS_ID} | NPC Wound Mode Selection:`, {
        actorId: this.id,
        actorName: this.name,
        individualMode: sys.woundMode,
        globalDefault: globalDefault,
        selectedMode: woundMode
      });
    }
    
    if (woundMode === "manual") {
      // Manual wound system: use direct threshold/penalty entry
      this._prepareNpcManualWounds(sys, order);
    } else {
      // Formula-based wound system: use Earth-based calculations
      this._prepareNpcFormulaWounds(sys, order);
      
      // Debug: Check values immediately after formula calculation
      if (CONFIG.debug?.l5r4?.wounds) {
        console.log(`${SYS_ID} | RIGHT AFTER _prepareNpcFormulaWounds:`, {
          healthy: sys.woundLevels.healthy?.value,
          nicked: sys.woundLevels.nicked?.value,
          out: sys.woundLevels.out?.value,
          sysType: typeof sys,
          woundLevelsType: typeof sys.woundLevels,
          isProxy: sys.constructor.name
        });
        
        // Try accessing the same object twice
        const firstAccess = sys.woundLevels.healthy?.value;
        const secondAccess = sys.woundLevels.healthy?.value;
        console.log(`${SYS_ID} | Double-check access:`, { firstAccess, secondAccess, same: firstAccess === secondAccess });
      }
    }

    // Initialize wound state using unified method
    L5R4Actor.initializeWoundState(sys, sys.suffered);
    
    // Debug: Check after initializeWoundState
    if (CONFIG.debug?.l5r4?.wounds && woundMode === "formula") {
      console.log(`${SYS_ID} | AFTER initializeWoundState:`, {
        healthy: sys.woundLevels.healthy?.value,
        nicked: sys.woundLevels.nicked?.value,
        out: sys.woundLevels.out?.value
      });
    }

    // Determine current wound level based on mode
    const outMax = toInt(sys.woundLevels.out?.value) || 0;
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));
    const current = this._determineCurrentWoundLevel(sys, order, sCapped, woundMode);

    // Calculate effective wound penalties using unified method
    sys.woundsPenaltyMod = toInt(sys.woundsPenaltyMod);
    L5R4Actor.calculateWoundPenalties(sys);

    // Set current wound penalty for rolls
    const curEffPenalty = Math.max(0, toInt(current.penalty) + toInt(sys.woundsPenaltyMod));
    sys.woundPenalty = curEffPenalty;
    sys.wounds.penalty = curEffPenalty;

    // Apply stance automation effects for NPCs
    applyStanceAutomation(this, sys);

    // Debug: Check wound levels right before _prepareVisibleWoundLevels
    if (CONFIG.debug?.l5r4?.wounds && woundMode === "formula") {
      console.log(`${SYS_ID} | sys.woundLevels RIGHT BEFORE _prepareVisibleWoundLevels:`, {
        healthy: sys.woundLevels.healthy?.value,
        nicked: sys.woundLevels.nicked?.value,
        out: sys.woundLevels.out?.value
      });
    }

    // Prepare visible wound levels for template display
    this._prepareVisibleWoundLevels(sys, order);
  }

  /**
   * Prepare manual wound system for NPCs using direct threshold/penalty entry.
   * Allows GMs to enter wound thresholds and penalties directly from stat blocks.
   * 
   * **Manual Wound Features:**
   * - Direct entry of wound thresholds (e.g., 15, 30, 45)
   * - Direct entry of wound penalties (e.g., -3, -10, Dead)
   * - Active/inactive toggle for each wound level
   * - Validation ensures thresholds increase and penalties worsen
   * 
   * @param {L5R4ActorSystem} sys - The actor's system data object
   * @param {string[]} order - Ordered array of wound level keys
   * @returns {void}
   * @private
   */
  _prepareNpcManualWounds(sys, order) {
    // Initialize manual wound levels if missing
    if (!sys.manualWoundLevels) {
      sys.manualWoundLevels = {};
    }

    // Ensure all wound levels exist with defaults
    const defaultPenalties = L5R4Actor.DEFAULT_WOUND_PENALTIES;
    const defaultThresholds = L5R4Actor.DEFAULT_WOUND_THRESHOLDS;
    
    for (const key of order) {
      if (!sys.manualWoundLevels[key]) {
        sys.manualWoundLevels[key] = {
          value: defaultThresholds[key] || 0,
          penalty: defaultPenalties[key] || 0,
          active: key === "healthy" || key === "nicked" || key === "out" // Default 3-level system
        };
      }
    }

    // Copy manual values to main woundLevels for display and calculation
    // In Manual mode, ONLY the Active checkbox controls visibility, not nrWoundLvls
    for (let i = 0; i < order.length; i++) {
      const key = order[i];
      const manual = sys.manualWoundLevels[key];
      const lvl = sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });
      
      // Always copy manual values to main table for display
      lvl.value = Math.max(0, toInt(manual.value));
      lvl.penalty = Math.max(0, toInt(manual.penalty)); // Penalties stored as positive values
      
      // Mark whether this level is active based ONLY on manual active flag
      // The nrWoundLvls dropdown does not control Manual mode visibility
      lvl.isActive = manual.active === true;
      lvl.isVisible = true; // All levels are visible in manual mode for configuration
      
      // For wound progression calculation, inactive levels use previous threshold
      if (!lvl.isActive && i > 0) {
        const prevKey = order[i - 1];
        const prevValue = sys.woundLevels[prevKey]?.value || 0;
        // Keep display value but use previous for progression
        lvl.calculatedValue = prevValue;
      } else {
        lvl.calculatedValue = lvl.value;
      }
    }

    // Validate and fix threshold progression (ensure strictly increasing)
    let prevValue = 0;
    for (const key of order) {
      const lvl = sys.woundLevels[key];
      if (lvl.value <= prevValue && key !== "healthy") {
        lvl.value = prevValue + 1;
      }
      prevValue = lvl.value;
    }
  }

  /**
   * Prepare formula-based wound system for NPCs using Earth-based calculations.
   * Maintains compatibility with existing Earth-based wound calculations while
   * allowing optional manual max wounds override for scaling.
   * 
   * **Formula Wound Features:**
   * - Earth-based threshold calculation (same as PCs)
   * - Optional manual max wounds override with proportional scaling
   * - Customizable wound level count (1-8 levels)
   * - Wound multiplier and modifier support
   * 
   * @param {L5R4ActorSystem} sys - The actor's system data object
   * @param {string[]} order - Ordered array of wound level keys
   * @returns {void}
   * @private
   */
  _prepareNpcFormulaWounds(sys, order) {
    const earth = sys.rings.earth;
    const mult = toInt(sys.woundsMultiplier) || 2; // Default multiplier for NPCs
    const add = toInt(sys.woundsMod) || 0;

    // Debug logging
    if (CONFIG.debug?.l5r4?.wounds) {
      console.log(`${SYS_ID} | Formula Wounds Calculation:`, {
        actorId: this.id,
        earth,
        mult,
        add,
        existingHealthy: sys.woundLevels?.healthy?.value
      });
    }

    // Handle customizable wound levels for nonhuman NPCs
    const nrWoundLvls = toInt(sys.nrWoundLvls) || 1;
    const activeOrder = L5R4Actor.getWoundLevelsForCount(nrWoundLvls);
    
    let prev = 0;
    for (let i = 0; i < order.length; i++) {
      const key = order[i];
      
      // CRITICAL FIX: Don't replace the object - modify its properties
      // Foundry may have the woundLevels objects frozen/protected
      const lvl = sys.woundLevels[key] ?? (sys.woundLevels[key] = {});
      
      // Reset properties to defaults
      lvl.current = false;
      lvl.isActive = false;
      lvl.isVisible = false;
      lvl.penalty = 0;
      
      // Check if this wound level key is in the active order (not based on index)
      if (activeOrder.includes(key)) {
        // Active wound level - calculate using Earth formula
        if (key === "healthy") {
          const newValue = 5 * earth + add;
          if (CONFIG.debug?.l5r4?.wounds) {
            console.log(`${SYS_ID} | ${key}: BEFORE assign = ${lvl.value}, AFTER assign = ${newValue}, setting now...`);
          }
          lvl.value = newValue;
          if (CONFIG.debug?.l5r4?.wounds) {
            console.log(`${SYS_ID} | ${key}: CONFIRMED lvl.value = ${lvl.value}`);
          }
        } else {
          lvl.value = earth * mult + prev + add;
        }
        prev = lvl.value;
        lvl.isActive = true;
        lvl.isVisible = true;
        
        // Debug logging
        if (CONFIG.debug?.l5r4?.wounds) {
          console.log(`${SYS_ID} | ${key}: value = ${lvl.value}`);
        }
      } else {
        // Inactive wound level - set to previous value to effectively disable
        lvl.value = prev;
        lvl.isActive = false;
        lvl.isVisible = false;
      }
    }

    // Final debug log
    if (CONFIG.debug?.l5r4?.wounds) {
      console.log(`${SYS_ID} | Formula Wounds Complete:`, {
        healthy: sys.woundLevels.healthy?.value,
        nicked: sys.woundLevels.nicked?.value,
        out: sys.woundLevels.out?.value,
        woundLevelsRef: sys.woundLevels
      });
    }

    // Scale wound thresholds if NPC has manual max wounds override
    const npcMax = toInt(sys.wounds?.max);
    const outDerived = toInt(sys.woundLevels.out?.value);
    if (npcMax > 0 && outDerived > 0 && npcMax !== outDerived) {
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
  }

  /**
   * Determine which wound level is currently active based on wounds suffered.
   * In Manual mode, only considers Active (checked) wound levels for calculation.
   * In Formula mode, considers all wound levels based on nrWoundLvls setting.
   * 
   * **Manual Mode Logic:**
   * - Only Active wound levels participate in current level calculation
   * - Finds highest Active threshold that is <= wounds suffered
   * - Prevents "current" being set to hidden/inactive wound levels
   * 
   * **Formula Mode Logic:**
   * - Uses standard progression through all wound levels
   * - Same as PC wound level calculation
   * 
   * @param {L5R4ActorSystem} sys - The actor's system data object
   * @param {string[]} order - Ordered array of wound level keys
   * @param {number} sCapped - Capped wounds suffered value
   * @param {string} woundMode - Current wound mode ("manual" or "formula")
   * @returns {object} The current wound level object
   * @private
   */
  _determineCurrentWoundLevel(sys, order, sCapped, woundMode) {
    try {
      // Reset all current flags
      for (const key of order) {
        const lvl = sys.woundLevels[key];
        if (lvl) {
          lvl.current = false;
        }
      }

      let levelsToCheck;
      if (woundMode === "manual") {
        // Manual mode: Only consider Active wound levels
        levelsToCheck = order.filter(key => {
          const manual = sys.manualWoundLevels?.[key];
          return manual?.active === true;
        });
      } else {
        // Formula mode: Use all wound levels (standard logic)
        levelsToCheck = order;
      }

      // Use unified current level finding logic
      const current = L5R4Actor.findCurrentWoundLevel(sys, levelsToCheck, sCapped);

      return current;
      
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to determine current wound level", { 
        err, 
        woundMode, 
        suffered: sys.suffered 
      });
      
      // Fallback: return healthy level to prevent broken state
      return sys.woundLevels.healthy || { penalty: 0 };
    }
  }

  /**
   * Prepare visible wound levels for template display based on wound mode and settings.
   * Creates filtered arrays for both main wound display and manual configuration.
   * 
   * **Visibility Logic:**
   * - **Formula mode**: Shows levels based on nrWoundLvls dropdown setting
   * - **Manual mode**: Main table shows ONLY Active (checked) wound levels
   * - **Manual configuration**: ALWAYS shows ALL 8 wound levels for editing
   * 
   * **Manual Mode Filtering:**
   * In Manual mode, the main wound table dynamically shows/hides rows based on
   * Active checkbox state. Only wound levels marked as Active=true appear in the
   * main display, providing clean UI that matches user configuration.
   * 
   * **Configuration Display:**
   * The wound configuration always shows all 8 wound levels regardless of dropdown
   * settings, allowing users to toggle Active checkboxes for any level.
   * 
   * @param {L5R4ActorSystem} sys - The actor's system data object
   * @param {string[]} order - Ordered array of wound level keys
   * @returns {void}
   * @private
   */
  _prepareVisibleWoundLevels(sys, order) {
    try {
      const nrWoundLvls = Math.max(1, Math.min(8, toInt(sys.nrWoundLvls) || 3));
      const isManualMode = sys.woundMode === "manual";
      
      // Determine base visible order using unified algorithm
      const baseVisibleOrder = L5R4Actor.getWoundLevelsForCount(nrWoundLvls);

      // Create filtered wound levels for template display
      sys.visibleWoundLevels = {};
      sys.visibleManualWoundLevels = {};
      
      // Manual configuration ALWAYS shows ALL 8 wound levels for editing
      // This allows users to toggle Active checkboxes for any wound level
      for (const key of order) {
        if (sys.manualWoundLevels && sys.manualWoundLevels[key]) {
          sys.visibleManualWoundLevels[key] = sys.manualWoundLevels[key];
        }
      }

      // Main wound table visibility depends on mode
      if (isManualMode) {
        // Manual mode: Only show Active (checked) wound levels in main table
        for (const key of order) {
          const manual = sys.manualWoundLevels?.[key];
          const woundLevel = sys.woundLevels?.[key];
          
          // Include in main table only if Active checkbox is checked
          if (manual?.active === true && woundLevel) {
            sys.visibleWoundLevels[key] = woundLevel;
          }
        }
      } else {
        // Formula mode: compute thresholds directly for display to avoid stale persisted values
        const earth = toInt(sys.rings?.earth);
        const mult = toInt(sys.woundsMultiplier) || 2;
        const add  = toInt(sys.woundsMod) || 0;
        const penaltyMod = toInt(sys.woundsPenaltyMod) || 0;

        let prev = 0;
        for (const key of baseVisibleOrder) {
          // Compute threshold progression
          const value = key === "healthy" ? (5 * earth + add) : (earth * mult + prev + add);
          prev = value;

          // Use default penalties (stored as positive) and compute effective display value
          const basePenalty = toInt(L5R4Actor.DEFAULT_WOUND_PENALTIES?.[key]) || 0;
          const penaltyEff = Math.abs(basePenalty + penaltyMod);

          sys.visibleWoundLevels[key] = {
            value,
            penalty: basePenalty,
            penaltyEff,
            current: false
          };
        }

        // Determine current level based on suffered wounds capped at Out
        const outMax = toInt(sys.visibleWoundLevels.out?.value) || 0;
        const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

        let lastVal = -1;
        for (const key of baseVisibleOrder) {
          const lvl = sys.visibleWoundLevels[key];
          if (!lvl) continue;
          const upper = toInt(lvl.value);
          const within = sCapped <= upper && sCapped > lastVal;
          lvl.current = within;
          lastVal = upper;
        }

        if (CONFIG.debug?.l5r4?.wounds) {
          console.log(`${SYS_ID} | _prepareVisibleWoundLevels (formula) computed:`, {
            healthy: sys.visibleWoundLevels.healthy?.value,
            nicked: sys.visibleWoundLevels.nicked?.value,
            out: sys.visibleWoundLevels.out?.value
          });
        }
      }
      
      // Final debug log for visible wounds
      if (CONFIG.debug?.l5r4?.wounds) {
        console.log(`${SYS_ID} | visibleWoundLevels prepared:`, {
          keys: Object.keys(sys.visibleWoundLevels),
          healthy: sys.visibleWoundLevels.healthy?.value,
          nicked: sys.visibleWoundLevels.nicked?.value,
          out: sys.visibleWoundLevels.out?.value
        });
      }
      
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to prepare visible wound levels", { 
        err, 
        woundMode: sys.woundMode, 
        nrWoundLvls: sys.nrWoundLvls 
      });
      
      // Fallback: show all wound levels to prevent broken UI
      sys.visibleWoundLevels = sys.woundLevels || {};
      sys.visibleManualWoundLevels = sys.manualWoundLevels || {};
    }
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
