import { describe, expect, it } from "vitest";
import { STATUS_EFFECTS } from "../../../module/config/status-effects.js";
import { buildStatusEffectUpdate } from "../../../module/utils/status-data.js";

/** The rules an effect created with only a status id takes (L5R4ActiveEffect#_preCreate). */
const rulesOf = statusId =>
  buildStatusEffectUpdate({ statuses: [statusId], system: {} })?.["system.rules"];

describe("buildStatusEffectUpdate", () => {
  it("should give an effect made with only a status id its status's rules", () => {
    expect(rulesOf("defenseStance")).toEqual([
      { key: "ArmorTN", value: "@rings.air + @skills.defense.rank" }
    ]);
    expect(rulesOf("mounted")[0]).toMatchObject({
      key: "RollModifier",
      selector: "attack",
      roll: 1
    });
    // Prone: -10 Armor TN against melee, -2k0 to attacks with small and medium weapons, a note for large
    // game-rules/41_conditional_effects.md, p.89
    expect(rulesOf("prone")).toEqual([
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
    expect(rulesOf("attackStance")).toBeUndefined();
  });

  it("should copy the rules, so editing them leaves the config alone", () => {
    rulesOf("defenseStance")[0].value = 99;
    const config = STATUS_EFFECTS.find(status => status.id === "defenseStance");
    expect(config.system.rules[0].value).toBe("@rings.air + @skills.defense.rank");
    expect(rulesOf("defenseStance")[0].value).toBe("@rings.air + @skills.defense.rank");
  });
});
