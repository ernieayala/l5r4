/**
 * NPC Actor Preparation Module
 *
 * Handles derived data calculation for Non-Player Character actors. Extracted from main
 * L5R4Actor class to maintain file size limits (<300 lines per file).
 *
 * Calculates combat stats for NPCs using simplified approach compared to PCs. Supports
 * both manual wound configuration (bosses, special enemies) and formula-based calculations
 * (standard enemies).
 *
 * @module documents/actor/preparation/npc-preparation
 */

// Config
import { SYS_ID } from "../../../config/constants.js";

// Utils
import { toInt } from "../../../utils/type-coercion.js";

// Services
import { applyStanceAutomation } from "../../../services/stance/core/automation.js";

// Local
import { WOUND_LEVEL_ORDER } from "../constants/wound-constants.js";
import { prepareTraitsAndRings } from "../calculations/shared-traits-rings.js";
import {
  prepareNpcManualWounds,
  prepareNpcFormulaWounds,
  prepareVisibleWoundLevels
} from "../calculations/wound-system.js";
import { applyConditionEffects } from "../calculations/condition-effects.js";
import { enrichActorItems } from "../calculations/item-enrichment.js";

/**
 * Prepare derived data for Non-Player Character actors.
 *
 * Calculates combat statistics for NPC actors using a simplified approach compared
 * to PCs. Supports both manual wound configuration (for special enemies, bosses) and
 * formula-based calculations (for standard enemies).
 *
 * **Calculated Values:**
 * - Traits and Rings (via prepareTraitsAndRings)
 * - Initiative: Uses explicit roll/keep values or falls back to Reflexes
 * - Armor TN: Direct value from npc.armor.armorTn field (no equipment calculation)
 * - Armor Reduction: Direct value from npc.armor.reduction field
 * - Wound Levels: Manual thresholds OR formula-based (per wound mode)
 * - Stance Effects: Bonuses/penalties from current combat stance
 * - Visible Wound Levels: For UI display in wound configuration sheet
 *
 * **NPC Initiative:**
 * NPCs use explicit initiative.roll and initiative.keep fields on the character sheet.
 * If these are 0 or missing, the system falls back to using Reflexes for both roll
 * and keep (simpler enemies that don't need complex initiative).
 *
 * **NPC Armor:**
 * Unlike PCs (who calculate armor TN from equipment), NPCs have a single armor.armorTn
 * field that GMs set directly. This simplifies NPC creation - no need to add armor items.
 *
 * **Wound Modes:**
 * - **Manual**: GM explicitly sets wound thresholds and penalties for each rank
 *   (good for bosses, special enemies with unusual HP pools)
 * - **Formula**: Auto-calculate from Earth Ring using multiplier (good for standard enemies)
 * The mode is controlled by sys.woundMode field, defaulting to global setting.
 *
 * **Side Effects:**
 * Mutates the `sys` parameter, populating:
 * - sys.initiative, sys.armorTn, sys.woundLevels, sys.wounds, sys.visibleWoundLevels
 *
 * @param {L5R4Actor} actor - The NPC actor being prepared
 * @param {Object} sys - Actor system data (actor.system) to mutate
 * @param {Function} finalizeWoundPenaltiesFn - Function to finalize wound penalties
 * @returns {void}
 */
export function prepareNpcData(actor, sys, finalizeWoundPenaltiesFn) {
  prepareTraitsAndRings(sys);

  sys.initiative = sys.initiative || {};
  const ref = toInt(sys.traits?.ref);
  sys.initiative.effRoll = toInt(sys.initiative.roll) > 0 ? toInt(sys.initiative.roll) : ref;
  sys.initiative.effKeep = toInt(sys.initiative.keep) > 0 ? toInt(sys.initiative.keep) : ref;
  sys.initiative.totalMod = toInt(sys.initiative.totalMod);

  sys.armorTn = sys.armorTn || {};
  sys.armorTn.base = 0;
  sys.armorTn.bonus = 0;
  sys.armorTn.reduction = toInt(sys.armor?.reduction ?? 0);
  sys.armorTn.current = toInt(sys.armor?.armorTn ?? 0);

  sys.woundLevels = sys.woundLevels || {};
  sys.manualWoundLevels = sys.manualWoundLevels || {};
  const order = WOUND_LEVEL_ORDER;

  // Determine NPC wound calculation mode
  // Read global default from settings, fall back to "manual" if setting unavailable
  let globalDefault = "manual";
  try {
    globalDefault = game.settings.get(SYS_ID, "defaultNpcWoundMode") || "manual";
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to read defaultNpcWoundMode setting, using manual mode", {
      err,
      actorId: actor.id,
      actorName: actor.name
    });
  }

  // Use actor-specific wound mode if set, otherwise use global default
  const woundMode = sys.woundMode || globalDefault;

  // Calculate wound thresholds based on mode
  if (woundMode === "manual") {
    // Manual mode: Use GM-configured thresholds from sys.manualWoundLevels
    prepareNpcManualWounds(sys, order);
  } else {
    // Formula mode: Calculate from Earth Ring using multiplier (like PCs)
    prepareNpcFormulaWounds(sys, order);
  }

  finalizeWoundPenaltiesFn(sys, order, woundMode);

  applyStanceAutomation(actor, sys);
  applyConditionEffects(actor, sys);

  // Movement calculation per L5R4 combat rules:
  // Free Action: Water Ring × 5 feet
  // Simple Action: Water Ring × 10 feet
  // Maximum per Round: Water Ring × 20 feet (hard limit)
  // Conditions like Blinded reduce effective Water Ring by 2 for movement (applied after condition effects)
  const baseWater = toInt(sys.rings.water);
  const waterPenalty = sys._conditionEffects?.waterRingPenalty ?? 0;
  const effectiveWater = Math.max(1, baseWater + waterPenalty); // Minimum 1 per L5R4 rules
  sys.movement = sys.movement || {};
  sys.movement.freeAction = effectiveWater * 5;
  sys.movement.simpleAction = effectiveWater * 10;
  sys.movement.maximum = effectiveWater * 20;

  prepareVisibleWoundLevels(sys, order);

  // Enrich all actor items with calculated roll formulas
  // This runs in Documents layer (prepareDerivedData) per architecture rules
  // Sheets will only read these pre-calculated formulas, never recalculate them
  enrichActorItems(actor);
}
