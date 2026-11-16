/**
 * @module sheets/active-effect-config
 * @description Core's Active Effect sheet with a Rules tab: the rules editor for the effect's `system.rules`
 * (module/sheets/rules-editor.js; roadmap/STAGE-11, Sheets). Everything else is core's (client/applications/sheets/
 * active-effect-config.mjs).
 */

import { SYS_ID } from "../config/constants.js";
import { RULES_EDITOR_ACTIONS, readRulesForm, rulesEditorContext } from "./rules-editor.js";

const { ActiveEffectConfig } = foundry.applications.sheets;
const { footer, ...BEFORE_FOOTER } = ActiveEffectConfig.PARTS;

/**
 * Core's Active Effect sheet with the Rules tab added before its footer.
 */
export default class L5R4ActiveEffectConfig extends ActiveEffectConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: RULES_EDITOR_ACTIONS
  };

  /** The core parts with the Rules tab before the footer, which stays last. @override */
  static PARTS = {
    ...BEFORE_FOOTER,
    rules: { template: `systems/${SYS_ID}/templates/rules/effect-tab.hbs`, scrollable: [""] },
    footer
  };

  /** @override */
  static TABS = {
    sheet: {
      ...ActiveEffectConfig.TABS.sheet,
      tabs: [
        ...ActiveEffectConfig.TABS.sheet.tabs,
        { id: "rules", icon: "fa-solid fa-scroll", label: "l5r4.ui.tabs.rules" }
      ]
    }
  };

  /**
   * The Rules tab's view: a form per rule, or the JSON.
   * @type {"form"|"json"}
   */
  rulesMode = "form";

  /** @override */
  async _preparePartContext(partId, context) {
    const partContext = await super._preparePartContext(partId, context);
    if (partId === "rules") {
      Object.assign(
        partContext,
        rulesEditorContext(this.document._source.system.rules, this.rulesMode, this.isEditable)
      );
    }
    return partContext;
  }

  /** @override */
  _processFormData(event, form, formData) {
    return readRulesForm(
      super._processFormData(event, form, formData),
      this.document._source.system.rules
    );
  }
}
