/**
 * Roll Handler Module
 *
 * Event handler collection for ActorSheetV2 roll actions in the L5R4 system.
 * Bridges UI events from character sheets to the dice service layer, handling
 * skill rolls, trait rolls, attack rolls, and damage rolls for both PCs and NPCs.
 *
 * Architecture:
 * - **Handler Responsibilities**: Parse DOM events, extract roll parameters, dispatch to dice services
 * - **NO Business Logic**: All game mechanics delegated to dice services and utils
 * - **Stateless**: Pure handler methods, no instance state beyond static methods
 * - **Event Delegation**: Designed for Application v2 event delegation pattern
 *
 * L5R4 Roll Types Handled:
 * - **Skill Rolls**: (Skill + Trait)k(Trait) for trained abilities
 * - **Trait Rolls**: XkX for raw ability checks without training
 * - **Attack Rolls**: Weapon attacks with stance bonuses and wound penalties
 * - **Damage Rolls**: Weapon damage with stance bonuses
 * - **NPC Rolls**: Simplified rolls for NPC stat blocks
 *
 * Foundry VTT Integration (v13+):
 * - Uses Application v2 event delegation (element parameter pattern)
 * - Reads data-* attributes from DOM for roll parameters
 * - Integrates with Actor.items collection for skill/weapon lookups
 * - Respects event.shiftKey for optional roll dialog display
 * - Posts results via ChatMessage through dice service layer
 *
 * Related Services:
 * - SkillRoll: Handles PC skill roll execution with emphasis and raises
 * - TraitRoll: Handles PC trait roll execution with void spending
 * - SimpleRoll: General-purpose roll handler for pre-calculated dice pools (PCs and NPCs)
 * - attack-bonuses: Stance bonus extraction (Full Attack +2k1, etc.)
 * - mechanics utils: Trait resolution, weapon skill lookups, wound penalties
 *
 * @module sheets/handlers/roll-handler
 * @requires Foundry VTT v13+ (Application v2 event delegation)
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html|Application v2}
 */

import { SkillRoll } from "../../services/dice/rolls/skill-roll.js";
import { SimpleRoll } from "../../services/dice/rolls/simple-roll.js";
import { TraitRoll } from "../../services/dice/rolls/trait-roll.js";
import {
  getStanceAttackBonuses,
  getStanceDamageBonuses
} from "../../services/stance/rolls/attack-bonuses.js";
import {
  normalizeTraitKey,
  getEffectiveTrait,
  extractRollParams,
  resolveWeaponSkillTrait,
  readWoundPenalty
} from "../../utils/mechanics.js";
import { toInt } from "../../utils/type-coercion.js";
import { T } from "../../utils/localization.js";

/**
 * Static handler collection for L5R4 roll events from character sheets.
 *
 * Provides event handlers for Application v2 sheets that parse DOM events,
 * extract roll parameters from data-* attributes, and dispatch to appropriate
 * dice service functions. All methods are static since no instance state needed.
 *
 * Usage Pattern (in ActorSheetV2._onAction):
 * ```javascript
 * switch (action) {
 *   case "roll-skill":
 *     return RollHandler.skillRoll(context, event, target);
 *   case "roll-trait":
 *     return RollHandler.traitRoll(context, event, target);
 * }
 * ```
 */
export class RollHandler {
  /**
   * Determine if the actor is an NPC based on sheet class name or actor type.
   *
   * Checks two indicators: sheet class name contains "Npc" or actor.type === "npc".
   * Used to route rolls to appropriate service (SkillRoll vs SimpleRoll).
   *
   * @param {Object} context - Sheet context object from _prepareContext()
   * @param {string} [context.sheetClassName] - Sheet class name (may include "Npc")
   * @param {Actor} context.actor - The actor document
   * @returns {boolean} True if actor is an NPC
   * @private
   */
  static _isNpc(context) {
    return context.sheetClassName?.includes("Npc") || context.actor.type === "npc";
  }

  /**
   * Append stance bonus notation to roll description text.
   *
   * If stance bonuses are present (e.g., Full Attack +2k1), appends bonus notation
   * to description string for display in chat messages. Enhances roll transparency
   * by showing where attack/damage bonuses originate.
   *
   * @param {string} description - Base roll description text
   * @param {Object} stanceBonuses - Stance bonuses from getStanceAttackBonuses/getStanceDamageBonuses
   * @param {number} stanceBonuses.roll - Rolled dice bonus
   * @param {number} stanceBonuses.keep - Kept dice bonus
   * @returns {string} Description with stance bonus appended if applicable
   * @private
   */
  static _addStanceBonusText(description, stanceBonuses) {
    if (stanceBonuses.roll > 0 || stanceBonuses.keep > 0) {
      const bonusText = `+${stanceBonuses.roll}k${stanceBonuses.keep}`;
      return description
        ? `${description} (Full Attack: ${bonusText})`
        : `Full Attack: ${bonusText}`;
    }
    return description;
  }

