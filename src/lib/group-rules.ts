import type { Division } from "@/lib/divisions";

/** Tiered over-target bonus and third division apply from this challenge date (inclusive). */
export const TIERED_SCORING_START_DATE = "2026-07-06";

/** Stage 4 block scoring + step milestones apply from Week 4 (inclusive). */
export const STAGE4_SCORING_START_DATE = "2026-07-20";

/** Elite + Strider only — used for stars and period boards before the cutover. */
export const LEGACY_DIVISIONS: Division[] = ["strider", "elite"];

const THREE_DIVISIONS: Division[] = ["strider", "elite", "riser"];

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

/** Steps above daily target per block that earns STAGE4_BLOCK_POINTS. */
export const STAGE4_OVER_TARGET_BLOCKS: Record<Division, number> = {
  elite: 4_000,
  strider: 3_000,
  riser: 2_000,
};

export const STAGE4_BLOCK_POINTS = 20;
export const STAGE4_MILESTONE_20K_STEPS = 20_000;
export const STAGE4_MILESTONE_20K_POINTS = 25;
export const STAGE4_MILESTONE_40K_STEPS = 40_000;
export const STAGE4_MILESTONE_40K_POINTS = 50;

export function usesTieredScoring(activityDate: string): boolean {
  return activityDate >= TIERED_SCORING_START_DATE;
}

export function usesStage4Scoring(activityDate: string): boolean {
  return activityDate >= STAGE4_SCORING_START_DATE;
}

export function usesThreeDivisions(asOfDate: string): boolean {
  return usesTieredScoring(asOfDate);
}

export function divisionsActiveOnDate(date: string): Division[] {
  return usesThreeDivisions(date) ? THREE_DIVISIONS : LEGACY_DIVISIONS;
}

/** Before cutover, Riser did not exist — use division-as-of-cutover.ts for per-user history. */
