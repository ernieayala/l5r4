import { describe, expect, it } from "vitest";
import { resolveValue, rollDataKey } from "../../../module/utils/rule-values.js";

const rollData = {
  rings: { air: 3, fire: 2 },
  skills: { defense: { rank: 2 }, tea_ceremony: { rank: 4 } },
  honor: { rank: 5 }
};

describe("resolveValue", () => {
  it("should return a number as is", () => {
    expect(resolveValue(3, rollData)).toBe(3);
    expect(resolveValue(-2, rollData)).toBe(-2);
  });

  it("should read @ paths from roll data", () => {
    expect(resolveValue("@rings.air + @skills.defense.rank", rollData)).toBe(5);
  });

  it("should count a missing @ path as 0, as an absent Skill has rank 0", () => {
    expect(resolveValue("@rings.air + @skills.defense_x.rank", rollData)).toBe(3);
  });

  it("should follow operator precedence and parentheses", () => {
    expect(resolveValue("2 + 3 * 4", rollData)).toBe(14);
    expect(resolveValue("(2 + 3) * 4", rollData)).toBe(20);
    expect(resolveValue("10 - 4 - 3", rollData)).toBe(3);
    expect(resolveValue("-@rings.fire", rollData)).toBe(-2);
  });

  it("should call the allowed functions", () => {
    expect(resolveValue("floor(@honor.rank / 2)", rollData)).toBe(2);
    expect(resolveValue("ceil(@honor.rank / 2)", rollData)).toBe(3);
    expect(resolveValue("max(@rings.air, @rings.fire, 1)", rollData)).toBe(3);
    expect(resolveValue("min(@rings.air, @rings.fire)", rollData)).toBe(2);
    expect(resolveValue("abs(0 - 4)", rollData)).toBe(4);
  });

  it("should read a key made by rollDataKey", () => {
    expect(resolveValue(`@skills.${rollDataKey("Tea Ceremony")}.rank`, rollData)).toBe(4);
  });

  it("should treat a numeric string as a formula", () => {
    expect(resolveValue("4", rollData)).toBe(4);
  });

  it("should return 0 for a blank formula", () => {
    expect(resolveValue("  ", rollData)).toBe(0);
  });

  it("should throw on unknown names, stray characters, and unbalanced input", () => {
    expect(() => resolveValue("alert(1)", rollData)).toThrow(/Unknown name/);
    expect(() => resolveValue("@rings.air; 1", rollData)).toThrow(/Unexpected character/);
    expect(() => resolveValue("(1 + 2", rollData)).toThrow(/Expected/);
    expect(() => resolveValue("1 +", rollData)).toThrow(/ends early/);
    expect(() => resolveValue("1 2", rollData)).toThrow(/Unexpected "2"/);
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
