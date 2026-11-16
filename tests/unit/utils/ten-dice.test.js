import { describe, expect, it } from "vitest";
import { applyTenDiceRule } from "../../../module/utils/ten-dice.js";

describe("applyTenDiceRule", () => {
  describe("Book example: the Ten Dice Rule (p.77)", () => {
    it("should turn 12k4 into 10k5", () => {
      expect(applyTenDiceRule(12, 4)).toEqual({ roll: 10, keep: 5, bonus: 0 });
    });

    it("should turn 13k9 into 10k10 + 2", () => {
      expect(applyTenDiceRule(13, 9)).toEqual({ roll: 10, keep: 10, bonus: 2 });
    });

    it("should turn 10k12 into 10k10 + 4", () => {
      expect(applyTenDiceRule(10, 12)).toEqual({ roll: 10, keep: 10, bonus: 4 });
    });

    it("should turn 14k12 into 10k10 + 12", () => {
      expect(applyTenDiceRule(14, 12)).toEqual({ roll: 10, keep: 10, bonus: 12 });
    });
  });

  it("should turn each extra rolled die into +2 once kept dice are already ten", () => {
    expect(applyTenDiceRule(12, 10)).toEqual({ roll: 10, keep: 10, bonus: 4 });
  });

  // game-rules/26_special_dice_rules.md, p.77
  it("should convert rolled dice to kept only until kept reaches ten, then make each rolled die +2", () => {
    // 15k9: one pair makes 10k10, then the 3 rolled dice left are +2 each
    expect(applyTenDiceRule(15, 9)).toEqual({ roll: 10, keep: 10, bonus: 6 });
    // 14k9 and 12k10 are the same pool once one pair converts
    expect(applyTenDiceRule(14, 9)).toEqual({ roll: 10, keep: 10, bonus: 4 });
    expect(applyTenDiceRule(30, 2)).toEqual({ roll: 10, keep: 10, bonus: 8 });
  });

  // game-rules/41_conditional_effects.md, p.89
  it("should never keep more dice than it rolls, above ten kept as well", () => {
    expect(applyTenDiceRule(8, 12)).toEqual({ roll: 8, keep: 8, bonus: 0 });
    expect(applyTenDiceRule(9, 11)).toEqual({ roll: 9, keep: 9, bonus: 0 });
  });

  it("should add the conversions to the bonus it is given", () => {
    expect(applyTenDiceRule(10, 12, 3)).toEqual({ roll: 10, keep: 10, bonus: 7 });
  });

  it("should leave a pool within the cap alone", () => {
    expect(applyTenDiceRule(7, 3, -2)).toEqual({ roll: 7, keep: 3, bonus: -2 });
  });

  it("should raise a pool below 1k1 to 1k1 and keep no more than it rolls", () => {
    expect(applyTenDiceRule(0, -1)).toEqual({ roll: 1, keep: 1, bonus: 0 });
    expect(applyTenDiceRule(3, 5)).toEqual({ roll: 3, keep: 3, bonus: 0 });
  });

  // The Little Truths exception, a house rule
  describe("littleTruths", () => {
    it("should add 2 when the kept dice end below ten", () => {
      expect(applyTenDiceRule(12, 4, 0, { littleTruths: true })).toEqual({
        roll: 10,
        keep: 5,
        bonus: 2
      });
    });

    it("should add nothing to a pool the rule did not convert", () => {
      expect(applyTenDiceRule(3, 2, 0, { littleTruths: true })).toEqual({
        roll: 3,
        keep: 2,
        bonus: 0
      });
    });

    it("should add nothing once the kept dice reach ten", () => {
      expect(applyTenDiceRule(13, 9, 0, { littleTruths: true })).toEqual({
        roll: 10,
        keep: 10,
        bonus: 2
      });
    });
  });
});
