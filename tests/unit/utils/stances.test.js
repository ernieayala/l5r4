import { describe, expect, it } from "vitest";
import { STANCE_IDS, getActiveStance, getStanceConflicts } from "../../../module/utils/stances.js";

describe("STANCE_IDS", () => {
  // game-rules/36_stances.md, p.84
  it("should be the five stances", () => {
    expect([...STANCE_IDS].sort()).toEqual([
      "attackStance",
      "centerStance",
      "defenseStance",
      "fullAttackStance",
      "fullDefenseStance"
    ]);
  });
});

describe("getActiveStance", () => {
  it("should find the stance among other statuses", () => {
    expect(getActiveStance(new Set(["prone", "defenseStance"]))).toBe("defenseStance");
  });

  it("should be empty with no stance", () => {
    expect(getActiveStance(["prone"])).toBe("");
  });
});

describe("getStanceConflicts", () => {
  const none = new Set();

  // game-rules/41_conditional_effects.md, p.89
  it("should allow only Defense and Full Defense while Dazed", () => {
    expect(getStanceConflicts("attackStance", ["dazed"], none)).toEqual(["dazed"]);
    expect(getStanceConflicts("fullDefenseStance", ["dazed"], none)).toEqual([]);
  });

  // game-rules/41_conditional_effects.md, p.89
  it("should allow only Attack and Defense while Prone", () => {
    expect(getStanceConflicts("centerStance", ["prone"], none)).toEqual(["prone"]);
    expect(getStanceConflicts("attackStance", ["prone"], none)).toEqual([]);
  });

  // game-rules/36_stances.md, p.84
  // game-rules/41_conditional_effects.md, p.89
  it("should rule out Full Attack while Mounted or Fatigued", () => {
    expect(
      getStanceConflicts("fullAttackStance", ["mounted", "fatigued", "blinded"], none)
    ).toEqual(["mounted", "fatigued"]);
  });

  // #73
  // game-rules/60_bugei_skills.md, p.140
  it("should allow Full Attack while Mounted from Horsemanship Rank 3, not Rank 2", () => {
    const at = rank => new Set([`skill:horsemanship:${rank}`]);
    expect(getStanceConflicts("fullAttackStance", ["mounted"], at(2))).toEqual(["mounted"]);
    expect(getStanceConflicts("fullAttackStance", ["mounted"], at(3))).toEqual([]);
  });

  // #73
  // game-rules/41_conditional_effects.md, p.89
  // game-rules/60_bugei_skills.md, p.140
  it("should still rule out Full Attack while Fatigued at Horsemanship Rank 3", () => {
    const options = new Set(["skill:horsemanship:3"]);
    expect(getStanceConflicts("fullAttackStance", ["mounted", "fatigued"], options)).toEqual([
      "fatigued"
    ]);
  });
});
