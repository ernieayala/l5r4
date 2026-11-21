/**
 * @module tools/eslint/plugin
 * @description The local ESLint plugin `l5r4`: the convention rules no core rule or `eslint-plugin-jsdoc` holds
 * (docs/code-system/README.md, Enforcement). `eslint.config.mjs` registers it.
 */

import docFormat from "./doc-format.mjs";
import importOrder from "./import-order.mjs";
import joinedCopy from "./joined-copy.mjs";
import joinedTitle from "./joined-title.mjs";
import memberOrder from "./member-order.mjs";
import moduleShape from "./module-shape.mjs";
import naming from "./naming.mjs";
import noBarePrepare from "./no-bare-prepare.mjs";

/** The plugin object ESLint's flat config takes. */
const PLUGIN = Object.freeze({
  meta: { name: "l5r4" },
  rules: {
    "doc-format": docFormat,
    "import-order": importOrder,
    "joined-copy": joinedCopy,
    "joined-title": joinedTitle,
    "member-order": memberOrder,
    "module-shape": moduleShape,
    naming,
    "no-bare-prepare": noBarePrepare
  }
});

export default PLUGIN;
