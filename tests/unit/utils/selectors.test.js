import { describe, expect, it } from "vitest";
import {
  getSkillAttackTwins,
  getSkillItem,
  toSelector,
  toSkillKey,
  toSkillType
} from "../../../module/utils/selectors.js";

// #173
describe("toSkillKey", () => {
  it("should lower-case, trim, and collapse runs of spaces", () => {
    expect(toSkillKey(" Tea  Ceremony ")).toBe("tea ceremony");
    expect(toSkillKey("Lore: Bushido")).toBe("lore: bushido");
    expect(toSkillKey(undefined)).toBe("");
  });
});

// #173
describe("toSkillType", () => {
  it("should give a Skill type by the name Skills store", () => {
    expect(toSkillType("merchant")).toBe("merch");
    expect(toSkillType(" Merchant ")).toBe("merch");
    expect(toSkillType("merch")).toBe("merch");
    expect(toSkillType("Bugei")).toBe("bugei");
  });
});

// #173
describe("toSelector", () => {
  it("should give a selector the form rolls build theirs in", () => {
    expect(toSelector("skill:Kenjutsu ")).toBe("skill:kenjutsu");
    expect(toSelector(" Skill: Lore:  Bushido")).toBe("skill:lore: bushido");
    expect(toSelector("skill-type:Merchant")).toBe("skill-type:merch");
    expect(toSelector("ATTACK")).toBe("attack");
    expect(toSelector("trait:ref")).toBe("trait:ref");
  });
});

// #173
describe("getSkillItem", () => {
  const items = [
    { type: "weapon", name: "Kenjutsu" },
    { type: "skill", name: "Kenjutsu " },
    { type: "skill", name: "Tea Ceremony" }
  ];

  it("should find a Skill by name whatever its case and spacing", () => {
    expect(getSkillItem(items, "kenjutsu")).toBe(items[1]);
    expect(getSkillItem(items, " TEA ceremony")).toBe(items[2]);
  });

  it("should give null for a Skill the items lack", () => {
    expect(getSkillItem(items, "iaijutsu")).toBeNull();
  });
});

// #173: a rule written once for "skill" and once for "attack"
describe("getSkillAttackTwins", () => {
  it("should pair a skill rule with the attack rule that matches it in every other field", () => {
    const rules = [
      { key: "TNModifier", selector: "skill", value: 5, predicate: ["consumed-perfection"] },
      { key: "TNModifier", predicate: ["consumed-perfection"], value: 5, selector: "attack" },
      { key: "TNModifier", selector: "spell", value: 5, predicate: ["consumed-perfection"] },
      { key: "RaiseRule", selector: "attack", maneuver: "feint", cost: 1 }
    ];
    expect(getSkillAttackTwins(rules)).toEqual([{ skill: 0, attack: 1 }]);
  });

  it("should pair nothing when the fields differ or a skill rule already leaves attacks out", () => {
    expect(
      getSkillAttackTwins([
        { key: "RollModifier", selector: "skill", roll: 1 },
        { key: "RollModifier", selector: "attack", roll: 2 }
      ])
    ).toEqual([]);
    expect(
      getSkillAttackTwins([
        { key: "TNModifier", selector: "skill", value: 5, predicate: [{ not: "check:attack" }] },
        { key: "TNModifier", selector: "attack", value: 5 }
      ])
    ).toEqual([]);
    expect(getSkillAttackTwins(undefined)).toEqual([]);
  });

  it("should pair each attack rule once", () => {
    const twin = { key: "RollModifier", roll: 1 };
    const rules = [
      { ...twin, selector: "skill" },
      { ...twin, selector: "skill" },
      { ...twin, selector: "attack" }
    ];
    expect(getSkillAttackTwins(rules)).toEqual([{ skill: 0, attack: 2 }]);
  });
});
