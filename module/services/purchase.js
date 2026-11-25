/**
 * @module services/purchase
 * @description Adding an item to a character (roadmap/STAGE-11, STAGE-15). Its Prerequisite rules, and a kiho's
 * Mastery Level, are checked, a GM may add it anyway, and each open ChoiceSet asks its question
 * (module/services/item-choices.js). A character's Clan, Family, or School replaces the one it had. Grants follow on
 * creation (module/documents/item/lifecycle/grants.js). A drop on a sheet and the compendium browser's Add both go
 * through `createPurchasedItem`.
 */

import { SYS_ID } from "../config/constants.js";
import { DIALOG_TEMPLATES } from "../config/templates.js";
import { F, R, T } from "../utils/localization.js";
import { getKihoCap, isKihoMasteryMet } from "../utils/kiho.js";
import { ringRankOf } from "../utils/mechanics.js";
import { getUnmetPrerequisites } from "../utils/purchase.js";
import { askButtons, askConfirm } from "./dialog.js";
import { askGmAllow } from "./gm-allow.js";
import { askItemChoices } from "./item-choices.js";

/**
 * Item types a new one replaces the old of (character creation Steps 1-3); a School asks first (askSchool).
 * game-rules/48_character_creation_expanded.md, p.102
 * @type {ReadonlySet<string>}
 */
const bioTypes = new Set(["clan", "family", "school"]);

/**
 * How each kind of kiho buyer's Mastery Level test reads as a prerequisite.
 * game-rules/87_kiho.md, p.261, 266
 */
const KIHO_MASTERY_KEYS = Object.freeze({
  brotherhood: "l5r4.ui.purchase.kihoMastery",
  monk: "l5r4.ui.purchase.kihoMastery",
  shugenja: "l5r4.ui.purchase.kihoMasteryRing",
  ninja: "l5r4.ui.purchase.kihoMasteryRank"
});

/**
 * Check an item's prerequisites against the actor and ask its open choices. A player cannot add an item whose
 * prerequisites they do not meet; a GM is asked whether to add it anyway.
 * @param {Actor} actor
 * @param {object} data - The item's source data, about to be created on the actor
 * @returns {Promise<object|null>} The data with its choices made, or null when the item is not to be added
 */
export async function preparePurchase(actor, data) {
  const rules = rulesOf(data);
  if (!(await canAddItem(actor, data, rules))) {
    return null;
  }
  return askItemChoices(data, rules);
}

/**
 * Add an item to an actor: its prerequisites first; then, for a School when the character has one, whether it
 * replaces it or is added beside it, asked before the School's choices so closing it wastes none (roadmap/STAGE-18
 * decision 9); then its choices. A character's Clan or Family replaces the old one, and the character's links point
 * at the new one.
 * @param {Actor} actor
 * @param {object} source - The item's source data, as `item.toObject()` gives it
 * @returns {Promise<Item|null>} The new item, or null when it is not added
 */
export async function createPurchasedItem(actor, source) {
  if (!actor.isOwner) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return null;
  }
  const rules = rulesOf(source);
  if (!(await canAddItem(actor, source, rules))) {
    return null;
  }
  const placement = await askPlacement(actor, source);
  const chosen = placement && (await askItemChoices(source, rules));
  if (!chosen) {
    return null;
  }
  const { replaces } = placement;
  const data = placement.second ? buildSecondSchoolData(chosen) : chosen;
  if (replaces) {
    const prior = actor.items.filter(item => item.type === data.type).map(item => item.id);
    if (prior.length) {
      await actor.deleteEmbeddedDocuments("Item", prior);
    }
  }
  const [created] = await actor.createEmbeddedDocuments("Item", [data]);
  if (replaces) {
    await actor.update(buildBioLinks(data.type, created));
  }
  return created;
}

/**
 * An item's rules, from its source data.
 * @param {object} data - The item's source data
 * @returns {object[]}
 */
function rulesOf(data) {
  return Array.isArray(data.system?.rules) ? data.system.rules : [];
}

/**
 * Where a new item goes: a PC's Clan, Family, or School replaces the character's item of its type, except a School
 * the player adds beside the one the character has (askSchool), which is a second School (Multiple Schools).
 * game-rules/64_advantages.md, p.151
 * @param {Actor} actor
 * @param {object} source - The item's source data
 * @returns {Promise<{replaces: boolean, second: boolean}|null>} null when the School question is closed
 */
async function askPlacement(actor, source) {
  const replaces = actor.type === "pc" && bioTypes.has(source.type);
  const schools = actor.items.filter(item => item.type === "school");
  if (!replaces || source.type !== "school" || !schools.length) {
    return { replaces, second: false };
  }
  const answer = await askSchool(actor, source.name, schools);
  return answer ? { replaces: answer === "replace", second: answer === "add" } : null;
}

/**
 * A second School's data, marked so it gives no free Skills (module/documents/item/lifecycle/second-school.js).
 * @param {object} data - The School's source data, choices made
 * @returns {object} A copy with `flags.l5r4-enhanced.secondSchool`
 */
