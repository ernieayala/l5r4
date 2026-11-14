/**
 * @module services/purchase
 * @description What happens before an item dropped on a character sheet is added (roadmap/STAGE-11): its
 * Prerequisite rules are checked, a GM may add it anyway, and each open ChoiceSet asks its question. The answers are
 * stored in the item's rules (module/utils/choices.js). Grants follow on creation
 * (module/documents/item/lifecycle/grants.js).
 */

import { F, T } from "../utils/localization.js";
import { openChoices, unmetPrerequisites, withSelections } from "../utils/purchase.js";

/** Rings a ChoiceSet's "rings" list offers. */
const RINGS = ["air", "earth", "fire", "water", "void"];

/** Traits a ChoiceSet's "traits" list offers. */
const TRAITS = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"];

/**
 * The options of a choice: its own, or a built-in list. The skills list holds every Skill item in the world and in
 * Item compendiums, by uuid, kept to the filter's Skill types.
 * @param {import("../utils/purchase.js").OpenChoice} choice
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
async function choiceOptions(choice) {
  if (choice.list === "traits") {
    return TRAITS.map(key => ({ value: key, label: T(`l5r4.ui.mechanics.traits.${key}`) }));
  }
  if (choice.list === "rings") {
    return RINGS.map(key => ({ value: key, label: T(`l5r4.ui.mechanics.rings.${key}`) }));
  }
  if (choice.list === "skills") {
    const keep = type => choice.filter.length === 0 || choice.filter.includes(type);
    const options = game.items
      .filter(item => item.type === "skill" && keep(item.system.type))
      .map(item => ({ value: item.uuid, label: item.name }));
    for (const pack of game.packs.filter(p => p.documentName === "Item")) {
      const index = await pack.getIndex({ fields: ["type", "system.type"] });
      for (const entry of index) {
        if (entry.type === "skill" && keep(entry.system?.type)) {
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
  const options = await choiceOptions(choice);
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
      label: T("l5r4.ui.label.ok"),
      callback: (_event, button) => button.form.elements.selection.value || null
    },
    rejectClose: false,
    modal: true
  });
}

/**
 * Check an item's prerequisites against the actor and ask its open choices. A player cannot add an item whose
 * prerequisites they do not meet; a GM is asked whether to add it anyway.
 * @param {Actor} actor
 * @param {object} data  The item's source data, about to be created on the actor
 * @returns {Promise<object|null>} The data with its choices made, or null when the item is not to be added
 */
export async function preparePurchase(actor, data) {
  const rules = Array.isArray(data.system?.rules) ? data.system.rules : [];
  const unmet = unmetPrerequisites(rules, actor.rollOptions);
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
  return { ...data, system: { ...data.system, rules: withSelections(rules, selections) } };
}
