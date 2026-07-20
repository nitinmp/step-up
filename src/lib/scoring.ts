import type { Division } from "@/lib/divisions";
import {
  GROUP_RULES,
  STAGE4_BLOCK_POINTS,
  STAGE4_MILESTONE_20K_POINTS,
  STAGE4_MILESTONE_20K_STEPS,
  STAGE4_MILESTONE_40K_POINTS,
  STAGE4_MILESTONE_40K_STEPS,
  STAGE4_OVER_TARGET_BLOCKS,
  usesStage4Scoring,
  usesTieredScoring,
  type GroupRule,
} from "@/lib/group-rules";

export function computeLegacyBasePoints(
  steps: number,
  target: number,
  dayRate: number,
): number {
  if (steps < target) {
    return 0;
  }

  return dayRate * (1 + Math.floor((steps - target) / 1000));
}

export function computeOverTargetBonus(
  steps: number,
  target: number,
  dayRate: number,
  division: Division,
): number {
  if (steps <= target) {
    return 0;
  }

  const rule = GROUP_RULES[division];
  let bonus = 0;

  const seg1End = Math.min(steps, rule.threshold);
  if (seg1End > target) {
    bonus += Math.floor((seg1End - target) / 1000) * dayRate;
  }

  const seg2Start = Math.max(target, rule.threshold);
  if (steps > seg2Start) {
    bonus +=
      Math.floor((steps - seg2Start) / rule.aboveBlock) *
      dayRate *
      rule.aboveMult;
  }

  return bonus;
}

export function computeTieredBasePoints(
  steps: number,
  target: number,
  dayRate: number,
  division: Division,
): number {
  if (steps < target) {
    return 0;
  }

  return dayRate + computeOverTargetBonus(steps, target, dayRate, division);
}

export function computeStage4OverTargetBonus(
  steps: number,
  target: number,
  division: Division,
): number {
  if (steps <= target) {
    return 0;
  }

  const block = STAGE4_OVER_TARGET_BLOCKS[division];
  return Math.floor((steps - target) / block) * STAGE4_BLOCK_POINTS;
}

export function computeStage4MilestoneBonus(steps: number): number {
  let bonus = 0;

  if (steps > STAGE4_MILESTONE_20K_STEPS) {
    bonus += STAGE4_MILESTONE_20K_POINTS;
  }

  if (steps > STAGE4_MILESTONE_40K_STEPS) {
    bonus += STAGE4_MILESTONE_40K_POINTS;
  }

  return bonus;
}

export function computeStage4BasePoints(
  steps: number,
  target: number,
  dayRate: number,
  division: Division,
): number {
  if (steps < target) {
    return 0;
  }

  return (
    dayRate +
    computeStage4OverTargetBonus(steps, target, division) +
    computeStage4MilestoneBonus(steps)
  );
}

export function computeBasePoints(
  steps: number,
  target: number,
  dayRate: number,
  activityDate: string,
  division: Division,
): number {
  if (!usesTieredScoring(activityDate)) {
    return computeLegacyBasePoints(steps, target, dayRate);
  }

  if (usesStage4Scoring(activityDate)) {
    return computeStage4BasePoints(steps, target, dayRate, division);
  }

  return computeTieredBasePoints(steps, target, dayRate, division);
}

export function getGroupRule(division: Division): GroupRule {
  return GROUP_RULES[division];
}

export function isBeastMode(
  steps: number,
  target: number,
  beastMultiplier: number,
): boolean {
  return steps >= beastMultiplier * target;
}
