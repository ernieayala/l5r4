import { describe, expect, it } from "vitest";
import {
  buildRuleRollData,
  getRuleValue,
  isRuleFormula,
  rollDataKey
} from "../../../module/utils/rule-values.js";

const rollData = {
  rings: { air: 3, fire: 2 },
  skills: { defense: { rank: 2 }, tea_ceremony: { rank: 4 } },
  honor: { rank: 5 }
};

describe("getRuleValue", () => {
  it("should return a number as is", () => {
    expect(getRuleValue(3, rollData)).toBe(3);
    expect(getRuleValue(-2, rollData)).toBe(-2);
  });

  it("should read @ paths from roll data", () => {
    expect(getRuleValue("@rings.air + @skills.defense.rank", rollData)).toBe(5);
  });

  it("should count a missing @ path as 0, as an absent Skill has rank 0", () => {
    expect(getRuleValue("@rings.air + @skills.defense_x.rank", rollData)).toBe(3);
  });

  it("should follow operator precedence and parentheses", () => {
    expect(getRuleValue("2 + 3 * 4", rollData)).toBe(14);
    expect(getRuleValue("(2 + 3) * 4", rollData)).toBe(20);
    expect(getRuleValue("10 - 4 - 3", rollData)).toBe(3);
    expect(getRuleValue("-@rings.fire", rollData)).toBe(-2);
  });

  it("should call the allowed functions", () => {
    expect(getRuleValue("floor(@honor.rank / 2)", rollData)).toBe(2);
    expect(getRuleValue("ceil(@honor.rank / 2)", rollData)).toBe(3);
    expect(getRuleValue("max(@rings.air, @rings.fire, 1)", rollData)).toBe(3);
    expect(getRuleValue("min(@rings.air, @rings.fire)", rollData)).toBe(2);
    expect(getRuleValue("abs(0 - 4)", rollData)).toBe(4);
  });

  it("should read a key made by rollDataKey", () => {
    expect(getRuleValue(`@skills.${rollDataKey("Tea Ceremony")}.rank`, rollData)).toBe(4);
  });

  it("should treat a numeric string as a formula", () => {
    expect(getRuleValue("4", rollData)).toBe(4);
  });

  it("should return 0 for a blank formula", () => {
    expect(getRuleValue("  ", rollData)).toBe(0);
  });

  it("should throw on unknown names, stray characters, and unbalanced input", () => {
    expect(() => getRuleValue("alert(1)", rollData)).toThrow(/Unknown name/);
    expect(() => getRuleValue("@rings.air; 1", rollData)).toThrow(/Unexpected character/);
    expect(() => getRuleValue("(1 + 2", rollData)).toThrow(/Expected/);
    expect(() => getRuleValue("1 +", rollData)).toThrow(/ends early/);
    expect(() => getRuleValue("1 2", rollData)).toThrow(/Unexpected "2"/);
  });

  // #172
  it("should throw on a value that is not a finite number", () => {
    expect(() => getRuleValue("1/0", rollData)).toThrow(/finite/);
    expect(() => getRuleValue("0/0", rollData)).toThrow(/finite/);
    expect(() => getRuleValue(Infinity, rollData)).toThrow(/finite/);
    expect(() => getRuleValue(NaN, rollData)).toThrow(/finite/);
  });

  // #172
  it("should not take Object.prototype's names for functions", () => {
    for (const name of ["toString", "constructor", "valueOf", "hasOwnProperty"]) {
      expect(() => getRuleValue(`${name}(1)`, rollData)).toThrow(/Unknown name/);
    }
  });
});

// #172
describe("isRuleFormula", () => {
  it("should accept a formula that parses, whatever it comes to", () => {
    expect(isRuleFormula("@rings.air + 1")).toBe(true);
    expect(isRuleFormula("1 / @rings.air")).toBe(true);
    expect(isRuleFormula("floor(@honor.rank / 2)")).toBe(true);
  });

  it("should refuse text that does not parse", () => {
    expect(isRuleFormula("abc")).toBe(false);
    expect(isRuleFormula("1 +")).toBe(false);
    expect(isRuleFormula("toString(1)")).toBe(false);
  });
});

// #172
describe("buildRuleRollData", () => {
  it("should add @level only for a rule with a level", () => {
    expect(buildRuleRollData(rollData, 2).level).toBe(2);
    expect(buildRuleRollData(rollData)).toBe(rollData);
  });
});

describe("rollDataKey", () => {
  it("should lower-case and join words with underscores", () => {
    expect(rollDataKey("Tea Ceremony")).toBe("tea_ceremony");
    expect(rollDataKey("Defense")).toBe("defense");
  });

  it("should keep letters outside ASCII and trim separators", () => {
    expect(rollDataKey(" Équitation ")).toBe("équitation");
    expect(rollDataKey("Lore: Shadowlands")).toBe("lore_shadowlands");
  });
});
