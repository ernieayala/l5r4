import { describe, expect, it } from "vitest";
import { getWindowId } from "../../../module/utils/window-id.js";

// #189: two unlinked tokens of one actor share its id but not its UUID
describe("getWindowId", () => {
  it("should build the id from the UUID, safe as an element id", () => {
    expect(getWindowId("wound-config", "Actor.abc")).toBe("wound-config-Actor-abc");
    expect(getWindowId("wound-config", "Scene.s1.Token.t1.Actor.abc")).toBe(
      "wound-config-Scene-s1-Token-t1-Actor-abc"
    );
  });

  it("should tell apart two windows of one document by the part given", () => {
    expect(getWindowId("npc-attack-config", "Actor.abc", "attack2")).toBe(
      "npc-attack-config-Actor-abc-attack2"
    );
  });
});
