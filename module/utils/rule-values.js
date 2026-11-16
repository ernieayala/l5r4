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
  const tokens = parseTokens(formula);
  let i = 0;
  const getCurrentToken = () => tokens[i];
  const parseToken = () => tokens[i++];
  const parseExpected = token => {
    if (parseToken() !== token) {
      throw new Error(`Expected "${token}" in "${formula}"`);
    }
  };

  const parseExpression = () => {
    let value = parseTerm();
    while (getCurrentToken() === "+" || getCurrentToken() === "-") {
      value = parseToken() === "+" ? value + parseTerm() : value - parseTerm();
    }
    return value;
  };
  const parseTerm = () => {
    let value = parseFactor();
    while (getCurrentToken() === "*" || getCurrentToken() === "/") {
      value = parseToken() === "*" ? value * parseFactor() : value / parseFactor();
    }
    return value;
  };
  const parseFactor = () => {
    const token = parseToken();
    if (token === undefined) {
      throw new Error(`Formula "${formula}" ends early`);
    }
    if (token === "-") {
      return -parseFactor();
    }
    if (token === "+") {
      return parseFactor();
    }
    if (token === "(") {
      const value = parseExpression();
      parseExpected(")");
      return value;
    }
    if (token.startsWith("@")) {
      const value = Number(getPath(rollData, token.slice(1)) ?? 0);
      return Number.isFinite(value) ? value : 0;
    }
    if (/^\d/.test(token)) {
      return Number(token);
    }
    if (token in FUNCTIONS) {
      parseExpected("(");
      const args = [parseExpression()];
      while (getCurrentToken() === ",") {
        parseToken();
        args.push(parseExpression());
      }
      parseExpected(")");
      return FUNCTIONS[token](...args);
    }
    throw new Error(`Unknown name "${token}" in "${formula}"`);
  };

  const value = parseExpression();
  if (i !== tokens.length) {
    throw new Error(`Unexpected "${tokens[i]}" in "${formula}"`);
  }
  return value;
}
