/**
 * @module sheets/handlers/pc-actions-handler
 * @description PC sheet actions for natural healing and Void Point spending, delegating to services: a night's rest
 * heals (Stamina × 2) + Insight Rank Wounds; Void for Armor TN gives +10 for one Round and only on the actor's turn
 * in combat, after a DialogV2 confirmation; Void for Initiative sets a flag the initiative roll spends for +10.
 */
import { T } from "../../utils/localization.js";
import { applyLongRest } from "../../services/rest.js";
import { applyEffect, effectsOf } from "../../services/effects/apply.js";
import { buildVoidUseUpdate, warnVoidLimit } from "../../services/effects/uses.js";

/**
 * Handler class for PC-specific action operations.
 *
 * All methods follow Application v2 event delegation pattern:
 * - Receive (context, event, element) parameters from sheet dispatcher
 * - Validate state and prerequisites
 * - Delegate to appropriate service or perform actor update
 * - Provide user feedback via notifications
 */
export class PcActionsHandler {
  /**
   * Applies natural healing to the character.
   *
   * **Game Rules Context:**
   * Characters heal (Stamina × 2) + Insight Rank wounds per night of rest.
   * Healing cannot reduce suffered wounds below 0 (no over-healing).
   *
   * **Implementation:**
   * Delegates to healing service which:
   * - Calculates healing amount from actor.system.wounds.healRate
   * - Reduces suffered wounds by healing amount
   * - Posts chat message with healing summary
   * - Handles edge cases (already at full health, invalid heal rate)
   *
   * @param {object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event on healing button
   * @param {HTMLElement} _element - Button element (unused)
   * @returns {Promise<void>}
   */
  static async applyHealing(context, event, _element) {
    event?.preventDefault?.();
    return applyLongRest(context.actor);
  }

  /**
   * Toggles Void Point armor TN boost.
   *
   * **Game Rules Context:**
   * Per core rules:
   * - Spend Void at beginning of round for +10 Armor TN for 1 round
   * - Only works if in combat on the actor's turn
   * - Void Point is spent immediately when activated
   *
   * **Validation:**
   * - Must be in active combat (game.combat exists and started)
   * - Must be actor's turn (current combatant matches actor)
   * - Must have Void Points available (system.rings.void.value > 0)
   * - Requires user confirmation via dialog
   *
   * **Implementation:**
   * On activation the Void Point is spent and the "voidArmor" effect (+10 Armor TN) is created; core's effect
   * registry ends it at the end of the Round (module/config/status-effects.js). Unticking ends the effect early.
   * game-rules/25_rings_and_traits.md, p.78
   *
   * @param {object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Checkbox change event
   * @param {HTMLElement} element - Checkbox element
   * @returns {Promise<void>}
   */
  static async updateArmorVoid(context, event, element) {
    event?.preventDefault?.();
    const actor = context.actor;

    // Deactivation path: end the effect; the Void Point stays spent
    if (!element.checked) {
      const effects = effectsOf(actor, "voidArmor").map(e => e.id);
      if (effects.length) {
        await actor.deleteEmbeddedDocuments("ActiveEffect", effects);
      }
      return;
    }

    // Activation path: validate prerequisites

    // Check if in combat
    const combat = game.combat;
    if (!combat || !combat.started) {
      ui.notifications?.warn("Must be in active combat to use Void for Armor TN");
      element.checked = false;
      return;
    }

    // Check if it's this actor's turn
    const currentCombatant = combat.combatant;
    if (!currentCombatant || currentCombatant.actorId !== actor.id) {
      ui.notifications?.warn("Can only use Void for Armor TN on your turn");
      element.checked = false;
      return;
    }

    // Check void points available
    const voidCurrent = actor.system?.rings?.void?.value ?? 0;
    if (voidCurrent <= 0) {
      ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noVoidPoints"));
      element.checked = false;
      return;
    }

    // Confirm with dialog
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Spend Void Point" },
      content: "<p>Spend a Void Point to increase Armor TN by +10 for 1 round?</p>"
    });

    if (!confirmed) {
      element.checked = false;
      return;
    }

    // Spend the Void Point, then +10 Armor TN as an effect ending with the Round. The write starts from the
    // stored value, so an Active Effect on Void Points is never written into storage (B6).
    // game-rules/25_rings_and_traits.md, p.78
    warnVoidLimit(actor);
    await actor.update({
      "system.rings.void.value": actor._source.system.rings.void.value - 1,
      ...buildVoidUseUpdate(actor)
    });
    await applyEffect(actor, "voidArmor");

    ui.notifications?.info(`${actor.name} spent Void Point - Armor TN +10 for 1 round`);
  }

  /**
   * Toggles Void Point initiative boost flag.
   *
   * **Game Rules Context:**
   * Per core rules:
   * - Flag indicates intent to spend Void for +10 initiative
   * - Void is spent when initiative is rolled (not when flag is set)
   * - Flag clears automatically after roll
   *
   * **Implementation:**
   * This is a simple flag toggle with no validation. The actual Void Point
   * spending and +10 initiative bonus are handled by the initiative roll
   * service when combat starts or initiative is rolled.
   *
   * Unlike armor Void (which requires combat and turn validation), this flag
   * can be set anytime before initiative is rolled.
   *
   * @param {object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Checkbox change event
   * @param {HTMLElement} element - Checkbox element
   * @returns {Promise<void>}
   */
  static async updateInitiativeVoid(context, event, element) {
    event?.preventDefault?.();
    const checked = element.checked;

    // Just toggle the flag - Void spending happens during initiative roll
    await context.actor.update({ "system.initiative.useVoid": checked });
  }
}