  /**
   * Resolve target element from Application v2 event delegation pattern.
   *
   * Application v2 passes element as a parameter, but falls back to event.currentTarget
   * for compatibility. This ensures handlers work with both delegation patterns.
   *
   * @param {HTMLElement|null} element - Element from delegation (preferred)
   * @param {Event} event - DOM event with currentTarget fallback
   * @returns {HTMLElement} The target element to extract data from
   * @private
   */
  static _getElement(element, event) {
    return element || event.currentTarget;
  }

  /**
   * Handle skill roll event from character sheet.
   *
   * Executes L5R4 skill rolls using formula (Skill Rank + Trait)k(Trait). Extracts
   * skill data from closest .item row, resolves trait key, applies stance bonuses
   * for weapon/bow attacks, and dispatches to SkillRoll service. Supports both
   * PC rolls (with emphasis, raises, void) and NPC simplified rolls.
   *
   * L5R4 Mechanics:
   * - Skill Roll Formula: (Skill + Trait)k(Trait) where rolled = Skill + Trait, kept = Trait
   * - Emphasis: Player selects via dialog if their emphasis applies to this specific situation
   * - Weapon/Bow Attacks: Applies Full Attack stance bonuses (+2k1) if applicable
   * - Wound Penalties: Applied to attack roll TN via SkillRoll service
   *
   * Data Sources:
   * - Skill Item: Extracts from actor.items via data-item-id on closest .item row
   * - Trait: Normalized from item.system.trait, resolved to effective value
   * - Bonuses: item.system.rollBonus, keepBonus, totalBonus plus stance bonuses
   *
   * Event Handling:
   * - event.shiftKey: Toggles roll dialog display (XOR with system setting)
   * - Prevents default to stop form submission or link navigation
   *
   * @param {Object} context - Sheet context from _prepareContext()
   * @param {Actor} context.actor - The actor making the roll
   * @param {Event} event - DOM click event on skill roll trigger
   * @param {HTMLElement} element - Target element from Application v2 delegation
   * @returns {void} Delegates to SkillRoll service which posts to chat
   */
  static skillRoll(context, event, element) {
    event.preventDefault();
    const el = RollHandler._getElement(element, event);
    const row = el?.closest?.(".item");
    const item = row ? context.actor.items.get(row.dataset.itemId) : null;
    if (!item) {
      return;
    }

    const traitKey = normalizeTraitKey(item.system?.trait);
    if (!traitKey) {
      console.warn("[L5R4] Skill is missing system.trait; cannot roll:", item?.name);
      return;
    }
    const actorTrait = getEffectiveTrait(context.actor, traitKey);

    const isNpc = RollHandler._isNpc(context);

    const rollType = item.type === "weapon" || item.type === "bow" ? "attack" : null;

    let rollBonus = toInt(item.system?.rollBonus);
    let keepBonus = toInt(item.system?.keepBonus);
    if (rollType === "attack") {
      const stanceBonuses = getStanceAttackBonuses(context.actor);
      rollBonus += stanceBonuses.roll;
      keepBonus += stanceBonuses.keep;
    }

    SkillRoll({
      actor: context.actor,
      woundPenalty: readWoundPenalty(context.actor),
      actorTrait,
      skillRank: toInt(item.system?.rank),
      skillName: item.name,
      askForOptions: event.shiftKey,
      npc: isNpc,
      skillTrait: traitKey,
      rollType,
      rollBonus,
      keepBonus,
      totalBonus: toInt(item.system?.totalBonus)
    });
  }

