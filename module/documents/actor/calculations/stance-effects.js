/**
 * Stance Effects Calculator
 *
 * Applies L5R4 combat stance mechanical effects to actor derived data during preparation phase.
 * Modifies Armor TN and stores detailed stance effect data for UI display and rules enforcement.
 *
 * Key Responsibilities:
 * - **Full Attack Stance**: Apply -10 Armor TN penalty and track attack/damage bonuses
 * - **Defense Stance**: Add Air Ring + Defense Skill to Armor TN
 * - **Full Defense Stance**: Apply Defense/Reflexes roll result (÷2 rounded up) to Armor TN
 * - **Effect Tracking**: Store stance details in sys._stanceEffects for sheet rendering
 *
 * L5R4 Game Rules Context:
 * Implements the three aggressive/defensive stances from core combat rules:
 * - Full Attack (Fire Ring): +2k1 attack, +1k1 damage, -10 Armor TN penalty
 * - Defense (Air Ring): +Air Ring + Defense Skill to Armor TN, cannot attack
 * - Full Defense (Earth Ring): Defense/Reflexes roll ÷ 2 (rounded up) to Armor TN, only Free Actions
 *
 * Foundry VTT Integration:
 * - Called during Actor.prepareDerivedData() lifecycle hook
 * - Reads stance state from ActiveEffect status IDs via getActiveStances()
 * - Uses flag storage for Full Defense roll persistence (flags[SYS_ID].fullDefenseRoll)
 * - Populates sys._stanceEffects for template consumption
 *
 * Data Flow:
 * 1. Read active stances from actor.effects collection
 * 2. Apply each stance's Armor TN modifier and track effects
 * 3. Aggregate all stance modifiers into sys.armorTn.stanceMod
 * 4. Update sys.armorTn.current with final modifier
 *
 * @module documents/actor/calculations/stance-effects
 * @requires Foundry VTT v13+
 * @see {@link module:services/stance/core/helpers} for stance detection logic
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActor.html#prepareDerivedData|Actor.prepareDerivedData}
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getActiveStances, getDefenseSkillRank } from "../../../services/stance/core/helpers.js";

/**
 * Applies all active stance mechanical effects to actor system data.
 *
 * Primary entry point for stance effect calculation during actor data preparation.
 * Iterates through all active stances and delegates to specific handler functions
 * that apply Armor TN modifiers and populate effect tracking data.
 *
 * L5R4 Rules Implementation:
 * - Characters can have only one stance active at a time per core rules
 * - Each stance provides different combat bonuses/penalties
 * - Armor TN is the primary mechanical effect (base = Reflexes × 5 + 5 + armor bonus)
 *
 * Armor TN Calculation:
 * - Initializes sys.armorTn.stanceMod to 0
 * - Each stance adds/subtracts from stanceMod
 * - Final modifier applied to sys.armorTn.current if non-zero
 *
 * Effect Tracking:
 * - sys._stanceEffects object populated with stance-specific data
 * - Used by character sheet to display current bonuses/penalties
 * - Structure varies by stance type (see individual handler functions)
 *
 * @param {Actor} actor - The L5R4 actor document being prepared
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @param {number} sys.armorTn.current - Current Armor TN value to be modified
 * @param {Object} sys.rings - Actor Ring values (for Defense stance)
 * @see applyFullAttackStance for Full Attack stance effects
 * @see applyDefenseStance for Defense stance effects
 * @see applyFullDefenseStance for Full Defense stance effects
 */
export function applyStanceEffects(actor, sys) {
  if (!actor || !sys) {
    return;
  }

  const activeStances = getActiveStances(actor);

  sys.armorTn = sys.armorTn || {};
  sys.armorTn.stanceMod = 0;
  sys._stanceEffects = {};

  for (const stanceId of activeStances) {
    switch (stanceId) {
      case "fullAttackStance":
        applyFullAttackStance(sys);
        break;
      case "defenseStance":
        applyDefenseStance(actor, sys);
        break;
      case "fullDefenseStance":
        applyFullDefenseStance(actor, sys);
        break;
    }
  }

  if (sys.armorTn.stanceMod !== 0) {
    sys.armorTn.current = (sys.armorTn.current || 0) + sys.armorTn.stanceMod;
  }
}

/**
 * Applies Full Attack stance mechanical effects.
 *
 * L5R4 Full Attack Stance (Fire Ring):
 * "A character in Full Attack Stance gains a bonus of +2k1 to attack rolls made that round,
 * but his Armor TN is reduced by 10 to reflect the all-or-nothing nature of the attack."
 *
 * Mechanical Effects:
 * - **Attack Bonus**: +2k1 to all attack rolls (applied during roll construction)
 * - **Damage Bonus**: +1k1 to damage rolls per core rules
 * - **Armor TN Penalty**: -10 to Armor TN (applied here)
 *
 * Effect Tracking:
 * Stores bonuses in sys._stanceEffects.fullAttack for UI display and roll integration.
 * Attack/damage bonuses are read by dice service during roll construction.
 *
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @param {number} sys.armorTn.stanceMod - Stance modifier accumulator
 * @param {Object} sys._stanceEffects - Effect tracking object for UI display
 * @private
 */
