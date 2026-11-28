import { describe, expect, it } from "vitest";
import {
  getNextSaveTn,
  getPeriodKey,
  getArmorTn,
  getUsesSpent
} from "../../../module/utils/effects.js";
import { getStackedModifiers } from "../../../module/utils/modifier-stacking.js";

const stack = getStackedModifiers;

describe("getNextSaveTn", () => {
  // game-rules/41_conditional_effects.md, p.89
  // roadmap/STAGE-09 decision 5
  it("should drop a Dazed save by 5 after each failure and stop at 5", () => {
    const tns = [20];
    for (let i = 0; i < 4; i++) {
      tns.push(getNextSaveTn(tns.at(-1), -5, 5));
    }
    expect(tns).toEqual([20, 15, 10, 5, 5]);
  });
});

describe("getPeriodKey", () => {
  const now = { combatId: "c1", round: 2, turn: 3, worldTime: 90000, secondsPerDay: 86400 };

  it("should key turn, round, and skirmish by the combat", () => {
    expect(getPeriodKey("turn", now)).toBe("c1:2:3");
    expect(getPeriodKey("round", now)).toBe("c1:2");
    expect(getPeriodKey("skirmish", now)).toBe("c1");
  });

  it("should have no combat key outside combat", () => {
    expect(getPeriodKey("round", { worldTime: 0 })).toBeNull();
  });

  it("should key a day by world time", () => {
    expect(getPeriodKey("day", now)).toBe("day:1");
    expect(getPeriodKey("day", { worldTime: 86399 })).toBe("day:0");
  });

  it("should reject an unknown period", () => {
    expect(() => getPeriodKey("week", now)).toThrow();
  });
});

describe("getUsesSpent", () => {
  it("should count uses stored in the same period", () => {
    expect(getUsesSpent({ key: "c1:2", count: 1 }, "c1:2")).toBe(1);
  });

  it("should reset when the period changes, with no event", () => {
    expect(getUsesSpent({ key: "c1:1", count: 1 }, "c1:2")).toBe(0);
  });

  it("should count nothing without a period or a store", () => {
    expect(getUsesSpent({ key: "c1:2", count: 1 }, null)).toBe(0);
    expect(getUsesSpent(undefined, "c1:2")).toBe(0);
  });
});

describe("getArmorTn", () => {
  // Reflexes 3: base 3 × 5 + 5 = 20; light armor +5
  // game-rules/32_attack_and_defense.md, p.82
  const pc = { base: 20, armor: 5, other: 0, stack };

  // Full Attack is -10
  // game-rules/36_stances.md, p.84
  it("should add stances and other effects", () => {
    expect(getArmorTn({ ...pc, rules: [{ mode: "add", value: -10 }] }).current).toBe(15);
  });

  // game-rules/41_conditional_effects.md, p.89
  // roadmap/STAGE-09 decision 3
  it("should replace only the base with Reflexes + 5 for Blinded; armor and stances still add", () => {
    const out = getArmorTn({
      ...pc,
      rules: [
        { mode: "base", value: 8 },
        { mode: "add", value: 5 }
      ]
    });
    expect(out.current).toBe(8 + 5 + 5);
    expect(out.base).toBe(8);
  });

  // game-rules/41_conditional_effects.md, p.89
  // roadmap/STAGE-09 decision 3
  it("should set Stunned and Grappled to 5 plus armor and ignore everything else", () => {
    const out = getArmorTn({
      ...pc,
      other: 3,
      rules: [
        { mode: "total", value: 5 },
        { mode: "add", value: 10 },
        { mode: "base", value: 8 },
        { mode: "add", value: -10, range: "melee" }
      ]
    });
    expect(out.current).toBe(10);
    expect(out.vs).toEqual({ melee: 0, ranged: 0 });
  });

  // Prone
  // game-rules/41_conditional_effects.md, p.89
  it("should keep a range-limited add out of the Armor TN and return it for the attacker", () => {
    const out = getArmorTn({ ...pc, rules: [{ mode: "add", value: -10, range: "melee" }] });
    expect(out.current).toBe(25);
    expect(out.vs).toEqual({ melee: -10, ranged: 0 });
  });

  it("should stack typed adds: the largest bonus of a type", () => {
    const rules = [
      { mode: "add", value: 3, type: "kata" },
      { mode: "add", value: 4, type: "kata" }
    ];
    expect(getArmorTn({ ...pc, rules }).current).toBe(29);
  });

  it("should never go below 5", () => {
    expect(
      getArmorTn({ base: 5, armor: 0, other: 0, stack, rules: [{ mode: "add", value: -10 }] })
        .current
    ).toBe(5);
  });

  // #171: a range-limited add stacks by type like the rest
  it("should stack typed adds against one range: the largest of a type", () => {
    const rules = [
      { mode: "add", value: 3, type: "spell", range: "melee" },
      { mode: "add", value: 5, type: "spell", range: "melee" }
    ];
    expect(getArmorTn({ ...pc, rules }).vs).toEqual({ melee: 5, ranged: 0 });
  });

  it("should stack a range's typed add with a general one of the same type", () => {
    const rules = [
      { mode: "add", value: 5, type: "spell" },
      { mode: "add", value: 3, type: "spell", range: "melee" }
    ];
    const out = getArmorTn({ ...pc, rules });
    expect(out.current).toBe(30);
    expect(out.vs, "the +5 of the type already counts").toEqual({ melee: 0, ranged: 0 });
  });

  // #171: Blinded (Reflexes 3: base 8) and Prone (-10 against melee), no armor
  // game-rules/41_conditional_effects.md, p.89
  it("should never go below 5 against one range", () => {
    const out = getArmorTn({
      base: 20,
      armor: 0,
      other: 0,
      stack,
      rules: [
        { mode: "base", value: 8 },
        { mode: "add", value: -10, range: "melee" }
      ]
    });
    expect(out.current).toBe(8);
    expect(out.current + out.vs.melee).toBe(5);
  });

  it("should floor the Armor TN against a range after its add, not before", () => {
    const out = getArmorTn({
      base: 5,
      armor: 0,
      other: 0,
      stack,
      rules: [
        { mode: "add", value: -10 },
        { mode: "add", value: 15, range: "ranged" }
      ]
    });
    expect(out.current).toBe(5);
    expect(out.current + out.vs.ranged, "5 - 10 + 15").toBe(10);
  });
});
