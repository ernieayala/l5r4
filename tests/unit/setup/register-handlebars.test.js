import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerHandlebarsHelpers } from "../../../module/setup/register-handlebars.js";

/** The helpers registered, by name, on a stand-in for the global Handlebars. */
let helpers;

beforeEach(() => {
  helpers = {};
  globalThis.Handlebars = { registerHelper: (name, fn) => (helpers[name] = fn) };
  registerHandlebarsHelpers();
});

afterEach(() => {
  delete globalThis.Handlebars;
});

// #185: Handlebars passes its options object last, so `(join sources)` once joined with "[object Object]"
describe("Join helper", () => {
  it("should join with ', ' when the template gives no separator", () => {
    const options = { hash: {}, data: {} };
    expect(helpers.join(["jade", "magic", "fire"], options)).toBe("jade, magic, fire");
  });

  it("should join with the template's separator and leave out empty values", () => {
    expect(helpers.join(["a", "", "b"], " / ", { hash: {} })).toBe("a / b");
  });
});
