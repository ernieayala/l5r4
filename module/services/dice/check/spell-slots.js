/**
 * @module services/dice/check/spell-slots
 * @description Spell slots for a Spell Casting Roll: whether the caster and the Ring can cast, the slot the dialog's
 * choice spends (an elemental slot of the spell's Ring, a Void slot, or none), and spending it once the roll is made.
 * A shugenja holds one slot per rank of each elemental Ring, plus Void slots that cast in any element. The spend runs
 * under a per-actor lock and checks the count again inside it, so two casts that overlap cannot both spend the last
 * slot.
 * game-rules/66_magic_and_spell_casting.md, p.163
 */

import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";

/**
 * The Rings a spell slot belongs to.
 * @type {ReadonlyArray<string>}
 */
const VALID_RINGS = Object.freeze(["water", "air", "fire", "earth", "void"]);

/**
 * Actors whose slot spend is running: a second spend for the same actor waits for the first.
 * @type {Map<string, boolean>}
 */
const actorLocks = new Map();

/**
 * Dialog data for the slot picker: the counts, and the default choice (an elemental slot while any are left,
 * else a Void slot, else none).
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
    slot: elementalSlots > 0 ? "elemental" : voidSlots > 0 ? "void" : "none"
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
 * @param {Actor|null} actor - The caster
 * @param {string} ringKey - The Ring the spell is cast in
 * @param {string} choice - "elemental", "void", or "none" (dialog input)
 * @returns {{valid: boolean, current: number, path: string|null, label: string, message: string|null}} `valid` is
 *   false, with the localized reason, when the cast cannot spend the chosen slot
 */
export function getSlotStatus(actor, ringKey, choice) {
  const refusal = getCastingRefusal(actor, ringKey);
  if (refusal) {
    return { valid: false, current: 0, path: null, label: "", message: refusal };
  }
  if (choice !== "elemental" && choice !== "void") {
    return { valid: true, current: 0, path: null, label: "", message: null };
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
 * The slot a choice spends, checked against what is left.
 * @param {Actor} actor
 * @param {string} ringKey
 * @param {string} choice - "elemental", "void", or "none" (dialog input)
 * @returns {{path: string|null, label: string}|null} The slot's path and its label suffix ("" for none); null,
 *   after a warning, when the cast cannot spend the chosen slot
 */
export function getSlotToSpend(actor, ringKey, choice) {
  const slot = getSlotStatus(actor, ringKey, choice);
  if (!slot.valid) {
    ui.notifications?.warn(slot.message);
    return null;
  }
  return { path: slot.path, label: slot.label };
}

/**
 * Spend the planned slot, under the caster's lock: the count is checked again first, so a second cast that
 * overlapped the first is refused once the first has spent the last slot. Writes the stored count minus one, so an
 * Active Effect on slots is never written into storage (AUTOMATION.md B6).
 * game-rules/66_magic_and_spell_casting.md, p.163
 * @param {Actor} actor
 * @param {string|null} path - The slot's path; null spends nothing
 * @returns {Promise<{success: boolean, message: string|null}>} Whether a slot was spent; the localized reason, after
 *   a warning, when none was left
 */
export async function spendSlot(actor, path) {
  if (!path) {
    return { success: false, message: null };
  }
  return updateUnderLock(actor.id, async () => {
    if (toInt(foundry.utils.getProperty(actor, path)) <= 0) {
      const message = T("l5r4.ui.notifications.noSpellSlots");
      ui.notifications?.warn(message);
      return { success: false, message };
    }
    await actor.update({ [path]: foundry.utils.getProperty(actor._source, path) - 1 });
    return { success: true, message: null };
  });
}

/**
 * Run a function with an exclusive lock on the actor: a call for an actor already locked waits until the lock is
 * released, so the spends of overlapping casts run one after the other.
 * @param {string} actorId - The actor's id
 * @param {function(): Promise<*>} fn - The work to run under the lock
 * @returns {Promise<*>} What the function returns
 */
async function updateUnderLock(actorId, fn) {
  while (actorLocks.get(actorId)) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  actorLocks.set(actorId, true);
  try {
    return await fn();
  } finally {
    actorLocks.delete(actorId);
  }
}