  /**
   * Handle generic NPC attack roll from data-* attributes.
   *
   * Executes attack rolls for NPC stat blocks using pre-calculated dice pools
   * stored in data-roll/data-keep attributes. Applies trait bonuses, stance bonuses
   * (Full Attack +2k1), and wound penalties. Used for NPC sheet quick rolls.
   *
   * L5R4 Mechanics:
   * - Base dice from data-roll/data-keep attributes on element
   * - Adds trait bonus if data-trait present (effective trait value)
   * - Full Attack stance: +2k1 to attack, -10 Armor TN (TN reduction in SimpleRoll)
   * - Wound Penalties: Applied to TN via SimpleRoll service
   *
   * Data Extraction:
   * Uses extractRollParams() to read data-roll, data-keep, data-label, data-description,
   * and optional data-trait from target element. Trait bonus resolved via getEffectiveTrait().
   *
   * @param {Object} context - Sheet context from _prepareContext()
   * @param {Actor} context.actor - The NPC actor making the roll
   * @param {Event} event - DOM click event on attack roll trigger
   * @param {HTMLElement} element - Target element from Application v2 delegation
   * @returns {Promise<ChatMessage|undefined>} Chat message from SimpleRoll service
   */
  static attackRoll(context, event, element) {
    event.preventDefault();
    const el = RollHandler._getElement(element, event);
    const params = extractRollParams(el, context.actor);

    const stanceBonuses = getStanceAttackBonuses(context.actor);
    const rollName = `${context.actor.name}: ${params.label}`.trim();
    const description = RollHandler._addStanceBonusText(params.description, stanceBonuses);

    return SimpleRoll({
      woundPenalty: readWoundPenalty(context.actor),
      diceRoll: params.diceRoll + params.traitBonus + stanceBonuses.roll,
      diceKeep: params.diceKeep + params.traitBonus + stanceBonuses.keep,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "attack",
      actor: context.actor
    });
  }

  /**
   * Handle weapon attack roll from weapon/bow item row.
   *
   * Executes weapon attack rolls with full skill/trait resolution. Searches actor's
   * skills for weapon's associatedSkill, calculates (Skill + Trait)k(Trait), applies
   * stance bonuses (Full Attack +2k1), and handles unskilled attacks (no skill = trait-only).
   * Posts chat message with weapon damage button on successful attacks.
   *
   * L5R4 Mechanics:
   * - Skilled Attack: (Skill Rank + Trait)k(Trait) using weapon's associated skill
   * - Unskilled Attack: (Trait)k(Trait) if no skill found, dice never explode
   * - Full Attack Stance: +2k1 attack bonus, -10 Armor TN (in SimpleRoll)
   * - Wound Penalties: Applied to attack TN via SimpleRoll service
   * - Successful Hit: Generates weapon damage button in chat with stance damage bonuses
   *
   * Resolution Process:
   * 1. Extract weapon item from closest .item row via data-item-id/data-document-id/data-id
   * 2. Validate weapon type (must be "weapon" or "bow")
   * 3. Resolve weapon skill and trait via resolveWeaponSkillTrait()
   * 4. Apply stance attack bonuses (Full Attack +2k1)
   * 5. Execute SimpleRoll with rollType="attack" and weaponId for damage integration
   *
   * @param {Object} context - Sheet context from _prepareContext()
   * @param {Actor} context.actor - The actor making the weapon attack
   * @param {Event} event - DOM click event on weapon attack trigger
   * @param {HTMLElement} element - Target element from Application v2 delegation
   * @returns {Promise<ChatMessage|undefined>} Chat message from SimpleRoll service
   */
  static weaponAttackRoll(context, event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const weapon = id ? context.actor.items.get(id) : null;

    if (!weapon || (weapon.type !== "weapon" && weapon.type !== "bow")) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.noValidWeapon"));
      return;
    }

    const weaponSkill = resolveWeaponSkillTrait(context.actor, weapon);

    const stanceBonuses = getStanceAttackBonuses(context.actor);

    const isUntrained = weaponSkill.skillRank === 0;

    const rollName = `${context.actor.name}: ${weapon.name} ${game.i18n.localize(
      "l5r4.ui.mechanics.rolls.attackRoll"
    )}`;
    const description =
      `${weaponSkill.description}` +
      `${
        stanceBonuses.roll > 0 || stanceBonuses.keep > 0
          ? ` (${game.i18n.localize("l5r4.ui.mechanics.stances.fullAttack")}: +${
              stanceBonuses.roll
            }k${stanceBonuses.keep})`
          : ""
      }` +
      `${isUntrained ? ` (${game.i18n.localize("l5r4.ui.mechanics.rolls.unskilled")})` : ""}`;

    // Pass isBow flag to pre-check ranged checkbox in dialog
    const isBow = weapon.type === "bow";

