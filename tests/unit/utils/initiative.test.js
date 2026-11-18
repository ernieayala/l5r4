import { describe, expect, it } from "vitest";
import {
  formatInitiativePool,
  getInitiativePool,
  getInitiativeFormula
} from "../../../module/utils/initiative.js";

// game-rules/31_combat_round.md, p.81
describe("getInitiativePool", () => {
  it("should roll Insight Rank + Reflexes and keep Reflexes", () => {
    expect(getInitiativePool({ insightRank: 1, reflexes: 2 })).toEqual({ roll: 3, keep: 2 });
    expect(getInitiativePool({ insightRank: 3, reflexes: 4 })).toEqual({ roll: 7, keep: 4 });
  });

  it("should add the rolled and kept modifiers", () => {
    expect(getInitiativePool({ insightRank: 1, reflexes: 3, rollMod: 2, keepMod: -1 })).toEqual({
      roll: 6,
      keep: 2
    });
  });

  it("should build pools above ten dice before the Ten Dice Rule", () => {
    expect(getInitiativePool({ insightRank: 6, reflexes: 10 })).toEqual({ roll: 16, keep: 10 });
  });
});

describe("getInitiativeFormula", () => {
  // game-rules/26_special_dice_rules.md, p.77
  // #10
  it("should roll a pool within the cap as it is, with exploding tens and no +0", () => {
    expect(getInitiativeFormula({ roll: 4, keep: 3 })).toBe("4d10xa10k3");
  });

  it("should add a positive or negative flat bonus", () => {
    expect(getInitiativeFormula({ roll: 4, keep: 3, bonus: 5 })).toBe("4d10xa10k3+5");
    expect(getInitiativeFormula({ roll: 4, keep: 3, bonus: -3 })).toBe("4d10xa10k3-3");
  });

  // game-rules/25_rings_and_traits.md, p.78
  it("should add a Void Point's +10 to the modifiers", () => {
    expect(getInitiativeFormula({ roll: 5, keep: 3, bonus: 2 + 10 })).toBe("5d10xa10k3+12");
  });

  // game-rules/26_special_dice_rules.md, p.77
  it("should apply the Ten Dice Rule: an Insight Rank 6, Reflexes 10 PC rolls 10k10 + 12", () => {
    expect(getInitiativeFormula({ roll: 16, keep: 10 })).toBe("10d10xa10k10+12");
  });

  it("should apply the Ten Dice Rule: 12k4 rolls 10k5", () => {
    expect(getInitiativeFormula({ roll: 12, keep: 4 })).toBe("10d10xa10k5");
  });

  it("should apply the Little Truths exception when asked", () => {
    expect(getInitiativeFormula({ roll: 12, keep: 4 }, { littleTruths: true })).toBe(
      "10d10xa10k5+2"
    );
  });

  it("should give a custom NPC pool of 3k2 its own formula", () => {
    expect(getInitiativeFormula({ roll: 3, keep: 2 })).toBe("3d10xa10k2");
  });
});

// #79: the sheet's pool reads XkY with a signed bonus (docs/design-system/content/voice.md, Numbers and dice)
describe("formatInitiativePool", () => {
  const pool = { roll: 5, keep: 3, totalMod: 0, useVoid: false };

  it("should leave a zero bonus out", () => {
    expect(formatInitiativePool(pool)).toBe("5k3");
  });

  it("should sign a positive bonus and keep a negative one's minus, never +-", () => {
    expect(formatInitiativePool({ ...pool, totalMod: 3 })).toBe("5k3+3");
    expect(formatInitiativePool({ ...pool, totalMod: -2 })).toBe("5k3-2");
  });

  // game-rules/25_rings_and_traits.md, p.78
  it("should add a marked Void Point's +10", () => {
    expect(formatInitiativePool({ ...pool, useVoid: true })).toBe("5k3+10");
    expect(formatInitiativePool({ ...pool, totalMod: -12, useVoid: true })).toBe("5k3-2");
  });
});
