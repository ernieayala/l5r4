import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSortPref,
  getSortPrefs,
  updateSortPref
} from "../../../module/services/sort-preferences.js";

describe("getSortPref", () => {
  beforeEach(() => {
    global.game = {
      user: {
        flags: {
          "l5r4-enhanced": {
            sortByActor: {}
          }
        }
      }
    };
  });

  describe("Stored preferences", () => {
    it("should retrieve stored preference", () => {
      global.game.user.flags["l5r4-enhanced"].sortByActor = {
        actor123: {
          skills: { key: "rank", dir: "desc" }
        }
      };

      const pref = getSortPref("actor123", "skills", {
        allowedKeys: ["name", "rank"],
        defaultKey: "name"
      });
      expect(pref.key).toBe("rank");
      expect(pref.dir).toBe("desc");
    });

    it("should handle multiple actors and scopes", () => {
      global.game.user.flags["l5r4-enhanced"].sortByActor = {
        actor1: {
          skills: { key: "rank", dir: "desc" }
        },
        actor2: {
          skills: { key: "name", dir: "asc" }
        }
      };

      const pref1 = getSortPref("actor1", "skills", {
        allowedKeys: ["name", "rank"],
        defaultKey: "name"
      });
      const pref2 = getSortPref("actor2", "skills", {
        allowedKeys: ["name", "rank"],
        defaultKey: "name"
      });

      expect(pref1.key).toBe("rank");
      expect(pref2.key).toBe("name");
    });
  });

  describe("Default values and validation", () => {
    it("should return default key when no preference stored", () => {
      const pref = getSortPref("actor123", "skills", {
        allowedKeys: ["name", "rank"],
        defaultKey: "name"
      });
      expect(pref.key).toBe("name");
      expect(pref.dir).toBe("asc");
    });

    it("should reject invalid key and use default", () => {
      global.game.user.flags["l5r4-enhanced"].sortByActor = {
        actor123: {
          skills: { key: "invalid", dir: "asc" }
        }
      };

      const pref = getSortPref("actor123", "skills", {
        allowedKeys: ["name", "rank"],
        defaultKey: "name"
      });
      expect(pref.key).toBe("name");
    });

    it("should default direction to asc", () => {
      global.game.user.flags["l5r4-enhanced"].sortByActor = {
        actor123: {
          skills: { key: "rank" }
        }
      };

      const pref = getSortPref("actor123", "skills", {
        allowedKeys: ["name", "rank"],
        defaultKey: "name"
      });
      expect(pref.dir).toBe("asc");
    });
  });

  describe("Edge cases", () => {
    it("should handle missing game.user", () => {
      global.game = {};

      const pref = getSortPref("actor123", "skills", {
        allowedKeys: ["name", "rank"],
        defaultKey: "name"
      });
      expect(pref.key).toBe("name");
      expect(pref.dir).toBe("asc");
    });

    it("should handle missing flags", () => {
      global.game = {
        user: {}
      };

      const pref = getSortPref("actor123", "skills", {
        allowedKeys: ["name", "rank"],
        defaultKey: "name"
      });
      expect(pref.key).toBe("name");
      expect(pref.dir).toBe("asc");
    });
  });
});

// #79: the sort header shows the stored sort on render (docs/design-system/components/sort-header.md)
describe("getSortPrefs", () => {
  beforeEach(() => {
    global.game = {
      user: {
        flags: {
          "l5r4-enhanced": {
            sortByActor: { actor123: { weapons: { key: "attack", dir: "desc" } } }
          }
        }
      }
    };
  });

  it("should give each sorting list its stored sort, or its first key ascending", () => {
    const prefs = getSortPrefs("actor123");
    expect(prefs.weapons).toEqual({ key: "attack", dir: "desc" });
    expect(prefs.skills).toEqual({ key: "name", dir: "asc" });
    expect(prefs["xp-purchases"]).toEqual({ key: "note", dir: "asc" });
  });

  it("should leave out the lists whose heads do not sort", () => {
    const prefs = getSortPrefs("actor123");
    expect(prefs).not.toHaveProperty("npcAttacks");
    expect(prefs).not.toHaveProperty("xpLedger");
  });
});

describe("updateSortPref", () => {
  beforeEach(() => {
    global.game = {
      user: {
        getFlag: vi.fn(async () => ({})),
        setFlag: vi.fn(async () => {})
      }
    };
  });

  describe("Setting and toggle behavior", () => {
    it("should set preference with ascending direction", async () => {
      await updateSortPref("actor123", "skills", { key: "rank" });

      expect(global.game.user.setFlag).toHaveBeenCalledWith(
        "l5r4-enhanced",
        "sortByActor",
        expect.objectContaining({
          actor123: expect.objectContaining({
            skills: { key: "rank", dir: "asc" }
          })
        })
      );
    });

    it("should toggle from asc to desc on second click", async () => {
      global.game.user.getFlag = vi.fn(async () => ({
        actor123: {
          skills: { key: "rank", dir: "asc" }
        }
      }));

      await updateSortPref("actor123", "skills", { key: "rank" });

      expect(global.game.user.setFlag).toHaveBeenCalledWith(
        "l5r4-enhanced",
        "sortByActor",
        expect.objectContaining({
          actor123: {
            skills: { key: "rank", dir: "desc" }
          }
        })
      );
    });

    it("should reset to asc when changing key", async () => {
      global.game.user.getFlag = vi.fn(async () => ({
        actor123: {
          skills: { key: "rank", dir: "desc" }
        }
      }));

      await updateSortPref("actor123", "skills", { key: "name" });

      expect(global.game.user.setFlag).toHaveBeenCalledWith(
        "l5r4-enhanced",
        "sortByActor",
        expect.objectContaining({
          actor123: {
            skills: { key: "name", dir: "asc" }
          }
        })
      );
    });

    it("should preserve other actors and scopes", async () => {
      global.game.user.getFlag = vi.fn(async () => ({
        "other-actor": {
          skills: { key: "name", dir: "desc" }
        }
      }));

      await updateSortPref("actor123", "skills", { key: "rank" });

      expect(global.game.user.setFlag).toHaveBeenCalledWith(
        "l5r4-enhanced",
        "sortByActor",
        expect.objectContaining({
          "other-actor": {
            skills: { key: "name", dir: "desc" }
          },
          actor123: {
            skills: { key: "rank", dir: "asc" }
          }
        })
      );
    });
  });
});
