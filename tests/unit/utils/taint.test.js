import { describe, expect, it } from "vitest";
import { canEmbraceTaint, isLost, taintEffects } from "../../../module/utils/taint.js";

describe("taintEffects (Core Rulebook pp.277-278; STAGE-11 decision 5)", () => {
  it("does nothing below Level 3", () => {
    for (const rank of [0, 1, 2]) {
      expect(taintEffects(rank)).toMatchObject({
        socialPenalty: 0,
        voidPointsLost: 0,
        honorRollPenalty: { roll: 0, keep: 0 }
      });
    }
  });

  it("Level 3: -1k0 to social Skill rolls", () => {
    expect(taintEffects(3)).toMatchObject({ level: 3, socialPenalty: 1, voidPointsLost: 0 });
  });

  it("Level 4 and beyond: -2k0 social (replacing -1k0), a Void Point lost, -2k2 Honor Rolls", () => {
    for (const rank of [4, 6, 10]) {
      expect(taintEffects(rank)).toEqual({
        level: 4,
        socialPenalty: 2,
        voidPointsLost: 1,
        honorRollPenalty: { roll: 2, keep: 2 }
      });
    }
  });
});

describe("isLost (p.278)", () => {
  it("at Rank 5, or Rank 7 with a Ring at 6 or higher", () => {
    expect(isLost(4, 3)).toBe(false);
    expect(isLost(5, 5)).toBe(true);
    expect(isLost(6, 6)).toBe(false);
    expect(isLost(7, 6)).toBe(true);
  });
});

describe("canEmbraceTaint (p.279)", () => {
  const roll = extra => ({ rank: 1, highestRing: 3, kind: "skill", trait: "agi", ...extra });

  it("on a physical Trait roll at Level 1 or more", () => {
    expect(canEmbraceTaint(roll())).toBe(true);
    for (const trait of ["str", "ref", "sta"]) {
      expect(canEmbraceTaint(roll({ trait }))).toBe(true);
    }
  });

  it("not on a mental Trait, a damage roll, below Level 1, or when Lost", () => {
    expect(canEmbraceTaint(roll({ trait: "int" }))).toBe(false);
    expect(canEmbraceTaint(roll({ kind: "damage" }))).toBe(false);
    expect(canEmbraceTaint(roll({ rank: 0 }))).toBe(false);
    expect(canEmbraceTaint(roll({ rank: 5 }))).toBe(false);
  });
});
