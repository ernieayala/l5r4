/**
 * @module services/dice/check/maneuver-cost
 * @description The attack dialog's maneuvers, kept live as the roller fills it in (#135): what the picked maneuvers
 * cost, what pays for them (Free Raises not spent on the TN first, then declared Raises), and the TN that results.
 * Picking a maneuver, or spending a Free Raise on the TN, raises the declared Raises to cover the cost, up to the
 * roll's cap; the roller may still declare more for Increased Damage, or fewer, since declaring Raises stays their
 * choice. For a player, a maneuver the roll cannot pay for at its cap is disabled with the reason, and while the picks
 * cost more than the Raises pay, Roll is disabled and a warning line says why, so the dialog never closes on a roll
 * that cannot be made. Going past what the Raises pay is the GM's call (#223): a player's "Ask the GM" button asks,
 * and once the GM allows it nothing is locked; a GM is never locked and sees the warning. The `gmAllowed` field tells
 * the pipeline the GM allowed it. The values come from the same terms the roll uses (terms.js), so the dialog and the
 * roll agree.
 * game-rules/28_raises.md, p.79
 * game-rules/38_maneuvers.md, p.86-87
 */

import { F, T } from "../../../utils/localization.js";
import { getManeuverCost } from "../../../utils/damage.js";
import { askGmAllow } from "../../gm-allow.js";
import { buildTnModifiers, getCheckTn } from "./message-data.js";
import { buildChosenTerms, buildPreparedTerms, getManeuverPayment } from "./terms.js";

/** Fields whose change raises the declared Raises to pay for the maneuvers: a pick, or Free Raises moved to the TN. */
const PAYMENT_FIELD = /^(maneuver\.|freeRaisesToTn$)/;

/** The maneuvers that cost Raises, each a checkbox `maneuver.<key>`; the Called Shot is the select. */
const PAID_MANEUVERS = Object.freeze(["feint", "knockdown", "fourLegged", "disarm", "extraAttack"]);

/**
 * Keep an attack dialog's maneuver cost, payment, and TN live. A dialog without the maneuvers' Raises (an Unskilled
 * attack) has no cost line, and nothing is bound.
 * @param {HTMLFormElement} form - The dialog's form
 * @param {object} check - From buildCheck
 * @param {function(HTMLFormElement): object} readChoices - Reads the form as the roll reads it (formDataOf)
 */
export function bindManeuverCost(form, check, readChoices) {
  if (!form.querySelector("[data-maneuver-cost]")) {
    return;
  }
  const update = event => {
    if (PAYMENT_FIELD.test(event?.target?.name ?? "")) {
      updateRaisesToCover(form, getAttackTerms(check, readChoices(form)));
    }
    updateManeuverCost(form, check, getAttackTerms(check, readChoices(form)));
  };
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  bindGmAsk(form, check, update);
  update();
}

/**
 * Unlock the maneuvers for a GM at once, and for a player once the GM allows it through the "Ask the GM" button.
 * @param {HTMLFormElement} form
 * @param {object} check - From buildCheck
 * @param {function(): void} update - Shows the dialog's state again
 */
function bindGmAsk(form, check, update) {
  const allowed = form.elements.namedItem("gmAllowed");
  if (game.user.isGM) {
    allowed.value = "1";
  }
  form.querySelector("[data-maneuver-ask]").addEventListener("click", async () => {
    const yes = await askGmAllow({
      title: check.request.label,
      reason: F("l5r4.ui.combat.maneuversAsk", { name: check.actor.name }),
      ask: T("l5r4.ui.requests.allowRequest")
    });
    if (yes) {
      allowed.value = "1";
      update();
    }
  });
}

/**
 * The attack's terms as the roll would settle them from the dialog's values now, with its maneuvers' payment and TN.
 * An attack has no `prepare`, so the dialog's values are all of its terms.
 * @param {object} check - From buildCheck
 * @param {object} choices - The dialog's values
 * @returns {{terms: object, payment: {maneuvers: object, cost: number, affordable: boolean}, free: number,
 *   tn: number}} `free` is the Free Raises left to pay for maneuvers
 */
