/**
 * @module services/item-choices
 * @description The open ChoiceSets of an item being added to a character (roadmap/STAGE-11, STAGE-15): each asks its
 * question in order, never offering what the item grants anyway, and the answers are stored in the item's rules
 * (module/utils/choices.js). Every choice's options are known before the first is asked, so a choice with none stops
 * the item before the buyer answers anything (#141). module/services/purchase.js calls it.
 * game-rules/48_character_creation_expanded.md, p.102
 */

import { CHOICE_LIST_VALUES } from "../config/rule-keys.js";
import { DIALOG_TEMPLATES } from "../config/templates.js";
import { F, R, T } from "../utils/localization.js";
import { toSkillType } from "../utils/selectors.js";
import {
  openChoices,
  getFixedGrantUuids,
  getUngrantedOptions,
  buildRulesWithSelections
} from "../utils/purchase.js";
import { askPrompt } from "./dialog.js";

/**
 * The item's data with each open choice asked and stored in its rules.
 * @param {object} data - The item's source data
 * @param {object[]} rules - The item's rules
 * @returns {Promise<object|null>} The data, or null when the buyer cancels a choice or one has no options
 */
export async function askItemChoices(data, rules) {
  const selections = await askOpenChoices(data.name, rules);
  if (!selections) {
    return null;
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
 * Ask each open choice of an item's rules, in order, once every one is known to have options. No choice offers what
 * the item grants anyway.
 * game-rules/48_character_creation_expanded.md, p.102
 * @param {string} itemName
 * @param {object[]} rules - The item's rules
 * @returns {Promise<Record<number, string>|null>} The selections by rule index, or null when the buyer cancels one
 *   or one has no options
 */
async function askOpenChoices(itemName, rules) {
  const uuids = getFixedGrantUuids(rules);
  const granted = {
    uuids,
    names: uuids.map(uuid => fromUuidSync(uuid, { strict: false })?.name).filter(Boolean)
  };
  const asked = await Promise.all(
    openChoices(rules).map(async choice => ({
      choice,
      options: getUngrantedOptions(await getChoiceOptions(choice), granted)
    }))
  );
  if (asked.some(({ options }) => !options.length)) {
    ui.notifications?.warn(F("l5r4.ui.purchase.noOptions", { name: itemName }));
    return null;
  }
  const selections = {};
  for (const { choice, options } of asked) {
    const selection = await askChoice(itemName, choice, options);
    if (selection === null) {
      return null;
    }
    selections[choice.index] = selection;
  }
  return selections;
}

/**
 * The options of a choice: its own, or a built-in list of Traits, Rings, or Skills.
 * @param {import("../utils/purchase.js").OpenChoice} choice
 * @returns {Promise<Array<{value: string, label: string, name?: string}>>}
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
    return getSkillOptions(choice.filter);
  }
  return choice.options;
}

/**
 * The skills list: every Skill item in the world and in Item compendiums, by uuid, kept to the filter's Skill types,
 * each with its Skill's name.
 * @param {string[]} filter - Skill types to keep; empty keeps all
 * @returns {Promise<Array<{value: string, label: string, name: string}>>}
 */
async function getSkillOptions(filter) {
  // The filter holds types as toSkillType gives them; a Skill's stored type is compared the same way (#173)
  const isAllowedType = type => filter.length === 0 || filter.includes(toSkillType(type));
  const options = game.items
    .filter(item => item.type === "skill" && isAllowedType(item.system.type))
    .map(item => ({ value: item.uuid, label: item.name, name: item.name }));
  for (const pack of game.packs.filter(p => p.documentName === "Item")) {
    const index = await pack.getIndex({ fields: ["type", "system.type"] });
    for (const entry of index) {
      if (entry.type === "skill" && isAllowedType(entry.system?.type)) {
        const label = `${entry.name} (${pack.title})`;
        options.push({ value: entry.uuid, label, name: entry.name });
      }
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
}

/**
 * Ask one choice.
 * @param {string} itemName
 * @param {import("../utils/purchase.js").OpenChoice} choice
 * @param {Array<{value: string, label: string}>} options - Its options, without those the item grants anyway
 * @returns {Promise<string|null>} The selection, or null when the buyer cancels
 */
async function askChoice(itemName, choice, options) {
  const prompt = choice.prompt || T("l5r4.ui.purchase.choose");
  return askPrompt({
    window: { title: F("l5r4.ui.purchase.choiceTitle", { item: itemName, prompt }) },
    content: await R(DIALOG_TEMPLATES.choice, {
      formId: foundry.utils.randomID(),
      label: prompt,
      name: "selection",
      options: options.map(({ value, label }) => ({ value, label }))
    }),
    ok: {
      label: T("l5r4.ui.purchase.makeChoice"),
      callback: (_event, button) => button.form.elements.selection.value || null
    },
    rejectClose: false,
    modal: true
  });
}
