/**
 * @module rule-values
 * @description A rule's value: a number, or a formula over the actor's roll data such as
 * "@rings.air + @skills.defense.rank" or "floor(@honor.rank / 2)". Formulas allow numbers, `@` paths, + - * /,
 * parentheses, and floor, ceil, round, min, max, abs. They are parsed here, never passed to eval.
 */

const FUNCTIONS = {
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  abs: Math.abs
};

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
function tokenize(formula) {
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
function evaluate(formula, rollData) {
  const tokens = tokenize(formula);
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const expect = token => {
    if (next() !== token) {
      throw new Error(`Expected "${token}" in "${formula}"`);
    }
  };

  const expression = () => {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      value = next() === "+" ? value + term() : value - term();
    }
    return value;
  };
  const term = () => {
    let value = factor();
    while (peek() === "*" || peek() === "/") {
      value = next() === "*" ? value * factor() : value / factor();
    }
    return value;
  };
  const factor = () => {
    const token = next();
    if (token === undefined) {
      throw new Error(`Formula "${formula}" ends early`);
    }
    if (token === "-") {
      return -factor();
    }
    if (token === "+") {
      return factor();
    }
    if (token === "(") {
      const value = expression();
      expect(")");
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
      expect("(");
      const args = [expression()];
      while (peek() === ",") {
        next();
        args.push(expression());
      }
      expect(")");
      return FUNCTIONS[token](...args);
    }
    throw new Error(`Unknown name "${token}" in "${formula}"`);
  };

  const value = expression();
  if (i !== tokens.length) {
    throw new Error(`Unexpected "${tokens[i]}" in "${formula}"`);
  }
  return value;
}

/**
 * The roll-data key for a named thing, so a formula can reach it: lower case, runs of other characters as "_".
 * @param {string} name
 * @returns {string}
 *
 * @example
 * rollDataKey("Tea Ceremony"); // "tea_ceremony"
 */
export function rollDataKey(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Resolve a rule value to a number. A missing @ path counts as 0, as an absent Skill has rank 0.
 * @param {number|string} value  A number or a formula.
 * @param {object} rollData  The actor's roll data.
 * @returns {number}
 * @throws {Error} When the formula does not parse.
 *
 * @example
 * resolveValue(3, {}); // 3
 * resolveValue("@rings.air + @skills.defense.rank", { rings: { air: 3 }, skills: { defense: { rank: 2 } } }); // 5
 */
export function resolveValue(value, rollData) {
  if (typeof value === "number") {
    return value;
  }
  const text = String(value ?? "").trim();
  if (!text) {
    return 0;
  }
  return evaluate(text, rollData ?? {});
}
