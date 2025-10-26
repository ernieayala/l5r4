/**
 * Condition Effects Calculator
 *
 * Applies L5R4 status condition mechanical effects to actor derived data during preparation phase.
 * Modifies Armor TN, movement, and stores detailed condition effect data for roll penalties and UI display.
 *
 * Key Responsibilities:
 * - **Blinded**: Apply -3k3 ranged, -1k1 melee penalties, override Armor TN, reduce Water Ring for movement
 * - **Dazed**: Apply -3k0 to all actions, restrict stances
 * - **Entangled**: Restrict actions
 * - **Fatigued**: Apply +5 TN penalty (stacking), restrict Full Attack
 * - **Grappled**: Override Armor TN to 5 + armor
 * - **Prone**: Apply -10 Armor TN vs melee, -2k0 attack penalties
 * - **Stunned**: Override Armor TN, prevent all actions
 * - **Guarding**: Apply -5 Armor TN penalty while protecting ally
 * - **Guarded**: Apply +10 Armor TN bonus while being protected by ally
 * - **Effect Tracking**: Store condition details in sys._conditionEffects for sheet rendering and rolls
 *
 * L5R4 Game Rules Context:
 * Implements condition penalties from Dueling/Grappling/Conditions rules.
 * Conditions can stack (e.g., Fatigued stacks daily, multiple conditions apply simultaneously).
 * Some conditions have specific recovery mechanics (Dazed/Stunned require Earth rolls).
 *
 * Foundry VTT Integration:
 * - Called during Actor.prepareDerivedData() lifecycle hook
 * - Reads condition state from ActiveEffect status IDs via getActiveConditions()
 * - Populates sys._conditionEffects for template consumption and roll integration
 *
 * Data Flow:
 * 1. Read active conditions from actor.effects collection
 * 2. Apply each condition's modifiers and track effects
 * 3. Aggregate penalties into sys._conditionEffects for roll system
 * 4. Override Armor TN where applicable (blinded, grappled, stunned, prone)
 *
 * @module documents/actor/calculations/condition-effects
 * @requires Foundry VTT v13+
 * @see {@link module:documents/actor/calculations/stance-effects} for similar pattern
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActor.html#prepareDerivedData|Actor.prepareDerivedData}
 */

import { SYS_ID } from "../../../config/constants.js";
import { toInt } from "../../../utils/type-coercion.js";

/**
 * Condition IDs that have mechanical effects in L5R4.
 * Subset of STATUS_EFFECTS from game-data.js that require penalty application.
 *
 * @constant {Set<string>}
 */
const CONDITION_IDS = new Set([
  "blinded",
  "dazed",
  "entangled",
  "fatigued",
  "feared",
  "grappled",
  "guarded",
  "guarding",
  "prone",
  "stunned"
]);

/**
 * Gets active conditions from actor's effects.
 *
 * Iterates through actor's active effects and extracts condition status IDs.
 * Only includes conditions with mechanical effects (per CONDITION_IDS).
 * Disabled effects are ignored.
 *
 * @param {Actor} actor - The actor to check for conditions
 * @returns {Set<string>} Set of active condition IDs
 * @private
 */
function getActiveConditions(actor) {
  const conditions = new Set();

  if (!actor?.effects) {
    return conditions;
  }

  for (const effect of actor.effects) {
    if (effect.disabled) {
      continue;
    }

    const statuses = effect.statuses || new Set();
    for (const statusId of statuses) {
      if (CONDITION_IDS.has(statusId)) {
        conditions.add(statusId);
      }
    }
  }

  return conditions;
}

