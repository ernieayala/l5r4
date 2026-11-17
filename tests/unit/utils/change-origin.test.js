import { describe, expect, it } from "vitest";
import { CHANGE_ORIGIN_OPTION } from "../../../module/config/constants.js";
import { isOwnChange } from "../../../module/utils/change-origin.js";

describe("isOwnChange", () => {
  it("should count a change stamped with this client's socket id", () => {
    expect(isOwnChange({ [CHANGE_ORIGIN_OPTION]: "socket-a" }, "socket-a")).toBe(true);
  });

  it("should not count a change stamped by the user's other client", () => {
    expect(isOwnChange({ [CHANGE_ORIGIN_OPTION]: "socket-b" }, "socket-a")).toBe(false);
  });

  it("should not count a change with no stamp", () => {
    expect(isOwnChange({}, "socket-a")).toBe(false);
  });
});
