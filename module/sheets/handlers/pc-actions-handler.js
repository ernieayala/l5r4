/**
 * @module sheets/handlers/pc-actions-handler
 * @description PC sheet actions for Void Point spending and the Insight Rank's mode, delegating to services: Void
 * for Armor TN gives +10 for one Round and only on the actor's turn in combat, after a DialogV2 confirmation; Void
 * for Initiative sets a flag the initiative roll spends for +10; a GM's Shift-click switches the Insight Rank
 * between computed and typed.
 */
import { DIALOG_TEMPLATES } from "../../config/templates.js";
import { F, R, T } from "../../utils/localization.js";
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
      await this.#deleteArmorVoid(actor);
      return;
    }

    // Activation path: validate prerequisites
    const problem = this.#getArmorVoidProblem(actor);
    if (problem) {
      ui.notifications?.warn(T(problem));
      element.checked = false;
      return;
    }

    // Confirm with dialog
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: T("l5r4.ui.effects.voidArmorTitle") },
      content: await R(DIALOG_TEMPLATES.confirm, {
        question: T("l5r4.ui.effects.voidArmorQuestion")
      }),
      yes: { label: T("l5r4.ui.common.spendVoidPoint") },
      no: { label: T("l5r4.ui.common.cancel") }
    });

    if (!confirmed) {
      element.checked = false;
      return;
    }

    await this.#spendArmorVoid(actor);
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

  /**
   * Toggles Insight Rank calculation mode between automatic and manual.
   *
   * **GM-Only Feature:**
   * Only GMs can toggle this setting. Shift+Click on the "Rank" label switches between:
   * - Automatic: Rank calculated from Insight Points (default)
   * - Manual: the GM types the rank value
   *
   * **What It Does:**
   * 1. Checks for GM permission (non-GMs ignored)
   * 2. Checks for Shift key (safety mechanism)
   * 3. Toggles actor.system.insight.autoCalculate flag
   * 4. Re-renders sheet to show input field or calculated value
   *
   * **Use Cases:**
   * - Special NPCs with non-standard rank progression
   * - Testing specific rank values
   * - Temporary rank adjustments for story purposes.
   *
   * @param {object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event on rank label
   * @param {HTMLElement} _element - Rank label element (unused)
   * @returns {Promise<void>}
   */
  static async updateRankMode(context, event, _element) {
    event?.preventDefault?.();

    // Only GMs can toggle rank mode
    if (!game.user.isGM) {
      return;
    }

    // Require Shift key to prevent accidental triggers
    if (!event?.shiftKey) {
      return;
    }

    // Toggle autoCalculate flag (default true if undefined)
    const current = context.actor.system.insight?.autoCalculate ?? true;
    await context.actor.update({
      "system.insight.autoCalculate": !current
    });

    // Notify user of mode change
    const key = !current
      ? "l5r4.character.ranks.insightAutomatic"
      : "l5r4.character.ranks.insightManual";
    ui.notifications?.info(F(key, { name: context.actor.name }));
  }

  /**
   * End the actor's Void for Armor TN effect early; the Void Point stays spent.
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async #deleteArmorVoid(actor) {
    const effects = effectsOf(actor, "voidArmor").map(e => e.id);
    if (effects.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", effects);
    }
  }

  /**
   * Why the actor cannot spend a Void Point on Armor TN now: no combat has started, it is not the actor's turn, or
   * the actor has no Void Points.
   * game-rules/25_rings_and_traits.md, p.78
   * @param {Actor} actor
   * @returns {string|null} The warning's i18n key, or null when the actor can spend
   */
  static #getArmorVoidProblem(actor) {
    // Check if in combat
    const combat = game.combat;
    if (!combat || !combat.started) {
      return "l5r4.ui.effects.voidArmorNoCombat";
    }

    // Check if it's this actor's turn
    const currentCombatant = combat.combatant;
    if (!currentCombatant || currentCombatant.actorId !== actor.id) {
      return "l5r4.ui.effects.voidArmorNotTurn";
    }

    // Check void points available
    const voidCurrent = actor.system?.rings?.void?.value ?? 0;
    if (voidCurrent <= 0) {
      return "l5r4.ui.mechanics.wounds.noVoidPoints";
    }
    return null;
  }

  /**
   * Spend the Void Point, then +10 Armor TN as an effect ending with the Round.
   * game-rules/25_rings_and_traits.md, p.78
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async #spendArmorVoid(actor) {
    // The write starts from the stored value, so an Active Effect on Void Points is never written into storage (B6).
    warnVoidLimit(actor);
    await actor.update({
      "system.rings.void.value": actor._source.system.rings.void.value - 1,
      ...buildVoidUseUpdate(actor)
    });
    await applyEffect(actor, "voidArmor");

    ui.notifications?.info(F("l5r4.ui.effects.voidArmorSpent", { name: actor.name }));
  }
}
