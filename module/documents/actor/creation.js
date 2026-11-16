/**
 * @module documents/actor/creation
 * @description What L5R4Actor's `_preCreate` does for an actor: the subtype's prototype token, its default image when
 * none is given, and the stored defaults the creation data leaves out (a PC's XP tracking flags, an NPC's wound
 * mode). Changes the actor with `updateSource()`.
 */

import { SYS_ID } from "../../config/constants.js";
import { getIconPath } from "../../utils/icons.js";

/**
 * Set a new actor's defaults before creation, by subtype.
 * @param {L5R4Actor} actor - The actor document being created (mutable during preCreate)
 * @param {object} data - Initial actor data
 */
export function onActorPreCreate(actor, data) {
  if (actor.type === "pc") {
    updatePcCreateSource(actor, data);
  } else {
    updateNpcCreateSource(actor, data);
  }
}

/**
 * A new PC's defaults: a linked, friendly prototype token with vision, the PC image when none is given, and the XP
 * tracking flags the creation data leaves out.
 * @param {L5R4Actor} actor
 * @param {object} data - Initial actor data
 */
function updatePcCreateSource(actor, data) {
  actor.prototypeToken.updateSource({
    bar1: { attribute: "wounds" },
    bar2: { attribute: "suffered" },
    displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
    displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
    disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
    name: actor.name,
    vision: true,
    actorLink: true
  });

  if (!data.img) {
    actor.updateSource({ img: getIconPath("pc.webp") });
  }

  const updates = buildXpFlagDefaults(data.flags?.[SYS_ID] ?? {});
  if (Object.keys(updates).length > 0) {
    actor.updateSource(updates);
  }
}

/**
 * A new NPC's defaults: a hostile prototype token, the NPC image when none is given, and manual wound mode when none
 * is given.
 * @param {L5R4Actor} actor
 * @param {object} data - Initial actor data
 */
function updateNpcCreateSource(actor, data) {
  actor.prototypeToken.updateSource({
    bar1: { attribute: "wounds" },
    bar2: { attribute: "suffered" },
    displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
    displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
    disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
  });

  const updates = {};

  if (!data.img) {
    updates.img = getIconPath("npc.webp");
  }

  if (!data.system?.woundMode) {
    updates["system.woundMode"] = "manual";
  }

  if (Object.keys(updates).length > 0) {
    actor.updateSource(updates);
  }
}

/**
 * The XP tracking flags a new PC's creation data leaves out, at their starting values. These flags persist character
 * creation choices and XP expenditure history.
 * @param {object} providedFlags - The system's flags in the creation data
 * @returns {Record<string, *>} Update data by flag path; empty when every flag is given
 */
function buildXpFlagDefaults(providedFlags) {
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

  return updates;
}
