import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDivisionForDate,
  STAGE4_DIVISION_CUTOVER_DATE,
} from "../src/lib/division-as-of-cutover";
import type { Division } from "../src/lib/divisions";
import { STAGE4_SCORING_START_DATE } from "../src/lib/group-rules";
import {
  computeBasePoints,
  computeStage4BasePoints,
  computeStage4MilestoneBonus,
  computeStage4OverTargetBonus,
} from "../src/lib/scoring";

const MOHIT_MENON_ID = "afafd81d-8624-47d4-a621-9b42dc5ccffd";

/** Week 4 day 1 from seed */
const STAGE4_DAY = STAGE4_SCORING_START_DATE;
const TARGET = 11_000;
const R = 20;

type Scenario = {
  label: string;
  steps: number;
  division: Division;
  expected: number;
  date?: string;
};

function scoringDivision(
  userId: string,
  currentDivision: Division,
  activityDate: string,
  divisionBeforeStage4?: Division | null,
): Division {
  return getDivisionForDate(
    userId,
    currentDivision,
    activityDate,
    divisionBeforeStage4,
  );
}

function expectPoints(scenario: Scenario) {
  const date = scenario.date ?? STAGE4_DAY;
  const actual = computeBasePoints(
    scenario.steps,
    TARGET,
    R,
    date,
    scenario.division,
  );
  assert.equal(
    actual,
    scenario.expected,
    `${scenario.label}: expected ${scenario.expected}, got ${actual}`,
  );
}

describe("Stage 4 formula selection by date", () => {
  it("uses legacy scoring before 6 Jul", () => {
    assert.equal(computeBasePoints(10_000, 5_000, 5, "2026-07-05", "strider"), 30);
  });

  it("uses tiered scoring between 6 Jul and 19 Jul", () => {
    assert.equal(computeBasePoints(15_000, TARGET, 15, "2026-07-19", "strider"), 45);
    assert.equal(computeBasePoints(21_000, 9_000, 10, "2026-07-12", "elite"), 90);
  });

  it("uses stage 4 scoring from 20 Jul", () => {
    assert.equal(
      computeBasePoints(15_000, TARGET, R, "2026-07-19", "elite"),
      100,
    );
    assert.equal(computeBasePoints(15_000, TARGET, R, STAGE4_DAY, "elite"), 40);
  });
});

describe("Stage 4 block bonuses by division", () => {
  const cases: Scenario[] = [
    {
      label: "exact target only",
      steps: TARGET,
      division: "elite",
      expected: R,
    },
    {
      label: "under target earns nothing",
      steps: TARGET - 1,
      division: "elite",
      expected: 0,
    },
    {
      label: "elite +4000 above target",
      steps: TARGET + 4_000,
      division: "elite",
      expected: R + 20,
    },
    {
      label: "elite +8000 above target",
      steps: TARGET + 8_000,
      division: "elite",
      expected: R + 40,
    },
    {
      label: "strider +3000 above target",
      steps: TARGET + 3_000,
      division: "strider",
      expected: R + 20,
    },
    {
      label: "strider +6000 above target",
      steps: TARGET + 6_000,
      division: "strider",
      expected: R + 40,
    },
    {
      label: "riser +2000 above target",
      steps: TARGET + 2_000,
      division: "riser",
      expected: R + 20,
    },
    {
      label: "riser +6000 above target",
      steps: TARGET + 6_000,
      division: "riser",
      expected: R + 60,
    },
  ];

  for (const scenario of cases) {
    it(scenario.label, () => {
      expectPoints(scenario);
      assert.equal(
        computeStage4OverTargetBonus(scenario.steps, TARGET, scenario.division),
        Math.max(0, scenario.expected - R),
        "over-target component",
      );
    });
  }
});

describe("Stage 4 milestone bonuses", () => {
  it("does not award milestones at or below thresholds", () => {
    assert.equal(computeStage4MilestoneBonus(20_000), 0);
    assert.equal(computeStage4MilestoneBonus(40_000), 25);
  });

  it("awards +25 above 20k steps", () => {
    assert.equal(computeStage4MilestoneBonus(20_001), 25);
  });

  it("awards +25 and +50 above 40k steps (75 total)", () => {
    assert.equal(computeStage4MilestoneBonus(40_001), 75);
  });

  it("includes milestones in full stage 4 total", () => {
    const steps = 21_000;
    const overTarget = computeStage4OverTargetBonus(steps, TARGET, "elite");
    const milestones = computeStage4MilestoneBonus(steps);
    assert.equal(overTarget, 40);
    assert.equal(milestones, 25);
    assert.equal(
      computeStage4BasePoints(steps, TARGET, R, "elite"),
      R + overTarget + milestones,
    );
    assert.equal(computeBasePoints(steps, TARGET, R, STAGE4_DAY, "elite"), 85);
  });

  it("combines high steps, blocks, and both milestones", () => {
    const steps = 42_000;
    const expected =
      R +
      Math.floor((steps - TARGET) / 4_000) * 20 +
      25 +
      50;
    assert.equal(computeBasePoints(steps, TARGET, R, STAGE4_DAY, "elite"), expected);
    assert.equal(expected, 235);
  });
});

describe("Stage 4 with division moves from 20 Jul", () => {
  it("scores Jul 19 activity with pre-move division", () => {
    const division = scoringDivision(MOHIT_MENON_ID, "strider", "2026-07-19", "elite");
    assert.equal(division, "elite");
    assert.equal(
      computeBasePoints(21_000, 9_000, 10, "2026-07-12", division),
      90,
    );
  });

  it("scores Jul 20 activity with new division after admin move", () => {
    const division = scoringDivision(
      MOHIT_MENON_ID,
      "strider",
      STAGE4_DIVISION_CUTOVER_DATE,
      "elite",
    );
    assert.equal(division, "strider");
    assert.equal(
      computeBasePoints(17_000, TARGET, R, STAGE4_DAY, division),
      60,
    );
  });

  it("unchanged user keeps same division before and after stage 4", () => {
    const divisionJul19 = scoringDivision(MOHIT_MENON_ID, "elite", "2026-07-19");
    const divisionJul20 = scoringDivision(
      MOHIT_MENON_ID,
      "elite",
      STAGE4_DIVISION_CUTOVER_DATE,
    );
    assert.equal(divisionJul19, "elite");
    assert.equal(divisionJul20, "elite");
  });
});

describe("Stage 4 realistic week-4 challenge days", () => {
  it("scores 23 Jul with higher target from seed schedule", () => {
    assert.equal(
      computeBasePoints(19_000, 12_000, 20, "2026-07-23", "strider"),
      20 + Math.floor(7_000 / 3_000) * 20,
    );
    assert.equal(
      computeBasePoints(19_000, 12_000, 20, "2026-07-23", "strider"),
      60,
    );
  });
});
