/**
 * L5R4 Actor Document
 *
 * Core Actor document for Legend of the Five Rings 4th Edition system. Manages character
 * data for both Player Characters (PCs) and Non-Player Characters (NPCs), calculating
 * derived stats, wound thresholds, combat values, and experience point tracking per
 * L5R4 game rules.
 *
 * Key Responsibilities:
 * - **Character Stats**: Calculate initiative, armor TN, wound levels, insight rank
 * - **Combat Values**: Derive attack/defense modifiers, wound penalties, healing rates
 * - **Wound System**: Manage progressive wound penalties and death thresholds
 * - **Experience Points**: Track XP spending, trait costs, skill costs (PC only)
 * - **Token Configuration**: Auto-configure prototype tokens with appropriate bars/vision
 * - **Data Lifecycle**: Prepare derived data during Foundry's data preparation phase
 *
 * L5R4 Game Mechanics Implemented:
 * - **Initiative**: (Insight Rank + Reflexes)kReflexes per combat round ordering
 * - **Armor TN**: Reflexes × 5 + 5 + armor bonus (determines difficulty to hit)
 * - **Wound Levels**: 8 progressive ranks from Healthy to Out, each imposing TN penalties
 * - **Lethality Scaling**: Variable Earth multipliers (×2/×3/×4/×5) for campaign style
 * - **Insight Rank**: (Rings × 10) + Skill Ranks, determines school advancement
 * - **Healing Rate**: (Stamina × 2) + Insight Rank + modifiers
 *
 * PC vs NPC Differences:
 * - **PCs**: Automatic XP tracking, school detection, formula-based wounds from Earth Ring
 * - **NPCs**: Manual or formula wound modes, simpler stat tracking, optional fear ratings
 *
 * Foundry VTT Integration:
 * - Extends Foundry Actor document class (requires v13+)
 * - Uses _preCreate hook for initial token/flag setup
 * - Uses _preUpdate hook for XP expenditure tracking
 * - Uses prepareDerivedData for stat calculations (called automatically by Foundry)
 * - Leverages game.settings for system configuration (armor stacking, wound modes)
 * - Stores XP history in actor.flags[SYS_ID] for audit trail
 *
 * @module documents/actor
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActor.html|Foundry Actor API}
 */

import { SYS_ID } from "../config/constants.js";
import { iconPath } from "../config/icons.js";
import { toInt } from "../utils/type-coercion.js";
import { applyStanceAutomation } from "../services/stance/core/automation.js";

import { WOUND_LEVEL_ORDER } from "./actor/constants/wound-constants.js";
import {
  calculateWoundPenalties,
  initializeWoundState,
  findCurrentWoundLevel,
  prepareNpcManualWounds,
  prepareNpcFormulaWounds,
  determineCurrentWoundLevel,
  prepareVisibleWoundLevels
} from "./actor/calculations/wound-system.js";

import {
  calculateInsightRank,
  preparePcExperience,
  trackXpExpenditure
} from "./actor/calculations/xp-system.js";

import { prepareTraitsAndRings } from "./actor/calculations/shared-traits-rings.js";

import { prepareFear } from "./actor/calculations/fear-system.js";

import { applyConditionEffects } from "./actor/calculations/condition-effects.js";

/**
 * L5R4 Actor Document class.
 *
 * Represents a character or creature in the Legend of the Five Rings 4th Edition game
 * system. Handles all character data calculations including combat stats, wounds,
 * advancement, and integration with Foundry VTT's Actor Document lifecycle.
 *
 * This class is automatically instantiated by Foundry when actors are loaded. Custom
 * actor sheets (ActorSheetV2) interact with instances of this class to display and
 * modify character data.
 *
 * Requires Foundry VTT v13+ for Actor Document v2 lifecycle hooks.
 *
 * @extends {Actor}
 */
export default class L5R4Actor extends Actor {
  /**
   * Exported wound level order constant for external access.
   *
   * Defines the canonical ordering of wound ranks: healthy, nicked, grazed, hurt,
   * injured, crippled, down, out. Used by UI components and calculation modules
   * to iterate wound levels in the correct sequence.
   *
   * @type {string[]}
   * @static
   */
  static WOUND_LEVEL_ORDER = WOUND_LEVEL_ORDER;

