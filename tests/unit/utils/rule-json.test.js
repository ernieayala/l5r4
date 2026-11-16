import { describe, expect, it } from "vitest";
import { parseRulesJson } from "../../../module/utils/rule-json.js";

describe("parseRulesJson", () => {
  it("should parse a list of rules, and blank text as no rules", () => {
    expect(parseRulesJson('[{"key": "Note", "selector": "attack", "text": "Hi"}]')).toEqual({
      rules: [{ key: "Note", selector: "attack", text: "Hi" }]
    });
    expect(parseRulesJson("  ")).toEqual({ rules: [] });
  });

  it("should report text that is not JSON", () => {
    const { error, detail } = parseRulesJson("[{");
    expect(error).toBe("invalidJson");
    expect(detail).toBeTruthy();
  });

  it("should report JSON that is not a list of objects with a key", () => {
    expect(parseRulesJson('{"key": "Note"}')).toEqual({ error: "notList" });
    expect(parseRulesJson('[{"selector": "attack"}]')).toEqual({ error: "notList" });
    expect(parseRulesJson("[null]")).toEqual({ error: "notList" });
    expect(parseRulesJson("[[]]")).toEqual({ error: "notList" });
  });
});