/**
 * Applies all active condition mechanical effects to actor system data.
 *
 * Primary entry point for condition effect calculation during actor data preparation.
 * Iterates through all active conditions and delegates to specific handler functions
 * that apply penalties and populate effect tracking data.
 *
 * L5R4 Rules Implementation:
 * - Characters can have multiple conditions active simultaneously
 * - Each condition provides different combat penalties/restrictions
 * - Some conditions override Armor TN (blinded, grappled, stunned)
 * - Some conditions apply roll penalties (blinded, dazed, fatigued, prone)
 *
 * Effect Tracking:
 * - sys._conditionEffects object populated with condition-specific data
 * - Used by dice service to apply penalties to rolls
 * - Used by character sheet to display current penalties
 * - Structure: { rollPenalty: {roll, keep}, keepPenalty: {roll, keep}, tnPenalty: number, restrictions: [] }
 *
 * @param {Actor} actor - The L5R4 actor document being prepared
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @param {number} sys.armorTn.current - Current Armor TN value to be modified
 * @param {Object} sys.rings - Actor Ring values
 * @param {Object} sys.traits - Actor Trait values
 * @see applyBlindedCondition for Blinded condition effects
 * @see applyDazedCondition for Dazed condition effects
 * @see applyEntangledCondition for Entangled condition effects
 * @see applyFatiguedCondition for Fatigued condition effects
 * @see applyFearedCondition for Feared condition effects
 * @see applyGrappledCondition for Grappled condition effects
 * @see applyGuardedCondition for Guarded condition effects
 * @see applyGuardingCondition for Guarding condition effects
 * @see applyProneCondition for Prone condition effects
 * @see applyStunnedCondition for Stunned condition effects
 */
export function applyConditionEffects(actor, sys) {
  if (!actor || !sys) {
    return;
  }

  const activeConditions = getActiveConditions(actor);

  sys._conditionEffects = {
    active: Array.from(activeConditions),
    rollPenalties: {
      melee: { roll: 0, keep: 0 },
      ranged: { roll: 0, keep: 0 },
      defense: { roll: 0, keep: 0 }
    },
    keepPenalties: {
      melee: { roll: 0, keep: 0 },
      ranged: { roll: 0, keep: 0 },
      defense: { roll: 0, keep: 0 }
    },
    tnPenalty: 0,
    restrictions: [],
    armorTnOverride: null,
    armorTnModifier: 0, // Additive modifier applied after override (e.g., Prone -10)
    waterRingPenalty: 0 // Penalty to Water Ring for movement calculations (e.g., Blinded -2)
  };

  for (const conditionId of activeConditions) {
    switch (conditionId) {
      case "blinded":
        applyBlindedCondition(sys);
        break;
      case "dazed":
        applyDazedCondition(sys);
        break;
      case "entangled":
        applyEntangledCondition(sys);
        break;
      case "fatigued":
        applyFatiguedCondition(sys);
        break;
      case "feared":
        applyFearedCondition(actor, sys);
        break;
      case "grappled":
        applyGrappledCondition(sys);
        break;
      case "guarded":
        applyGuardedCondition(sys);
        break;
      case "guarding":
        applyGuardingCondition(sys);
        break;
      case "prone":
        applyProneCondition(sys);
        break;
      case "stunned":
        applyStunnedCondition(sys);
        break;
    }
  }

  // Apply Armor TN override if any condition sets one
  // Preserve stance modifiers (e.g., Full Attack -10) when applying override
  if (sys._conditionEffects.armorTnOverride !== null) {
    const stanceMod = sys.armorTn.stanceMod || 0;
    sys.armorTn.current = sys._conditionEffects.armorTnOverride + stanceMod;
    sys.armorTn.conditionOverride = true;
  }

  // Apply additive Armor TN modifiers after override (e.g., Prone -10)
  if (sys._conditionEffects.armorTnModifier !== 0) {
    sys.armorTn.current += sys._conditionEffects.armorTnModifier;
  }

  // Enforce Armor TN floor of 5 per L5R4 rules (minimum from Grappled/Stunned base)
  if (sys.armorTn.current < 5) {
    sys.armorTn.current = 5;
  }
}

