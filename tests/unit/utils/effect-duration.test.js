import { describe, expect, it } from "vitest";
import { effectEnd, expiryEventKey, usesLeft } from "../../../module/utils/effect-duration.js";

describe("effectEnd", () => {
  it("should count rounds and turns left from core's remaining value", () => {
    expect(effectEnd({ value: 3, units: "rounds", remaining: 2 })).toEqual({
      key: "l5r4.ui.effectPanel.rounds",
      data: { count: 2 }
    });
    expect(effectEnd({ value: 1, units: "turns", remaining: 1 })).toEqual({
      key: "l5r4.ui.effectPanel.turns",
      data: { count: 1 }
    });
    expect(
      effectEnd({ value: 2, units: "rounds", remaining: -1 }).data.count,
      "never below 0"
    ).toBe(0);
  });

  it("should use core's label for world time", () => {
    expect(effectEnd({ value: 10, units: "minutes", remaining: 4, label: "4m" })).toEqual({
      key: "l5r4.ui.effectPanel.time",
      data: { time: "4m" }
    });
  });

  it("should name each expiry event that ends an effect with no set length", () => {
    expect(effectEnd({ value: null, units: "seconds", expiry: "encounterEnd" })).toEqual({
      key: "l5r4.ui.effectPanel.until",
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
      expect(effectEnd({ value: null, units: "seconds", expiry: event }).data.event).toBe(
        `EFFECT.DURATION.EXPIRY_EVENTS.${event}`
      );
    }
  });

  it("should treat core's prepared infinite length as no set length", () => {
    expect(
      effectEnd({ value: Infinity, units: "seconds", remaining: Infinity, expiry: null })
    ).toEqual({
      key: "l5r4.ui.effectPanel.noEnd",
      data: {}
    });
    expect(effectEnd({ value: NaN, units: "seconds", expiry: "encounterEnd" }).key).toBe(
      "l5r4.ui.effectPanel.until"
    );
  });

  it("should say when nothing ends an effect", () => {
    expect(effectEnd({ value: null, units: "seconds", expiry: null })).toEqual({
      key: "l5r4.ui.effectPanel.noEnd",
      data: {}
    });
  });
});

describe("The expiryEventKey and usesLeft helpers", () => {
  it("should prefer the system's own event label", () => {
    expect(expiryEventKey("encounterEnd")).toBe("l5r4.ui.effects.expiry.encounterEnd");
  });

  it("should give a use counter's uses left, never below 0", () => {
    expect(usesLeft(2, 1)).toEqual({ key: "l5r4.ui.effectPanel.uses", data: { left: 1, max: 2 } });
    expect(usesLeft(1, 3).data.left).toBe(0);
  });
});
