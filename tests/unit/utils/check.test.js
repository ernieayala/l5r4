import { describe, expect, it } from "vitest";
import {
  buildPool,
  getContestResult,
  getCheckResult,
  getMaxRaises,
  parseRollAndKeep,
  getPoolFormula,
  getTn
} from "../../../module/utils/check.js";

const pool = spec => buildPool(spec);

describe("buildPool", () => {
  // The book's example: Kyujutsu 4, Reflexes 3 is 7k3
  // game-rules/27_skills_in_rolls.md, p.79
  it("should roll Skill + Trait and keep the Trait", () => {
    expect(pool({ roll: 7, keep: 3 })).toEqual({
      roll: 7,
      keep: 3,
      bonus: 0,
      explode: 10,
      rerollOnes: false
    });
  });

  it("should stack typed modifiers as a sheet does: the best of each type, untyped all add", () => {
    const modifiers = [
      { roll: 1, keep: 1, type: "kata" },
      { roll: 1, keep: 1, type: "kata" },
      { roll: 1 }
    ];
    expect(pool({ roll: 5, keep: 3, modifiers })).toMatchObject({ roll: 7, keep: 4 });
  });

  // The book's example: Dazed, 6k4 rolls 3k3
  // game-rules/41_conditional_effects.md, p.89
  it("should keep no more dice than it rolls after a penalty", () => {
    expect(pool({ roll: 6, keep: 4, modifiers: [{ roll: -3 }] })).toMatchObject({
      roll: 3,
      keep: 3
    });
  });

  // The book's example: Fire 3, Rank 1 is 4k3
  // game-rules/29_types_of_rolls.md, p.80
  it("should cast with Ring + School Rank, keeping the Ring", () => {
    expect(pool({ roll: 3 + 1, keep: 3 })).toMatchObject({ roll: 4, keep: 3 });
  });

  // The book's example: a dai tsuchi 5k2 with Strength 3 is 8k2
  // game-rules/29_types_of_rolls.md, p.80
  it("should add Strength to a weapon's rolled dice for damage", () => {
    expect(pool({ roll: 5 + 3, keep: 2 })).toMatchObject({ roll: 8, keep: 2 });
  });

  // game-rules/25_rings_and_traits.md, p.78
  it("should add a Void Point as +1k1", () => {
    expect(pool({ roll: 5, keep: 2, voidPoint: true })).toMatchObject({ roll: 6, keep: 3 });
  });

  it("should add enabled modifiers and skip disabled ones", () => {
    const modifiers = [{ roll: 2, keep: 1 }, { roll: 1, total: 5, enabled: false }, { total: -3 }];
    expect(pool({ roll: 5, keep: 2, modifiers })).toMatchObject({ roll: 7, keep: 3, bonus: -3 });
  });

  // game-rules/26_special_dice_rules.md, p.77
  it("should apply the Ten Dice Rule after every modifier", () => {
    expect(pool({ roll: 10, keep: 4, modifiers: [{ roll: 2 }] })).toMatchObject({
      roll: 10,
      keep: 5,
      bonus: 0
    });
    expect(pool({ roll: 12, keep: 8, voidPoint: true })).toMatchObject({
      roll: 10,
      keep: 10,
      bonus: 2
    });
    expect(pool({ roll: 14, keep: 12 })).toMatchObject({ roll: 10, keep: 10, bonus: 12 });
  });

  // game-rules/26_special_dice_rules.md, p.77
  // #14
  it("should apply the Ten Dice Rule to a pool its modifiers push past ten: 8k3 + 4k2 is 10k6", () => {
    expect(pool({ roll: 8, keep: 3, modifiers: [{ roll: 4, keep: 2 }] })).toMatchObject({
      roll: 10,
      keep: 6,
      bonus: 0
    });
  });

  // game-rules/30_skill_rolls_expanded.md, p.80
  it("should never explode an Unskilled Roll, even with a Void Point", () => {
    expect(pool({ roll: 3, keep: 3, unskilled: true, voidPoint: true })).toMatchObject({
      roll: 4,
      keep: 4,
      explode: null
    });
  });

  // game-rules/58_skills_overview.md, p.133
  it("should keep a lower explode threshold and re-roll 1s for an Emphasis", () => {
    expect(pool({ roll: 5, keep: 2, explode: 9, rerollOnes: true })).toMatchObject({
      explode: 9,
      rerollOnes: true
    });
  });

  // game-rules/23_roll_and_keep.md, p.75
  it("should let the roller keep fewer dice, never more", () => {
    expect(pool({ roll: 4, keep: 2, keepOverride: 1 })).toMatchObject({ keep: 1 });
    expect(pool({ roll: 4, keep: 2, keepOverride: 3 })).toMatchObject({ keep: 2 });
  });
});

describe("getPoolFormula", () => {
  it("should write roll, keep, explosions, and bonus", () => {
    expect(getPoolFormula(pool({ roll: 7, keep: 3 }))).toBe("7d10xa10k3+0");
    expect(getPoolFormula(pool({ roll: 14, keep: 12 }))).toBe("10d10xa10k10+12");
  });

  it("should re-roll 1s before keeping, and write a lower threshold as x>=N", () => {
    expect(getPoolFormula(pool({ roll: 5, keep: 2, rerollOnes: true, explode: 9 }))).toBe(
      "5d10r1xa>=9k2+0"
    );
  });

  it("should leave out explosions for an Unskilled Roll and keep a negative bonus's sign", () => {
    expect(getPoolFormula(pool({ roll: 3, keep: 3, unskilled: true, bonus: -1 }))).toBe("3d10k3-1");
  });
});

