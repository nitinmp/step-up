#!/usr/bin/env node
/**
 * Plain Node verification for Stage 4 scoring (no tsx required).
 * Run: node scripts/verify-stage4-scoring.mjs
 */

const STAGE4_START = "2026-07-20";
const TIERED_START = "2026-07-06";
const TARGET = 11_000;
const R = 20;

const STAGE4_BLOCKS = { elite: 4000, strider: 3000, riser: 2000 };

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    passed += 1;
    console.log(`  ✓ ${label}`);
    return;
  }
  failed += 1;
  console.error(`  ✗ ${label}`);
  console.error(`    expected ${expected}, got ${actual}`);
}

function legacyBase(steps, target, dayRate) {
  if (steps < target) return 0;
  return dayRate * (1 + Math.floor((steps - target) / 1000));
}

function tieredOverTarget(steps, target, dayRate, division) {
  if (steps <= target) return 0;
  const rules = {
    elite: { threshold: 15_000, aboveBlock: 3_000, aboveMult: 1 },
    strider: { threshold: 10_000, aboveBlock: 2_000, aboveMult: 1 },
    riser: { threshold: 10_000, aboveBlock: 1_000, aboveMult: 2 },
  };
  const rule = rules[division];
  let bonus = 0;
  const seg1End = Math.min(steps, rule.threshold);
  if (seg1End > target) bonus += Math.floor((seg1End - target) / 1000) * dayRate;
  const seg2Start = Math.max(target, rule.threshold);
  if (steps > seg2Start) {
    bonus += Math.floor((steps - seg2Start) / rule.aboveBlock) * dayRate * rule.aboveMult;
  }
  return bonus;
}

function tieredBase(steps, target, dayRate, division) {
  if (steps < target) return 0;
  return dayRate + tieredOverTarget(steps, target, dayRate, division);
}

function stage4OverTarget(steps, target, division) {
  if (steps <= target) return 0;
  return Math.floor((steps - target) / STAGE4_BLOCKS[division]) * 20;
}

function stage4Milestone(steps) {
  let bonus = 0;
  if (steps > 20_000) bonus += 25;
  if (steps > 40_000) bonus += 50;
  return bonus;
}

function stage4Base(steps, target, dayRate, division) {
  if (steps < target) return 0;
  return dayRate + stage4OverTarget(steps, target, division) + stage4Milestone(steps);
}

function computeBasePoints(steps, target, dayRate, activityDate, division) {
  if (activityDate < TIERED_START) return legacyBase(steps, target, dayRate);
  if (activityDate >= STAGE4_START) return stage4Base(steps, target, dayRate, division);
  return tieredBase(steps, target, dayRate, division);
}

console.log("Stage 4 scoring verification\n");

console.log("Formula selection");
assertEqual(computeBasePoints(10_000, 5_000, 5, "2026-07-05", "strider"), 30, "legacy week 1");
assertEqual(computeBasePoints(15_000, TARGET, 15, "2026-07-19", "strider"), 45, "tiered week 3");
assertEqual(computeBasePoints(21_000, 9_000, 10, "2026-07-12", "elite"), 90, "tiered week 2 elite");
assertEqual(computeBasePoints(15_000, TARGET, R, "2026-07-19", "elite"), 100, "Jul 19 still tiered");
assertEqual(computeBasePoints(15_000, TARGET, R, STAGE4_START, "elite"), 40, "Jul 20 stage 4 elite");

console.log("\nBlock bonuses (target 11k, R=20)");
assertEqual(computeBasePoints(TARGET, TARGET, R, STAGE4_START, "elite"), 20, "exact target");
assertEqual(computeBasePoints(TARGET - 1, TARGET, R, STAGE4_START, "elite"), 0, "under target");
assertEqual(computeBasePoints(15_000, TARGET, R, STAGE4_START, "elite"), 40, "elite +4k block");
assertEqual(computeBasePoints(19_000, TARGET, R, STAGE4_START, "elite"), 60, "elite +8k blocks");
assertEqual(computeBasePoints(14_000, TARGET, R, STAGE4_START, "strider"), 40, "strider +3k block");
assertEqual(computeBasePoints(17_000, TARGET, R, STAGE4_START, "strider"), 60, "strider +6k blocks");
assertEqual(computeBasePoints(13_000, TARGET, R, STAGE4_START, "riser"), 40, "riser +2k block");
assertEqual(computeBasePoints(17_000, TARGET, R, STAGE4_START, "riser"), 80, "riser +6k blocks");

console.log("\nMilestone bonuses");
assertEqual(stage4Milestone(20_000), 0, "no milestone at exactly 20k");
assertEqual(stage4Milestone(20_001), 25, "+25 above 20k");
assertEqual(stage4Milestone(40_000), 25, "+25 at exactly 40k (not 40k tier yet)");
assertEqual(stage4Milestone(40_001), 75, "+75 above 40k (25+50)");
assertEqual(computeBasePoints(21_000, TARGET, R, STAGE4_START, "elite"), 85, "21k elite total");
assertEqual(computeBasePoints(42_000, TARGET, R, STAGE4_START, "elite"), 235, "42k elite total");

console.log("\nLater week 4 day (12k target, 23 Jul)");
assertEqual(
  computeBasePoints(19_000, 12_000, 20, "2026-07-23", "strider"),
  60,
  "strider 19k vs 12k target",
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
