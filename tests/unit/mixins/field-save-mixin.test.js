import { describe, it, expect, vi } from "vitest";
import { FieldSaveMixin, toFieldValue } from "../../../module/mixins/field-save-mixin.js";

/** A form field as the mixin reads it. */
const field = (value, { type = "number", dataType, name } = {}) => ({
  type,
  value,
  name,
  dataset: dataType ? { type: dataType } : {}
});

/**
 * A window with the mixin over a bare base, saving through a spy; `reject` names a field its validation refuses.
 * @param {string} [reject] - A field name whose value validation turns down
 * @returns {object} The window
 */
function buildWindow(reject) {
  const Window = class extends FieldSaveMixin(class {}) {
    _updateActor = vi.fn(async () => {});

    _validateFieldValue(name, value) {
      return name === reject ? null : value;
    }
  };
  return new Window();
}

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

// #137: each change saves when it happens, so a second edit or closing the window loses nothing
describe("FieldSaveMixin", () => {
  it("should save each of two fields changed back to back", async () => {
    const app = buildWindow();
    await Promise.all([
      app._onFieldChange(new Event("change"), field("2", { name: "initiative.rollMod" })),
      app._onFieldChange(new Event("change"), field("1", { name: "initiative.keepMod" }))
    ]);
    expect(app._updateActor.mock.calls).toEqual([
      ["initiative.rollMod", 2],
      ["initiative.keepMod", 1]
    ]);
  });

  it("should have saved a change by the time its handler returns", async () => {
    const app = buildWindow();
    await app._onFieldChange(new Event("change"), field("3", { name: "initiative.totalMod" }));
    expect(app._updateActor).toHaveBeenCalledWith("initiative.totalMod", 3);
  });

  it("should not save a value validation rejects", async () => {
    const app = buildWindow("woundsMultiplier");
    await app._onFieldChange(new Event("change"), field("9", { name: "woundsMultiplier" }));
    expect(app._updateActor).not.toHaveBeenCalled();
  });
});
