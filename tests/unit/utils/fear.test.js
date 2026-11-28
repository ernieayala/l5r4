import { describe, expect, it } from "vitest";
import { getFearTn, isCatastrophicFear } from "../../../module/utils/fear.js";

// game-rules/42_fear.md, p.90
describe("getFearTn", () => {
  it("should give 5 + 5 × the Fear Rank, 20 for Rank 3", () => {
    expect(getFearTn(3)).toBe(20);
  });
});

// game-rules/42_fear.md, p.90
describe("isCatastrophicFear", () => {
  it("should count a failure by 15 or more as a Catastrophic Failure", () => {
    expect(isCatastrophicFear(5, 20)).toBe(true);
    expect(isCatastrophicFear(6, 20)).toBe(false);
    expect(isCatastrophicFear(25, 20)).toBe(false);
  });
});
