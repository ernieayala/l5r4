import { describe, expect, it } from "vitest";
import { getMasteryInsight } from "../../../module/utils/insight.js";

describe("getMasteryInsight", () => {
  // #72
  // game-rules/59_high_skills.md, p.135
  it("should add 3 at Courtier Rank 3 and 7 more at Rank 7", () => {
    expect(getMasteryInsight([{ name: "Courtier", rank: 2 }])).toBe(0);
    expect(getMasteryInsight([{ name: "Courtier", rank: 3 }])).toBe(3);
    expect(getMasteryInsight([{ name: "Courtier", rank: 6 }])).toBe(3);
    expect(getMasteryInsight([{ name: "Courtier", rank: 7 }])).toBe(10);
  });

  // #72
  // game-rules/59_high_skills.md, p.135-136
  it("should add Courtier's and Etiquette's together, and nothing for other Skills", () => {
    expect(
      getMasteryInsight([
        { name: "Courtier", rank: 3 },
        { name: "etiquette", rank: 7 },
        { name: "Kenjutsu", rank: 7 }
      ])
    ).toBe(13);
  });
});
