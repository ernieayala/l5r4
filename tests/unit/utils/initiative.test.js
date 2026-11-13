import { describe, expect, it } from "vitest";
import { initiativeDice, initiativeFormula } from "../../../module/utils/initiative.js";

describe("initiativeDice (Core Rulebook p.81)", () => {
  it("rolls Insight Rank + Reflexes and keeps Reflexes", () => {
    expect(initiativeDice({ insightRank: 1, reflexes: 2 })).toEqual({ roll: 3, keep: 2 });
    expect(initiativeDice({ insightRank: 3, reflexes: 4 })).toEqual({ roll: 7, keep: 4 });
  });

  it("adds the rolled and kept modifiers", () => {
    expect(initiativeDice({ insightRank: 1, reflexes: 3, rollMod: 2, keepMod: -1 })).toEqual({
      roll: 6,
      keep: 2
    });
  });

  it("builds pools above ten dice before the Ten Dice Rule", () => {
    expect(initiativeDice({ insightRank: 6, reflexes: 10 })).toEqual({ roll: 16, keep: 10 });
  });
});

describe("initiativeFormula", () => {
  it("rolls a pool within the cap as it is, with exploding tens and no +0", () => {
    expect(initiativeFormula({ roll: 4, keep: 3 })).toBe("4d10k3x10");
  });

  it("adds a positive or negative flat bonus", () => {
    expect(initiativeFormula({ roll: 4, keep: 3, bonus: 5 })).toBe("4d10k3x10+5");
    expect(initiativeFormula({ roll: 4, keep: 3, bonus: -3 })).toBe("4d10k3x10-3");
  });

  it("adds a Void Point's +10 (p.78) to the modifiers", () => {
    expect(initiativeFormula({ roll: 5, keep: 3, bonus: 2 + 10 })).toBe("5d10k3x10+12");
  });

  it("applies the Ten Dice Rule (p.77): an Insight Rank 6, Reflexes 10 PC rolls 10k10 + 12", () => {
    expect(initiativeFormula({ roll: 16, keep: 10 })).toBe("10d10k10x10+12");
  });

  it("applies the Ten Dice Rule: 12k4 rolls 10k5", () => {
    expect(initiativeFormula({ roll: 12, keep: 4 })).toBe("10d10k5x10");
  });

  it("applies the Little Truths exception when asked", () => {
    expect(initiativeFormula({ roll: 12, keep: 4 }, { littleTruths: true })).toBe("10d10k5x10+2");
  });

  it("gives a custom NPC pool of 3k2 its own formula", () => {
    expect(initiativeFormula({ roll: 3, keep: 2 })).toBe("3d10k2x10");
  });
});
