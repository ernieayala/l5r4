import { describe, expect, it } from "vitest";
import { getFloatingChanges, formatFloatingText } from "../../../module/utils/floating-text.js";
import { getFearTn, FEAR_RANKS } from "../../../module/utils/fear.js";

describe("getFloatingChanges", () => {
  it("should sign a Wound change and a Void change", () => {
    expect(getFloatingChanges({ wounds: 3, void: 2 }, { wounds: 10, void: 1 })).toEqual([
      { id: "wounds", delta: 7 },
      { id: "void", delta: -1 }
    ]);
  });

  it("should give nothing when neither changed", () => {
    expect(getFloatingChanges({ wounds: 3, void: 2 }, { wounds: 3, void: 2 })).toEqual([]);
  });
});

describe("formatFloatingText", () => {
  it("should write the sign, size, and name", () => {
    expect(formatFloatingText(7, "Wounds")).toBe("+7 Wounds");
    expect(formatFloatingText(-1, "Void Points")).toBe("−1 Void Points");
  });
});

// game-rules/42_fear.md, p.90
describe("getFearTn", () => {
  it("should be 5 + 5 per Rank: Fear 3 is TN 20, the book's example", () => {
    expect(getFearTn(3)).toBe(20);
    expect([FEAR_RANKS.min, FEAR_RANKS.max]).toEqual([1, 10]);
  });
});