/**
 * Applies Blinded condition mechanical effects.
 *
 * L5R4 Blinded Condition:
 * "A character who has been struck blind or who suffers from the Blind Disadvantage suffers
 * a penalty of -3k3 to all ranged attack rolls and -1k1 to melee attack rolls. A blind
 * character's base Armor TN is equal to his Reflexes Trait plus 5 (armor adds bonuses as normal).
 * The character's Water Ring is considered two ranks lower for the purposes of determining
 * how far he can move as part of a Move Action."
 *
 * Mechanical Effects:
 * - **Ranged Attack Penalty**: -3k3 to all ranged attack rolls
 * - **Melee Attack Penalty**: -1k1 to melee attack rolls
 * - **Defense Penalty**: -1k1 to Defense rolls (implied from defense skill usage)
 * - **Armor TN Override**: Base = Reflexes + 5 (armor bonus still applies, but no other modifiers)
 * - **Movement Reduction**: Water Ring -2 for movement calculation (handled by movement system)
 *
 * Effect Tracking:
 * Stores penalties in sys._conditionEffects for UI display and roll integration.
 *
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys._conditionEffects - Effect tracking object for UI display and rolls
 * @param {Object} sys.traits - Actor trait values
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @private
 */
function applyBlindedCondition(sys) {
  // Ranged attack penalty: -3k3
  sys._conditionEffects.rollPenalties.ranged.roll += -3;
  sys._conditionEffects.rollPenalties.ranged.keep += -3;

  // Melee attack penalty: -1k1
  sys._conditionEffects.rollPenalties.melee.roll += -1;
  sys._conditionEffects.rollPenalties.melee.keep += -1;

  // Defense penalty: -1k1
  sys._conditionEffects.rollPenalties.defense.roll += -1;
  sys._conditionEffects.rollPenalties.defense.keep += -1;

  // Armor TN override: Reflexes + 5 + armor bonus (no other modifiers)
  // When multiple conditions set overrides, use the lowest value (most vulnerable)
  const ref = toInt(sys.traits?.ref || 0);
  const armorBonus = toInt(sys.armorTn?.bonus || 0);
  const blindedTN = ref + 5 + armorBonus;

  if (
    sys._conditionEffects.armorTnOverride === null ||
    blindedTN < sys._conditionEffects.armorTnOverride
  ) {
    sys._conditionEffects.armorTnOverride = blindedTN;
  }

  // Movement reduction: Water Ring -2 for movement calculation
  sys._conditionEffects.waterRingPenalty += -2;

  sys._conditionEffects.restrictions.push("l5r4.conditions.blinded.restrictions");
}

/**
 * Applies Dazed condition mechanical effects.
 *
 * L5R4 Dazed Condition:
 * "A character who has been dazed suffers a penalty of -3k0 to all actions. Dazed characters
 * can only use the Defense and Full Defense Stances and cannot perform an Iaijutsu duel.
 * The character may recover from this Status Effect by making a successful Earth Ring Roll
 * versus a TN of 20 during the Reaction Stage. The target may attempt this roll once each
 * Round, and the TN decreases by 5 each time he fails the roll."
 *
 * Mechanical Effects:
 * - **Universal Penalty**: -3k0 to all actions (attacks, skills, spells, etc.)
 * - **Stance Restriction**: Only Defense and Full Defense stances allowed
 * - **Duel Restriction**: Cannot perform Iaijutsu duels
 * - **Recovery**: Earth Ring roll TN 20 (decreases by 5/round) during Reaction Stage
 *
 * Note: The -3k0 penalty reduces rolled dice. If rolled dice become less than kept dice,
 * kept dice are reduced to match (per L5R4 dice penalty rules).
 *
 * Effect Tracking:
 * Stores penalty in sys._conditionEffects for UI display and roll integration.
 *
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys._conditionEffects - Effect tracking object for UI display and rolls
 * @private
 */
function applyDazedCondition(sys) {
  // Universal penalty: -3k0 to all actions
  sys._conditionEffects.rollPenalties.melee.roll += -3;
  sys._conditionEffects.rollPenalties.ranged.roll += -3;
  sys._conditionEffects.rollPenalties.defense.roll += -3;

  sys._conditionEffects.restrictions.push("l5r4.conditions.dazed.restrictions");
}

