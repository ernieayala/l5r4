import { describe, it, expect } from "vitest";
import { toFieldValue } from "../../../module/mixins/debounced-field-mixin.js";

/** A form field as the mixin reads it. */
const field = (value, { type = "number", dataType } = {}) => ({
  type,
  value,
  dataset: dataType ? { type: dataType } : {}
});

describe("toFieldValue", () => {
  it.each(["-0", "-0.5", "-0abc", " -0 "])("should save 0, never -0, for %j", value => {
    expect(Object.is(toFieldValue(field(value)), 0)).toBe(true);
    expect(
      Object.is(toFieldValue(field(value, { type: "select-one", dataType: "Number" })), 0)
    ).toBe(true);
  });

  it.each([
    ["3", 3],
    [" 3 ", 3],
    ["3.7", 3],
    ["-3.7", -3],
    ["", 0],
    ["abc", 0]
  ])("should read %j in a number field as %d", (value, expected) => {
    expect(toFieldValue(field(value))).toBe(expected);
  });

  it("should read a checkbox's checked state and a text field's text", () => {
    expect(toFieldValue({ type: "checkbox", checked: true, value: "on", dataset: {} })).toBe(true);
    expect(toFieldValue(field("-0", { type: "text" }))).toBe("-0");
  });
});
