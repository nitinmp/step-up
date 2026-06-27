"use client";

import type { UserStanding } from "@/lib/standings";
import {
  LeaderboardPodium,
  type LeaderboardRanking,
} from "@/components/ui/leaderboard-podium";
import {
  LeaderboardRankings,
  type LeaderboardRankingItem,
} from "@/components/ui/leaderboard-rankings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LeaderboardViewProps = {
  standings: UserStanding[];
  currentUserId: string;
};

function toPodiumRanking(row: UserStanding): LeaderboardRanking {
  return {
    userId: row.userId,
    userName: row.name,
    rank: row.rank,
    value: row.total,
  };
}

function toRankingItem(row: UserStanding): LeaderboardRankingItem {
  return {
    userId: row.userId,
    userName: row.name,
    rank: row.rank,
    value: row.total,
    byline: `${row.daysMet} days met · ⭐ ${row.starDayCount} · 🔥 ${row.beastCount}`,
  };
}

export function LeaderboardView({
  standings,
  currentUserId,
}: LeaderboardViewProps) {
  const hasScores = standings.some((row) => row.total > 0 || row.totalSteps > 0);
  const topThree = standings.filter((row) => row.rank <= 3);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-white/80">
          Overall standings
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Leaderboard</h1>
        <p className="mt-2 text-sm text-white/85">
          {standings.length} participants · ranked by total points
        </p>
      </section>

      {!hasScores ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-lg font-medium">No scores yet</p>
            <p className="mt-2 text-muted-foreground">
              Once people start logging steps, rankings will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {topThree.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 3</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <LeaderboardPodium
                  rankings={topThree.map(toPodiumRanking)}
                  size="default"
                />
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Full rankings
            </h2>
            <LeaderboardRankings
              currentUserId={currentUserId}
              rankings={standings.map(toRankingItem)}
            />
          </div>
        </>
      )}
    </div>
  );
}
