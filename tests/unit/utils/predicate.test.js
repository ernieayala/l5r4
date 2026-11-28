import { describe, expect, it } from "vitest";
import { hasOptionPrefix, testPredicate } from "../../../module/utils/predicate.js";

// #175: which preparation step a rule must wait for
describe("hasOptionPrefix", () => {
  it("should find a prefix in a plain, negated, nested, or compared term", () => {
    expect(hasOptionPrefix(["wound:nicked"], ["wound:"])).toBe(true);
    expect(hasOptionPrefix([{ not: "wound:out" }], ["wound:"])).toBe(true);
    expect(hasOptionPrefix([{ or: ["status:prone", { and: ["wound:hurt"] }] }], ["wound:"])).toBe(
      true
    );
    expect(hasOptionPrefix([{ gte: ["ring:fire", 3] }], ["ring:"])).toBe(true);
  });

  it("should find nothing in a predicate without the prefix", () => {
    expect(
      hasOptionPrefix(["status:prone", { gte: ["skill:kenjutsu", 3] }], ["wound:", "ring:"])
    ).toBe(false);
    expect(hasOptionPrefix(undefined, ["wound:"])).toBe(false);
  });
});

const options = new Set([
  "status:defenseStance",
  "ring:fire:3",
  "trait:ref:2",
  "target",
  "target:status:prone"
]);

describe("testPredicate", () => {
  it("should hold for an empty or missing predicate", () => {
    expect(testPredicate([], options)).toBe(true);
    expect(testPredicate(undefined, options)).toBe(true);
  });

  it("should need every string term present", () => {
    expect(testPredicate(["status:defenseStance"], options)).toBe(true);
    expect(testPredicate(["status:defenseStance", "status:prone"], options)).toBe(false);
  });

  it("should negate with not", () => {
    expect(testPredicate([{ not: "target:status:mounted" }], options)).toBe(true);
    expect(testPredicate([{ not: "target:status:prone" }], options)).toBe(false);
  });

  it("should need one term with or, and all with and", () => {
    expect(testPredicate([{ or: ["status:prone", "ring:fire:3"] }], options)).toBe(true);
    expect(testPredicate([{ or: ["status:prone", "status:stunned"] }], options)).toBe(false);
    expect(testPredicate([{ and: ["target", "target:status:prone"] }], options)).toBe(true);
    expect(testPredicate([{ and: ["target", "target:status:mounted"] }], options)).toBe(false);
  });

  it("should nest operators", () => {
    expect(testPredicate([{ not: { or: ["status:prone", "status:stunned"] } }], options)).toBe(
      true
    );
  });

  it("should compare numeric options by prefix", () => {
    expect(testPredicate([{ gte: ["ring:fire", 3] }], options)).toBe(true);
    expect(testPredicate([{ gt: ["ring:fire", 3] }], options)).toBe(false);
    expect(testPredicate([{ lte: ["trait:ref", 2] }], options)).toBe(true);
    expect(testPredicate([{ lt: ["trait:ref", 2] }], options)).toBe(false);
    expect(testPredicate([{ eq: ["ring:fire", 3] }], options)).toBe(true);
  });

  it("should fail a comparison when no option has the prefix", () => {
    expect(testPredicate([{ gte: ["ring:water", 1] }], options)).toBe(false);
  });

  it("should not match a longer prefix as a shorter one", () => {
    expect(testPredicate([{ gte: ["ring:fir", 1] }], options)).toBe(false);
  });

  it("should fail an unknown or malformed term", () => {
    expect(testPredicate([{ near: "x" }], options)).toBe(false);
    expect(testPredicate([null], options)).toBe(false);
    expect(testPredicate([42], options)).toBe(false);
    expect(testPredicate([{ or: "status:defenseStance" }], options)).toBe(false);
  });
});