    // Extract skill name and trait for armor penalty calculation
    const weaponSystem = weapon.system || {};
    const associatedSkill = weaponSystem.associatedSkill || null;

    // Find the actual skill item to get its trait (if it exists)
    let skillTrait = weaponSystem.fallbackTrait || "agi";
    if (associatedSkill && context.actor.items) {
      const skillItem = context.actor.items.find(
        i => i.type === "skill" && i.name.toLowerCase() === associatedSkill.toLowerCase()
      );
      if (skillItem && skillItem.system?.trait) {
        skillTrait = skillItem.system.trait;
      }
    }

    return SimpleRoll({
      woundPenalty: readWoundPenalty(context.actor),
      diceRoll: weaponSkill.rollBonus + stanceBonuses.roll,
      diceKeep: weaponSkill.keepBonus + stanceBonuses.keep,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "attack",
      actor: context.actor,
      untrained: isUntrained,
      weaponId: id,
      isBow,
      skillName: associatedSkill,
      skillTrait: skillTrait
    });
  }

  /**
   * Handle damage roll from data-* attributes.
   *
   * Executes damage rolls for weapons using pre-calculated dice pools from data-*
   * attributes. Applies stance damage bonuses (from Full Attack stance if applicable)
   * and trait bonuses (typically Strength for melee, bow Strength for ranged).
   *
   * L5R4 Mechanics:
   * - Base dice from data-roll/data-keep on element
   * - Melee: Usually includes Strength trait bonus (data-trait="str")
   * - Ranged: Bow Strength or weapon-specific attribute
   * - Stance Bonuses: Extracted from active effects (varies by technique/stance)
   * - No Wound Penalties: Damage rolls not affected by attacker's wounds
   *
   * Data Extraction:
   * Uses extractRollParams() to read roll parameters and optional trait bonus.
   * Stance damage bonuses retrieved via getStanceDamageBonuses().
   *
   * @param {Object} context - Sheet context from _prepareContext()
   * @param {Actor} context.actor - The actor making the damage roll
   * @param {Event} event - DOM click event on damage roll trigger
   * @param {HTMLElement} element - Target element from Application v2 delegation
   * @returns {Promise<ChatMessage|undefined>} Chat message from SimpleRoll service
   */
  static damageRoll(context, event, element) {
    event.preventDefault();
    const el = RollHandler._getElement(element, event);
    const params = extractRollParams(el, context.actor);

    const stanceBonuses = getStanceDamageBonuses(context.actor);
    const rollName = `${context.actor.name}: ${params.label}`.trim();
    const description = RollHandler._addStanceBonusText(params.description, stanceBonuses);

    return SimpleRoll({
      diceRoll: params.diceRoll + params.traitBonus + stanceBonuses.roll,
      diceKeep: params.diceKeep + params.traitBonus + stanceBonuses.keep,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "damage",
      actor: context.actor
    });
  }

  /**
   * Handle trait roll for raw ability checks.
   *
   * Executes trait rolls using formula XkX where X = trait rank. Trait rolls represent
   * innate abilities without skill training (resisting effects, lifting, endurance).
   * Routes to SimpleRoll for NPCs or TraitRoll for PCs (which supports void spending,
   * raises, and wound penalties).
   *
   * L5R4 Mechanics:
   * - Trait Roll Formula: XkX where X = trait rank (roll and keep same number)
   * - Usage: Raw ability checks (Stamina for poison resistance, Willpower for mental focus)
   * - PC Rolls: Support void points (+1k1), raises, wound penalties, unskilled flag
   * - NPC Rolls: Simplified XkX without advanced options
   *
   * Trait Resolution:
   * Attempts to extract trait key from multiple sources with fallback chain:
   * 1. Closest .trait block's .trait-rank data-trait attribute
   * 2. element.dataset.traitName
   * 3. Default fallback: "ref" (Reflexes)
   *
   * @param {Object} context - Sheet context from _prepareContext()
   * @param {Actor} context.actor - The actor making the trait roll
   * @param {Event} event - DOM click event on trait roll trigger
   * @param {HTMLElement} element - Target element from Application v2 delegation
   * @returns {Promise<ChatMessage|false|undefined>} Chat message from service, false if cancelled
   */
  static traitRoll(context, event, element) {
    event.preventDefault();
    const block = element.closest(".trait");
    // querySelector used here to find trait-rank element within the trait block context
    // Scoped query prevents selecting unrelated trait elements elsewhere in the sheet
    const traitKey = normalizeTraitKey(
      block?.querySelector(".trait-rank")?.dataset.trait || element.dataset.traitName || "ref"
    );

    const traitValue = getEffectiveTrait(context.actor, traitKey);

    const isNpc = RollHandler._isNpc(context);

    if (isNpc) {
      return SimpleRoll({
        npc: true,
        rollName: element?.dataset?.traitName || traitKey,
        traitName: traitKey,
        traitRank: traitValue
      });
    } else {
      return TraitRoll({
        traitRank: traitValue,
        traitName: traitKey,
        askForOptions: event.shiftKey,
        actor: context.actor
      });
    }
  }

  /**
   * Handle NPC ring roll for magical/supernatural effects.
   *
   * Executes ring rolls using formula XkX where X = ring rank. Ring rolls are uncommon
   * and typically involve magical/supernatural effects (spell resistance, Taint resistance).
   * Used exclusively for NPCs; PCs use trait rolls or spell casting rolls instead.
   *
   * L5R4 Mechanics:
   * - Ring Roll Formula: XkX where X = ring rank (Earth, Air, Fire, Water, Void)
   * - Usage: Resisting spells, supernatural effects, Shadowlands Taint
   * - No Wound Penalties: Ring rolls represent spiritual/magical resilience
   * - No Skill Training: Pure ring value without modifiers
   *
   * Data Sources:
   * - Ring Name: element.dataset.ringName or localized from dataset.systemRing
   * - Ring Rank: element.dataset.ringRank (pre-calculated from NPC stat block)
   * - System Ring: element.dataset.systemRing (ring identifier: "earth", "air", etc.)
   *
   * @param {Object} context - Sheet context from _prepareContext()
   * @param {Actor} context.actor - The NPC actor making the ring roll
   * @param {Event} event - DOM click event on ring roll trigger
   * @param {HTMLElement} element - Target element with data-ring-name/data-ring-rank/data-system-ring
   * @returns {Promise<ChatMessage|undefined>} Chat message from SimpleRoll service
   */
  static npcRingRoll(context, event, element) {
    event?.preventDefault?.();
    const ringName =
      element?.dataset?.ringName ||
      T(`l5r4.ui.mechanics.rings.${element?.dataset?.systemRing || "void"}`);
    const systemRing = String(element?.dataset?.systemRing || "void").toLowerCase();
    const ringRank = toInt(element?.dataset?.ringRank);
    return SimpleRoll({
      npc: true,
      rollName: ringName,
      ringName: systemRing,
      ringRank
    });
  }

  /**
   * Handle generic NPC simple roll from event.currentTarget dataset.
   *
   * Executes custom rolls for NPCs using XkY notation from data-* attributes.
   * Flexible handler for any roll type (attack, damage, skill, initiative, etc.)
   * defined directly on NPC sheets without requiring item lookups.
   *
   * L5R4 Mechanics:
   * - Base dice from data-roll and data-keep on event.currentTarget
   * - Roll type determined by data-rolltype ("attack", "damage", "simple")
   * - Attack rolls: Apply wound penalties to TN
   * - Other rolls: No wound penalties applied
   * - Supports event.shiftKey for optional roll dialog
   *
   * Data Sources (from event.currentTarget.dataset):
   * - roll: Number of dice to roll (required)
   * - keep: Number of dice to keep (required)
   * - rolllabel: Display label for the roll (e.g., "Claw Attack")
   * - trait: Trait name for display purposes (e.g., "Agility")
   * - rolltype: Roll type identifier ("attack", "damage", "simple", etc.)
   *
   * @param {Object} context - Sheet context from _prepareContext()
   * @param {Actor} context.actor - The NPC actor making the roll
   * @param {Event} event - DOM click event with dataset on currentTarget
   * @returns {Promise<ChatMessage|undefined>} Chat message from SimpleRoll service
   */
  static npcSimpleRoll(context, event) {
    event?.preventDefault?.();
    const ds = event.currentTarget?.dataset || {};
    const diceRoll = toInt(ds.roll);
    const diceKeep = toInt(ds.keep);
    const rollTypeLabel = ds.rolllabel || "";
    const trait = ds.trait || "";
    const rollType = ds.rolltype || "simple";
    const rollName = `${context.actor.name}: ${rollTypeLabel} ${trait}`.trim();

    return SimpleRoll({
      woundPenalty: readWoundPenalty(context.actor),
      diceRoll,
      diceKeep,
      rollName,
      toggleOptions: event.shiftKey,
      rollType
    });
  }
}
