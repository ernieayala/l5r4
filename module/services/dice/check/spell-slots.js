/**
 * @module services/dice/check/spell-slots
 * @description Spell slot choice for a Spell Casting Roll: an elemental slot of the spell's Ring, a Void slot, or
 * none, and spending it once the roll is made.
 */

import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";

/**
 * Dialog data for the slot picker: the counts, and the default choice (an elemental slot while any are left,
 * else a Void slot, else none).
 * @param {Actor} actor
 * @param {string} ringKey
 * @returns {{ringName: string, elementalSlots: number, voidSlots: number, slot: string}}
 */
export function slotDialogData(actor, ringKey) {
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
 * The slot a choice spends, checked against what is left.
 * @param {Actor} actor
 * @param {string} ringKey
 * @param {string} choice  "elemental", "void", or "none" (dialog input)
 * @returns {{path: string|null, label: string}|null} null, after a warning, when the chosen pool is empty
 */
export function planSlot(actor, ringKey, choice) {
  if (choice !== "elemental" && choice !== "void") {
    return { path: null, label: "" };
  }
  const key = choice === "void" ? "void" : ringKey;
  if (toInt(actor.system.spellSlots[key]) <= 0) {
    ui.notifications?.warn(
      T("l5r4.ui.notifications.noSpellSlots", {
        ring:
          choice === "void"
            ? T("l5r4.magic.spells.voidSlot")
            : T(`l5r4.ui.mechanics.rings.${ringKey}`)
      })
    );
    return null;
  }
  const label =
    choice === "void"
      ? T("l5r4.magic.spells.voidSlot")
      : `${T("l5r4.magic.spells.useSpellSlot")} ${T(`l5r4.ui.mechanics.rings.${ringKey}`)}`;
  return { path: `system.spellSlots.${key}`, label: ` [${label}]` };
}

/**
 * Spend the planned slot. Writes the stored count minus one, so an Active Effect on slots is never written into
 * storage (AUTOMATION.md B6).
 * @param {Actor} actor
 * @param {string|null} path
 * @returns {Promise<void>}
 */
export async function spendSlot(actor, path) {
  if (path) {
    await actor.update({ [path]: foundry.utils.getProperty(actor._source, path) - 1 });
  }
}
