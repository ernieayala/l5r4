import { describe, expect, it } from "vitest";
import { initiativeDice, initiativeFormula } from "../../../module/utils/initiative.js";

// game-rules/31_combat_round.md, p.81
describe("initiativeDice", () => {
  it("should roll Insight Rank + Reflexes and keep Reflexes", () => {
    expect(initiativeDice({ insightRank: 1, reflexes: 2 })).toEqual({ roll: 3, keep: 2 });
    expect(initiativeDice({ insightRank: 3, reflexes: 4 })).toEqual({ roll: 7, keep: 4 });
  });

  it("should add the rolled and kept modifiers", () => {
    expect(initiativeDice({ insightRank: 1, reflexes: 3, rollMod: 2, keepMod: -1 })).toEqual({
      roll: 6,
      keep: 2
    });
  });

  it("should build pools above ten dice before the Ten Dice Rule", () => {
    expect(initiativeDice({ insightRank: 6, reflexes: 10 })).toEqual({ roll: 16, keep: 10 });
  });
});

describe("initiativeFormula", () => {
  // game-rules/26_special_dice_rules.md, p.77
  // #10
  it("should roll a pool within the cap as it is, with exploding tens and no +0", () => {
    expect(initiativeFormula({ roll: 4, keep: 3 })).toBe("4d10xa10k3");
  });

  it("should add a positive or negative flat bonus", () => {
    expect(initiativeFormula({ roll: 4, keep: 3, bonus: 5 })).toBe("4d10xa10k3+5");
    expect(initiativeFormula({ roll: 4, keep: 3, bonus: -3 })).toBe("4d10xa10k3-3");
  });

  // game-rules/25_rings_and_traits.md, p.78
  it("should add a Void Point's +10 to the modifiers", () => {
    expect(initiativeFormula({ roll: 5, keep: 3, bonus: 2 + 10 })).toBe("5d10xa10k3+12");
  });

  // game-rules/26_special_dice_rules.md, p.77
  it("should apply the Ten Dice Rule: an Insight Rank 6, Reflexes 10 PC rolls 10k10 + 12", () => {
    expect(initiativeFormula({ roll: 16, keep: 10 })).toBe("10d10xa10k10+12");
  });

  it("should apply the Ten Dice Rule: 12k4 rolls 10k5", () => {
    expect(initiativeFormula({ roll: 12, keep: 4 })).toBe("10d10xa10k5");
  });

  it("should apply the Little Truths exception when asked", () => {
    expect(initiativeFormula({ roll: 12, keep: 4 }, { littleTruths: true })).toBe("10d10xa10k5+2");
  });

  it("should give a custom NPC pool of 3k2 its own formula", () => {
    expect(initiativeFormula({ roll: 3, keep: 2 })).toBe("3d10xa10k2");
  });
});
