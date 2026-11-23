import { describe, expect, it } from "vitest";
import { MAX_RAISES } from "../../../module/config/game-mechanics.js";
import { validateAttackRaises } from "../../../module/utils/validators.js";

describe("validateAttackRaises", () => {
  it("should accept matching Raises and return them", () => {
    expect(validateAttackRaises(2, 2)).toEqual({ valid: true, sanitized: 2 });
  });

  it("should refuse values that are not finite numbers with an i18n key", () => {
    expect(validateAttackRaises(Infinity, 2)).toEqual({
      valid: false,
      error: "l5r4.ui.combat.errors.raisesInvalid",
      data: {}
    });
  });

  it("should refuse Raises out of range with the limit as data", () => {
    expect(validateAttackRaises(MAX_RAISES + 1, MAX_RAISES + 1)).toEqual({
      valid: false,
      error: "l5r4.ui.combat.errors.raisesOutOfRange",
      data: { max: MAX_RAISES }
    });
  });

  it("should refuse a claim that differs from the stored Raises with both as data", () => {
    expect(validateAttackRaises(3, 2)).toEqual({
      valid: false,
      error: "l5r4.ui.combat.errors.raisesMismatch",
      data: { claimed: 3, stored: 2 }
    });
  });
});