/**
 * Applies Entangled condition mechanical effects.
 *
 * L5R4 Entangled Condition:
 * "A character who has become entangled can take no Actions other than attempting to break free.
 * This is a Strength roll against a TN determined by the GM based on the nature of the
 * entanglement: it is a Contested Roll if someone else is actively trying to keep the
 * character entangled. Opponents may initiate a grapple with an entangled character without
 * an attack roll."
 *
 * Mechanical Effects:
 * - **Action Restriction**: Cannot take any actions except Strength roll to break free
 * - **Grapple Vulnerability**: Opponents can grapple without attack roll
 * - **Recovery**: Strength roll vs TN (GM determined or contested)
 *
 * Note: This is primarily a restriction effect with no numerical penalties.
 *
 * Effect Tracking:
 * Stores restriction in sys._conditionEffects for UI display.
 *
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys._conditionEffects - Effect tracking object for UI display
 * @private
 */
function applyEntangledCondition(sys) {
  sys._conditionEffects.restrictions.push("l5r4.conditions.entangled.restrictions");
}

/**
 * Applies Fatigued condition mechanical effects.
 *
 * L5R4 Fatigued Condition:
 * "A character who goes without rest for 24 hours suffers a +5 TN penalty to all his Skill rolls,
 * physical Trait rolls, and Spell Casting Rolls until he rests. This penalty increases by an
 * additional +5 for every day that passes without rest. After a number of days equal to the
 * character's Stamina Trait, he must begin making Willpower Trait Rolls at TN 20 every two
 * hours to avoid falling asleep. A fatigued character may not take the Full Attack Stance."
 *
 * Mechanical Effects:
 * - **TN Penalty**: +5 TN to all skill rolls, physical trait rolls, and spellcasting (stacks +5 per day)
 * - **Stance Restriction**: Cannot use Full Attack stance
 * - **Sleep Risk**: After Stamina days, Willpower TN 20 every 2 hours to avoid sleep
 *
 * Note: TN penalties increase effective TN rather than reducing dice rolled.
 * Stacking is handled by applying the condition multiple times or using flags to track days.
 *
 * Effect Tracking:
 * Stores TN penalty in sys._conditionEffects for UI display and roll integration.
 *
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys._conditionEffects - Effect tracking object for UI display and rolls
 * @private
 */
function applyFatiguedCondition(sys) {
  // TN penalty: +5 (stacking per day without rest)
  sys._conditionEffects.tnPenalty += 5;

  sys._conditionEffects.restrictions.push("l5r4.conditions.fatigued.restrictions");
}

/**
 * Applies Feared condition mechanical effects.
 *
 * L5R4 Fear Condition:
 * "A character who fails to resist a Fear effect suffers a penalty to all of his die rolls
 * equal to -Xk0, where X is the Rank of the Fear effect. Thus, for example, a Fear 2 effect
 * would inflict a -2k0 penalty on all die rolls. This penalty lasts until the end of the
 * encounter, unless the source of the Fear is removed prior to that time."
 *
 * Mechanical Effects:
 * - **Universal Penalty**: -Xk0 to all actions (attacks, skills, spells, etc.) where X = Fear Rank
 * - **Duration**: Until encounter end or Fear source removed
 * - **Multiple Fear Sources**: If multiple Fear effects apply, use the highest Fear Rank
 *
 * Note: The -Xk0 penalty reduces rolled dice. If rolled dice become less than kept dice,
 * kept dice are reduced to match (per L5R4 dice penalty rules).
 *
 * Effect Tracking:
 * Stores penalty in sys._conditionEffects for UI display and roll integration.
 * Fear Rank is retrieved from the ActiveEffect's flags.l5r4.fearRank value.
 *
 * @param {Actor} actor - The actor document (needed to access effects)
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys._conditionEffects - Effect tracking object for UI display and rolls
 * @private
 */
