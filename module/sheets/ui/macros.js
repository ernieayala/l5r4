/**
 * @module sheets/ui/macros
 * @description Hotbar macros (roadmap/STAGE-14). Dropping a skill, weapon, spell, kata, or kiho row, or a Trait or
 * Ring, from a sheet onto the hotbar makes a script macro that rolls it the way the sheet's own button does: the
 * same roll, with its dialog. One macro per item or Trait per user; dropping again reuses it.
 *
 * `rollItem(uuid)` and `rollTrait(actorUuid, key)` are on `game.system.api` for the macros to call.
 */

import { SYS_ID } from "../../config/constants.js";
import { TRAIT_KEYS } from "../../config/reference-data.js";
import { RING_LABELS } from "../../config/localization.js";
import { T } from "../../utils/localization.js";
import { toggleActivation } from "../../services/effects/activation.js";
import { RollHandler } from "../handlers/roll-handler.js";
import { PcRollHandler } from "../handlers/pc-roll-handler.js";

/** Drag data type of a Trait or Ring dragged from a sheet. */
export const TRAIT_DRAG_TYPE = `${SYS_ID}.trait`;

/** Item types a macro rolls. */
const MACRO_ITEM_TYPES = new Set(["skill", "weapon", "bow", "spell", "kata", "kiho"]);

/** Ring keys a macro rolls. */
const RING_KEYS = Object.keys(RING_LABELS);

/**
 * Roll an item an actor owns, as its sheet button does: a skill's roll, a weapon's attack, a spell's cast, or a kata
 * or kiho's activation.
 * @param {string} uuid  The owned item's UUID
 * @returns {Promise<unknown>}
 */
export async function rollItem(uuid) {
  const item = await fromUuid(String(uuid));
  const actor = item?.actor;
  if (!actor || !MACRO_ITEM_TYPES.has(item.type)) {
    ui.notifications?.warn(T("l5r4.ui.macros.missing"));
    return null;
  }
  if (!actor.isOwner) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return null;
  }
  switch (item.type) {
    case "skill":
      return RollHandler.rollSkill(actor, item, true);
    case "spell":
      return PcRollHandler.castSpell(actor, item, true);
    case "kata":
    case "kiho":
      return toggleActivation(actor, item);
    default:
      return RollHandler.rollWeaponAttack(actor, item, true);
  }
}

/**
 * Roll a Trait or Ring of an actor, as its sheet does.
 * @param {string} actorUuid
 * @param {string} key  A Trait key or a Ring key
 * @returns {Promise<unknown>}
 */
export async function rollTrait(actorUuid, key) {
  const actor = await fromUuid(String(actorUuid));
  if (actor?.documentName !== "Actor" || !(TRAIT_KEYS.includes(key) || RING_KEYS.includes(key))) {
    ui.notifications?.warn(T("l5r4.ui.macros.missing"));
    return null;
  }
  if (!actor.isOwner) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return null;
  }
  return TRAIT_KEYS.includes(key)
    ? RollHandler.rollTrait(actor, key, true)
    : RollHandler.rollRing(actor, key, true);
}

/**
 * The macro for a drop this system handles, as name, image, command, and key; null for any other drop.
 * @param {object} data  Drag data: user input
 * @returns {Promise<{key: string, name: string, img: string, command: string}|null>}
 */
async function macroFor(data) {
  if (data?.type === "Item" && typeof data.uuid === "string") {
    const item = await fromUuid(data.uuid);
    if (!item?.actor || !MACRO_ITEM_TYPES.has(item.type)) {
      return null;
    }
    return {
      key: `item:${item.uuid}`,
      name: `${item.actor.name}: ${item.name}`,
      img: item.img,
      command: `await game.system.api.rollItem(${JSON.stringify(item.uuid)});`
    };
  }
  if (data?.type === TRAIT_DRAG_TYPE && typeof data.actorUuid === "string") {
    const actor = await fromUuid(data.actorUuid);
    const key = String(data.key);
    const isTrait = TRAIT_KEYS.includes(key);
    if (actor?.documentName !== "Actor" || !(isTrait || RING_KEYS.includes(key))) {
      return null;
    }
    const label = T(isTrait ? `l5r4.ui.mechanics.traits.${key}` : `l5r4.ui.mechanics.rings.${key}`);
    return {
      key: `trait:${actor.uuid}:${key}`,
      name: `${actor.name}: ${label}`,
      img: actor.img,
      command: `await game.system.api.rollTrait(${JSON.stringify(actor.uuid)}, ${JSON.stringify(key)});`
    };
  }
  return null;
}

/**
 * Whether a drop is one this system makes a macro for, from the drag data alone, so core's handling can be cancelled
 * synchronously (client/applications/ui/hotbar.mjs:496).
 * @param {object} data
 * @returns {boolean}
 */
function handles(data) {
  if (data?.type === TRAIT_DRAG_TYPE) {
    return true;
  }
  if (data?.type !== "Item" || typeof data.uuid !== "string") {
    return false;
  }
  const item = fromUuidSync(data.uuid, { strict: false });
  return Boolean(item?.actor && MACRO_ITEM_TYPES.has(item.type));
}

/**
 * Make or reuse this user's macro for a drop and put it in the slot.
 * @param {object} data
 * @param {number|string} slot
 * @returns {Promise<Macro|null>}
 */
export async function assignMacro(data, slot) {
  const spec = await macroFor(data);
  if (!spec) {
    return null;
  }
  const mine = game.macros.find(
    macro => macro.author?.id === game.user.id && macro.getFlag(SYS_ID, "macro") === spec.key
  );
  const macro =
    mine ??
    (await foundry.documents.Macro.implementation.create({
      name: spec.name,
      type: CONST.MACRO_TYPES.SCRIPT,
      img: spec.img,
      command: spec.command,
      flags: { [SYS_ID]: { macro: spec.key } }
    }));
  await game.user.assignHotbarMacro(macro, slot);
  return macro;
}

/**
 * The `hotbarDrop` hook: take over the drops this system makes macros for and leave the rest to core. Returns
 * false synchronously to cancel core's handling (client/applications/ui/hotbar.mjs:496).
 * @param {Hotbar} _hotbar
 * @param {object} data
 * @param {number|string} slot
 * @returns {boolean|void}
 */
export function onHotbarDrop(_hotbar, data, slot) {
  if (!handles(data)) {
    return undefined;
  }
  assignMacro(data, slot);
  return false;
}

/** Expose the macro API on `game.system.api`, once during init. */
export function registerMacroApi() {
  game.system.api = { ...game.system.api, rollItem, rollTrait };
}
