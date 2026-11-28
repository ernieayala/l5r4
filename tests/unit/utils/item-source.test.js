import { describe, expect, it } from "vitest";
import { SYS_ID } from "../../../module/config/constants.js";
import { migrateLegacyCostSource } from "../../../module/utils/item-source.js";

// #182: 3.2.1 charged a kata's or kiho's typed cost; a kiho at 0 was a monk's free School kiho
describe("migrateLegacyCostSource", () => {
  it("should move a kiho's cost into the legacyCost flag and make a cost of 0 a School kiho", () => {
    const free = { type: "kiho", system: { mastery: 2, cost: 0 }, flags: {} };
    migrateLegacyCostSource(free);
    expect(free.system).toEqual({ mastery: 2, schoolKiho: true });
    expect(free.flags[SYS_ID].legacyCost).toBe(0);
    const bought = { type: "kiho", system: { mastery: 2, cost: "3" } };
    migrateLegacyCostSource(bought);
    expect(bought.system.schoolKiho).toBe(false);
    expect(bought.flags[SYS_ID].legacyCost).toBe(3);
  });

  it("should keep a kiho's stored schoolKiho and a legacyCost flag already set", () => {
    const source = {
      type: "kiho",
      system: { cost: 0, schoolKiho: false },
      flags: { [SYS_ID]: { legacyCost: 4, other: 1 } }
    };
    migrateLegacyCostSource(source);
    expect(source.system.schoolKiho).toBe(false);
    expect(source.flags[SYS_ID]).toEqual({ legacyCost: 4, other: 1 });
  });

  it("should move a kata's cost and leave other types, and a source without a cost, alone", () => {
    const kata = { type: "kata", system: { cost: 3 } };
    migrateLegacyCostSource(kata);
    expect(kata.system).toEqual({});
    expect(kata.flags[SYS_ID].legacyCost).toBe(3);
    const advantage = { type: "advantage", system: { cost: 3 } };
    migrateLegacyCostSource(advantage);
    expect(advantage).toEqual({ type: "advantage", system: { cost: 3 } });
    const current = { type: "kiho", system: { schoolKiho: true }, flags: {} };
    migrateLegacyCostSource(current);
    expect(current).toEqual({ type: "kiho", system: { schoolKiho: true }, flags: {} });
  });
});
