import { describe, expect, it } from "vitest";
import { applyTenDiceRule } from "../../../module/utils/ten-dice.js";

describe("applyTenDiceRule", () => {
  describe("the book's examples (Core Rulebook p.77)", () => {
    it("12k4 becomes 10k5", () => {
      expect(applyTenDiceRule(12, 4)).toEqual({ diceRoll: 10, diceKeep: 5, bonus: 0 });
    });

    it("13k9 becomes 10k10 + 2", () => {
      expect(applyTenDiceRule(13, 9)).toEqual({ diceRoll: 10, diceKeep: 10, bonus: 2 });
    });

    it("10k12 becomes 10k10 + 4", () => {
      expect(applyTenDiceRule(10, 12)).toEqual({ diceRoll: 10, diceKeep: 10, bonus: 4 });
    });

    it("14k12 becomes 10k10 + 12", () => {
      expect(applyTenDiceRule(14, 12)).toEqual({ diceRoll: 10, diceKeep: 10, bonus: 12 });
    });
  });

  it("turns each extra rolled die into +2 once kept dice are already ten", () => {
    expect(applyTenDiceRule(12, 10)).toEqual({ diceRoll: 10, diceKeep: 10, bonus: 4 });
  });

  it("converts rolled dice to kept only until kept reaches ten; each rolled die after that is +2 (p.77)", () => {
    // 15k9: one pair makes 10k10, then the 3 rolled dice left are +2 each
    expect(applyTenDiceRule(15, 9)).toEqual({ diceRoll: 10, diceKeep: 10, bonus: 6 });
    // 14k9 and 12k10 are the same pool once one pair converts
    expect(applyTenDiceRule(14, 9)).toEqual({ diceRoll: 10, diceKeep: 10, bonus: 4 });
    expect(applyTenDiceRule(30, 2)).toEqual({ diceRoll: 10, diceKeep: 10, bonus: 8 });
  });

  it("never keeps more dice than it rolls (p.89), above ten kept as well", () => {
    expect(applyTenDiceRule(8, 12)).toEqual({ diceRoll: 8, diceKeep: 8, bonus: 0 });
    expect(applyTenDiceRule(9, 11)).toEqual({ diceRoll: 9, diceKeep: 9, bonus: 0 });
  });

  it("adds the conversions to the bonus it is given", () => {
    expect(applyTenDiceRule(10, 12, 3)).toEqual({ diceRoll: 10, diceKeep: 10, bonus: 7 });
  });

  it("leaves a pool within the cap alone", () => {
    expect(applyTenDiceRule(7, 3, -2)).toEqual({ diceRoll: 7, diceKeep: 3, bonus: -2 });
  });

  it("raises a pool below 1k1 to 1k1 and keeps no more than it rolls", () => {
    expect(applyTenDiceRule(0, -1)).toEqual({ diceRoll: 1, diceKeep: 1, bonus: 0 });
    expect(applyTenDiceRule(3, 5)).toEqual({ diceRoll: 3, diceKeep: 3, bonus: 0 });
  });

  describe("Little Truths exception (house rule)", () => {
    it("adds 2 when the kept dice end below ten", () => {
      expect(applyTenDiceRule(12, 4, 0, { littleTruths: true })).toEqual({
        diceRoll: 10,
        diceKeep: 5,
        bonus: 2
      });
    });

    it("adds nothing to a pool the rule did not convert", () => {
      expect(applyTenDiceRule(3, 2, 0, { littleTruths: true })).toEqual({
        diceRoll: 3,
        diceKeep: 2,
        bonus: 0
      });
    });

    it("adds nothing once the kept dice reach ten", () => {
      expect(applyTenDiceRule(13, 9, 0, { littleTruths: true })).toEqual({
        diceRoll: 10,
        diceKeep: 10,
        bonus: 2
      });
    });
  });
});
