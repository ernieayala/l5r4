import { describe, expect, it } from "vitest";
import { testPredicate } from "../../../module/utils/predicate.js";

const options = new Set([
  "status:defenseStance",
  "ring:fire:3",
  "trait:ref:2",
  "target",
  "target:status:prone"
]);

describe("testPredicate", () => {
  it("holds for an empty or missing predicate", () => {
    expect(testPredicate([], options)).toBe(true);
    expect(testPredicate(undefined, options)).toBe(true);
  });

  it("needs every string term present", () => {
    expect(testPredicate(["status:defenseStance"], options)).toBe(true);
    expect(testPredicate(["status:defenseStance", "status:prone"], options)).toBe(false);
  });

  it("negates with not", () => {
    expect(testPredicate([{ not: "target:status:mounted" }], options)).toBe(true);
    expect(testPredicate([{ not: "target:status:prone" }], options)).toBe(false);
  });

  it("needs one term with or, and all with and", () => {
    expect(testPredicate([{ or: ["status:prone", "ring:fire:3"] }], options)).toBe(true);
    expect(testPredicate([{ or: ["status:prone", "status:stunned"] }], options)).toBe(false);
    expect(testPredicate([{ and: ["target", "target:status:prone"] }], options)).toBe(true);
    expect(testPredicate([{ and: ["target", "target:status:mounted"] }], options)).toBe(false);
  });

  it("nests operators", () => {
    expect(testPredicate([{ not: { or: ["status:prone", "status:stunned"] } }], options)).toBe(
      true
    );
  });

  it("compares numeric options by prefix", () => {
    expect(testPredicate([{ gte: ["ring:fire", 3] }], options)).toBe(true);
    expect(testPredicate([{ gt: ["ring:fire", 3] }], options)).toBe(false);
    expect(testPredicate([{ lte: ["trait:ref", 2] }], options)).toBe(true);
    expect(testPredicate([{ lt: ["trait:ref", 2] }], options)).toBe(false);
    expect(testPredicate([{ eq: ["ring:fire", 3] }], options)).toBe(true);
  });

  it("fails a comparison when no option has the prefix", () => {
    expect(testPredicate([{ gte: ["ring:water", 1] }], options)).toBe(false);
  });

  it("does not match a longer prefix as a shorter one", () => {
    expect(testPredicate([{ gte: ["ring:fir", 1] }], options)).toBe(false);
  });

  it("fails an unknown or malformed term", () => {
    expect(testPredicate([{ near: "x" }], options)).toBe(false);
    expect(testPredicate([null], options)).toBe(false);
    expect(testPredicate([42], options)).toBe(false);
    expect(testPredicate([{ or: "status:defenseStance" }], options)).toBe(false);
  });
});
