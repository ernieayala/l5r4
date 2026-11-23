import { describe, expect, it } from "vitest";
import { applySortPref } from "../../../module/utils/sorting.js";

describe("applySortPref", () => {
  describe("Basic sorting", () => {
    it("should sort by name ascending", () => {
      const items = [{ name: "Charlie" }, { name: "Alice" }, { name: "Bob" }];

      const columns = {
        name: i => i.name
      };

      const pref = { key: "name", dir: "asc" };

      const result = applySortPref(items, columns, { pref });

      expect(result[0].name).toBe("Alice");
      expect(result[1].name).toBe("Bob");
      expect(result[2].name).toBe("Charlie");
    });

    it("should sort by name descending", () => {
      const items = [{ name: "Alice" }, { name: "Charlie" }, { name: "Bob" }];

      const columns = {
        name: i => i.name
      };

      const pref = { key: "name", dir: "desc" };

      const result = applySortPref(items, columns, { pref });

      expect(result[0].name).toBe("Charlie");
      expect(result[1].name).toBe("Bob");
      expect(result[2].name).toBe("Alice");
    });

    it("should sort by numeric value", () => {
      const items = [{ rank: 3 }, { rank: 1 }, { rank: 2 }];

      const columns = {
        rank: i => i.rank
      };

      const pref = { key: "rank", dir: "asc" };

      const result = applySortPref(items, columns, { pref });

      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);
    });
  });

  describe("Tiebreaker sorting", () => {
    it("should use secondary column for tiebreaks", () => {
      const items = [
        { rank: 2, name: "Charlie" },
        { rank: 2, name: "Alice" },
        { rank: 2, name: "Bob" }
      ];

      const columns = {
        rank: i => i.rank,
        name: i => i.name
      };

      const pref = { key: "rank", dir: "asc" };

      const result = applySortPref(items, columns, { pref });

      expect(result[0].name).toBe("Alice");
      expect(result[1].name).toBe("Bob");
      expect(result[2].name).toBe("Charlie");
    });

    it("should apply direction only to primary column", () => {
      const items = [
        { rank: 1, name: "Charlie" },
        { rank: 3, name: "Alice" },
        { rank: 2, name: "Bob" }
      ];

      const columns = {
        rank: i => i.rank,
        name: i => i.name
      };

      const pref = { key: "rank", dir: "desc" };

      const result = applySortPref(items, columns, { pref });

      expect(result[0].rank).toBe(3);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty array", () => {
      const items = [];
      const columns = { name: i => i.name };
      const pref = { key: "name", dir: "asc" };

      const result = applySortPref(items, columns, { pref });

      expect(result).toEqual([]);
    });

    it("should handle null values in numeric comparison", () => {
      const items = [{ rank: 3 }, { rank: null }, { rank: 1 }];

      const columns = {
        rank: i => i.rank
      };

      const pref = { key: "rank", dir: "asc" };

      const result = applySortPref(items, columns, { pref });

      expect(result[0].rank).toBeNull();
      expect(result[1].rank).toBe(1);
      expect(result[2].rank).toBe(3);
    });

    it("should mutate original array", () => {
      const items = [{ name: "Charlie" }, { name: "Alice" }];

      const columns = { name: i => i.name };
      const pref = { key: "name", dir: "asc" };

      const result = applySortPref(items, columns, { pref });

      expect(result).toBe(items);
      expect(items[0].name).toBe("Alice");
    });
  });
});
