/**
 * @module services/dice/check/spell-slots
 * @description Spell slots for a Spell Casting Roll: whether the caster and the Ring can cast, the slot the dialog's
 * choice spends (an elemental slot of the spell's Ring or a Void slot; with none left, only with the GM's leave), taking
 * it before the roll, and giving it back when the cast stops before it rolls (Ernie's ruling: the slot is spent before
 * the roll). A shugenja holds one
 * slot per rank of each elemental Ring, plus Void slots that cast in any element. The spend runs in the caster's write
 * queue (module/services/write-queue.js) and checks the count again inside it, so two casts that overlap cannot both
 * spend the last slot.
 * game-rules/66_magic_and_spell_casting.md, p.163
 */

import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { askGmAllow } from "../../gm-allow.js";
import { queueActorWrite } from "../../write-queue.js";

/**
 * The Rings a spell slot belongs to.
 * @type {ReadonlyArray<string>}
 */
const VALID_RINGS = Object.freeze(["water", "air", "fire", "earth", "void"]);

/**
 * Dialog data for the slot picker: the counts, and the default choice (a Void slot when only Void slots are left,
 * else an elemental slot). With none of either left, the dialog says the GM will be asked (#158).
 * @param {Actor} actor
 * @param {string} ringKey
 * @returns {{ringName: string, elementalSlots: number, voidSlots: number, slot: string}}
 */
export function getSlotDialogData(actor, ringKey) {
  const elementalSlots = toInt(actor.system.spellSlots[ringKey]);
  const voidSlots = toInt(actor.system.spellSlots.void);
  return {
    ringName: T(`l5r4.ui.mechanics.rings.${ringKey}`),
    elementalSlots,
    voidSlots,
    slot: elementalSlots <= 0 && voidSlots > 0 ? "void" : "elemental"
  };
}

/**
 * Why a cast cannot start: no caster, or a Ring no spell slot belongs to.
 * @param {Actor|null} actor - The caster
 * @param {string} ringKey - The Ring the spell is cast in
 * @returns {string|null} The localized refusal, or null when the cast may go on
 */
export function getCastingRefusal(actor, ringKey) {
  if (!actor) {
    return T("l5r4.ui.notifications.noActorForVoid");
  }
  if (!VALID_RINGS.includes(String(ringKey ?? "").toLowerCase())) {
    return F("l5r4.ui.notifications.invalidRingForSpell", { ring: ringKey });
  }
  return null;
}

/**
 * The slot a choice spends and whether one is left: its path, the label it puts on the card, and the count left.
 * Anything but "void" picks the spell's own Ring: every cast spends a slot (#158).
 * @param {Actor|null} actor - The caster
 * @param {string} ringKey - The Ring the spell is cast in
 * @param {string} choice - "elemental" or "void" (dialog input)
 * @returns {{valid: boolean, current: number, path: string|null, label: string, message: string|null}} `valid` is
 *   false, with the localized reason, when the cast cannot spend the chosen slot
 */
export function getSlotStatus(actor, ringKey, choice) {
  const refusal = getCastingRefusal(actor, ringKey);
  if (refusal) {
    return { valid: false, current: 0, path: null, label: "", message: refusal };
  }
  const ring = String(ringKey).toLowerCase();
  const path = `system.spellSlots.${choice === "void" ? "void" : ring}`;
  const current = Math.max(0, toInt(foundry.utils.getProperty(actor, path)));
  if (current <= 0) {
    return {
      valid: false,
      current,
      path,
      label: "",
      message: T("l5r4.ui.notifications.noSpellSlots")
    };
  }
  const label =
    choice === "void"
      ? T("l5r4.magic.spells.voidSlotSuffix")
      : F("l5r4.magic.spells.slotSuffix", { element: T(`l5r4.ui.mechanics.rings.${ring}`) });
  return { valid: true, current, path, label, message: null };
}

/**
 * Spend the slot a choice names, before the roll: the choice is checked, then the slot is spent in the caster's
 * write queue, so a cast that overlapped another cannot spend the last slot twice. A cast with no slot to spend goes
 * ahead only with the GM's leave (Ernie's ruling, #158); a GM casting for an NPC needs none.
 * game-rules/66_magic_and_spell_casting.md, p.163
 * @param {Actor} actor - The caster
 * @param {string} ringKey - The Ring the spell is cast in
 * @param {string} choice - "elemental" or "void" (dialog input)
 * @returns {Promise<{path: string|null, label: string}|null>} The slot spent (a null path for a cast the GM allowed
 *   without one) and its label suffix; null when the cast does not go ahead
 */
export async function spendChosenSlot(actor, ringKey, choice) {
  const slot = getSlotStatus(actor, ringKey, choice);
  if (slot.valid && (await spendSlot(actor, slot.path)).success) {
    return { path: slot.path, label: slot.label };
  }
  if (getCastingRefusal(actor, ringKey)) {
    ui.notifications?.warn(slot.message);
    return null;
  }
  return (await canCastWithoutSlot(actor, ringKey)) ? { path: null, label: "" } : null;
}

/**
 * Give back a slot a cast took, when the cast stops before it rolls: writes the stored count plus one under the
 * caster's write queue, so an Active Effect on slots is never written into storage (AUTOMATION.md B6).
 * @param {Actor} actor - The caster
 * @param {string|null} path - The slot's path; null gives back nothing
 * @returns {Promise<void>}
 */
export async function updateReturnedSlot(actor, path) {
  if (!path) {
    return;
  }
  await queueActorWrite(actor, () =>
    actor.update({ [path]: foundry.utils.getProperty(actor._source, path) + 1 })
  );
}

/**
 * Spend the planned slot, in the caster's write queue: the count is checked again first, so a second cast that
 * overlapped the first is refused once the first has spent the last slot. Writes the stored count minus one, so an
 * Active Effect on slots is never written into storage (AUTOMATION.md B6).
 * game-rules/66_magic_and_spell_casting.md, p.163
 * @param {Actor} actor
 * @param {string|null} path - The slot's path; null spends nothing
 * @returns {Promise<{success: boolean, message: string|null}>} Whether a slot was spent; the localized reason when
 *   none was left
 */
export async function spendSlot(actor, path) {
  if (!path) {
    return { success: false, message: null };
  }
  return queueActorWrite(actor, async () => {
    if (toInt(foundry.utils.getProperty(actor, path)) <= 0) {
      return { success: false, message: T("l5r4.ui.notifications.noSpellSlots") };
    }
    await actor.update({ [path]: foundry.utils.getProperty(actor._source, path) - 1 });
    return { success: true, message: null };
  });
}

/**
 * Whether a cast with no slot to spend goes ahead: the book allows a set number of casts a day, so the GM is asked
 * (Ernie's ruling, #158). A GM casting for an NPC is that ruling, so no question is asked.
 * game-rules/66_magic_and_spell_casting.md, p.163
 * @param {Actor} actor - The caster
 * @param {string} ringKey - The Ring the spell is cast in
 * @returns {Promise<boolean>}
 */
function canCastWithoutSlot(actor, ringKey) {
  if (game.user.isGM && actor.type === "npc") {
    return Promise.resolve(true);
  }
  const ring = T(`l5r4.ui.mechanics.rings.${String(ringKey).toLowerCase()}`);
  return askGmAllow({
    title: actor.name,
    reason: F("l5r4.magic.spells.noSlot", { name: actor.name, ring }),
    ask: T("l5r4.magic.spells.noSlotGM")
  });
}