function buildSecondSchoolData(data) {
  return foundry.utils.mergeObject(
    data,
    { flags: { [SYS_ID]: { secondSchool: true } } },
    { inplace: false }
  );
}

/**
 * Whether an item may be added to the actor: its prerequisites, and a kiho's Mastery Level, are met, or a GM adds it
 * anyway when asked. A player whose character does not meet them is told which.
 * @param {Actor} actor
 * @param {object} data - The item's source data
 * @param {object[]} rules - The item's rules
 * @returns {Promise<boolean>}
 */
async function canAddItem(actor, data, rules) {
  const unmet = getUnmetPrerequisites(rules, actor.rollOptions).map(
    p => p.label || JSON.stringify(p.requires)
  );
  if (data.type === "kiho") {
    unmet.push(...getUnmetKihoMastery(actor, data.system));
  }
  if (!unmet.length) {
    return true;
  }
  const list = unmet.join("; ");
  // A player asks the GM, who may allow it anyway (#223); a GM decides here
  if (!game.user.isGM) {
    return askGmAllow({
      title: T("l5r4.ui.purchase.unmetTitle"),
      reason: F("l5r4.ui.purchase.unmet", { name: data.name, list }),
      ask: T("l5r4.ui.purchase.addAnyway")
    });
  }
  const bypass = await askConfirm({
    window: { title: T("l5r4.ui.purchase.unmetTitle") },
    content: await R(DIALOG_TEMPLATES.confirm, {
      question: F("l5r4.ui.purchase.unmet", { name: data.name, list }),
      consequence: T("l5r4.ui.purchase.addAnyway")
    }),
    yes: { label: T("l5r4.ui.purchase.bypass") },
    no: { label: T("l5r4.ui.common.cancel") }
  });
  return Boolean(bypass);
}

/**
 * What a kiho asks of its buyer, as prerequisites (Ernie's ruling, #159): a School that gives kiho; the Mastery Level
 * reached as that buyer reaches it (Ring and School Rank for a monk, the Ring for a shugenja, the School Rank for a
 * ninja); and, outside the Brotherhood, no more kiho than the School Rank allows. Each label names what is unmet.
 * game-rules/87_kiho.md, p.261, 266
 * @param {Actor} actor
 * @param {{ring: string, mastery: number}} kiho - The kiho's system data
 * @returns {string[]}
 */
function getUnmetKihoMastery(actor, kiho) {
  const buyer = actor.system.kihoBuyer;
  if (!buyer) {
    return [T("l5r4.ui.purchase.kihoNoSchool")];
  }
  const unmet = [];
  if (!isKihoMasteryMet(buyer, { mastery: kiho.mastery, ring: ringRankOf(actor, kiho.ring) })) {
    const ring = T(`l5r4.ui.mechanics.rings.${kiho.ring}`);
    unmet.push(F(KIHO_MASTERY_KEYS[buyer.access], { ring, mastery: kiho.mastery }));
  }
  const cap = getKihoCap(buyer);
  if (cap !== null && actor.items.filter(item => item.type === "kiho").length >= cap) {
    unmet.push(F("l5r4.ui.purchase.kihoCap", { cap }));
  }
  return unmet;
}

/**
 * The character fields and flags that point at its Clan, Family, or School item.
 * @param {string} type - clan, family, or school
 * @param {Item} item - The new item
 * @returns {object}
 */
function buildBioLinks(type, item) {
  if (type === "family") {
    return {
      [`flags.${SYS_ID}.familyItemUuid`]: item.uuid,
      [`flags.${SYS_ID}.familyName`]: item.name
    };
  }
  return {
    [`system.${type}`]: item.name,
    [`flags.${SYS_ID}.${type}ItemUuid`]: item.uuid
  };
}

/**
 * Ask whether a School joins the character's Schools or replaces them. A character may hold more than one: an
 * Advanced School and the Multiple Schools Advantage add one.
 * game-rules/84_advanced_schools_and_alternate_paths.md, p.245-247
 * game-rules/64_advantages.md, p.151
 * @param {Actor} actor
 * @param {string} name - The new School's name
 * @param {Item[]} schools - The character's Schools
 * @returns {Promise<"replace"|"add"|null>} null when the dialog is closed
 */
async function askSchool(actor, name, schools) {
  return askButtons({
    window: { title: T("l5r4.ui.purchase.schoolTitle") },
    content: await R(DIALOG_TEMPLATES.confirm, {
      question: F("l5r4.ui.purchase.schoolQuestion", {
        name: actor.name,
        schools: schools.map(school => school.name).join(", "),
        school: name
      })
    }),
    buttons: [
      { action: "add", label: T("l5r4.ui.purchase.schoolAdd"), default: true },
      { action: "replace", label: T("l5r4.ui.purchase.schoolReplace") }
    ]
  });
}
