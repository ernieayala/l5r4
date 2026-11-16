import { posix } from "node:path";
import {
  isSentenceCase,
  parseJs,
  registerConventionSuite,
  walkAst
} from "../../tools/conventions/shared.mjs";

const { dirname, join } = posix;

/** The longest `it` name (Stage 17 decision 8). */
const MAX_NAME = 100;

/** The folders a Quench file may sit in: a `module/` layer, or `workflows/` (docs/code-system/testing.md). */
const QUENCH_FOLDERS = Object.freeze([
  "apps",
  "data",
  "documents",
  "hooks",
  "services",
  "setup",
  "sheets",
  "utils",
  "workflows"
]);

/** A note a test name never carries: a page, issue, stage, phase, decision, backlog tag, plan number, or parentheses. */
const NOTE =
  /\bpp?\.\s?\d|#\d|\b(stage|phase|decision)\s*\d|\b\d+\.\d+\.\d+\b|[()]|(?<![A-Za-z0-9])[A-Z]\d{1,2}(?![A-Za-z0-9])/i;

/** History words a test name never carries. */
const HISTORY = /\bregression\b|\bbug report\b|\bbug fix\b/i;

/** Parsed Quench and test files per tree, so each file parses once. */
const quenchFiles = new WeakMap();
const testFiles = new WeakMap();

/**
 * The name argument of a test call, or why it has none a check can read.
 * @param {object} node - The argument node
 * @returns {{name: string|null, literal: boolean}} The name, and whether it is a plain string literal
 */
function nameOf(node) {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return { name: node.value, literal: true };
  }
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return { name: node.quasis[0].value.cooked, literal: false };
  }
  return { name: null, literal: node?.type !== "TemplateLiteral" };
}

/**
 * The test calls of a file: each `describe` and `it`, its name, its modifier, and its enclosing `describe`.
 * @param {string} text - The test file
 * @returns {{kind: string, modifier: string|null, name: string|null, literal: boolean, line: number, parent: object|null}[]}
 *   The calls
 */
function testCallsOf(text) {
  const parsed = parseJs(text);
  if (!parsed) {
    return [];
  }
  const calls = [];
  walkAst(parsed.ast, (node, ancestors) => {
    if (node.type !== "CallExpression") {
      return;
    }
    let callee = node.callee;
    let modifier = null;
    if (callee.type === "CallExpression" && callee.callee.type === "MemberExpression") {
      modifier = callee.callee.property.name;
      callee = callee.callee.object;
    } else if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
      modifier = callee.property.name;
      callee = callee.object;
    }
    if (callee.type !== "Identifier" || !["describe", "it", "test"].includes(callee.name)) {
      return;
    }
    const parent = [...ancestors]
      .reverse()
      .find(
        above =>
          above.type === "CallExpression" &&
          ((above.callee.type === "Identifier" && above.callee.name === "describe") ||
            (above.callee.type === "MemberExpression" && above.callee.object.name === "describe"))
      );
    calls.push({
      kind: callee.name === "describe" ? "describe" : "it",
      modifier,
      ...nameOf(node.arguments[0]),
      line: node.loc.start.line,
      parent: parent ?? null
    });
  });
  return calls;
}

/**
 * Whether a `registerBatch` call forwards a batch it was handed: its id is a parameter of a function around it, as a
 * wrapper of the Quench API passes on the id its caller gave. Such a call registers no batch of its own.
 * @param {object} idNode - The call's first argument
 * @param {object[]} ancestors - The nodes above the call
 * @returns {boolean} True for a forwarding call
 */
function isForwardedBatch(idNode, ancestors) {
  return (
    idNode?.type === "Identifier" &&
    ancestors.some(
      node =>
        /Function/.test(node.type) &&
        node.params.some(param => param.type === "Identifier" && param.name === idNode.name)
    )
  );
}

/**
 * The Quench batches a file registers: each id as written, its display name, and its line.
 * @param {string} text - The Quench file
 * @returns {{id: string|null, literalId: boolean, displayName: string|null, line: number}[]} The batches
 */
