import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/auth";
import { DivisionPeriodBoard } from "@/components/leaderboard/division-period-board";
import { formatDayTitle } from "@/components/leaderboard/period-leaderboard-view";
import { getDailyLeaderboardPage } from "@/lib/period-leaderboard-service";

type DayLeaderboardPageProps = {
  params: Promise<{ date: string }>;
};

export default async function DayLeaderboardPage({ params }: DayLeaderboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { date } = await params;
  const page = await getDailyLeaderboardPage(date);
  if (!page) {
    notFound();
  }

  const periodEnded = page.day.date < page.calendarToday;

  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-black/5 bg-surface p-8 text-center text-muted">
          Loading day board…
        </div>
      }
    >
      <DivisionPeriodBoard
        backHref="/leaderboard/days"
        backLabel="All past days"
        currentUserId={session.user.id}
        entriesByDivision={page.entriesByDivision}
        metricLabel="steps"
        periodEnded={periodEnded}
        showBasePoints
        starBonusPoints={page.starOfDayPoints}
        starPeriod="day"
        subtitle={`${formatDayTitle(page.day.date)} · target ${page.day.targetSteps.toLocaleString("en-IN")} steps`}
        title={periodEnded ? "Day board" : "Today’s board"}
      />
    </Suspense>
  );
}