function applyFullAttackStance(sys) {
  sys.armorTn.stanceMod += -10;

  sys._stanceEffects.fullAttack = {
    armorTnPenalty: -10,
    attackBonus: "+2k1",
    damageBonus: "+1k1"
  };
}

/**
 * Applies Defense stance mechanical effects.
 *
 * L5R4 Defense Stance (Air Ring):
 * "Characters in Defense Stance add their Air Ring plus their Defense Skill Rank to their Armor TN.
 * There are no restrictions on what kind of Actions a character may take, other than that they may not attack."
 *
 * Mechanical Effects:
 * - **Armor TN Bonus**: +Air Ring + Defense Skill Rank
 * - **Attack Restriction**: Cannot make attacks (enforced by stance service, not here)
 *
 * Defense Skill Lookup:
 * Uses getDefenseSkillRank() to search actor.items for Defense skill.
 * Returns 0 if untrained (L5R4 allows untrained Defense skill usage).
 *
 * Effect Tracking:
 * Stores bonus breakdown in sys._stanceEffects.defense for UI transparency.
 * Shows Air Ring and Defense Skill contributions separately.
 *
 * @param {Actor} actor - The L5R4 actor document (needed for Defense skill lookup)
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys.rings - Actor Ring values
 * @param {number} sys.rings.air - Air Ring rank (used for Defense bonus)
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @param {number} sys.armorTn.stanceMod - Stance modifier accumulator
 * @param {Object} sys._stanceEffects - Effect tracking object for UI display
 * @private
 */
function applyDefenseStance(actor, sys) {
  const airRing = toInt(sys.rings?.air || 0);
  const defenseSkillRank = getDefenseSkillRank(actor);
  const defenseBonus = airRing + defenseSkillRank;

  sys.armorTn.stanceMod += defenseBonus;

  sys._stanceEffects.defense = {
    armorTnBonus: defenseBonus,
    airRing: airRing,
    defenseSkill: defenseSkillRank
  };
}

/**
 * Applies Full Defense stance mechanical effects.
 *
 * L5R4 Full Defense Stance (Earth Ring):
 * "Upon declaring his Stance, a character in Full Defense Stance makes a Defense/Reflexes roll
 * and adds half of the total (rounding up) to his Armor TN until his following Turn.
 * This Skill Roll is considered a Complex Action, so a character in this Stance may only take Free Actions."
 *
 * Implementation Strategy:
 * - **Roll Required**: Full Defense requires a Defense/Reflexes roll before bonus is calculated
 * - **Default Bonus**: Uses +5 as temporary bonus while awaiting roll (reasonable defensive value)
 * - **Roll Storage**: Stores roll result in actor flag (flags[SYS_ID].fullDefenseRoll)
 * - **Bonus Calculation**: Math.ceil(rollResult / 2) implements "half, rounding up" per rules
 *
 * Two-Phase Application:
 * 1. **Before Roll**: Apply default +5 bonus, set needsRoll flag for UI prompt
 * 2. **After Roll**: Read stored roll result, calculate actual bonus (roll ÷ 2, rounded up)
 *
 * Roll result is set by stance service roll handler and persists until stance changes
 * or combat round ends (flag cleared on stance deactivation).
 *
 * Effect Tracking:
 * Stores roll state and bonus in sys._stanceEffects.fullDefense:
 * - rollResult: Current roll total or localized "pending" message
 * - armorTnBonus: Actual bonus being applied to Armor TN
 * - needsRoll: Boolean flag indicating roll prompt needed (only before roll)
 *
 * @param {Actor} actor - The L5R4 actor document (needed for flag storage)
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @param {number} sys.armorTn.stanceMod - Stance modifier accumulator
 * @param {Object} sys._stanceEffects - Effect tracking object for UI display
 * @private
 */
function applyFullDefenseStance(actor, sys) {
  const existingRoll = actor.getFlag(SYS_ID, "fullDefenseRoll");

  // Before roll: Apply conservative default bonus and prompt for roll
  if (!existingRoll) {
    const defaultBonus = 5; // Temporary bonus until Defense/Reflexes roll completed
    sys.armorTn.stanceMod += defaultBonus;

    sys._stanceEffects.fullDefense = {
      rollResult: game.i18n.localize("l5r4.ui.mechanics.stances.pending"),
      armorTnBonus: defaultBonus,
      needsRoll: true
    };
  } else {
    const rollResult = toInt(existingRoll.total || 0);
    const armorBonus = Math.ceil(rollResult / 2);

    sys.armorTn.stanceMod += armorBonus;

    sys._stanceEffects.fullDefense = {
      rollResult: rollResult,
      armorTnBonus: armorBonus
    };
  }
}
