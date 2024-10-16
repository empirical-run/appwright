import { test, expect } from "vitest";
import { longestDeterministicGroup } from "../utils";

test("longest deterministic group with one group", () => {
  const pattern = /.*(Copy to clipboard)$/;
  const substring = longestDeterministicGroup(pattern);
  expect(substring).toBe("Copy to clipboard");
});

test("longest deterministic group with no groups", () => {
  const pattern = /.*Copy to clipboard$/;
  const substring = longestDeterministicGroup(pattern);
  expect(substring).toBe(undefined);
});

test("longest deterministic group with group that has special chars", () => {
  const pattern = /.*(Copy .* to clipboard)$/;
  const substring = longestDeterministicGroup(pattern);
  expect(substring).toBe(undefined);
});
