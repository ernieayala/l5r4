/**
 * PC Actions Handler
 *
 * Handles character action operations for PC sheets including healing/rest and
 * Void Point spending mechanics. Delegates to services for complex operations.
 *
 * **Responsibilities:**
 * - Natural healing/rest application
 * - Void Point armor TN boost (combat-only, turn-based)
 * - Void Point initiative boost (pre-roll flag)
 *
 * **Game Rules Integration:**
 * - Natural Healing: (Stamina × 2) + Insight Rank per night
 * - Void for Armor TN: +10 TN for 1 round, must be on actor's turn
 * - Void for Initiative: +10 initiative, spent when rolled
 *
 * **Foundry API:**
 * - Uses Actor.update() for state changes
 * - Integrates with game.combat for turn/round tracking
 * - Uses Dialog.confirm() for user confirmation
 * - Posts ui.notifications for user feedback
 *
 * @module sheets/handlers/pc-actions-handler
 */

// Utils
import { T } from "../../utils/localization.js";

// Services
import { applyLongRest } from "../../services/rest.js";

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
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event on healing button
   * @param {HTMLElement} _element - Button element (unused)
   * @returns {Promise<void>}
   */
  static async handleApplyHealing(context, event, _element) {
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
   * - Effect expires at end of round (tracked via system.armorTn.voidRound)
   *
   * **Validation:**
   * - Must be in active combat (game.combat exists and started)
   * - Must be actor's turn (current combatant matches actor)
   * - Must have Void Points available (system.rings.void.value > 0)
   * - Requires user confirmation via dialog
   *
   * **Implementation:**
   * On activation:
   * - Validates all prerequisites (combat, turn, void points)
   * - Shows confirmation dialog
   * - Spends 1 Void Point
   * - Sets system.armorTn.useVoid = true
   * - Records current round in system.armorTn.voidRound
   * - Posts notification
   *
   * On deactivation:
   * - Simply clears flags without spending Void
   *
   * **Effect Duration:**
   * The Void Point armor boost is automatically cleared by combat hooks when
   * the round advances. This handler only manages the activation/deactivation.
   *
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Checkbox change event
   * @param {HTMLElement} element - Checkbox element
   * @returns {Promise<void>}
   */
  static async handleToggleArmorVoid(context, event, element) {
    event?.preventDefault?.();
    const checked = element.checked;

    // Deactivation path: just clear flags
    if (!checked) {
      await context.actor.update({
        "system.armorTn.useVoid": false,
        "system.armorTn.voidRound": null
      });
      return;
    }

    // Activation path: validate prerequisites

    // Check if in combat
    const combat = game.combat;
    if (!combat || !combat.started) {
      ui.notifications?.warn("Must be in active combat to use Void for Armor TN");
      element.checked = false;
      await context.actor.update({
        "system.armorTn.useVoid": false,
        "system.armorTn.voidRound": null
      });
      return;
    }

    // Check if it's this actor's turn
    const currentCombatant = combat.combatant;
    if (!currentCombatant || currentCombatant.actorId !== context.actor.id) {
      ui.notifications?.warn("Can only use Void for Armor TN on your turn");
      element.checked = false;
      await context.actor.update({
        "system.armorTn.useVoid": false,
        "system.armorTn.voidRound": null
      });
      return;
    }

    // Check void points available
    const voidCurrent = context.actor.system?.rings?.void?.value ?? 0;
    if (voidCurrent <= 0) {
      ui.notifications?.warn(T("l5r4.ui.mechanics.wounds.noVoidPoints"));
      element.checked = false;
      await context.actor.update({
        "system.armorTn.useVoid": false,
        "system.armorTn.voidRound": null
      });
      return;
    }

    // Confirm with dialog
    const confirmed = await Dialog.confirm({
      title: "Spend Void Point",
      content: "<p>Spend a Void Point to increase Armor TN by +10 for 1 round?</p>",
      yes: () => true,
      no: () => false
    });

    if (!confirmed) {
      element.checked = false;
      await context.actor.update({
        "system.armorTn.useVoid": false,
        "system.armorTn.voidRound": null
      });
      return;
    }

    // Spend void and activate (useVoid stays true until round end)
    await context.actor.update({
      "system.rings.void.value": voidCurrent - 1,
      "system.armorTn.useVoid": true,
      "system.armorTn.voidRound": combat.round
    });

    ui.notifications?.info(`${context.actor.name} spent Void Point - Armor TN +10 for 1 round`);
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
   * @param {Object} context - Handler context from actor sheet
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Checkbox change event
   * @param {HTMLElement} element - Checkbox element
   * @returns {Promise<void>}
   */
  static async handleToggleInitiativeVoid(context, event, element) {
    event?.preventDefault?.();
    const checked = element.checked;

    // Just toggle the flag - Void spending happens during initiative roll
    await context.actor.update({ "system.initiative.useVoid": checked });
  }
}
