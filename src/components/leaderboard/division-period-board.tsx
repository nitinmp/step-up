"use client";

import {
  DivisionSubTabs,
  useActiveDivision,
} from "@/components/leaderboard/division-sub-tabs";
import { PeriodLeaderboardView } from "@/components/leaderboard/period-leaderboard-view";
import { ALL_DIVISIONS, type Division } from "@/lib/divisions";
import type { PeriodLeaderboardEntry } from "@/lib/period-leaderboard";

type DivisionPeriodBoardProps = {
  currentUserId: string;
  entriesByDivision: Record<Division, PeriodLeaderboardEntry[]>;
  activeDivisions?: Division[];
  title: string;
  subtitle: string;
  metricLabel: string;
  periodEnded: boolean;
  starPeriod?: "day" | "week";
  starBonusPoints?: number;
  showBasePoints?: boolean;
  backHref: string;
  backLabel: string;
};

export function DivisionPeriodBoard({
  currentUserId,
  entriesByDivision,
  activeDivisions = ALL_DIVISIONS,
  title,
  subtitle,
  metricLabel,
  periodEnded,
  starPeriod,
  starBonusPoints,
  showBasePoints = false,
  backHref,
  backLabel,
}: DivisionPeriodBoardProps) {
  const activeDivision = useActiveDivision("strider", activeDivisions);

  return (
    <div className="space-y-4">
      <DivisionSubTabs divisions={activeDivisions} />
      <PeriodLeaderboardView
        backHref={backHref}
        backLabel={backLabel}
        currentUserId={currentUserId}
        entries={entriesByDivision[activeDivision]}
        metricLabel={metricLabel}
        periodEnded={periodEnded}
        starBonusPoints={starBonusPoints}
        starPeriod={starPeriod}
        showBasePoints={showBasePoints}
        subtitle={subtitle}
        title={title}
      />
    </div>
  );
}
