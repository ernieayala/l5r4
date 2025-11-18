/**
 * @module documents/actor
 * @description Core Actor document for L5R4 Enhanced system.
 *
 * Extends Foundry's Actor class to implement Legend of the Five Rings 4th Edition
 * game mechanics including:
 * - Wound tracking and penalties
 * - Experience point management and insight rank calculation
 * - Ring and trait system with derived values
 * - Fear mechanics
 * - Token configuration defaults for PCs and NPCs
 *
 * Architecture:
 * - Uses Foundry's data preparation lifecycle (prepareBaseData → prepareDerivedData)
 * - Delegates type-specific logic to preparation modules (pc-preparation, npc-preparation)
 * - Wound system uses calculation modules for complex penalty logic
 * - XP tracking uses flags for persistent character advancement data
 *
 * @requires Foundry VTT v11+
 */

import { SYS_ID } from "../config/constants.js";
import { iconPath } from "../config/icons.js";
import { toInt } from "../utils/type-coercion.js";
import { WOUND_LEVEL_ORDER } from "../config/game-mechanics.js";
import {
  calculateWoundPenalties,
  initializeWoundState,
  findCurrentWoundLevel,
  determineCurrentWoundLevel
} from "./actor/calculations/wound-system.js";
import {
  calculateInsightRank,
  preparePcExperience,
  trackXpExpenditure
} from "./actor/calculations/xp-system.js";
import { prepareFear } from "./actor/calculations/fear-system.js";
import { preparePcData } from "./actor/preparation/pc-preparation.js";
import { prepareNpcData } from "./actor/preparation/npc-preparation.js";

/**
 * Actor document for L5R4 Enhanced system.
 * Implements L5R4 game mechanics for player characters and NPCs.
 */
export default class L5R4Actor extends Actor {
  /** @type {string[]} Ordered list of wound level keys for penalty calculation */
  static WOUND_LEVEL_ORDER = WOUND_LEVEL_ORDER;

  /**
   * Configure actor defaults before creation.
   * Sets token configuration, default images, and initializes XP tracking flags.
   *
   * @param {object} data - Initial actor data
   * @param {object} options - Creation options
   * @param {User} user - User creating the actor
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

      if (!data.img) {
        this.updateSource({ img: iconPath("pc.webp") });
      }

      // Initialize XP tracking flags for character advancement
      // These flags persist character creation choices and XP expenditure history
      const providedFlags = data.flags?.[SYS_ID] ?? {};
      const updates = {};

      if (providedFlags.xpManual === undefined) {
        updates[`flags.${SYS_ID}.xpManual`] = [];
      }
      if (providedFlags.xpSpent === undefined) {
        updates[`flags.${SYS_ID}.xpSpent`] = [];
      }
      if (providedFlags.xpBase === undefined) {
        updates[`flags.${SYS_ID}.xpBase`] = 40;
      }
      if (providedFlags.xpFreeTraitBase === undefined) {
        updates[`flags.${SYS_ID}.xpFreeTraitBase`] = {};
      }
      if (providedFlags.traitDiscounts === undefined) {
        updates[`flags.${SYS_ID}.traitDiscounts`] = {};
      }

      if (Object.keys(updates).length > 0) {
        this.updateSource(updates);
      }
    } else {
      this.prototypeToken.updateSource({
        bar1: { attribute: "wounds" },
        bar2: { attribute: "suffered" },
        displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
      });

      const updates = {};

      if (!data.img) {
        updates.img = iconPath("npc.webp");
      }

      if (!data.system?.woundMode) {
        updates["system.woundMode"] = "manual";
      }

      if (Object.keys(updates).length > 0) {
        this.updateSource(updates);
      }
    }
  }

  /**
   * Initialize base actor data structures.
   * Ensures all required system properties exist and propagates trait values from source.
   * Called before Active Effects are applied.
   *
   * @returns {void}
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData();

    const sys = this.system ?? {};

    // Propagate trait values from source to ensure they're available before Active Effects
    // This prevents traits from being overwritten by effect application
    if (this._source?.system?.traits) {
      sys.traits = sys.traits ?? {};
      const sourceTr = this._source.system.traits;
      for (const key of ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"]) {
        if (sourceTr[key] !== undefined) {
          sys.traits[key] = sourceTr[key];
        }
      }
    }

    sys.initiative = sys.initiative ?? {};
    sys.armorTn = sys.armorTn ?? {};
    sys.wounds = sys.wounds ?? {};
    sys.woundLevels = sys.woundLevels ?? {};
    sys.insight = sys.insight ?? {};
    sys.rings = sys.rings ?? {};
    sys.traits = sys.traits ?? {};

    if (this.type === "npc") {
      sys.manualWoundLevels = sys.manualWoundLevels ?? {};
      sys.armor = sys.armor ?? {};
    }
  }

  /**
   * Assemble roll data for dice formulas.
   * Combines traits, rings, bonuses, and derived values into flat object.
   *
   * @returns {object} Roll data with all actor properties available for formulas
   * @override
   */
  getRollData() {
    const data = { ...super.getRollData() };

    if (this.system?.traits) {
      Object.assign(data, this.system.traits);
    }

    if (this.system?._derived?.traitsEff) {
      Object.assign(data, this.system._derived.traitsEff);
    }

    if (this.system?.rings) {
      Object.assign(data, this.system.rings);
    }

    if (this.system?.bonuses) {
      Object.assign(data, this.system.bonuses);
    }

    return data;
  }

