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

    it("adds nothing once the kept dice reach ten", () => {
      expect(applyTenDiceRule(13, 9, 0, { littleTruths: true })).toEqual({
        diceRoll: 10,
        diceKeep: 10,
        bonus: 2
      });
    });
  });
});
