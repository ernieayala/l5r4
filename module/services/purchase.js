/**
 * @module services/purchase
 * @description Adding an item to a character (roadmap/STAGE-11, STAGE-15). Its Prerequisite rules are checked, a GM
 * may add it anyway, and each open ChoiceSet asks its question; the answers are stored in the item's rules
 * (module/utils/choices.js). A character's Clan, Family, or School replaces the one it had. Grants follow on creation
 * (module/documents/item/lifecycle/grants.js). A drop on a sheet and the compendium browser's Add both go through
 * `createPurchasedItem`.
 */

import { SYS_ID } from "../config/constants.js";
import { CHOICE_LIST_VALUES } from "../config/rule-keys.js";
import { F, T } from "../utils/localization.js";
import { openChoices, getUnmetPrerequisites, buildRulesWithSelections } from "../utils/purchase.js";

/**
 * Item types a new one replaces the old of (character creation Steps 1-3); a School asks first (askSchool).
 * game-rules/48_character_creation_expanded.md, p.102
 * @type {ReadonlySet<string>}
 */
const bioTypes = new Set(["clan", "family", "school"]);

/**
 * Check an item's prerequisites against the actor and ask its open choices. A player cannot add an item whose
 * prerequisites they do not meet; a GM is asked whether to add it anyway.
 * @param {Actor} actor
 * @param {object} data - The item's source data, about to be created on the actor
 * @returns {Promise<object|null>} The data with its choices made, or null when the item is not to be added
 */
export async function preparePurchase(actor, data) {
  const rules = Array.isArray(data.system?.rules) ? data.system.rules : [];
  const unmet = getUnmetPrerequisites(rules, actor.rollOptions);
  if (unmet.length) {
    const list = unmet.map(p => p.label || JSON.stringify(p.requires)).join("; ");
    if (!game.user.isGM) {
      ui.notifications?.warn(F("l5r4.ui.purchase.unmet", { name: data.name, list }));
      return null;
    }
    const bypass = await foundry.applications.api.DialogV2.confirm({
      window: { title: T("l5r4.ui.purchase.unmetTitle") },
      content: `<p>${foundry.utils.escapeHTML(
        F("l5r4.ui.purchase.unmet", { name: data.name, list })
      )}</p><p>${T("l5r4.ui.purchase.addAnyway")}</p>`
    });
    if (!bypass) {
      return null;
    }
  }

  const selections = {};
  for (const choice of openChoices(rules)) {
    const selection = await askChoice(data.name, choice);
    if (selection === null) {
      return null;
    }
    selections[choice.index] = selection;
  }
  if (!Object.keys(selections).length) {
    return data;
  }
  return {
    ...data,
    system: { ...data.system, rules: buildRulesWithSelections(rules, selections) }
  };
}

/**
 * Add an item to an actor: its prerequisites and choices first (preparePurchase), then, for a character's Clan or
 * Family, the old one removed and the character's links pointed at the new one. A School asks first, when the
 * character has one, whether it replaces it or is added beside it.
 * @param {Actor} actor
 * @param {object} source - The item's source data, as `item.toObject()` gives it
 * @returns {Promise<Item|null>} The new item, or null when it is not added
 */
export async function createPurchasedItem(actor, source) {
  if (!actor.isOwner) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return null;
  }
  const data = await preparePurchase(actor, source);
  if (!data) {
    return null;
  }
  let replaces = actor.type === "pc" && bioTypes.has(data.type);
  const schools = actor.items.filter(item => item.type === "school");
  if (replaces && data.type === "school" && schools.length) {
    const answer = await askSchool(actor, data.name, schools);
    if (!answer) {
      return null;
    }
    replaces = answer === "replace";
  }
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
 * The options of a choice: its own, or a built-in list. The skills list holds every Skill item in the world and in
 * Item compendiums, by uuid, kept to the filter's Skill types.
 * @param {import("../utils/purchase.js").OpenChoice} choice
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
async function getChoiceOptions(choice) {
  if (choice.list === "traits") {
    return CHOICE_LIST_VALUES.traits.map(key => ({
      value: key,
      label: T(`l5r4.ui.mechanics.traits.${key}`)
    }));
  }
  if (choice.list === "rings") {
    return CHOICE_LIST_VALUES.rings.map(key => ({
      value: key,
      label: T(`l5r4.ui.mechanics.rings.${key}`)
    }));
  }
  if (choice.list === "skills") {
    const isAllowedType = type => choice.filter.length === 0 || choice.filter.includes(type);
    const options = game.items
      .filter(item => item.type === "skill" && isAllowedType(item.system.type))
      .map(item => ({ value: item.uuid, label: item.name }));
    for (const pack of game.packs.filter(p => p.documentName === "Item")) {
      const index = await pack.getIndex({ fields: ["type", "system.type"] });
      for (const entry of index) {
        if (entry.type === "skill" && isAllowedType(entry.system?.type)) {
          options.push({ value: entry.uuid, label: `${entry.name} (${pack.title})` });
        }
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
  }
  return choice.options;
}

/**
 * Ask one choice.
 * @param {string} itemName
 * @param {import("../utils/purchase.js").OpenChoice} choice
 * @returns {Promise<string|null>} The selection, or null when the buyer cancels
 */
async function askChoice(itemName, choice) {
  const options = await getChoiceOptions(choice);
  if (!options.length) {
    ui.notifications?.warn(F("l5r4.ui.purchase.noOptions", { name: itemName }));
    return null;
  }
  const select = foundry.applications.fields.createSelectInput({
    name: "selection",
    options: options.map(({ value, label }) => ({ value, label }))
  });
  const prompt = choice.prompt || T("l5r4.ui.purchase.choose");
  return foundry.applications.api.DialogV2.prompt({
    window: { title: `${itemName}: ${prompt}` },
    content: `<div class="form-group"><label>${foundry.utils.escapeHTML(prompt)}</label>${
      select.outerHTML
    }</div>`,
    ok: {
      label: T("l5r4.ui.common.ok"),
      callback: (_event, button) => button.form.elements.selection.value || null
    },
    rejectClose: false,
    modal: true
  });
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
function askSchool(actor, name, schools) {
  return foundry.applications.api.DialogV2.wait({
    window: { title: T("l5r4.ui.purchase.schoolTitle") },
    content: `<p>${foundry.utils.escapeHTML(
      F("l5r4.ui.purchase.schoolQuestion", {
        name: actor.name,
        schools: schools.map(school => school.name).join(", "),
        school: name
      })
    )}</p>`,
    buttons: [
      { action: "add", label: T("l5r4.ui.purchase.schoolAdd"), default: true },
      { action: "replace", label: T("l5r4.ui.purchase.schoolReplace") }
    ]
  });
}
