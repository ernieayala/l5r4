/**
 * @module tools/eslint/plugin
 * @description The local ESLint plugin `l5r4`: the convention rules no core rule or `eslint-plugin-jsdoc` holds
 * (docs/code-system/README.md, Enforcement). `eslint.config.mjs` registers it.
 */

import docFormat from "./doc-format.mjs";
import importOrder from "./import-order.mjs";
import memberOrder from "./member-order.mjs";
import moduleShape from "./module-shape.mjs";
import naming from "./naming.mjs";

/** The plugin object ESLint's flat config takes. */
const PLUGIN = Object.freeze({
  meta: { name: "l5r4" },
  rules: {
    "doc-format": docFormat,
    "import-order": importOrder,
    "member-order": memberOrder,
    "module-shape": moduleShape,
    naming
  }
});

export default PLUGIN;
