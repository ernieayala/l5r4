import { describe, expect, it } from "vitest";
import { nextSaveTn, periodKey, resolveArmorTn, usesSpent } from "../../../module/utils/effects.js";
import { stackModifiers } from "../../../module/utils/modifier-stacking.js";

const stack = stackModifiers;

describe("nextSaveTn", () => {
  it("drops a Dazed save by 5 after each failure and stops at 5 (p.89, decision 5)", () => {
    const tns = [20];
    for (let i = 0; i < 4; i++) {
      tns.push(nextSaveTn(tns.at(-1), -5, 5));
    }
    expect(tns).toEqual([20, 15, 10, 5, 5]);
  });
});

describe("periodKey", () => {
  const now = { combatId: "c1", round: 2, turn: 3, worldTime: 90000, secondsPerDay: 86400 };

  it("keys turn, round, and skirmish by the combat", () => {
    expect(periodKey("turn", now)).toBe("c1:2:3");
    expect(periodKey("round", now)).toBe("c1:2");
    expect(periodKey("skirmish", now)).toBe("c1");
  });

  it("has no combat key outside combat", () => {
    expect(periodKey("round", { worldTime: 0 })).toBeNull();
  });

  it("keys a day by world time", () => {
    expect(periodKey("day", now)).toBe("day:1");
    expect(periodKey("day", { worldTime: 86399 })).toBe("day:0");
  });

  it("rejects an unknown period", () => {
    expect(() => periodKey("week", now)).toThrow();
  });
});

describe("usesSpent", () => {
  it("counts uses stored in the same period", () => {
    expect(usesSpent({ key: "c1:2", count: 1 }, "c1:2")).toBe(1);
  });

  it("resets when the period changes, with no event", () => {
    expect(usesSpent({ key: "c1:1", count: 1 }, "c1:2")).toBe(0);
  });

  it("counts nothing without a period or a store", () => {
    expect(usesSpent({ key: "c1:2", count: 1 }, null)).toBe(0);
    expect(usesSpent(undefined, "c1:2")).toBe(0);
  });
});

describe("resolveArmorTn", () => {
  // Reflexes 3: base 3 × 5 + 5 = 20 (p.82); light armor +5
  const pc = { base: 20, armor: 5, other: 0, stack };

  it("adds stances and other effects (Full Attack -10, p.84)", () => {
    expect(resolveArmorTn({ ...pc, rules: [{ mode: "add", value: -10 }] }).current).toBe(15);
  });

  it("Blinded replaces only the base with Reflexes + 5; armor and stances still add (p.89, decision 3)", () => {
    const out = resolveArmorTn({
      ...pc,
      rules: [
        { mode: "base", value: 8 },
        { mode: "add", value: 5 }
      ]
    });
    expect(out.current).toBe(8 + 5 + 5);
    expect(out.base).toBe(8);
  });

  it("Stunned and Grappled set 5 plus armor and ignore everything else (p.89, decision 3)", () => {
    const out = resolveArmorTn({
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

  it("keeps a range-limited add out of the Armor TN and returns it for the attacker (Prone, p.89)", () => {
    const out = resolveArmorTn({ ...pc, rules: [{ mode: "add", value: -10, range: "melee" }] });
    expect(out.current).toBe(25);
    expect(out.vs).toEqual({ melee: -10, ranged: 0 });
  });

  it("stacks typed adds: the largest bonus of a type", () => {
    const rules = [
      { mode: "add", value: 3, type: "kata" },
      { mode: "add", value: 4, type: "kata" }
    ];
    expect(resolveArmorTn({ ...pc, rules }).current).toBe(29);
  });

  it("never goes below 5", () => {
    expect(
      resolveArmorTn({ base: 5, armor: 0, other: 0, stack, rules: [{ mode: "add", value: -10 }] })
        .current
    ).toBe(5);
  });
});
