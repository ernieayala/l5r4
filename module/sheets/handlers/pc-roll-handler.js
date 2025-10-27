/**
 * PC Roll Handler
 *
 * Handles roll-specific actions for PC character sheets including Ring rolls,
 * spell casting, and weapon damage rolls. Delegates to roll services for actual
 * roll construction and execution.
 *
 * **Responsibilities:**
 * - Ring rolls (XkX where X = Ring rank)
 * - Spell casting rolls with automatic affinity/deficiency detection
 * - Weapon damage rolls with stance bonuses
 *
 * **Game Rules Integration:**
 * - Ring Rolls: Raw elemental power checks
 * - Spell Casting: (Ring + School Rank)k(Ring) vs TN
 * - Weapon Damage: (DR + Strength)k(Keep) with exploding dice
 * - Full Attack Stance: +2k1 damage bonus
 *
 * **Foundry API:**
 * - Uses RingRoll, SpellCastRoll, MahoCastRoll, WeaponRoll services
 * - Integrates with wound penalty system
 * - Respects Shift+Click modifier for roll options dialog
 *
 * @module sheets/handlers/pc-roll-handler
 */

// Utils
import { T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { readWoundPenalty } from "../../utils/mechanics.js";

// Services
import { RingRoll } from "../../services/dice/rolls/ring-roll.js";
import { WeaponRoll } from "../../services/dice/rolls/weapon-roll.js";
import { SpellCastRoll } from "../../services/dice/rolls/spell-cast-roll.js";
import { MahoCastRoll } from "../../services/dice/rolls/maho-cast-roll.js";
import { getStanceDamageBonuses } from "../../services/stance/rolls/attack-bonuses.js";

/**
 * Handler class for PC-specific roll actions.
 *
 * All methods follow Application v2 event delegation pattern:
 * - Receive (context, event, element) parameters from sheet dispatcher
 * - Extract data from element.dataset attributes
 * - Delegate to appropriate roll service
 * - Log warnings on failure (non-blocking)
 */
export class PcRollHandler {
  /**
   * Initiates a Ring roll (XkX where X = Ring rank).
   *
   * **Game Rules Context:**
   * Ring rolls represent raw supernatural or elemental power checks:
   * - Spell resistance rolls (e.g., "Roll Earth to resist Shadowlands Taint")
   * - Void-based enlightenment checks
   * - Elemental attunement tests
   *
   * Formula: XkX where both rolled and kept dice equal Ring rank.
   * Includes wound penalties per the Wound Penalty system.
   *
   * **User Interaction:**
   * Shift+Click opens options dialog for raises, bonuses, and TN entry.
   * Normal click uses default ring value without modifications.
   *
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event (shift key triggers options dialog)
   * @param {HTMLElement} element - Element with dataset.ringRank and dataset.systemRing
   * @returns {Promise<void>}
   */
  static async handleRingRoll(context, event, element) {
    event?.preventDefault?.();

    const ringName =
      element.dataset?.ringName ||
      T(`l5r4.ui.mechanics.rings.${element.dataset?.systemRing || "void"}`);
    const systemRing = String(element.dataset?.systemRing || "void").toLowerCase();
    const ringRank = toInt(element.dataset?.ringRank);

    return RingRoll({
      ringRank,
      ringName,
      systemRing,
      askForOptions: event.shiftKey,
      actor: context.actor,
      woundPenalty: readWoundPenalty(context.actor)
    });
  }

  /**
   * Initiates a spell casting roll with simplified dialog.
   *
   * **Game Rules Context:**
   * Spell Casting rolls determine if a shugenja successfully invokes the kami:
   * - Formula: (Ring + School Rank)k(Ring)
   * - TN: 5 + (Mastery Level × 5)
   * - Affinity: +1 effective School Rank (auto-detected)
   * - Deficiency: -1 effective School Rank (auto-detected)
   * - Spell slots consumed automatically (elemental or Void bonus slots)
   *
   * **L5R4 Spell Casting Mechanics:**
   * Shugenja have spell slots equal to their Ring value in each element, plus
   * Void Ring bonus slots usable for any element. Failed casts still consume
   * slots. Interrupted casts (before completion) do not consume slots.
   *
   * **Automatic Detection:**
   * - Affinity/Deficiency: Detected from actor's school and applied automatically
   * - Target Number: Calculated from spell's Mastery Level automatically
   * - Spell Slots: Consumed automatically (elemental preferred, void fallback)
   *
   * **Implementation:**
   * Extracts spell data from .item row, shows simplified dialog (wound penalty,
   * void, modifiers, raises only), then executes spell casting with all automatic
   * detection and slot management handled by SpellCastRoll service. Dialog always
   * appears to give user control over modifiers and raises before casting.
   *
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element with data-item-id for spell lookup
   * @returns {Promise<void>}
   */
  static async handleCastSpell(context, event, element) {
    event?.preventDefault?.();

    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const spell = id ? context.actor.items.get(id) : null;

    if (!spell || spell.type !== "spell") {
      return;
    }

    // Route to maho casting if spell is blood magic
    if (spell.system?.maho) {
      return MahoCastRoll({
        actor: context.actor,
        spell,
        woundPenalty: readWoundPenalty(context.actor),
        showDialog: true
      });
    }

    return SpellCastRoll({
      actor: context.actor,
      spell,
      woundPenalty: readWoundPenalty(context.actor),
      showDialog: true // Always show dialog for user control
    });
  }

  /**
   * Initiates a weapon damage roll.
   *
   * **Game Rules Context:**
   * Weapon damage rolls determine wounds inflicted on successful hits:
   * - Formula: (Weapon DR + Strength)k(Keep) for melee weapons
   * - Dice explode on 10s (roll again and add, per core rules)
   * - Full Attack stance: +2k1 damage bonus (Fire Ring stance)
   *
   * Full Attack Stance Bonus:
   * Characters in Full Attack stance gain +2k1 to damage rolls in addition to
   * the +2k1 attack bonus and -10 Armor TN penalty. This makes Full Attack a
   * high-risk, high-reward offensive posture.
   *
   * **Implementation:**
   * Reads stance bonuses from actor.system via getStanceDamageBonuses service.
   * Appends stance bonus to description for chat display.
   *
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event (shift key triggers damage modifier dialog)
   * @param {HTMLElement} element - Element with data-item-id for weapon lookup
   * @returns {Promise<void>}
   */
  static async handleWeaponRoll(context, event, element) {
    event?.preventDefault?.();

    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const item = id ? context.actor.items.get(id) : null;

    if (!item) {
      return;
    }

    // Use derived damage values (includes Strength) if available, otherwise fall back to base values
    const baseDiceRoll =
      Number(item.system?.derivedDamageRoll ?? item.system?.damageRoll ?? 0) || 0;
    const baseDiceKeep =
      Number(item.system?.derivedDamageKeep ?? item.system?.damageKeep ?? 0) || 0;

    const stanceBonuses = getStanceDamageBonuses(context.actor);
    const diceRoll = baseDiceRoll + stanceBonuses.roll;
    const diceKeep = baseDiceKeep + stanceBonuses.keep;

    let description = "";
    if (stanceBonuses.roll > 0 || stanceBonuses.keep > 0) {
      const bonusText = `+${stanceBonuses.roll}k${stanceBonuses.keep}`;
      const stanceLabel = T("l5r4.ui.mechanics.stances.fullAttack");
      description = `${stanceLabel}: ${bonusText}`;
    }

    return WeaponRoll({
      diceRoll,
      diceKeep,
      weaponName: item.name,
      description,
      askForOptions: event.shiftKey,
      actor: context.actor
    });
  }
}
