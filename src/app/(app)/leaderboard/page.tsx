import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LeaderboardHub } from "@/components/leaderboard/leaderboard-hub";
import { getLeaderboardHubData } from "@/lib/period-leaderboard-service";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await getLeaderboardHubData(session.user.id);

  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-black/5 bg-surface p-8 text-center text-muted">
          Loading leaderboard…
        </div>
      }
    >
      <LeaderboardHub
        currentDaily={data.currentDaily}
        currentUserId={data.currentUserId}
        currentWeekly={data.currentWeekly}
        lastEndedWeek={data.lastEndedWeek}
        lastWeeklyByDivision={data.lastWeeklyByDivision}
        periods={data.periods}
        starOfDayPoints={data.starOfDayPoints}
        starOfWeekPoints={data.starOfWeekPoints}
        standingsByDivision={data.standingsByDivision}
        viewerDivision={data.viewerDivision}
      />
    </Suspense>
  );
}
