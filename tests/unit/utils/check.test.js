import { describe, expect, it } from "vitest";
import {
  buildPool,
  contest,
  evaluateCheck,
  maxRaises,
  parseRollAndKeep,
  poolFormula,
  targetNumber
} from "../../../module/utils/check.js";

const pool = spec => buildPool(spec);

describe("buildPool", () => {
  it("rolls Skill + Trait and keeps the Trait (p.79: Kyujutsu 4, Reflexes 3 is 7k3)", () => {
    expect(pool({ roll: 7, keep: 3 })).toEqual({
      roll: 7,
      keep: 3,
      bonus: 0,
      explode: 10,
      rerollOnes: false
    });
  });

  it("casts with Ring + School Rank, keeping the Ring (p.80: Fire 3, Rank 1 is 4k3)", () => {
    expect(pool({ roll: 3 + 1, keep: 3 })).toMatchObject({ roll: 4, keep: 3 });
  });

  it("adds Strength to a weapon's rolled dice for damage (p.80: dai tsuchi 5k2, Strength 3 is 8k2)", () => {
    expect(pool({ roll: 5 + 3, keep: 2 })).toMatchObject({ roll: 8, keep: 2 });
  });

  it("adds a Void Point as +1k1 (p.78)", () => {
    expect(pool({ roll: 5, keep: 2, voidPoint: true })).toMatchObject({ roll: 6, keep: 3 });
  });

  it("adds enabled modifiers and skips disabled ones", () => {
    const modifiers = [{ roll: 2, keep: 1 }, { roll: 1, total: 5, enabled: false }, { total: -3 }];
    expect(pool({ roll: 5, keep: 2, modifiers })).toMatchObject({ roll: 7, keep: 3, bonus: -3 });
  });

  it("applies the Ten Dice Rule after every modifier (p.77)", () => {
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

  it("never explodes an Unskilled Roll, even with a Void Point (p.80)", () => {
    expect(pool({ roll: 3, keep: 3, unskilled: true, voidPoint: true })).toMatchObject({
      roll: 4,
      keep: 4,
      explode: null
    });
  });

  it("keeps a lower explode threshold and re-rolls 1s for an Emphasis (p.133)", () => {
    expect(pool({ roll: 5, keep: 2, explode: 9, rerollOnes: true })).toMatchObject({
      explode: 9,
      rerollOnes: true
    });
  });

  it("lets the roller keep fewer dice, never more (p.75)", () => {
    expect(pool({ roll: 4, keep: 2, keepOverride: 1 })).toMatchObject({ keep: 1 });
    expect(pool({ roll: 4, keep: 2, keepOverride: 3 })).toMatchObject({ keep: 2 });
  });
});

describe("poolFormula", () => {
  it("writes roll, keep, explosions, and bonus", () => {
    expect(poolFormula(pool({ roll: 7, keep: 3 }))).toBe("7d10k3x10+0");
    expect(poolFormula(pool({ roll: 14, keep: 12 }))).toBe("10d10k10x10+12");
  });

  it("re-rolls 1s before keeping, and writes a lower threshold as x>=N", () => {
    expect(poolFormula(pool({ roll: 5, keep: 2, rerollOnes: true, explode: 9 }))).toBe(
      "5d10r1k2x>=9+0"
    );
  });

  it("leaves out explosions for an Unskilled Roll and keeps a negative bonus's sign", () => {
    expect(poolFormula(pool({ roll: 3, keep: 3, unskilled: true, bonus: -1 }))).toBe("3d10k3-1");
  });
});

describe("maxRaises", () => {
  it("allows Raises up to the Void Ring (p.79), none Unskilled (p.80)", () => {
    expect(maxRaises(2)).toBe(2);
    expect(maxRaises(3, true)).toBe(0);
    expect(maxRaises(-1)).toBe(0);
  });
});

describe("targetNumber", () => {
  it("adds 5 per Raise (p.79)", () => {
    expect(targetNumber({ base: 20, raises: 2 })).toBe(30);
  });

  it("takes 5 off per Free Raise spent on the TN (p.79)", () => {
    expect(targetNumber({ base: 20, freeRaisesToTN: 1 })).toBe(15);
  });

  it("adds the Wound Rank's penalty (p.82: Nicked +3)", () => {
    expect(targetNumber({ base: 15, woundPenalty: 3 })).toBe(18);
  });

  it("adds other TN modifiers and never goes below 0", () => {
    expect(targetNumber({ base: 10, modifiers: [5, -2] })).toBe(13);
    expect(targetNumber({ base: 5, freeRaisesToTN: 3 })).toBe(0);
  });

  it("gives no TN to a roll with no TN and no Raises", () => {
    expect(targetNumber({ base: 0, woundPenalty: 10 })).toBeNull();
    expect(targetNumber({ base: 0, raises: 1 })).toBe(5);
  });
});

describe("evaluateCheck", () => {
  it("succeeds on meeting the TN (p.75: 27 against 20 strikes, p.79)", () => {
    expect(evaluateCheck(27, 20)).toEqual({ success: true, margin: 7 });
    expect(evaluateCheck(20, 20)).toEqual({ success: true, margin: 0 });
  });

  it("fails short of a raised TN even above the original (p.79)", () => {
    expect(evaluateCheck(22, targetNumber({ base: 20, raises: 1 }))).toEqual({
      success: false,
      margin: -3
    });
  });

  it("evaluates nothing without a TN", () => {
    expect(evaluateCheck(14, null)).toBeNull();
  });
});

describe("contest", () => {
  it("gives the win to the higher total (p.80)", () => {
    expect(
      contest([
        { id: "a", total: 21 },
        { id: "b", total: 17 }
      ])
    ).toMatchObject({
      winner: "a",
      tie: false
    });
  });

  it("calls a tie for a re-roll", () => {
    expect(
      contest([
        { id: "a", total: 17 },
        { id: "b", total: 17 }
      ])
    ).toMatchObject({
      winner: null,
      tie: true
    });
  });

  it("makes a roller with Raises beat the other by 5 per Raise (p.80)", () => {
    expect(
      contest([
        { id: "a", total: 22, raises: 1 },
        { id: "b", total: 18 }
      ])
    ).toMatchObject({
      winner: "b"
    });
    expect(
      contest([
        { id: "a", total: 24, raises: 1 },
        { id: "b", total: 18 }
      ])
    ).toMatchObject({
      winner: "a"
    });
  });

  it("picks the highest of several (p.80)", () => {
    expect(
      contest([
        { id: "a", total: 12 },
        { id: "b", total: 30 },
        { id: "c", total: 25 }
      ]).winner
    ).toBe("b");
  });
});

describe("parseRollAndKeep", () => {
  it("parses plain, bonus, Unskilled, Emphasis, and explode-threshold notation", () => {
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

  it("rejects anything else", () => {
    expect(parseRollAndKeep("1d20")).toBeNull();
    expect(parseRollAndKeep("7k")).toBeNull();
    expect(parseRollAndKeep("hello 7k3")).toBeNull();
  });

  it("feeds the same pool and formula as a rolled check (B9)", () => {
    const parsed = parseRollAndKeep("12k4+1");
    expect(poolFormula(buildPool(parsed))).toBe("10d10k5x10+1");
  });
});
