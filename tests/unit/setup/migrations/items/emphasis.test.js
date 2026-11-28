import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { migrateEmphasisStringToArray } from "../../../../../module/setup/migrations/items/emphasis.js";

// #153: an old Emphasis string maps only exact or singular/plural names to official Emphases
describe("migrateEmphasisStringToArray", () => {
  let custom;

  beforeEach(() => {
    custom = [];
    globalThis.game = {
      settings: {
        get: () => custom,
        set: async (_scope, _key, value) => {
          custom = value;
        }
      }
    };
  });

  afterEach(() => {
    delete globalThis.game;
  });

  const migrate = async emphasis => {
    const item = { type: "skill", system: { emphasis }, update: vi.fn() };
    await migrateEmphasisStringToArray(item);
    return item.update.mock.calls[0][0];
  };

  it("should keep a name that only contains an official Emphasis as its own", async () => {
    const update = await migrate("Bokken, Bow, Boating, Honor, Journeys, Clans");
    expect(update["system.trainedEmphases"]).toEqual([
      "Bokken",
      "Bow",
      "Boating",
      "Honor",
      "Journeys",
      "Clan"
    ]);
    expect(custom).toEqual(["Bokken", "Bow", "Boating", "Honor", "Journeys"]);
  });

  it("should map the same name in any case, and its singular or plural", async () => {
    const update = await migrate("katana, Dog, horse");
    expect(update["system.availableEmphases"]).toEqual(["Katana", "Dogs", "Horses"]);
  });

  it("should clear the old text once its Emphases are in the lists", async () => {
    expect((await migrate("Katana"))["system.emphasis"]).toBe("");
  });
});
