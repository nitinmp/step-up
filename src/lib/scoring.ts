import type { Division } from "@/lib/divisions";
import {
  GROUP_RULES,
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
