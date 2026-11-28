import { describe, expect, it } from "vitest";
import { hasActivePlayer } from "../../../module/utils/ownership.js";

/**
 * A document owned by the users with the given ids.
 * @param {string[]} owners
 * @returns {{testUserPermission: function(object, string): boolean}}
 */
const ownedBy = owners => ({
  testUserPermission: (user, level) => level === "OWNER" && (user.isGM || owners.includes(user.id))
});

const gm = { id: "gm", isGM: true, active: true };

describe("hasActivePlayer", () => {
  it("should find a connected player who owns the document", () => {
    const player = { id: "p1", isGM: false, active: true };
    expect(hasActivePlayer(ownedBy(["p1"]), [gm, player])).toBe(true);
  });

  it("should not count an owner who is offline", () => {
    const player = { id: "p1", isGM: false, active: false };
    expect(hasActivePlayer(ownedBy(["p1"]), [gm, player])).toBe(false);
  });

  it("should not count a GM, who owns every document", () => {
    expect(hasActivePlayer(ownedBy([]), [gm])).toBe(false);
  });

  it("should not count a connected player who does not own the document", () => {
    const player = { id: "p2", isGM: false, active: true };
    expect(hasActivePlayer(ownedBy(["p1"]), [gm, player])).toBe(false);
  });
});
