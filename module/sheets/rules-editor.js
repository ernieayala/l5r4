/**
 * @module sheets/rules-editor
 * @description The rules editor the item sheet's Rules tab and the Active Effect sheet's Rules tab share
 * (roadmap/STAGE-11, Sheets): one form per rule, built from its key's model, or the whole list as JSON. Adding,
 * removing, and switching views first take in what the form holds, so nothing typed is lost.
 */

import { SYS_ID } from "../config/constants.js";
import { RULE_KEYS } from "../config/rule-keys.js";
import { answeredRules } from "../utils/choices.js";
import { parseRulesJson } from "../utils/rule-engine.js";
import { describeRule, newRule, ruleFromForm } from "../documents/rule-fields.js";

/** The editor's template, rendered inside each sheet's Rules tab. */
export const RULES_EDITOR_TEMPLATE = `systems/${SYS_ID}/templates/rules/_partials/_editor.hbs`;

/**
 * The editor's template context.
 * @param {object[]} rules - The document's stored `system.rules`
 * @param {"form"|"json"} mode
 * @param {boolean} editable
 * @returns {object}
 */
export function rulesEditorContext(rules, mode, editable) {
  const answered = answeredRules(rules);
  return {
    rulesMode: mode,
    rulesEditable: editable,
    ruleKeys: Object.fromEntries(RULE_KEYS.map(key => [key, key])),
    rules: rules.map((rule, index) => ({ index, ...describeRule(rule, answered[index]) })),
    rulesJson: JSON.stringify(rules, null, 2)
  };
}

/**
 * Turn the editor's submitted fields, or its JSON, into `system.rules` in a sheet's processed form data. Text that
 * does not parse throws, which ApplicationV2 shows as an error and saves nothing
 * [src: client/applications/api/application.mjs:2159-2175].
 * @param {object} data - The sheet's processed (expanded) form data, changed in place
 * @param {object[]} stored - The document's stored rules, which the fields are read over
 * @returns {object} The same data
 */
export function readRulesForm(data, stored) {
  if ("rulesJson" in data) {
    const { rules, error, detail } = parseRulesJson(String(data.rulesJson));
    delete data.rulesJson;
    if (error) {
      throw new Error(game.i18n.localize(`l5r4.ui.rules.${error}`, { error: detail }));
    }
    data.system ??= {};
    data.system.rules = rules;
  } else if (data.rules) {
    const values = data.rules;
    delete data.rules;
    data.system ??= {};
    data.system.rules = stored.map((rule, i) => (values[i] ? ruleFromForm(rule, values[i]) : rule));
  }
  return data;
}

/**
 * The editor's actions, for a sheet's DEFAULT_OPTIONS.actions. Each runs with the sheet as `this`; the sheet keeps
 * its view in `rulesMode`. Frozen: ApplicationV2 deep-clones DEFAULT_OPTIONS before merging them
 * [src: client/applications/api/application.mjs:471-484], and each sheet spreads or clones this object.
 * @type {Record<string, function(this: DocumentSheetV2, PointerEvent, HTMLElement): Promise<void>>}
 */
export const RULES_EDITOR_ACTIONS = Object.freeze({
  /**
   * Add a rule of the key the editor's select names.
   * @param {PointerEvent} _event - The click
   * @param {HTMLElement} target - The clicked button inside the editor
   */
  async "create-rule"(_event, target) {
    const key = target.closest("[data-rules-editor]").querySelector("[data-rule-key]").value;
    if (RULE_KEYS.includes(key)) {
      await changeRules(this, rules => [...rules, newRule(key)]);
    }
  },

  /**
   * Remove the rule whose card holds the button.
   * @param {PointerEvent} _event - The click
   * @param {HTMLElement} target - The clicked button inside the rule's card
   */
  async "delete-rule"(_event, target) {
    const index = Number(target.closest("[data-rule-index]").dataset.ruleIndex);
    await changeRules(this, rules => rules.filter((_rule, i) => i !== index));
  },

  /** Switch between the forms and the JSON, keeping what the form holds. */
  async "toggle-rules-view"() {
    await changeRules(this, rules => rules);
    this.rulesMode = this.rulesMode === "json" ? "form" : "json";
    await this.render();
  }
});

/**
 * Save the sheet's form with its rules changed: what the form holds is taken in first.
 * @param {DocumentSheetV2} sheet
 * @param {function(object[]): object[]} change - From the current rules to the new ones
 * @returns {Promise<void>}
 */
async function changeRules(sheet, change) {
  try {
    const data = sheet._processFormData(
      null,
      sheet.form,
      new foundry.applications.ux.FormDataExtended(sheet.form)
    );
    const rules = data.system?.rules ?? sheet.document._source.system.rules;
    await sheet.submit({ updateData: { system: { rules: change([...rules]) } } });
  } catch (err) {
    ui.notifications?.error(err.message);
  }
}
