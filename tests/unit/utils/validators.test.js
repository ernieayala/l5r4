import { describe, expect, it } from "vitest";
import { MAX_RAISES } from "../../../module/config/game-mechanics.js";
import { validateAttackRaises, validateEmphasisName } from "../../../module/utils/validators.js";

// #141: the reason is a key the custom Emphasis dialog shows under its field
describe("validateEmphasisName", () => {
  it("should accept a name and return it trimmed", () => {
    expect(validateEmphasisName("  Katana ")).toEqual({ valid: true, sanitized: "Katana" });
  });

  it("should refuse an empty name with the length limits as data", () => {
    expect(validateEmphasisName("   ")).toEqual({
      valid: false,
      error: "l5r4.apps.emphasisManager.errors.nameLength",
      data: { min: 1, max: 100 }
    });
  });

  it("should refuse characters outside letters, numbers, spaces, hyphens, and apostrophes", () => {
    expect(validateEmphasisName("Invalid@Name")).toEqual({
      valid: false,
      error: "l5r4.apps.emphasisManager.errors.nameCharacters",
      data: {}
    });
  });

  it("should refuse a name already among the given ones", () => {
    expect(validateEmphasisName(" Archery ", ["Archery"])).toEqual({
      valid: false,
      error: "l5r4.apps.emphasisManager.errors.nameTaken",
      data: { name: "Archery" }
    });
  });
});

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
