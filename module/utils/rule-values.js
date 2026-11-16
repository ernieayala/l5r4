/**
 * @module utils/rule-values
 * @description A rule's value: a number, or a formula over the actor's roll data such as
 * "@rings.air + @skills.defense.rank" or "floor(@honor.rank / 2)". Formulas allow numbers, `@` paths, + - * /,
 * parentheses, and floor, ceil, round, min, max, abs. They are parsed here, never passed to eval.
 */

const FUNCTIONS = Object.freeze({
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  abs: Math.abs
});

/**
 * The roll-data key for a named thing, so a formula can reach it: lower case, runs of other characters as "_".
 * "Tea Ceremony" becomes "tea_ceremony".
 * @param {string} name
 * @returns {string}
 */
export function rollDataKey(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Resolve a rule value to a number. A missing @ path counts as 0, as an absent Skill has rank 0. The number 3
 * resolves to 3; "@rings.air + @skills.defense.rank" with Air 3 and Defense 2 resolves to 5.
 * @param {number|string} value - A number or a formula.
 * @param {object} rollData - The actor's roll data.
 * @returns {number}
 * @throws {Error} When the formula does not parse.
 */
export function getRuleValue(value, rollData) {
  if (typeof value === "number") {
    return value;
  }
  const text = String(value ?? "").trim();
  if (!text) {
    return 0;
  }
  return getFormulaValue(text, rollData ?? {});
}

/**
 * Read a dot path from an object.
 * @param {object} data
 * @param {string} path
 * @returns {*}
 */
function getPath(data, path) {
  return path.split(".").reduce((node, key) => node?.[key], data);
}

/**
 * Split a formula into tokens: numbers, @paths, names, operators, parentheses, and commas.
 * @param {string} formula
 * @returns {string[]}
 */
function parseTokens(formula) {
  const tokens = formula.match(/\d+(?:\.\d+)?|@[\p{L}\p{N}_.]+|[A-Za-z_]\w*|[-+*/(),]/gu) ?? [];
  if (tokens.join("") !== formula.replace(/\s+/g, "")) {
    throw new Error(`Unexpected character in "${formula}"`);
  }
  return tokens;
}

/**
 * Evaluate a formula against roll data.
 * @param {string} formula
 * @param {object} rollData
 * @returns {number}
 */
function getFormulaValue(formula, rollData) {
  const parser = { formula, rollData, tokens: parseTokens(formula), i: 0 };
  const value = parseExpression(parser);
  if (parser.i !== parser.tokens.length) {
    throw new Error(`Unexpected "${parser.tokens[parser.i]}" in "${formula}"`);
  }
  return value;
}

/**
 * @typedef {object} FormulaParser
 * @property {string} formula  The formula, for error messages
 * @property {object} rollData The roll data `@` paths read
 * @property {string[]} tokens The formula's tokens
 * @property {number} i        The index of the next token; the parse functions advance it
 */

/**
 * The next token, not consumed.
 * @param {FormulaParser} parser
 * @returns {string|undefined}
 */
function getCurrentToken(parser) {
  return parser.tokens[parser.i];
}

/**
 * Consume the next token.
 * @param {FormulaParser} parser
 * @returns {string|undefined}
 */
function parseToken(parser) {
  return parser.tokens[parser.i++];
}

/**
 * Consume the next token, which must be `token`.
 * @param {FormulaParser} parser
 * @param {string} token
 */
function parseExpected(parser, token) {
  if (parseToken(parser) !== token) {
    throw new Error(`Expected "${token}" in "${parser.formula}"`);
  }
}

/**
 * Parse a sum: terms joined by + and -.
 * @param {FormulaParser} parser
 * @returns {number}
 */
function parseExpression(parser) {
  let value = parseTerm(parser);
  while (getCurrentToken(parser) === "+" || getCurrentToken(parser) === "-") {
    value = parseToken(parser) === "+" ? value + parseTerm(parser) : value - parseTerm(parser);
  }
  return value;
}

/**
 * Parse a product: factors joined by * and /.
 * @param {FormulaParser} parser
 * @returns {number}
 */
function parseTerm(parser) {
  let value = parseFactor(parser);
  while (getCurrentToken(parser) === "*" || getCurrentToken(parser) === "/") {
    value = parseToken(parser) === "*" ? value * parseFactor(parser) : value / parseFactor(parser);
  }
  return value;
}

/**
 * Parse a factor: a signed factor, a parenthesized sum, an `@` path (0 when missing or not a number), a number, or a
 * function call.
 * @param {FormulaParser} parser
 * @returns {number}
 */
function parseFactor(parser) {
  const token = parseToken(parser);
  if (token === undefined) {
    throw new Error(`Formula "${parser.formula}" ends early`);
  }
  if (token === "-") {
    return -parseFactor(parser);
  }
  if (token === "+") {
    return parseFactor(parser);
  }
  if (token === "(") {
    const value = parseExpression(parser);
    parseExpected(parser, ")");
    return value;
  }
  if (token.startsWith("@")) {
    const value = Number(getPath(parser.rollData, token.slice(1)) ?? 0);
    return Number.isFinite(value) ? value : 0;
  }
  if (/^\d/.test(token)) {
    return Number(token);
  }
  if (token in FUNCTIONS) {
    return parseCall(parser, token);
  }
  throw new Error(`Unknown name "${token}" in "${parser.formula}"`);
}

/**
 * Parse a function call's parenthesized, comma-separated arguments and apply the function.
 * @param {FormulaParser} parser
 * @param {string} name - A key of FUNCTIONS, already consumed
 * @returns {number}
 */
function parseCall(parser, name) {
  parseExpected(parser, "(");
  const args = [parseExpression(parser)];
  while (getCurrentToken(parser) === ",") {
    parseToken(parser);
    args.push(parseExpression(parser));
  }
  parseExpected(parser, ")");
  return FUNCTIONS[name](...args);
}
