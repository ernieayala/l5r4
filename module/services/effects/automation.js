/**
 * @module services/effects/automation
 * @description Effect automation driven by document hooks:
 * - taking the Full Defense Stance asks its owner for the Defense / Reflexes roll (p.84);
 * - Prone follows the Wound Rank: put on at Down or Out, taken off again when the character rises above Down
 *   (B10). It runs on the active GM only, so one client makes each change;
 * - a concentrating caster who takes more Wounds than his Earth Ring in one update is asked for the Willpower
 *   roll (p.166);
 * - the GM's "End encounter" button ends Fear outside combat (p.90; STAGE-09 decision 4).
 */

import { SYS_ID } from "../../config/constants.js";
import { T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { applyEffect, effectsOf } from "./apply.js";
import { promptConcentration, rollFullDefense } from "./prompts.js";

/**
 * Whether the actor is at Down or Out, or past its last Wound Rank.
 * @param {Actor} actor
 * @returns {boolean}
 */
function isDown(actor) {
  const levels = actor.system.woundLevels ?? {};
  return (
    toInt(actor.system.wounds?.value) <= 0 ||
    levels.down?.current === true ||
    levels.out?.current === true
  );
}

/**
 * Put Prone on an actor that is Down and not dead, and take the automatic Prone off one that is not Down.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function syncProne(actor) {
  const automatic = effectsOf(actor, "prone").filter(e => e.getFlag(SYS_ID, "autoApplied"));
  if (isDown(actor)) {
    if (!actor.statuses.has("prone") && !actor.statuses.has("dead")) {
      await applyEffect(actor, "prone", {
        name: `${T("l5r4.ui.common.auto")}: ${T("EFFECT.prone")}`,
        flags: { autoApplied: true }
      });
    }
  } else if (automatic.length) {
    await actor.deleteEmbeddedDocuments(
      "ActiveEffect",
      automatic.map(e => e.id)
    );
  }
}

/**
 * Remember the stored Wounds before an update, to measure what one update inflicts.
 * @param {Actor} actor
 * @param {object} changes
 * @param {object} options
 */
function onPreUpdateActor(actor, changes, options) {
  if (foundry.utils.hasProperty(changes, "system.suffered")) {
    options[`${SYS_ID}SufferedBefore`] = toInt(actor._source.system.suffered);
  }
}

/**
 * After a Wounds change, on the active GM: sync Prone and check Concentration.
 * @param {Actor} actor
 * @param {object} changes
 * @param {object} options
 * @returns {Promise<void>}
 */
async function onUpdateActor(actor, changes, options) {
  if (!game.users.activeGM?.isSelf) {
    return;
  }
  if (!foundry.utils.hasProperty(changes, "system.suffered") && !changes.system?.wounds) {
    return;
  }
  await syncProne(actor);

  const before = options[`${SYS_ID}SufferedBefore`];
  const taken = before === undefined ? 0 : toInt(actor._source.system.suffered) - before;
  if (taken > toInt(actor.system.rings.earth)) {
    for (const effect of effectsOf(actor, "concentration")) {
      await promptConcentration(actor, effect);
    }
  }
}

/**
 * Ask for the Full Defense roll when the user who took the stance is this one.
 * @param {ActiveEffect} effect
 * @param {object} _options
 * @param {string} userId
 */
function onCreateActiveEffect(effect, _options, userId) {
  if (
    userId === game.user.id &&
    effect.parent?.documentName === "Actor" &&
    effect.statuses.has("fullDefenseStance")
  ) {
    rollFullDefense(effect.parent);
  }
}

/**
 * End the encounter outside combat: every effect lasting until the encounter ends (Fear, p.90) ends, after the GM
 * confirms. A combat ending does the same for its combatants (module/documents/combat.js; STAGE-09 decision 4).
 * @returns {Promise<void>}
 */
export async function endEncounter() {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: T("l5r4.ui.effects.endEncounter") },
    content: `<p>${T("l5r4.ui.effects.endEncounterConfirm")}</p>`
  });
  if (confirmed) {
    await foundry.documents.ActiveEffect.registry.refresh("encounterEnd", {});
  }
}

/**
 * Add the GM's "End encounter" button to the token controls.
 * @param {Record<string, object>} controls
 */
function onGetSceneControlButtons(controls) {
  if (!controls.tokens) {
    return;
  }
  controls.tokens.tools[`${SYS_ID}-end-encounter`] = {
    name: `${SYS_ID}-end-encounter`,
    order: Object.keys(controls.tokens.tools).length,
    title: "l5r4.ui.effects.endEncounter",
    icon: "fa-solid fa-flag-checkered",
    visible: game.user.isGM,
    button: true,
    onChange: () => endEncounter()
  };
}

/** Register the hooks, once during system init. */
export function initializeEffectAutomation() {
  Hooks.on("preUpdateActor", onPreUpdateActor);
  Hooks.on("updateActor", onUpdateActor);
  Hooks.on("createActiveEffect", onCreateActiveEffect);
  Hooks.on("getSceneControlButtons", onGetSceneControlButtons);
}
