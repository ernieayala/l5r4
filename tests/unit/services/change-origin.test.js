import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CHANGE_ORIGIN_OPTION } from "../../../module/config/constants.js";
import {
  onPreCreateChangeOrigin,
  onPreDeleteChangeOrigin,
  onPreUpdateChangeOrigin
} from "../../../module/services/change-origin.js";

beforeEach(() => {
  global.game = { socket: { id: "socket-a" } };
});

afterEach(() => {
  delete global.game;
});

describe("onPreCreateChangeOrigin", () => {
  it("should stamp a creation with this client's socket id", () => {
    const options = {};
    onPreCreateChangeOrigin({}, {}, options);
    expect(options[CHANGE_ORIGIN_OPTION]).toBe("socket-a");
  });
});

describe("onPreUpdateChangeOrigin", () => {
  it("should stamp an update with this client's socket id", () => {
    const options = {};
    onPreUpdateChangeOrigin({}, {}, options);
    expect(options[CHANGE_ORIGIN_OPTION]).toBe("socket-a");
  });
});

describe("onPreDeleteChangeOrigin", () => {
  it("should stamp a deletion with this client's socket id", () => {
    const options = {};
    onPreDeleteChangeOrigin({}, options);
    expect(options[CHANGE_ORIGIN_OPTION]).toBe("socket-a");
  });
});
