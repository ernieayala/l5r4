import { describe, expect, it } from "vitest";
import { STANCE_IDS, activeStance, stanceConflicts } from "../../../module/utils/stances.js";

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

describe("activeStance", () => {
  it("should find the stance among other statuses", () => {
    expect(activeStance(new Set(["prone", "defenseStance"]))).toBe("defenseStance");
  });

  it("should be empty with no stance", () => {
    expect(activeStance(["prone"])).toBe("");
  });
});

describe("stanceConflicts", () => {
  // game-rules/41_conditional_effects.md, p.89
  it("should allow only Defense and Full Defense while Dazed", () => {
    expect(stanceConflicts("attackStance", ["dazed"])).toEqual(["dazed"]);
    expect(stanceConflicts("fullDefenseStance", ["dazed"])).toEqual([]);
  });

  // game-rules/41_conditional_effects.md, p.89
  it("should allow only Attack and Defense while Prone", () => {
    expect(stanceConflicts("centerStance", ["prone"])).toEqual(["prone"]);
    expect(stanceConflicts("attackStance", ["prone"])).toEqual([]);
  });

  // game-rules/36_stances.md, p.84
  // game-rules/41_conditional_effects.md, p.89
  it("should rule out Full Attack while Mounted or Fatigued", () => {
    expect(stanceConflicts("fullAttackStance", ["mounted", "fatigued", "blinded"])).toEqual([
      "mounted",
      "fatigued"
    ]);
  });
});
