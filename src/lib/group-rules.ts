import type { Division } from "@/lib/divisions";

/** Tiered over-target bonus applies from this challenge date (inclusive). */
export const TIERED_SCORING_START_DATE = "2026-07-06";

export type GroupRule = {
  threshold: number;
  aboveBlock: number;
  aboveMult: number;
};

export const GROUP_RULES: Record<Division, GroupRule> = {
  elite: { threshold: 15_000, aboveBlock: 3_000, aboveMult: 1 },
  strider: { threshold: 10_000, aboveBlock: 2_000, aboveMult: 1 },
  riser: { threshold: 10_000, aboveBlock: 1_000, aboveMult: 2 },
};

export function usesTieredScoring(activityDate: string): boolean {
  return activityDate >= TIERED_SCORING_START_DATE;
}
