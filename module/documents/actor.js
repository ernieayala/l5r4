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
 * - Type-specific derived data: prepareDerivedData() runs the PC's or the NPC's preparation
 * - Wound system uses calculation modules for complex penalty logic
 * - XP tracking uses flags for persistent character advancement data
 */

import { WOUND_LEVEL_ORDER } from "../config/game-mechanics.js";
import { isOwnChange } from "../utils/change-origin.js";
import { toInt } from "../utils/type-coercion.js";
import { rollDataKey } from "../utils/rule-values.js";
import { getHighestSchoolRank } from "../utils/mechanics.js";
import {
  prepareWoundPenalties,
  prepareWoundState,
  prepareCurrentWoundLevel
} from "./actor/calculations/wound-system.js";
import { onActorPreCreate } from "./actor/creation.js";
import { prepareCurrentWoundLevelByMode } from "./actor/calculations/npc-wound-system.js";
import { updateXpFlags } from "./actor/calculations/xp-system.js";
import { preparePcData } from "./actor/preparation/pc-preparation.js";
import { prepareNpcData } from "./actor/preparation/npc-preparation.js";
import { applyGrants } from "./item/lifecycle/grants.js";
import { applyInitialRules } from "./actor/rules.js";
import { prepareWoundRollOption } from "./actor/roll-options.js";

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
    onActorPreCreate(this, data);
  }

  /**
   * Initialize base actor data structures.
   * Ensures all required system properties exist; `_initialize` has already built the system data from the stored
   * data. Called before Active Effects are applied.
   *
   * @returns {void}
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData();

    const sys = this.system ?? {};

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
   * Apply Active Effect changes for a phase; after the "initial" phase, collect `system.rules` and apply
   * TraitAdjust (module/documents/actor/rules.js).
   *
   * @param {string} phase
   * @returns {void}
   * @override
   */
  applyActiveEffects(phase) {
    super.applyActiveEffects(phase);
    if (phase === "initial") {
      applyInitialRules(this);
    }
  }

  /**
   * Run the subtype's preparation (pc-preparation, npc-preparation). Core calls this after the "initial" Active Effect
   * phase and the system model's own `prepareDerivedData`, and before the "final" phase
   * [src: client/documents/abstract/client-document.mjs:313-320] [src: client/documents/actor.mjs:428-474].
   * @returns {void}
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    (this.type === "pc" ? preparePcData : prepareNpcData)(this, this.system);
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

    // Skill ranks for rule formulas, e.g. @skills.defense.rank (module/utils/rule-values.js)
    data.skills = {};
    for (const item of this.items) {
      if (item.type === "skill") {
        data.skills[rollDataKey(item.name)] = { rank: item.system.rank };
      }
    }

    // The School Rank a Technique scales with, as @school.rank
    data.school = { rank: getHighestSchoolRank(this) };

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
    updateXpFlags(this, changed, options);
  }

  /**
   * A change that raises Insight Rank (a Trait, the Void Ring) can bring a School's next Technique due
   * (roadmap/STAGE-11 decision 2). Only the client that sent the change grants it.
   * @override
   */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (isOwnChange(options, game.socket.id)) {
      applyGrants(this);
    }
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
   */
  _finalizeWoundPenalties(sys, order, woundMode) {
    prepareWoundState(sys, sys.suffered);

    // Cap suffered wounds at Out threshold to prevent overflow
    const outMax = toInt(sys.woundLevels?.out?.value) || 0;
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

    const current = woundMode
      ? prepareCurrentWoundLevelByMode(sys, order, { sCapped, woundMode })
      : prepareCurrentWoundLevel(sys, order, sCapped);

    // Apply wound penalty modifiers from effects and conditions
    sys.woundsPenaltyMod = toInt(sys.woundsPenaltyMod);
    prepareWoundPenalties(sys);

    if (!woundMode) {
      sys.currentWoundLevel = current;
    }
    prepareWoundRollOption(this, sys, current);

    // The current rank's effective penalty, as prepareWoundPenalties set it on every rank (#102)
    sys.woundPenalty = current.penaltyEff;
    sys.wounds.penalty = current.penaltyEff;

    return current;
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