  /**
   * Pre-creation hook for Actor Document initialization.
   *
   * Called by Foundry before an actor is created in the world. Sets up initial
   * prototype token configuration (bars, vision, disposition) and initializes
   * required flags for system functionality. PC actors get XP tracking flags,
   * NPC actors get wound mode configuration.
   *
   * **Token Configuration:**
   * - PCs: bar1=wounds, bar2=suffered, vision enabled, always show name, friendly disposition, actor linking
   * - NPCs: bar1=wounds, bar2=suffered, owner-only visibility, hostile disposition, no actor linking
   *
   * **XP Flag Initialization (PC only):**
   * Creates empty arrays/objects for XP tracking:
   * - `xpManual`: Array of manual XP adjustments (GM awards)
   * - `xpSpent`: Array of XP expenditure log entries
   * - `xpBase`: Starting XP (default 40 per L5R4 character creation)
   * - `xpFreeTraitBase`: Tracks consumed free trait bonuses from family/school
   * - `traitDiscounts`: XP cost modifiers for traits (advantages, disadvantages)
   *
   * **NPC Wound Mode:**
   * Reads `defaultNpcWoundMode` setting ("manual" or "formula") and applies it.
   * Manual mode lets GMs set exact wound thresholds; formula mode calculates from
   * Earth Ring. Falls back to "manual" if setting read fails.
   *
   * **Side Effects:**
   * - Mutates `this.prototypeToken` with default token settings
   * - Mutates `this` with default actor image if not provided
   * - Mutates `this` with initialized flags if not provided
   *
   * Requires Foundry v13+ for prototypeToken.updateSource() API.
   *
   * @param {Object} data - Initial actor data being created
   * @param {Object} options - Creation options passed by Foundry
   * @param {User} user - User performing the creation
   * @returns {Promise<void>}
   * @override
   * @async
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
      // Read default NPC wound calculation mode from system settings
      // "manual": GM sets exact wound thresholds (good for special enemies, bosses)
      // "formula": Auto-calculate from Earth Ring (good for standard enemies)
      // Error handling: If settings not registered yet (e.g., during module load), fall back to "manual"
      let defaultWoundMode = "manual"; // Fallback default
      try {
        defaultWoundMode = game.settings.get(SYS_ID, "defaultNpcWoundMode") || "manual";
      } catch (err) {
        console.warn(
          `${SYS_ID}`,
          "Failed to read defaultNpcWoundMode setting during NPC creation, using manual mode",
          {
            err,
            actorId: this.id,
            actorName: this.name
          }
        );
      }

      this.prototypeToken.updateSource({
        bar1: { attribute: "wounds" },
        bar2: { attribute: "suffered" },
        displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
      });

      try {
        const updates = {};

        if (!data.img) {
          updates.img = iconPath("npc.webp");
        }

        if (!data.system?.woundMode) {
          updates["system.woundMode"] = defaultWoundMode;
        }

        if (Object.keys(updates).length > 0) {
          this.updateSource(updates);
        }

        if (CONFIG.debug?.l5r4?.wounds) {
          console.log(`${SYS_ID} | NPC Created with wound mode:`, {
            actorId: this.id,
            actorName: this.name,
            providedWoundMode: data.system?.woundMode,
            defaultWoundMode: defaultWoundMode,
            finalWoundMode: data.system?.woundMode || defaultWoundMode
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
   * Pre-update hook for tracking experience point expenditures.
   *
   * Called by Foundry before an actor update is applied. Monitors trait and Void Ring
   * changes to log XP spending for character advancement tracking. Only active for PC
   * actors; NPCs do not track XP.
   *
   * The trackXpExpenditure function (from xp-system.js) inspects the `changed` delta
   * object for trait/Void updates and appends timestamped log entries to the actor's
   * `flags.l5r4.xpSpent` array. These logs appear in the XP Manager application.
   *
   * **Important:** Skill/advantage/disadvantage XP tracking happens via item create/delete
   * hooks, not here. This only tracks direct trait/Void changes on the actor document.
   *
   * Requires Foundry v13+ for _preUpdate hook signature.
   *
   * @param {Object} changed - Update delta object containing changed properties
   * @param {Object} options - Update options passed by Foundry
   * @param {User} user - User performing the update
   * @returns {Promise<void>}
   * @override
   * @async
   */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    trackXpExpenditure(this, changed, options);
  }

  /**
   * Prepare derived data for the actor.
   *
   * Called automatically by Foundry during the data preparation lifecycle after base
   * data is loaded but before rendering. Calculates all derived stats (initiative,
   * armor TN, wounds, insight, etc.) based on current actor state. Runs every time
   * the actor or its items change.
   *
   * **Execution Flow:**
   * 1. PC actors: Calculate combat stats → Calculate XP breakdown
   * 2. NPC actors: Calculate combat stats → Calculate fear effects
   *
   * **Data Mutation:**
   * This method directly mutates `this.system` (actor.system) to populate derived
   * values. All derived properties are recalculated on every preparation cycle,
   * ensuring consistency with base data.
   *
   * **Performance:**
   * Called frequently (on every actor/item update). Calculation modules are optimized
   * for performance. Avoid expensive operations or external API calls here.
   *
   * Requires Foundry v13+ for prepareDerivedData lifecycle.
   *
   * @returns {void} Mutates this.system in place
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
   * Prepare derived data for Player Character actors.
   *
   * Calculates all combat statistics, wound thresholds, and insight rank for PC actors.
   * Implements full L5R4 character rules including equipment-based modifiers, stance
   * automation, and formula-based wound calculations.
   *
   * **Calculated Values:**
   * - School name (from equipped school item)
   * - Traits and Rings (via prepareTraitsAndRings)
   * - Initiative: (Insight Rank + Reflexes)kReflexes
   * - Armor TN: (Reflexes × 5 + 5) + armor bonus + modifiers
   * - Armor Reduction: Damage reduction from equipped armor
   * - Stance Effects: Bonuses/penalties from current combat stance
   * - Wound Levels: Earth-based thresholds with progressive penalties
   * - Healing Rate: (Stamina × 2) + Insight Rank + modifiers
   * - Insight Points: (Rings × 10) + Skill Ranks
   * - Insight Rank: Character advancement tier (1-8+)
   *
   * **Armor Stacking:**
   * The `allowArmorStacking` system setting controls how multiple equipped armor pieces
   * interact:
   * - Enabled: All armor bonuses and reductions stack additively
   * - Disabled (default): Only highest armor bonus and highest reduction apply
   * This is a house rule option; RAW L5R4 assumes characters wear one armor piece.
   *
   * **Wound Calculation:**
   * Uses formula mode exclusively for PCs:
   * - Healthy: Earth × 5 (buffer for normal activity per core rules)
   * - Other ranks: Earth × multiplier (cumulative)
   * - Multiplier defaults to 2 (standard lethality: very deadly, 1-3 round combats)
   * - Higher multipliers (3/4/5) available for less lethal campaigns
   *
   * **Side Effects:**
   * Mutates the `sys` parameter extensively, populating:
   * - sys.school, sys.initiative, sys.armorTn, sys.woundLevels, sys.wounds, sys.insight
   *
   * @param {Object} sys - Actor system data (actor.system) to mutate
   * @returns {void}
   * @private
   */
  _preparePc(sys) {
    // Extract school name from equipped school item for display on character sheet
    // Error handling: If items collection is malformed, preserve existing school name
    try {
      const schoolItem = (this.items?.contents ?? this.items).find(i => i.type === "school");
      sys.school = schoolItem?.name ?? "";
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to derive school name in _preparePc", { err });
      sys.school = sys.school ?? "";
    }

    prepareTraitsAndRings(sys);

    // Helper: Get trait value safely as integer
    const TR = k => toInt(sys.traits?.[k]);

    // Initiative calculation per L5R4 combat rules:
    // Roll: Insight Rank + Reflexes + modifiers (determines action order)
    // Keep: Reflexes + modifiers (number of dice kept)
    // Higher Initiative Score acts first each round
    sys.initiative = sys.initiative || {};
    sys.initiative.roll = toInt(sys.insight?.rank) + TR("ref") + toInt(sys.initiative.rollMod);
    sys.initiative.keep = TR("ref") + toInt(sys.initiative.keepMod);

    // Armor TN calculation per L5R4 combat rules:
    // Base TN = (Reflexes × 5) + 5 (default difficulty to hit character)
    // Current TN = Base + Manual Modifier + Armor Bonus
    // Attackers must meet or exceed this TN to hit
    sys.armorTn = sys.armorTn || {};
    const ref = TR("ref");
    const baseTN = 5 * ref + 5;
    const modTN = toInt(sys.armorTn.mod);

    // Check armor stacking setting (house rule option)
    // If disabled (default), only highest armor bonus applies (prevents exploit of wearing multiple armor)
    // If enabled, all equipped armor bonuses stack (generous house rule)
    let allowStack = false;
    try {
      allowStack = game.settings.get(SYS_ID, "allowArmorStacking");
    } catch (_) {
      /* setting not registered: default false */
    }

    // Iterate equipped armor items to calculate total TN bonus and damage reduction
    let bonusTN = 0;
    let reduction = 0;

    for (const it of this.items) {
      if (!it || typeof it.type !== "string" || it.type !== "armor") continue;
      const a = it.system ?? {};
      if (!a?.equipped) continue;
      const b = toInt(a.bonus);
      const r = toInt(a.reduction);
      if (allowStack) {
        // Stacking enabled: Sum all armor bonuses/reductions
        bonusTN += b;
        reduction += r;
      } else {
        // Stacking disabled: Use highest single armor bonus/reduction
        bonusTN = Math.max(bonusTN, b);
        reduction = Math.max(reduction, r);
      }
    }

    sys.armorTn.base = baseTN;
    sys.armorTn.bonus = bonusTN;
    sys.armorTn.reduction = reduction;
    sys.armorTn.current = baseTN + modTN + bonusTN;

    applyStanceAutomation(this, sys);
    applyConditionEffects(this, sys);

    // Wound threshold calculation per L5R4 rules with lethality variants:
    // Healthy rank: Earth × 5 + modifier (buffer for normal activity)
    // Other ranks: Earth × multiplier + previous threshold + modifier (cumulative)
    //
    // Lethality variants (Earth multiplier):
    // ×2 (default): Very lethal, 1-3 round combats (RAW L5R4)
    // ×3: Moderate lethality, 3-4 round combats
    // ×4: Lower lethality, 5-6 round combats
    // ×5: High survivability, 7+ round combats
    const earth = sys.rings.earth;
    const mult = toInt(sys.woundsMultiplier);
    const add = toInt(sys.woundsMod);

    sys.woundLevels = sys.woundLevels || {};
    const order = WOUND_LEVEL_ORDER;
    let prev = 0;
    for (const key of order) {
      const lvl =
        sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });
      if (key === "healthy") {
        lvl.value = 5 * earth + add;
      } else {
        lvl.value = earth * mult + prev + add;
      }
      prev = lvl.value;
    }

    this._finalizeWoundPenalties(sys, order);

    // Healing rate per L5R4 rules: (Stamina × 2) + Insight Rank + modifiers
    // This determines the number of wounds healed per day of rest
    sys.wounds.healRate = TR("sta") * 2 + toInt(sys.insight?.rank) + toInt(sys.wounds?.mod);

    // Insight calculation per L5R4 character advancement:
    // Insight Points = (Sum of 5 Ring ranks × 10) + (Sum of all Skill ranks)
    // This value determines Insight Rank (school technique progression)
    const ringsTotal =
      toInt(sys.rings.air) +
      toInt(sys.rings.earth) +
      toInt(sys.rings.fire) +
      toInt(sys.rings.water) +
      toInt(sys.rings?.void?.rank);

    let skillTotal = 0;
    for (const it of this.items) {
      if (!it || typeof it.type !== "string" || it.type !== "skill") {
        continue;
      }
      skillTotal += toInt(it.system?.rank);
    }

    sys.insight = sys.insight || {};
    sys.insight.points = ringsTotal * 10 + skillTotal * 1;

    // Auto-calculate Insight Rank if setting enabled (default: enabled)
    // If disabled, GMs can manually set rank for special circumstances
    if (game.settings.get(SYS_ID, "calculateRank")) {
      sys.insight.rank = this._calculateInsightRank(sys.insight.points);
    }
  }

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
   * @param {Object} sys - Actor system data (actor.system) to mutate
   * @returns {void}
   * @private
   */
  _prepareNpc(sys) {
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
        actorId: this.id,
        actorName: this.name
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

    this._finalizeWoundPenalties(sys, order, woundMode);

    applyStanceAutomation(this, sys);
    applyConditionEffects(this, sys);

    prepareVisibleWoundLevels(sys, order);
  }

  /**
   * Finalize wound penalties and determine current wound level.
   *
   * Integrates wound calculation results from prepareNpcManualWounds or prepareNpcFormulaWounds,
   * applying wound penalties and determining which wound rank the character is currently in
   * based on suffered damage. This is the final step in wound system preparation.
   *
   * **Process:**
   * 1. Initialize wounds.max and wounds.value from wound thresholds
   * 2. Cap suffered damage to Out threshold (can't exceed max damage)
   * 3. Determine current wound level based on capped damage
   * 4. Calculate effective wound penalty (base penalty + global modifier)
   * 5. Store final wound penalty for use in rolls
   *
   * **Wound Penalties:**
   * Each wound rank imposes a TN penalty per L5R4 rules:
   * - Healthy: +0, Nicked: +3, Grazed: +5, Hurt: +10, Injured: +15, Crippled: +20, Down: +40
   * The woundsPenaltyMod allows GMs to adjust severity globally (e.g., +5 for gritty campaigns).
   *
   * **Side Effects:**
   * - Calls initializeWoundState() to set wounds.max and wounds.value
   * - Calls calculateWoundPenalties() to compute penaltyEff for each level
   * - Calls determineCurrentWoundLevel() or findCurrentWoundLevel() to mark active level
   * - Sets sys.woundPenalty and sys.wounds.penalty to effective penalty value
   * - Sets sys.currentWoundLevel for PC actors (legacy support)
   *
   * @param {Object} sys - Actor system data with wound configuration
   * @param {string[]} order - Ordered array of wound level keys (WOUND_LEVEL_ORDER)
   * @param {string} [woundMode] - "manual" or "formula" (NPC only, optional)
   * @returns {Object} The current wound level object
   * @private
   */
  _finalizeWoundPenalties(sys, order, woundMode) {
    initializeWoundState(sys, sys.suffered);

    const outMax = toInt(sys.woundLevels?.out?.value) || 0;
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

    const current = woundMode
      ? determineCurrentWoundLevel(sys, order, sCapped, woundMode)
      : findCurrentWoundLevel(sys, order, sCapped);

    sys.woundsPenaltyMod = toInt(sys.woundsPenaltyMod);
    calculateWoundPenalties(sys);

    if (!woundMode) {
      sys.currentWoundLevel = current;
    }

    const curEffPenalty = Math.max(0, toInt(current.penalty) + toInt(sys.woundsPenaltyMod));
    sys.woundPenalty = curEffPenalty;
    sys.wounds.penalty = curEffPenalty;

    return current;
  }

  /**
   * Calculate Insight Rank from total insight value.
   *
   * Wrapper for the calculateInsightRank utility function. Converts total insight
   * points (Rings × 10 + Skills) into Insight Rank tier per L5R4 advancement rules.
   *
   * **Insight Rank Thresholds:**
   * - Rank 1: 0-149 insight
   * - Rank 2: 150-174 insight
   * - Rank 3: 175-199 insight
   * - Rank 4: 200-224 insight
   * - Rank 5: 225-249 insight
   * - Rank 6+: +25 insight per rank
   *
   * Insight Rank determines when characters learn new school Techniques and is
   * used in some game mechanics (e.g., initiative calculation).
   *
   * @param {number} insight - Total insight points (Rings × 10 + Skill ranks)
   * @returns {number} Insight Rank (1-50+)
   * @private
   */
  _calculateInsightRank(insight) {
    return calculateInsightRank(insight);
  }

  /**
   * Check if this actor has an active Fear effect.
   *
   * Public API method used by sheets and other modules to determine if Fear is
   * affecting the actor. Fear represents supernatural terror from horrifying enemies
   * or traumatic situations, imposing penalties on all rolls.
   *
   * **L5R4 Fear Rules:**
   * - Fear has a Rank from 1-10 representing severity
   * - Characters must resist with Willpower + Honor Rank vs TN (5 + 5 × Fear Rank)
   * - Failure inflicts -Xk0 penalty to all rolls (X = Fear Rank)
   * - Catastrophic failure causes fleeing or cowering
   *
   * Fear is typically applied to NPC actors (monsters, supernatural threats) but
   * can be applied to PCs in special circumstances.
   *
   * @returns {boolean} True if Fear Rank > 0 and active, false otherwise
   */
  hasFear() {
    return this.system?.fear?.active ?? false;
  }
}