function getAttackTerms(check, choices) {
  const chosen = buildChosenTerms(check, choices);
  const terms = { ...chosen, ...buildPreparedTerms(chosen, {}) };
  const payment = getManeuverPayment(check, choices, terms);
  terms.maneuvers = payment.maneuvers;
  const tn = getCheckTn(check, terms, buildTnModifiers(check, terms));
  return { terms, payment, free: terms.totalFreeRaises - terms.freeRaisesToTn, tn };
}

/**
 * Raise the declared Raises to what the maneuvers need beyond the Free Raises, up to the field's cap. Never lowers
 * them: Raises declared past the cost are Increased Damage, the roller's choice.
 * game-rules/38_maneuvers.md, p.87
 * @param {HTMLFormElement} form
 * @param {ReturnType<typeof getAttackTerms>} attack
 */
function updateRaisesToCover(form, { terms, payment, free }) {
  const field = form.elements.namedItem("raises");
  const needed = Math.min(Math.max(0, payment.cost - free), Number(field.max));
  if (terms.raises < needed) {
    field.value = String(needed);
  }
}

/**
 * Show the cost line, the warning when the Raises do not pay, the Roll button's state, each maneuver's, and the
 * player's "Ask the GM" button while something is locked.
 * @param {HTMLFormElement} form
 * @param {object} check - From buildCheck
 * @param {ReturnType<typeof getAttackTerms>} attack
 */
function updateManeuverCost(form, check, attack) {
  const { terms, payment, free, tn } = attack;
  const { cost, affordable } = payment;
  const unlocked = form.elements.namedItem("gmAllowed").value === "1";
  const fromFree = Math.min(cost, free);
  const line = form.querySelector("[data-maneuver-cost]");
  line.hidden = cost === 0;
  line.textContent = F("l5r4.ui.combat.maneuverCost", {
    cost,
    free: fromFree,
    raises: cost - fromFree,
    tn
  });
  const warning = form.querySelector("[data-maneuver-short]");
  warning.hidden = affordable;
  warning.querySelector("[data-maneuver-short-text]").textContent = F(
    "l5r4.ui.combat.notEnoughRaises",
    { cost, raises: terms.raises }
  );
  form.querySelector("[data-action='ok']").disabled = !affordable && !unlocked;
  const locked = updateManeuverChoices(form, check, { ...attack, unlocked });
  form.querySelector("[data-maneuver-ask]").hidden = unlocked || (affordable && !locked);
}

/**
 * Disable each maneuver the roll cannot pay for with the others picked, at its cap and its Free Raises, with the
 * reason; a picked maneuver stays enabled so the roller can drop it. Once unlocked, none is disabled.
 * game-rules/28_raises.md, p.79
 * @param {HTMLFormElement} form
 * @param {object} check - From buildCheck
 * @param {ReturnType<typeof getAttackTerms> & {unlocked: boolean}} attack
 * @returns {boolean} Whether any maneuver is disabled
 */
function updateManeuverChoices(form, check, { payment, free, unlocked }) {
  const max = Number(form.elements.namedItem("raises").max);
  const getCostWith = change =>
    getManeuverCost({ ...payment.maneuvers, ...change }, check.ctx.raises.maneuverCosts);
  const formatReason = cost =>
    !unlocked && cost > max + free ? F("l5r4.ui.combat.maneuverOverCap", { cost, max, free }) : "";
  for (const key of PAID_MANEUVERS) {
    const box = form.elements.namedItem(`maneuver.${key}`);
    updateControlState(
      box,
      box.checked ? "" : formatReason(getCostWith({ [key]: true })),
      "data-tooltip"
    );
  }
  const select = form.elements.namedItem("maneuver.calledShot");
  for (const option of select.options) {
    const picked = option.value === select.value;
    updateControlState(
      option,
      picked ? "" : formatReason(getCostWith({ calledShot: Number(option.value) })),
      "title"
    );
  }
  return [...form.querySelectorAll("[name^='maneuver.'], option")].some(c => c.disabled);
}

/**
 * Disable a control with its reason, or enable it again when there is none.
 * @param {HTMLInputElement|HTMLOptionElement} control
 * @param {string} reason - Why it cannot be picked; empty when it can
 * @param {string} attribute - Where the reason shows: `data-tooltip` on a checkbox, `title` on an option
 */
function updateControlState(control, reason, attribute) {
  control.disabled = Boolean(reason);
  if (reason) {
    control.setAttribute(attribute, reason);
  } else {
    control.removeAttribute(attribute);
  }
}
