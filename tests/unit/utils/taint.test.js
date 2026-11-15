import { describe, expect, it } from "vitest";
import {
  canEmbraceTaint,
  highestRing,
  isLost,
  lostBonus,
  taintEffects,
  voidPointsMax
} from "../../../module/utils/taint.js";

// game-rules/89_shadowlands_taint.md, p.279
describe("lostBonus", () => {
  const roll = extra => ({ rank: 5, highestRing: 4, kind: "skill", trait: "agi", ...extra });

  it("should add the Taint Rank to a Lost character's physical Trait rolls", () => {
    expect(lostBonus(roll())).toBe(5);
    expect(lostBonus(roll({ kind: "trait", trait: "sta" }))).toBe(5);
  });

  it("should add nothing to a mental Trait roll, a damage roll, or a character not yet Lost", () => {
    expect(lostBonus(roll({ trait: "int" }))).toBe(0);
    expect(lostBonus(roll({ kind: "damage", trait: "str" }))).toBe(0);
    expect(lostBonus(roll({ rank: 4 }))).toBe(0);
    expect(lostBonus(roll({ highestRing: 6 })), "a Ring at 6 holds out until Rank 7").toBe(0);
  });
});

// game-rules/89_shadowlands_taint.md, p.278-279
describe("voidPointsMax", () => {
  it("should be the Void Ring, one less from Level 4, and none once Lost", () => {
    expect(voidPointsMax(3, 3, 3)).toBe(3);
    expect(voidPointsMax(3, 4, 3)).toBe(2);
    expect(voidPointsMax(3, 5, 3)).toBe(0);
    expect(voidPointsMax(6, 6, 6), "not Lost until Rank 7").toBe(5);
  });
});

describe("highestRing", () => {
  it("should count the Void Ring", () => {
    expect(highestRing({ air: 2, earth: 3, fire: 2, water: 2, void: { rank: 6 } })).toBe(6);
  });
});

// game-rules/89_shadowlands_taint.md, p.277-278
// roadmap/STAGE-11 decision 5
describe("taintEffects", () => {
  it("should do nothing below Level 3", () => {
    for (const rank of [0, 1, 2]) {
      expect(taintEffects(rank)).toMatchObject({
        socialPenalty: 0,
        voidPointsLost: 0,
        honorRollPenalty: { roll: 0, keep: 0 }
      });
    }
  });

  it("should give -1k0 to social Skill rolls at Level 3", () => {
    expect(taintEffects(3)).toMatchObject({ level: 3, socialPenalty: 1, voidPointsLost: 0 });
  });

  it("should give -2k0 social in place of -1k0, a Void Point lost, and -2k2 Honor Rolls from Level 4", () => {
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

// game-rules/89_shadowlands_taint.md, p.278
describe("isLost", () => {
  it("should be true at Rank 5, or Rank 7 with a Ring at 6 or higher", () => {
    expect(isLost(4, 3)).toBe(false);
    expect(isLost(5, 5)).toBe(true);
    expect(isLost(6, 6)).toBe(false);
    expect(isLost(7, 6)).toBe(true);
  });
});

// game-rules/89_shadowlands_taint.md, p.279
describe("canEmbraceTaint", () => {
  const roll = extra => ({ rank: 1, highestRing: 3, kind: "skill", trait: "agi", ...extra });

  it("should allow it on a physical Trait roll at Level 1 or more", () => {
    expect(canEmbraceTaint(roll())).toBe(true);
    for (const trait of ["str", "ref", "sta"]) {
      expect(canEmbraceTaint(roll({ trait }))).toBe(true);
    }
  });

  it("should not allow it on a mental Trait, a damage roll, below Level 1, or when Lost", () => {
    expect(canEmbraceTaint(roll({ trait: "int" }))).toBe(false);
    expect(canEmbraceTaint(roll({ kind: "damage" }))).toBe(false);
    expect(canEmbraceTaint(roll({ rank: 0 }))).toBe(false);
    expect(canEmbraceTaint(roll({ rank: 5 }))).toBe(false);
  });
});
