import { describe, expect, it } from "vitest";
import {
  getEffectEnd,
  getExpiryEventKey,
  getUsesLeft
} from "../../../module/utils/effect-duration.js";

describe("getEffectEnd", () => {
  it("should count rounds and turns left from core's remaining value", () => {
    expect(getEffectEnd({ value: 3, units: "rounds", remaining: 2 })).toEqual({
      key: "l5r4.apps.effectPanel.rounds",
      data: { count: 2 }
    });
    expect(getEffectEnd({ value: 1, units: "turns", remaining: 1 })).toEqual({
      key: "l5r4.apps.effectPanel.turns",
      data: { count: 1 }
    });
    expect(
      getEffectEnd({ value: 2, units: "rounds", remaining: -1 }).data.count,
      "never below 0"
    ).toBe(0);
  });

  it("should use core's label for world time", () => {
    expect(getEffectEnd({ value: 10, units: "minutes", remaining: 4, label: "4m" })).toEqual({
      key: "l5r4.apps.effectPanel.time",
      data: { time: "4m" }
    });
  });

  it("should name each expiry event that ends an effect with no set length", () => {
    expect(getEffectEnd({ value: null, units: "seconds", expiry: "encounterEnd" })).toEqual({
      key: "l5r4.apps.effectPanel.until",
      data: { event: "l5r4.ui.effects.expiry.encounterEnd" }
    });
    for (const event of [
      "combatEnd",
      "roundEnd",
      "roundStart",
      "turnStart",
      "turnEnd",
      "combatStart"
    ]) {
      expect(getEffectEnd({ value: null, units: "seconds", expiry: event }).data.event).toBe(
        `EFFECT.DURATION.EXPIRY_EVENTS.${event}`
      );
    }
  });

  it("should treat core's prepared infinite length as no set length", () => {
    expect(
      getEffectEnd({ value: Infinity, units: "seconds", remaining: Infinity, expiry: null })
    ).toEqual({
      key: "l5r4.apps.effectPanel.noEnd",
      data: {}
    });
    expect(getEffectEnd({ value: NaN, units: "seconds", expiry: "encounterEnd" }).key).toBe(
      "l5r4.apps.effectPanel.until"
    );
  });

  it("should say when nothing ends an effect", () => {
    expect(getEffectEnd({ value: null, units: "seconds", expiry: null })).toEqual({
      key: "l5r4.apps.effectPanel.noEnd",
      data: {}
    });
  });
});

describe("The getExpiryEventKey and getUsesLeft helpers", () => {
  it("should prefer the system's own event label", () => {
    expect(getExpiryEventKey("encounterEnd")).toBe("l5r4.ui.effects.expiry.encounterEnd");
  });

  it("should give a use counter's uses left, never below 0", () => {
    expect(getUsesLeft(2, 1)).toEqual({
      key: "l5r4.apps.effectPanel.uses",
      data: { left: 1, max: 2 }
    });
    expect(getUsesLeft(1, 3).data.left).toBe(0);
  });
});
