import { describe, expect, it } from "vitest";
import { isAnsweringClient } from "../../../module/utils/gm-client.js";

// #82
describe("isAnsweringClient", () => {
  const self = { id: "b", startedAt: 100 };
  const timing = { now: 1000, ttl: 25 };

  it("should answer alone", () => {
    expect(isAnsweringClient(self, [], timing)).toBe(true);
  });

  it("should leave it to a client that started earlier and was heard from lately", () => {
    expect(isAnsweringClient(self, [{ id: "a", startedAt: 50, seen: 990 }], timing)).toBe(false);
  });

  it("should answer for a client that started later", () => {
    expect(isAnsweringClient(self, [{ id: "c", startedAt: 200, seen: 990 }], timing)).toBe(true);
  });

  it("should answer once an earlier client has not been heard from within the ttl", () => {
    expect(isAnsweringClient(self, [{ id: "a", startedAt: 50, seen: 900 }], timing)).toBe(true);
  });

  it("should give a tie to the lower socket id", () => {
    expect(isAnsweringClient(self, [{ id: "a", startedAt: 100, seen: 990 }], timing)).toBe(false);
    expect(isAnsweringClient(self, [{ id: "c", startedAt: 100, seen: 990 }], timing)).toBe(true);
  });
});