function applyFearedCondition(actor, sys) {
  // Find the feared effect to extract Fear Rank
  // If multiple fear effects exist, use the highest Fear Rank
  let maxFearRank = 0;

  for (const effect of actor.effects) {
    if (effect.disabled) {
      continue;
    }

    const statuses = effect.statuses || new Set();
    if (statuses.has("feared")) {
      const fearRank = toInt(effect.getFlag(SYS_ID, "fearRank") || 0);
      if (fearRank > maxFearRank) {
        maxFearRank = fearRank;
      }
    }
  }

  // Apply -Xk0 penalty to all roll types
  if (maxFearRank > 0) {
    sys._conditionEffects.rollPenalties.melee.roll += -maxFearRank;
    sys._conditionEffects.rollPenalties.ranged.roll += -maxFearRank;
    sys._conditionEffects.rollPenalties.defense.roll += -maxFearRank;

    sys._conditionEffects.restrictions.push("l5r4.conditions.feared.restrictions");
  }
}

/**
 * Applies Grappled condition mechanical effects.
 *
 * L5R4 Grappled Condition:
 * "A character who is participating in a grapple is considered grappled. Characters who are
 * grappled are much easier to hit with attacks, and have their Armor TN reduced to 5 plus
 * any bonuses from armor they are wearing."
 *
 * Mechanical Effects:
 * - **Armor TN Override**: 5 + armor bonus only (no Reflexes, no other modifiers)
 * - **Vulnerability**: Easier to hit by third parties
 *
 * Effect Tracking:
 * Stores Armor TN override in sys._conditionEffects.
 *
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys._conditionEffects - Effect tracking object for UI display
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @private
 */
function applyGrappledCondition(sys) {
  // Armor TN override: 5 + armor bonus
  // When multiple conditions set overrides, use the lowest value (most vulnerable)
  const armorBonus = toInt(sys.armorTn?.bonus || 0);
  const grappledTN = 5 + armorBonus;

  if (
    sys._conditionEffects.armorTnOverride === null ||
    grappledTN < sys._conditionEffects.armorTnOverride
  ) {
    sys._conditionEffects.armorTnOverride = grappledTN;
  }

  sys._conditionEffects.restrictions.push("l5r4.conditions.grappled.restrictions");
}

/**
 * Applies Guarded condition mechanical effects.
 *
 * L5R4 Guard Maneuver:
 * "When you declare a Guard Action, you must designate one other person within 5 feet of you.
 * Until your next Turn, any time that person is within 5 feet of you, their Armor TN is
 * increased by 10 and your Armor TN is decreased by 5."
 *
 * Mechanical Effects (Guarded - the protected character):
 * - **Armor TN Bonus**: +10 while within 5 feet of guardian
 * - **Duration**: Until guardian's next turn
 * - **Proximity Requirement**: Must remain within 5 feet of guardian
 *
 * Note: Players manually apply/remove this status when Guard action is declared.
 * Proximity tracking is handled by players as per L5R4 tabletop rules.
 *
 * Effect Tracking:
 * Stores Armor TN modifier in sys._conditionEffects.
 *
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys._conditionEffects - Effect tracking object for UI display
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @private
 */
function applyGuardedCondition(sys) {
  // Armor TN bonus: +10 while being guarded
  sys._conditionEffects.armorTnModifier += 10;

  sys._conditionEffects.restrictions.push("l5r4.conditions.guarded.restrictions");
}

/**
 * Applies Guarding condition mechanical effects.
 *
 * L5R4 Guard Maneuver:
 * "When you declare a Guard Action, you must designate one other person within 5 feet of you.
 * Until your next Turn, any time that person is within 5 feet of you, their Armor TN is
 * increased by 10 and your Armor TN is decreased by 5."
 *
 * Mechanical Effects (Guarding - the guardian character):
 * - **Armor TN Penalty**: -5 while protecting ally
 * - **Duration**: Until guardian's next turn
 * - **Proximity Requirement**: Protected ally must remain within 5 feet
 * - **Action Cost**: Simple Action to declare Guard
 * - **Stance Restriction**: Cannot Guard while in Full Attack stance
 *
 * Note: Players manually apply/remove this status when Guard action is declared.
 * Proximity tracking is handled by players as per L5R4 tabletop rules.
 *
 * Effect Tracking:
 * Stores Armor TN modifier in sys._conditionEffects.
 *
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys._conditionEffects - Effect tracking object for UI display
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @private
 */
