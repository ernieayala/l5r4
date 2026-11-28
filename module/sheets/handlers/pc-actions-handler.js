/**
 * @module sheets/handlers/pc-actions-handler
 * @description PC sheet actions for Void Point spending and the Insight Rank's mode, delegating to services: Void
 * for Armor TN gives +10 for one Round, declared at the start of the Round in combat, after a DialogV2 confirmation; Void
 * for Initiative sets a flag the initiative roll spends for +10; a GM's lock button switches the Insight Rank
 * between computed and typed.
 */
import { DIALOG_TEMPLATES } from "../../config/templates.js";
import { F, R, T } from "../../utils/localization.js";
import { applyEffect, effectsOf } from "../../services/effects/apply.js";
import { startedCombatOf } from "../../services/effects/uses.js";
import { spendVoidPoint } from "../../services/dice/resources/void-points.js";
import { askConfirm } from "../../services/dialog.js";
import { askGmAllow } from "../../services/gm-allow.js";

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
   * - Declared while the Round's first Turn is under way, whoever's Turn it is (Ernie's ruling, #197)
   * - Void Point is spent immediately when activated
   *
   * **Validation:**
   * - Must be in a started combat (the actor's own, not only the viewed scene's)
   * - Past the Round's first Turn, the GM is asked (#223)
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
    if (!(await this.#canDeclareArmorVoid(actor))) {
      element.checked = false;
      return;
    }

    // Confirm with dialog
    const confirmed = await askConfirm({
      window: { title: T("l5r4.ui.effects.voidArmorTitle") },
      content: await R(DIALOG_TEMPLATES.confirm, {
        question: T("l5r4.ui.effects.voidArmorQuestion")
      }),
      yes: { label: T("l5r4.ui.common.spendVoidPoint") },
      no: { label: T("l5r4.ui.common.cancel") }
    });

    if (!confirmed || !(await this.#spendArmorVoid(actor))) {
      element.checked = false;
    }
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
   * Only GMs can toggle this setting. The lock button after the Insight Rank switches between:
   * - Automatic: Rank calculated from Insight Points (default)
   * - Manual: the GM types the rank value
   *
   * **What It Does:**
   * 1. Checks for GM permission (non-GMs ignored)
   * 2. Toggles actor.system.insight.autoCalculate flag
   * 3. Re-renders sheet to show input field or calculated value
   *
   * **Use Cases:**
   * - Special NPCs with non-standard rank progression
   * - Testing specific rank values
   * - Temporary rank adjustments for story purposes.
   *
   * @param {object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event on the rank mode button
   * @param {HTMLElement} _element - The rank mode button (unused)
   * @returns {Promise<void>}
   */
  static async updateRankMode(context, event, _element) {
    event?.preventDefault?.();

    // Only GMs can toggle rank mode
    if (!game.user.isGM) {
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
   * Why the actor cannot spend a Void Point on Armor TN at all: no combat has started, or the actor has no Void
   * Points.
   * game-rules/25_rings_and_traits.md, p.78
   * @param {Actor} actor
   * @returns {string|null} The warning's i18n key, or null when the actor can spend
   */
  static #getArmorVoidProblem(actor) {
    // The actor's own started combat, which need not be the viewed scene's (#110)
    if (!startedCombatOf(actor)) {
      return "l5r4.ui.effects.voidArmorNoCombat";
    }
    const voidCurrent = actor.system?.rings?.void?.value ?? 0;
    if (voidCurrent <= 0) {
      return "l5r4.ui.mechanics.wounds.noVoidPoints";
    }
    return null;
  }

  /**
   * Whether the +10 may be declared now: never with no combat or no Void Points (#getArmorVoidProblem warns why). It
   * is declared at the beginning of the combat Round, which Ernie's ruling (#197) reads as while the Round's first
   * Turn is under way, whoever's Turn it is. Later in the Round it is the GM's call (#223): a player asks the GM, and a
   * GM confirms.
   * game-rules/25_rings_and_traits.md, p.78
   * @param {Actor} actor
   * @returns {Promise<boolean>}
   */
  static async #canDeclareArmorVoid(actor) {
    const problem = this.#getArmorVoidProblem(actor);
    if (problem) {
      ui.notifications?.warn(T(problem));
      return false;
    }
    if (startedCombatOf(actor).turn === 0) {
      return true;
    }
    return askGmAllow({
      title: T("l5r4.ui.effects.voidArmorTitle"),
      reason: T("l5r4.ui.effects.voidArmorRoundStart"),
      ask: T("l5r4.ui.requests.allowRequest")
    });
  }

  /**
   * Spend the Void Point, then +10 Armor TN as an effect ending with the Round. The spend goes through the one Void
   * Point spend, so a spend from another client at the same time cannot take the same point (#170).
   * game-rules/25_rings_and_traits.md, p.78
   * @param {Actor} actor
   * @returns {Promise<boolean>} Whether the Void Point was spent
   */
  static async #spendArmorVoid(actor) {
    const spent = await spendVoidPoint(actor);
    if (!spent.success) {
      ui.notifications?.warn(spent.message);
      return false;
    }
    await applyEffect(actor, "voidArmor");

    ui.notifications?.info(F("l5r4.ui.effects.voidArmorSpent", { name: actor.name }));
    return true;
  }
}
