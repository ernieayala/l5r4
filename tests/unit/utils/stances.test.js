import { describe, expect, it } from "vitest";
import { STANCE_IDS, activeStance, stanceConflicts } from "../../../module/utils/stances.js";

describe("STANCE_IDS", () => {
  it("is the five stances of p.84", () => {
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
  it("finds the stance among other statuses", () => {
    expect(activeStance(new Set(["prone", "defenseStance"]))).toBe("defenseStance");
  });

  it("is empty with no stance", () => {
    expect(activeStance(["prone"])).toBe("");
  });
});

describe("stanceConflicts", () => {
  it("Dazed allows only Defense and Full Defense (p.89)", () => {
    expect(stanceConflicts("attackStance", ["dazed"])).toEqual(["dazed"]);
    expect(stanceConflicts("fullDefenseStance", ["dazed"])).toEqual([]);
  });

  it("Prone allows only Attack and Defense (p.89)", () => {
    expect(stanceConflicts("centerStance", ["prone"])).toEqual(["prone"]);
    expect(stanceConflicts("attackStance", ["prone"])).toEqual([]);
  });

  it("Mounted and Fatigued rule out Full Attack (pp.84, 89)", () => {
    expect(stanceConflicts("fullAttackStance", ["mounted", "fatigued", "blinded"])).toEqual([
      "mounted",
      "fatigued"
    ]);
  });
});
