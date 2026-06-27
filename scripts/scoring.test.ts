import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeBasePoints, isBeastMode } from "../src/lib/scoring";

describe("computeBasePoints", () => {
  it("returns 0 when under target", () => {
    assert.equal(computeBasePoints(4999, 5000, 5), 0);
  });

  it("week 1 example: 10000 steps at target 5000, R=5", () => {
    assert.equal(computeBasePoints(10000, 5000, 5), 30);
  });

  it("week 3 example: 13200 steps at target 10000, R=15", () => {
    assert.equal(computeBasePoints(13200, 10000, 15), 60);
  });

  it("exact target earns day rate only", () => {
    assert.equal(computeBasePoints(5000, 5000, 5), 5);
  });
});

describe("isBeastMode", () => {
  it("flags beast when steps >= 2x target", () => {
    assert.equal(isBeastMode(10000, 5000, 2), true);
    assert.equal(isBeastMode(9999, 5000, 2), false);
  });
});
