import { describe, expect, it } from "vitest";
import { getStatusRules } from "../../../module/utils/status-data.js";

describe("getStatusRules", () => {
  it("should copy a status's rules, and none for a status without them", () => {
    expect(getStatusRules("defenseStance")).toEqual([
      { key: "ArmorTN", value: "@rings.air + @skills.defense.rank" }
    ]);
    expect(getStatusRules("mounted")[0]).toMatchObject({
      key: "RollModifier",
      selector: "attack",
      roll: 1
    });
    // Prone: -10 Armor TN against melee, -2k0 to attacks with small and medium weapons, a note for large
    // game-rules/41_conditional_effects.md, p.89
    expect(getStatusRules("prone")).toEqual([
      { key: "ArmorTN", value: -10, range: "melee" },
      {
        key: "RollModifier",
        selector: "attack",
        roll: -2,
        predicate: [{ not: "weapon:size:large" }]
      },
      {
        key: "Note",
        selector: "attack",
        text: "l5r4.ui.effects.proneLargeWeapon",
        predicate: ["weapon:size:large"]
      }
    ]);
    expect(getStatusRules("attackStance")).toEqual([]);
  });

  it("should return a copy, so editing it leaves the config alone", () => {
    getStatusRules("defenseStance")[0].value = 99;
    expect(getStatusRules("defenseStance")[0].value).toBe("@rings.air + @skills.defense.rank");
  });
});