function applyGuardingCondition(sys) {
  // Armor TN penalty: -5 while guarding
  sys._conditionEffects.armorTnModifier += -5;

  sys._conditionEffects.restrictions.push("l5r4.conditions.guarding.restrictions");
}

/**
 * Applies Prone condition mechanical effects.
 *
 * L5R4 Prone Condition:
 * "A prone character is lying flat on his back, side, or stomach, and cannot move, attack,
 * or defend himself to full effect. A prone character immediately suffers a -10 penalty to
 * his Armor TN against melee attacks. This penalty lasts until he stands up. He cannot use
 * Move Actions, and may only adopt the Defense or Attack Stances. He cannot attack with
 * large weapons, and suffers a -2k0 penalty to attacks with medium and small weapons.
 * It requires a Simple Action to stand up from the prone position."
 *
 * Mechanical Effects:
 * - **Armor TN Penalty**: -10 to Armor TN vs melee attacks
 * - **Attack Penalty**: -2k0 to attacks with medium/small weapons, cannot attack with large weapons
 * - **Movement Restriction**: Cannot use Move Actions
 * - **Stance Restriction**: Only Defense or Attack stances allowed
 * - **Recovery**: Simple Action to stand up
 *
 * Note: The -10 Armor TN is against melee attacks. Ranged attacks against prone targets
 * get +10 TN (harder to hit), but that's applied by the attacker, not stored here.
 *
 * Effect Tracking:
 * Stores penalties and restrictions in sys._conditionEffects.
 *
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys._conditionEffects - Effect tracking object for UI display and rolls
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @private
 */
function applyProneCondition(sys) {
  // Armor TN penalty: -10 vs melee attacks
  // Applied via armorTnModifier to work correctly with condition overrides
  sys._conditionEffects.armorTnModifier += -10;
  sys.armorTn.pronePenalty = -10;

  // Attack penalty: -2k0 for medium/small weapons
  sys._conditionEffects.rollPenalties.melee.roll += -2;
  sys._conditionEffects.rollPenalties.ranged.roll += -2;

  sys._conditionEffects.restrictions.push("l5r4.conditions.prone.restrictions");
}

/**
 * Applies Stunned condition mechanical effects.
 *
 * L5R4 Stunned Condition:
 * "A character who is stunned may take no actions. Such a character has an Armor TN equal to
 * 5 plus any bonuses from armor worn. The character may recover from this Status Effect by
 * making a successful Earth Ring Roll at TN 20 during the Reaction Stage. If he fails this
 * roll, the status ends at the end of the next Combat Round."
 *
 * Mechanical Effects:
 * - **Action Restriction**: Cannot take any actions
 * - **Armor TN Override**: 5 + armor bonus only (no Reflexes, no other modifiers)
 * - **Recovery**: Earth Ring roll TN 20 during Reaction Stage, or automatic after 1 round
 *
 * Effect Tracking:
 * Stores Armor TN override and restriction in sys._conditionEffects.
 *
 * @param {Object} sys - The actor.system data object being modified
 * @param {Object} sys._conditionEffects - Effect tracking object for UI display
 * @param {Object} sys.armorTn - Armor TN calculation object
 * @private
 */
function applyStunnedCondition(sys) {
  // Armor TN override: 5 + armor bonus
  // When multiple conditions set overrides, use the lowest value (most vulnerable)
  const armorBonus = toInt(sys.armorTn?.bonus || 0);
  const stunnedTN = 5 + armorBonus;

  if (
    sys._conditionEffects.armorTnOverride === null ||
    stunnedTN < sys._conditionEffects.armorTnOverride
  ) {
    sys._conditionEffects.armorTnOverride = stunnedTN;
  }

  sys._conditionEffects.restrictions.push("l5r4.conditions.stunned.restrictions");
}