function batchesOf(text) {
  const parsed = parseJs(text);
  if (!parsed) {
    return [];
  }
  const batches = [];
  walkAst(parsed.ast, (node, ancestors) => {
    if (
      node.type !== "CallExpression" ||
      node.callee.type !== "MemberExpression" ||
      node.callee.property.name !== "registerBatch" ||
      isForwardedBatch(node.arguments[0], ancestors)
    ) {
      return;
    }
    const [idNode, , options] = node.arguments;
    let id = null;
    let literalId = false;
    if (
      idNode?.type === "TemplateLiteral" &&
      idNode.expressions[0]?.name === "SYS_ID" &&
      idNode.quasis[0].value.cooked === ""
    ) {
      id = `\${SYS_ID}${idNode.quasis
        .slice(1)
        .map(quasi => quasi.value.cooked)
        .join("")}`;
    } else if (idNode?.type === "Literal") {
      id = String(idNode.value);
      literalId = true;
    }
    const display = options?.properties?.find(
      property => property.key?.name === "displayName"
    )?.value;
    batches.push({
      id,
      literalId,
      displayName: display?.type === "Literal" ? display.value : null,
      line: node.loc.start.line
    });
  });
  return batches;
}

/**
 * The Quench files of a tree that register batches.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{path: string, batches: object[]}[]} The files and their batches
 */
function quenchFilesOf(tree) {
  if (!quenchFiles.has(tree)) {
    quenchFiles.set(
      tree,
      tree
        .files("tests/quench", /\.js$/)
        .map(path => ({ path, batches: batchesOf(tree.text(path)) }))
        .filter(({ batches }) => batches.length)
    );
  }
  return quenchFiles.get(tree);
}

/**
 * Every test file of a tree: Quench batches and Vitest files, the conventions' fixtures left out.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @returns {{path: string, calls: object[]}[]} The files and their test calls
 */
function testFilesOf(tree) {
  if (!testFiles.has(tree)) {
    testFiles.set(
      tree,
      [
        ...tree.files("tests/quench", /\.js$/),
        ...tree.files("tests", /\.test\.js$/).filter(path => !path.startsWith("tests/quench/"))
      ]
        .filter(path => !path.startsWith("tests/fixtures/"))
        .map(path => ({ path, calls: testCallsOf(tree.text(path)) }))
    );
  }
  return testFiles.get(tree);
}

/**
 * Collect one violation per test call that breaks a rule.
 * @param {import("../../tools/conventions/shared.mjs").Tree} tree - The tree
 * @param {string} kind - "it" or "describe"
 * @param {(call: object) => string|null} check - A message for a violating call, or null
 * @returns {string[]} The violations
 */
function perCall(tree, kind, check) {
  return testFilesOf(tree).flatMap(({ path, calls }) =>
    calls
      .filter(call => call.kind === kind && call.name !== null)
      .flatMap(call => {
        const message = check(call);
        return message ? [`${path}:${call.line}: ${kind}("${call.name}") ${message}`] : [];
      })
  );
}

/**
 * The batch id a Quench file's path asks for.
 * @param {string} path - The file, under `tests/quench/`
 * @returns {string} The expected id
 */