describe("getMaxRaises", () => {
  // game-rules/28_raises.md, p.79
  // game-rules/30_skill_rolls_expanded.md, p.80
  it("should allow Raises up to the Void Ring, none Unskilled", () => {
    expect(getMaxRaises(2)).toBe(2);
    expect(getMaxRaises(3, true)).toBe(0);
    expect(getMaxRaises(-1)).toBe(0);
  });
});

describe("getTn", () => {
  // game-rules/28_raises.md, p.79
  it("should add 5 per Raise", () => {
    expect(getTn({ base: 20, raises: 2 })).toBe(30);
  });

  // game-rules/28_raises.md, p.79
  it("should take 5 off per Free Raise spent on the TN", () => {
    expect(getTn({ base: 20, freeRaisesToTn: 1 })).toBe(15);
  });

  // Nicked is +3
  // game-rules/33_wounds.md, p.82
  it("should add the Wound Rank's penalty", () => {
    expect(getTn({ base: 15, woundPenalty: 3 })).toBe(18);
  });

  it("should add other TN modifiers and never go below 0", () => {
    expect(getTn({ base: 10, modifiers: [5, -2] })).toBe(13);
    expect(getTn({ base: 5, freeRaisesToTn: 3 })).toBe(0);
  });

  it("should give no TN to a roll with no TN and no Raises", () => {
    expect(getTn({ base: 0, woundPenalty: 10 })).toBeNull();
    expect(getTn({ base: 0, raises: 1 })).toBe(5);
  });
});

describe("getCheckResult", () => {
  // The book's example: 27 against 20 strikes
  // game-rules/23_roll_and_keep.md, p.75
  // game-rules/28_raises.md, p.79
  it("should succeed on meeting the TN", () => {
    expect(getCheckResult(27, 20)).toEqual({ success: true, margin: 7 });
    expect(getCheckResult(20, 20)).toEqual({ success: true, margin: 0 });
  });

  // game-rules/28_raises.md, p.79
  it("should fail short of a raised TN even above the original", () => {
    expect(getCheckResult(22, getTn({ base: 20, raises: 1 }))).toEqual({
      success: false,
      margin: -3
    });
  });

  it("should evaluate nothing without a TN", () => {
    expect(getCheckResult(14, null)).toBeNull();
  });
});

describe("contest", () => {
  // game-rules/29_types_of_rolls.md, p.80
  it("should give the win to the higher total", () => {
    expect(
      getContestResult([
        { id: "a", total: 21 },
        { id: "b", total: 17 }
      ])
    ).toMatchObject({
      winner: "a",
      tie: false
    });
  });

  it("should call a tie for a re-roll", () => {
    expect(
      getContestResult([
        { id: "a", total: 17 },
        { id: "b", total: 17 }
      ])
    ).toMatchObject({
      winner: null,
      tie: true
    });
  });

  // game-rules/29_types_of_rolls.md, p.80
  it("should make a roller with Raises beat the other by 5 per Raise", () => {
    expect(
      getContestResult([
        { id: "a", total: 22, raises: 1 },
        { id: "b", total: 18 }
      ])
    ).toMatchObject({
      winner: "b"
    });
    expect(
      getContestResult([
        { id: "a", total: 24, raises: 1 },
        { id: "b", total: 18 }
      ])
    ).toMatchObject({
      winner: "a"
    });
  });

  // Ernie's ruling
  // game-rules/29_types_of_rolls.md, p.80
  it("should give the win to a raiser who beats the other by exactly 5 per Raise", () => {
    expect(
      getContestResult([
        { id: "a", total: 22, raises: 1 },
        { id: "b", total: 17 }
      ])
    ).toMatchObject({ winner: "a", tie: false });
    expect(
      getContestResult([
        { id: "a", total: 27, raises: 2 },
        { id: "b", total: 17 }
      ])
    ).toMatchObject({ winner: "a", tie: false });
  });

  // game-rules/29_types_of_rolls.md, p.80
  it("should pick the highest of several", () => {
    expect(
      getContestResult([
        { id: "a", total: 12 },
        { id: "b", total: 30 },
        { id: "c", total: 25 }
      ]).winner
    ).toBe("b");
  });
});

describe("parseRollAndKeep", () => {
  it("should parse plain, bonus, Unskilled, Emphasis, and explode-threshold notation", () => {
    expect(parseRollAndKeep("7k3")).toEqual({
      roll: 7,
      keep: 3,
      bonus: 0,
      unskilled: false,
      rerollOnes: false,
      explode: 10
    });
    expect(parseRollAndKeep("e7k3+5")).toMatchObject({ rerollOnes: true, bonus: 5 });
    expect(parseRollAndKeep("u3k3")).toMatchObject({ unskilled: true });
    expect(parseRollAndKeep("7k3x9-2+1")).toMatchObject({ explode: 9, bonus: -1 });
  });

  it("should reject anything else", () => {
    expect(parseRollAndKeep("1d20")).toBeNull();
    expect(parseRollAndKeep("7k")).toBeNull();
    expect(parseRollAndKeep("hello 7k3")).toBeNull();
  });

  // B9 in roadmap/AUTOMATION.md
  it("should feed the same pool and formula as a rolled check", () => {
    const parsed = parseRollAndKeep("12k4+1");
    expect(getPoolFormula(buildPool(parsed))).toBe("10d10xa10k5+1");
  });
});
