import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeBasePoints,
  computeLegacyBasePoints,
  computeOverTargetBonus,
  computeStage4BasePoints,
  computeStage4MilestoneBonus,
  computeStage4OverTargetBonus,
  computeTieredBasePoints,
  isBeastMode,
} from "../src/lib/scoring";
import {
  STAGE4_SCORING_START_DATE,
  TIERED_SCORING_START_DATE,
} from "../src/lib/group-rules";

const WEEK2_DATE = TIERED_SCORING_START_DATE;
const BEFORE_CUTOVER = "2026-07-05";
const R = 10;
const TARGET = 8000;

describe("computeLegacyBasePoints", () => {
  it("returns 0 when under target", () => {
    assert.equal(computeLegacyBasePoints(4999, 5000, 5), 0);
  });

  it("week 1 example: 10000 steps at target 5000, R=5", () => {
    assert.equal(computeLegacyBasePoints(10000, 5000, 5), 30);
  });

  it("week 3 example: 13200 steps at target 10000, R=15", () => {
    assert.equal(computeLegacyBasePoints(13200, 10000, 15), 60);
  });

  it("exact target earns day rate only", () => {
    assert.equal(computeLegacyBasePoints(5000, 5000, 5), 5);
  });
});

describe("computeOverTargetBonus (tiered, Week 2 table)", () => {
  const cases: Array<[number, number, number, number]> = [
    [8000, 0, 0, 0],
    [10000, 20, 20, 20],
    [12000, 40, 30, 60],
    [15000, 70, 40, 120],
    [18000, 80, 60, 180],
    [21000, 90, 70, 240],
  ];

  for (const [steps, elite, strider, riser] of cases) {
    it(`bonus at ${steps} steps matches spec`, () => {
      assert.equal(
        computeOverTargetBonus(steps, TARGET, R, "elite"),
        elite,
        "elite",
      );
      assert.equal(
        computeOverTargetBonus(steps, TARGET, R, "strider"),
        strider,
        "strider",
      );
      assert.equal(
        computeOverTargetBonus(steps, TARGET, R, "riser"),
        riser,
        "riser",
      );
    });
  }

  it("spot check total at 10000 steps for elite", () => {
    assert.equal(computeTieredBasePoints(10000, TARGET, R, "elite"), 30);
  });
});

describe("promo card examples (Week 2, target 8,000, R=10)", () => {
  it("riser at 12,000: seg1 20 + seg2 40 = 60 bonus, 70 total", () => {
    assert.equal(computeOverTargetBonus(12000, TARGET, R, "riser"), 60);
    assert.equal(computeTieredBasePoints(12000, TARGET, R, "riser"), 70);
  });

  it("strider at 15,000: seg1 20 + seg2 20 = 40 bonus, 50 total", () => {
    assert.equal(computeOverTargetBonus(15000, TARGET, R, "strider"), 40);
    assert.equal(computeTieredBasePoints(15000, TARGET, R, "strider"), 50);
  });

  it("elite at 20,000: seg1 70 + seg2 10 = 80 bonus, 90 total", () => {
    assert.equal(computeOverTargetBonus(20000, TARGET, R, "elite"), 80);
    assert.equal(computeTieredBasePoints(20000, TARGET, R, "elite"), 90);
  });
});

describe("computeBasePoints cutover", () => {
  it("uses legacy formula before cutover regardless of group", () => {
    const legacy = computeLegacyBasePoints(12000, TARGET, R);
    assert.equal(
      computeBasePoints(12000, TARGET, R, BEFORE_CUTOVER, "elite"),
      legacy,
    );
    assert.equal(
      computeBasePoints(12000, TARGET, R, BEFORE_CUTOVER, "riser"),
      legacy,
    );
  });

  it("uses tiered formula from cutover onward", () => {
    assert.equal(
      computeBasePoints(12000, TARGET, R, WEEK2_DATE, "riser"),
      R + 60,
    );
  });
});

describe("week 4 stage 4 block scoring (from 20 Jul)", () => {
  const week4Date = STAGE4_SCORING_START_DATE;
  const week4Target = 11000;
  const week4Rate = 20;

  it("elite earns 20 pts per 4000 steps above target", () => {
    assert.equal(
      computeStage4OverTargetBonus(19000, week4Target, "elite"),
      40,
    );
    assert.equal(
      computeBasePoints(19000, week4Target, week4Rate, week4Date, "elite"),
      60,
    );
  });

  it("strider earns 20 pts per 3000 steps above target", () => {
    assert.equal(
      computeStage4OverTargetBonus(17000, week4Target, "strider"),
      40,
    );
    assert.equal(
      computeBasePoints(17000, week4Target, week4Rate, week4Date, "strider"),
      60,
    );
  });

  it("riser earns 20 pts per 2000 steps above target", () => {
    assert.equal(
      computeStage4OverTargetBonus(15000, week4Target, "riser"),
      40,
    );
    assert.equal(
      computeBasePoints(15000, week4Target, week4Rate, week4Date, "riser"),
      60,
    );
  });

  it("adds milestone bonuses above 20k and 40k steps", () => {
    assert.equal(computeStage4MilestoneBonus(20000), 0);
    assert.equal(computeStage4MilestoneBonus(20001), 25);
    assert.equal(computeStage4MilestoneBonus(40000), 25);
    assert.equal(computeStage4MilestoneBonus(40001), 75);
    assert.equal(
      computeStage4BasePoints(40001, week4Target, week4Rate, "elite"),
      20 + Math.floor(29001 / 4000) * 20 + 75,
    );
  });

  it("still uses tiered scoring on the last week 3 day", () => {
    assert.equal(
      computeBasePoints(15000, week4Target, 15, "2026-07-19", "strider"),
      45,
    );
  });
});

describe("isBeastMode", () => {
  it("flags beast when steps >= 2x target", () => {
    assert.equal(isBeastMode(10000, 5000, 2), true);
    assert.equal(isBeastMode(9999, 5000, 2), false);
  });
});
