/**
 * @module tools/eslint/joined-copy
 * @description The local rule `l5r4/joined-copy` (docs/design-system/content/localization.md, One key per meaning):
 * copy is one i18n key with placeholders, never a localized string joined to other text with `+` or in a template
 * literal (tools/eslint/localized-join.mjs), so a translation can order its own words.
 */

import { joinsLocalized, visitJoins } from "./localized-join.mjs";

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Copy is one i18n key per docs/design-system/content/localization.md"
    },
    schema: [],
    messages: {
      joined:
        "A localized string joined to other text: write one key with placeholders, such as F(key, { name }) (docs/design-system/content/localization.md, One key per meaning)"
    }
  },

  /**
   * The rule's visitors for one file.
   * @param {object} context - ESLint's rule context
   * @returns {object} The visitors, by node type
   */
  create(context) {
    return visitJoins(node => {
      if (joinsLocalized(node, context.sourceCode)) {
        context.report({ node, messageId: "joined" });
      }
    });
  }
};
