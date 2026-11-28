import { describe, expect, it } from "vitest";
import { buildAddedValues } from "../../../module/utils/added-values.js";

// #184: a configuration window edits the stored value and shows what preparation adds
describe("buildAddedValues", () => {
  it("should give the amount added and the total for each path that changed, by its dotted name", () => {
    const stored = { woundsMod: 2, woundsPenaltyMod: 1, wounds: { mod: 0 } };
    const prepared = { woundsMod: 5, woundsPenaltyMod: 1, wounds: { mod: -1 } };
    expect(
      buildAddedValues(stored, prepared, ["woundsMod", "woundsPenaltyMod", "wounds.mod"])
    ).toEqual({
      woundsMod: { value: 3, total: 5 },
      "wounds.mod": { value: -1, total: -1 }
    });
  });

  it("should read an absent value as 0", () => {
    expect(
      buildAddedValues({}, { armorTn: { mod: 5 } }, ["armorTn.mod", "armorTn.reductionMod"])
    ).toEqual({
      "armorTn.mod": { value: 5, total: 5 }
    });
  });
});
