/**
 * @module services/effects/automation
 * @description Effect automation driven by document hooks:
 * - taking the Full Defense Stance asks its owner for the Defense / Reflexes roll;
 * - Prone follows the Wound Rank: put on at Down or Out, taken off again when the character rises above Down
 *   (B10). It runs on the active GM only, so one client makes each change;
 * - a concentrating caster who takes more Wounds than his Earth Ring in one update is asked for the Willpower
 *   roll;
 * - the GM's "End encounter" button ends Fear outside combat (STAGE-09 decision 4);
 * - unlinked tokens whose actors were built before core's effect registry existed have their timed effects
 *   registered, so they still expire (#45).
 * game-rules/36_stances.md, p.84
 * game-rules/67_universal_spells.md, p.166
 * game-rules/42_fear.md, p.90
 */

import { SYS_ID } from "../../config/constants.js";
import { DIALOG_TEMPLATES } from "../../config/templates.js";
import { isOwnChange } from "../../utils/change-origin.js";
import { R, T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { isAnsweringGmClient } from "../gm-client.js";
import { askConfirm } from "../dialog.js";
import { applyEffect, effectsOf } from "./apply.js";
import { postConcentrationPrompt, postFullDefensePrompt, rollFullDefense } from "./prompts.js";

/**
 * Put Prone on an actor that is Down and not dead, and take the automatic Prone off one that is not Down.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function updateProne(actor) {
  const automatic = effectsOf(actor, "prone").filter(e => e.getFlag(SYS_ID, "autoApplied"));
  if (isDown(actor)) {
    if (!actor.statuses.has("prone") && !actor.statuses.has("dead")) {
      await applyEffect(actor, "prone", {
        name: T("l5r4.ui.effects.autoProne"),
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
 * End the encounter outside combat: every effect lasting until the encounter ends (Fear) ends, after the GM
 * confirms. A combat ending does the same for its combatants (module/documents/combat.js; STAGE-09 decision 4).
 * game-rules/42_fear.md, p.90
 * @returns {Promise<void>}
 */
export async function endEncounter() {
  const confirmed = await askConfirm({
    window: { title: T("l5r4.ui.effects.endEncounter") },
    content: await R(DIALOG_TEMPLATES.confirm, {
      question: T("l5r4.ui.effects.endEncounterConfirm")
    }),
    yes: { label: T("l5r4.ui.effects.endEncounter") },
    no: { label: T("l5r4.ui.common.cancel") }
  });
  if (confirmed) {
    await foundry.documents.ActiveEffect.registry.refresh("encounterEnd", {});
  }
}

/**
 * Register the timed effects of every unlinked token whose actor is already built. Core prepares world documents
 * before it creates its effect registry [src: client/game.mjs:914-922], and a Combatant's preparation builds its
 * token's actor [src: client/documents/combatant.mjs:160-182]. Core registers a token actor's effects when the actor
 * is built only once the registry exists [src: client/documents/token.mjs:318-321], and the registry's own start
 * covers world actors only [src: client/helpers/active-effect-registry.mjs:29-39], so a combatant token's Fear would
 * never end. This does what core does for a new scene's tokens [src: client/documents/scene.mjs:1066-1070]; the
 * registry keeps only effects that can expire, so registering twice changes nothing.
 */
export function registerTokenEffects() {
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      const actor = token.delta?.syntheticActor;
      if (actor) {
        foundry.documents.ActiveEffect.registry.addFromParent(actor);
      }
    }
  }
}

/**
 * Remember the stored Wounds before an update, to measure what one update inflicts, and whether it changes the
 * Wounds or their settings at all: an update that writes them back unchanged, as the world migration's write-back
 * does (module/setup/migrations/schema/persist.js), is no Wounds change (#182).
 * @param {Actor} actor
 * @param {object} changes
 * @param {object} options
 */
export function onPreUpdateActorWounds(actor, changes, options) {
  const stored = actor._source.system;
  const hasSuffered = foundry.utils.hasProperty(changes, "system.suffered");
  if (hasSuffered) {
    options[`${SYS_ID}SufferedBefore`] = toInt(stored.suffered);
  }
  const wounds = changes.system?.wounds;
  options[`${SYS_ID}WoundsChanged`] =
    (hasSuffered && toInt(changes.system.suffered) !== toInt(stored.suffered)) ||
    (wounds !== undefined &&
      !foundry.utils.isEmpty(foundry.utils.diffObject(stored.wounds ?? {}, wounds)));
}

/**
 * After a Wounds change, on the active GM's answering client (#82): sync Prone and check Concentration.
 * @param {Actor} actor
 * @param {object} changes
 * @param {object} options
 * @returns {Promise<void>}
 */
export async function onUpdateActorWounds(actor, changes, options) {
  if (!game.users.activeGM?.isSelf || !isAnsweringGmClient()) {
    return;
  }
  if (!options[`${SYS_ID}WoundsChanged`]) {
    return;
  }
  await updateProne(actor);

  const before = options[`${SYS_ID}SufferedBefore`];
  const taken = before === undefined ? 0 : toInt(actor._source.system.suffered) - before;
  if (taken > toInt(actor.system.rings.earth)) {
    for (const effect of effectsOf(actor, "concentration")) {
      await postConcentrationPrompt(actor, effect);
    }
  }
}

/**
 * Ask for the Full Defense roll on the client that took the stance (module/utils/change-origin.js). A roll dialog
 * closed without rolling leaves the stance with no Armor TN bonus, so the Full Defense card is posted for the roll to
 * be made from chat (#142).
 * game-rules/36_stances.md, p.84
 * @param {ActiveEffect} effect
 * @param {object} options - The creation's options
 * @returns {Promise<void>}
 */
export async function onCreateActiveEffectFullDefense(effect, options) {
  if (
    isOwnChange(options, game.socket.id) &&
    effect.parent?.documentName === "Actor" &&
    effect.statuses.has("fullDefenseStance") &&
    !(await rollFullDefense(effect.parent))
  ) {
    await postFullDefensePrompt(effect.parent);
  }
}

/**
 * Add the GM's "End encounter" button to the token controls.
 * @param {Record<string, object>} controls
 */
export function onGetSceneControlButtonsEncounter(controls) {
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