function expectedIdOf(path) {
  const segments = path
    .replace(/^tests\/quench\//, "")
    .replace(/\.js$/, "")
    .split("/");
  return `\${SYS_ID}.${segments.join(".")}`;
}

/** docs/code-system/testing.md and naming.md, Tests. */
const RULES = {
  "tests/batch-id": tree =>
    quenchFilesOf(tree).flatMap(({ path, batches }) =>
      batches
        .filter(({ id }) => id !== expectedIdOf(path))
        .map(
          ({ id, line }) =>
            `${path}:${line}: batch id ${id ?? "(computed)"} is not \`${expectedIdOf(path)}\``
        )
    ),

  "tests/batch-display-name": tree =>
    quenchFilesOf(tree).flatMap(({ path, batches }) =>
      batches.flatMap(({ displayName, line }) => {
        const rest = /^L5R4: (.+)$/.exec(displayName ?? "")?.[1];
        const problem =
          displayName === null
            ? "has no displayName"
            : !rest
              ? 'does not start "L5R4: "'
              : /[()]/.test(rest)
                ? "holds a note in parentheses"
                : /\bTests?$/.test(rest)
                  ? 'ends "Tests"'
                  : /&|\s\+\s/.test(rest)
                    ? 'joins with "&" or "+", not "and"'
                    : /\b(stage|phase)\s*\d/i.test(rest)
                      ? "carries a stage or phase number"
                      : !/^[A-Z]/.test(rest) || !isSentenceCase(rest)
                        ? "is not in sentence case"
                        : null;
        return problem ? [`${path}:${line}: batch display name "${displayName}" ${problem}`] : [];
      })
    ),

  "tests/batch-per-file": tree =>
    quenchFilesOf(tree)
      .filter(({ path, batches }) => batches.length > 1 || path === "tests/quench/index.js")
      .map(
        ({ path, batches }) =>
          `${path}: registers ${batches.length} batches; one per file, none in index.js`
      ),

  "tests/register-function": tree =>
    quenchFilesOf(tree)
      .filter(({ path }) => path !== "tests/quench/index.js")
      .filter(({ path }) => {
        const exported = [...tree.text(path).matchAll(/^export (?:async )?function (\w+)/gm)].map(
          ([, name]) => name
        );
        return exported.length !== 1 || !/^register[A-Z]\w*Tests$/.test(exported[0]);
      })
      .map(({ path }) => `${path}: exports one register<Feature>Tests(quench)`),

  "tests/quench-folder": tree =>
    tree
      .files("tests/quench", /\.js$/)
      .filter(path => path.split("/").length > 3 && !QUENCH_FOLDERS.includes(path.split("/")[2]))
      .map(path => `${path}: a Quench folder is a module/ layer or workflows/`),

  "tests/it-should": tree =>
    perCall(tree, "it", ({ name }) =>
      name.startsWith("should ") ? null : 'does not start "should"'
    ),

  "tests/it-length": tree =>
    perCall(tree, "it", ({ name }) =>
      name.length > MAX_NAME ? `runs ${name.length} characters, over ${MAX_NAME}` : null
    ),

  "tests/it-note": tree =>
    perCall(tree, "it", ({ name }) =>
      NOTE.test(name) ? "carries a citation, number, or note" : null
    ),

  "tests/it-history": tree =>
    perCall(tree, "it", ({ name }) => (HISTORY.test(name) ? "carries a history word" : null)),

  "tests/it-unique": tree =>
    testFilesOf(tree).flatMap(({ path, calls }) => {
      const seen = new Map();
      return calls
        .filter(call => call.kind === "it" && call.name !== null && !call.modifier)
        .flatMap(call => {
          const scope = seen.get(call.parent) ?? new Set();
          seen.set(call.parent, scope);
          if (scope.has(call.name)) {
            return [`${path}:${call.line}: it("${call.name}") repeats a name in its describe`];
          }
          scope.add(call.name);
          return [];
        });
    }),

  "tests/describe-case": tree =>
    perCall(tree, "describe", ({ name }) => {
      const example = /^Book example: (.+) \(p\.\d+(-\d+)?\)$/.exec(name);
      const plain = example ? `Example ${example[1]}` : name;
      if (!/\s/.test(plain)) {
        return null;
      }
      return /^[A-Z0-9]/.test(plain) && isSentenceCase(plain)
        ? null
        : "is not a noun phrase in sentence case";
    }),

  "tests/book-example": tree =>
    perCall(tree, "describe", ({ name }) =>
      /\bbook\b/i.test(name) &&
      /\bexamples?\b/i.test(name) &&
      !/^Book example: .+ \(p\.\d+(-\d+)?\)$/.test(name)
        ? 'is not "Book example: <name> (p.<page>)"'
        : null
    ),

  "tests/focus-skip": tree =>
    testFilesOf(tree).flatMap(({ path, calls }) =>
      calls
        .filter(call => ["only", "skip"].includes(call.modifier))
        .map(call => `${path}:${call.line}: ${call.kind}.${call.modifier} left in`)
    ),

  "tests/name-literal": tree =>
    testFilesOf(tree).flatMap(({ path, calls }) =>
      calls
        .filter(call => !call.literal)
        .map(
          call =>
            `${path}:${call.line}: a ${call.kind} name is a string literal, not a template literal`
        )
    ),

  "tests/unit-mirror": tree =>
    tree
      .files("tests/unit", /\.test\.js$/)
      .filter(
        path =>
          !tree.has(`module/${path.replace(/^tests\/unit\//, "").replace(/\.test\.js$/, ".js")}`)
      )
      .map(path => `${path}: mirrors no module/ file`),

  "tests/unit-import": tree =>
    tree.files("tests/unit", /\.test\.js$/).flatMap(path => {
      const target = `module/${path.replace(/^tests\/unit\//, "").replace(/\.test\.js$/, ".js")}`;
      if (!tree.has(target)) {
        return [];
      }
      const imports = [...tree.text(path).matchAll(/^import\b[^;]*?from\s+["']([^"']+)["']/gm)].map(
        ([, source]) => join(dirname(path), source)
      );
      return imports.includes(target)
        ? []
        : [`${path}: does not import ${target}, the file it mirrors`];
    })
};

registerConventionSuite("Test names and layout", RULES, "tests");
