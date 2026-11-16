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
  // game-rules/41_conditional_effects.md, p.89
  it("should allow only Defense and Full Defense while Dazed", () => {
    expect(getStanceConflicts("attackStance", ["dazed"])).toEqual(["dazed"]);
    expect(getStanceConflicts("fullDefenseStance", ["dazed"])).toEqual([]);
  });

  // game-rules/41_conditional_effects.md, p.89
  it("should allow only Attack and Defense while Prone", () => {
    expect(getStanceConflicts("centerStance", ["prone"])).toEqual(["prone"]);
    expect(getStanceConflicts("attackStance", ["prone"])).toEqual([]);
  });

  // game-rules/36_stances.md, p.84
  // game-rules/41_conditional_effects.md, p.89
  it("should rule out Full Attack while Mounted or Fatigued", () => {
    expect(getStanceConflicts("fullAttackStance", ["mounted", "fatigued", "blinded"])).toEqual([
      "mounted",
      "fatigued"
    ]);
  });
});
