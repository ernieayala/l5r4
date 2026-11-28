import { describe, expect, it, vi } from "vitest";
import { migrateNpcWoundCount } from "../../../../../module/setup/migrations/actors/npc-wound-count.js";

// #155: a stored count keeps the ranks it showed once the count includes Out
describe("migrateNpcWoundCount", () => {
  const migrate = async (count, type = "npc") => {
    const actor = { type, _source: { system: { nrWoundLvls: count } }, update: vi.fn() };
    await migrateNpcWoundCount(actor);
    return actor.update.mock.calls.map(([update]) => update["system.nrWoundLvls"]);
  };

  it("should move a stored 1 to 2 and a stored 2 to 3", async () => {
    expect(await migrate(1)).toEqual([2]);
    expect(await migrate(2)).toEqual([3]);
  });

  it("should leave counts from 3 up, and PCs, alone", async () => {
    expect(await migrate(3)).toEqual([]);
    expect(await migrate(8)).toEqual([]);
    expect(await migrate(1, "pc")).toEqual([]);
  });
});
