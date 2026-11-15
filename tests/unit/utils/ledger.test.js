import { describe, expect, it } from "vitest";
import { ledgerChange } from "../../../module/utils/ledger.js";

const rule = (track, direction, value, source = "Rule") => ({ track, direction, value, source });

// Ledger rules
describe("ledgerChange", () => {
  it("should leave a change alone without rules", () => {
    expect(ledgerChange({ track: "honor", points: 4, rules: [] })).toEqual({
      points: 4,
      errors: []
    });
    expect(ledgerChange({ track: "honor", points: 0, rules: [] }).points).toBe(0);
  });

  it("should size gains and losses of its own track and direction only", () => {
    const rules = [
      rule("honor", "loss", "@points * 2"),
      rule("honor", "gain", "@points + 1"),
      rule("glory", "loss", "0")
    ];
    expect(ledgerChange({ track: "honor", points: -3, rules }).points).toBe(-6);
    expect(ledgerChange({ track: "honor", points: 2, rules }).points).toBe(3);
    expect(ledgerChange({ track: "glory", points: -5, rules }).points).toBe(-0);
    expect(ledgerChange({ track: "taint", points: 1, rules }).points).toBe(1);
  });

  it("should apply rules in order, each seeing the size before it, never below 0", () => {
    const rules = [rule("taint", "gain", "@points - 3"), rule("taint", "gain", "@points * 2")];
    expect(ledgerChange({ track: "taint", points: 4, rules }).points).toBe(2);
    expect(ledgerChange({ track: "taint", points: 1, rules }).points).toBe(0);
  });

  it("should read the actor's roll data, and report a formula that fails", () => {
    const result = ledgerChange({
      track: "honor",
      points: 2,
      rules: [rule("honor", "gain", "@points + @rings.air"), rule("honor", "gain", "oops(", "Bad")],
      rollData: { rings: { air: 3 } }
    });
    expect(result.points).toBe(5);
    expect(result.errors).toEqual([{ source: "Bad", message: expect.any(String) }]);
  });
});