  /**
   * Track XP expenditure before actor updates.
   * Monitors changes to traits, skills, and other advancement to log XP spending.
   *
   * @param {object} changed - Changed actor data
   * @param {object} options - Update options
   * @param {User} user - User performing update
   * @returns {Promise<void>}
   * @override
   */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    trackXpExpenditure(this, changed, options);
  }

  /**
   * Calculate derived actor data.
   * Delegates to type-specific preparation modules for PC/NPC logic.
   * Called after Active Effects are applied.
   *
   * @returns {void}
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    const sys = this.system ?? {};

    if (this.type === "pc") {
      this._preparePc(sys);
      preparePcExperience(this, sys);
    } else if (this.type === "npc") {
      this._prepareNpc(sys);
      prepareFear(sys);
    }
  }

  /**
   * Prepare PC-specific derived data.
   * Delegates to pc-preparation module with wound and insight calculation callbacks.
   *
   * @param {object} sys - Actor system data
   * @returns {void}
   * @private
   */
  _preparePc(sys) {
    preparePcData(
      this,
      sys,
      this._finalizeWoundPenalties.bind(this),
      this._calculateInsightRank.bind(this)
    );
  }

  /**
   * Prepare NPC-specific derived data.
   * Delegates to npc-preparation module with wound calculation callback.
   *
   * @param {object} sys - Actor system data
   * @returns {void}
   * @private
   */
  _prepareNpc(sys) {
    prepareNpcData(this, sys, this._finalizeWoundPenalties.bind(this));
  }

  /**
   * Calculate wound penalties and current wound level.
   * Determines wound state based on suffered wounds and wound level thresholds.
   * Applies wound penalty modifiers from effects and conditions.
   *
   * @param {object} sys - Actor system data
   * @param {string[]} order - Ordered wound level keys
   * @param {string} [woundMode] - Optional wound mode override for NPCs
   * @returns {object} Current wound level object with penalty value
   * @private
   */
  _finalizeWoundPenalties(sys, order, woundMode) {
    initializeWoundState(sys, sys.suffered);

    // Cap suffered wounds at Out threshold to prevent overflow
    const outMax = toInt(sys.woundLevels?.out?.value) || 0;
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

    const current = woundMode
      ? determineCurrentWoundLevel(sys, order, sCapped, woundMode)
      : findCurrentWoundLevel(sys, order, sCapped);

    // Apply wound penalty modifiers from effects and conditions
    sys.woundsPenaltyMod = toInt(sys.woundsPenaltyMod);
    calculateWoundPenalties(sys);

    if (!woundMode) {
      sys.currentWoundLevel = current;
    }

    // Calculate effective penalty (base penalty + modifiers, minimum 0)
    const curEffPenalty = Math.max(0, toInt(current.penalty) + toInt(sys.woundsPenaltyMod));
    sys.woundPenalty = curEffPenalty;
    sys.wounds.penalty = curEffPenalty;

    return current;
  }

  /**
   * Calculate insight rank from insight points.
   * Uses L5R4 insight rank progression table.
   *
   * @param {number} insight - Total insight points
   * @returns {number} Insight rank (1-10+)
   * @private
   */
  _calculateInsightRank(insight) {
    return calculateInsightRank(insight);
  }

  /**
   * Check if actor has active fear effect.
   *
   * @returns {boolean} True if fear is active
   */
  hasFear() {
    return this.system?.fear?.active ?? false;
  }
}
