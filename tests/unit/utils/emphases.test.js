import { describe, expect, it } from "vitest";
import { buildEmphasisList, getSkillEmphases } from "../../../module/utils/emphases.js";

// #187: a form offers every Emphasis the Skill holds, so saving it drops none
// game-rules/58_skills_overview.md, p.133
describe("getSkillEmphases", () => {
  it("should list the available Emphases, then each trained one not among them, once", () => {
    const system = {
      availableEmphases: ["Disease", "Antidotes", ""],
      trainedEmphases: ["Antidotes", "Fortunes"]
    };
    expect(getSkillEmphases(system)).toEqual(["Disease", "Antidotes", "Fortunes"]);
  });
});

describe("buildEmphasisList", () => {
  it("should keep the Skill's own Emphases outside the official and custom lists", () => {
    const list = buildEmphasisList({
      official: ["Disease", "Herbalism"],
      custom: ["Poisons"],
      skill: { availableEmphases: ["Antidotes", "Disease"], trainedEmphases: ["Non-Humans"] }
    });
    expect(list).toEqual([
      { name: "Antidotes", available: true, custom: false },
      { name: "Disease", available: true, custom: false },
      { name: "Herbalism", available: false, custom: false },
      { name: "Non-Humans", available: false, custom: false },
      { name: "Poisons", available: false, custom: true }
    ]);
  });
});
