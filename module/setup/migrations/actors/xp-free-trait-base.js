/**
 * @module setup/migrations/actors/xp-free-trait-base
 * @description Clears free stored Trait ranks that were marked for a rule-based creation bonus.
 */
import { SYS_ID } from "../../../config/constants.js";
import { getCreationFreeBonusSources } from "../../../utils/xp-calculations.js";

/**
 * Clears `flags.l5r4-enhanced.xpFreeTraitBase.<trait>` where the Trait's creation bonus is a TraitAdjust rule
 * (a 3.2.1 Active Effect bonus becomes one in module/setup/migrations/items/item-rules.js, which runs first).
 *
 * The flag marks a stored rank as the free Family/School rank. That holds for the legacy `trait`/`bonus` fields,
 * which the player stores as a rank, but a rule bonus adds on top of the stored rank: with the flag set, XP skips
 * the first bought rank and prices the later ones without the bonus. Clearing it prices every stored rank at
 * 4 × the Trait's new rank with the bonus. Setting the value to 0 reads the same as an absent key in the XP code,
 * and running again changes nothing.
 * game-rules/48_character_creation_expanded.md, p.103
 * @param {Actor} actor - An actor; an NPC is left alone
 * @returns {Promise<void>}
 */
export async function migrateEffectFreeTraitBase(actor) {
  if (actor.type !== "pc") {
    return;
  }
  const freeTraitBase = actor.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};
  const updates = {};
  for (const [trait, value] of Object.entries(freeTraitBase)) {
    if (Number(value) > 0 && getCreationFreeBonusSources(actor, trait).rules > 0) {
      updates[`flags.${SYS_ID}.xpFreeTraitBase.${trait}`] = 0;
    }
  }
  if (Object.keys(updates).length > 0) {
    // The XP history's version hash does not cover this flag; 0 makes the XP Manager rebuild the history
    updates[`flags.${SYS_ID}.xpRetroactiveVersion`] = 0;
    await actor.update(updates, { diff: true, render: false });
  }
}
