import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSourceCitation } from "../../../module/utils/source-citation.js";

const lang = JSON.parse(readFileSync("lang/en.json", "utf8"));

/** Whether a dotted key holds a string in lang/en.json. */
const hasKey = key => typeof key.split(".").reduce((node, part) => node?.[part], lang) === "string";

describe("buildSourceCitation", () => {
  it("should cite the book and printed page", () => {
    expect(buildSourceCitation({ book: "core", page: 204 })).toEqual({
      key: "l5r4.ui.ruleSummary.citation",
      data: { book: { key: "l5r4.ui.sources.core", data: {} }, page: 204 }
    });
    expect(hasKey("l5r4.ui.sources.core")).toBe(true);
  });

  it("should be null for an item that cites nothing", () => {
    expect(buildSourceCitation({ book: "", page: 0 })).toBeNull();
    expect(buildSourceCitation({ book: "core", page: 0 })).toBeNull();
    expect(buildSourceCitation(undefined)).toBeNull();
  });
});
