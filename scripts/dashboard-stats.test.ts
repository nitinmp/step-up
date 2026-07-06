import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeLoggingStreaks,
  computePointsBreakdown,
  computeRankChase,
} from "../src/lib/dashboard-stats";
import type { UserStanding } from "../src/lib/standings";

test("computePointsBreakdown splits target and push from base_points", () => {
  const breakdown = computePointsBreakdown(
    "u1",
    [
      {
        userId: "u1",
        activityDate: "2026-07-01",
        steps: 8000,
        basePoints: 0,
        status: "approved",
      },
      {
        userId: "u1",
        activityDate: "2026-07-02",
        steps: 12000,
        basePoints: 45,
        status: "approved",
      },
    ],
    [
      {
        date: "2026-07-01",
        weekNo: 1,
        dayRate: 5,
        targetSteps: 7000,
      },
      {
        date: "2026-07-02",
        weekNo: 1,
        dayRate: 5,
        targetSteps: 7000,
      },
    ],
  );

  assert.equal(breakdown.targetPoints, 10);
  assert.equal(breakdown.pushPoints, 35);
});

test("computeLoggingStreaks ignores today when not logged", () => {
  const streaks = computeLoggingStreaks(
    new Set(["2026-07-01", "2026-07-02"]),
    ["2026-07-01", "2026-07-02", "2026-07-03"],
    "2026-07-03",
  );

  assert.equal(streaks.current, 2);
  assert.equal(streaks.longest, 2);
});

test("computePointsBreakdown ignores pending activities", () => {
  const breakdown = computePointsBreakdown(
    "u1",
    [
      {
        userId: "u1",
        activityDate: "2026-07-03",
        steps: 15000,
        basePoints: 50,
        status: "pending",
      },
      {
        userId: "u1",
        activityDate: "2026-07-02",
        steps: 12000,
        basePoints: 45,
        status: "approved",
      },
    ],
    [
      {
        date: "2026-07-02",
        weekNo: 1,
        dayRate: 5,
        targetSteps: 7000,
      },
      {
        date: "2026-07-03",
        weekNo: 1,
        dayRate: 5,
        targetSteps: 7000,
      },
    ],
  );

  assert.equal(breakdown.targetPoints, 5);
  assert.equal(breakdown.pushPoints, 40);
});

test("computeRankChase returns gap to rank above", () => {
  const standing: UserStanding = {
    userId: "u2",
    name: "B",
    profileImageUrl: null,
    division: "strider",
    gender: null,
    rank: 2,
    total: 100,
    breakdown: { base: 100, starDay: 0, weekStar: 0, consistency: 0 },
    daysMet: 5,
    starDayCount: 0,
    weekStarCount: 0,
    beastCount: 0,
    totalSteps: 50000,
  };

  const chase = computeRankChase(standing, [
    {
      ...standing,
      userId: "u1",
      name: "A",
      rank: 1,
      total: 112,
    },
    standing,
  ]);

  assert.equal(chase.pointsToRankAbove, 12);
  assert.equal(chase.participantCount, 2);
});
