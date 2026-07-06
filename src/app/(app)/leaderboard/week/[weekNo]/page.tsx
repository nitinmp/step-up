import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/auth";
import { DivisionPeriodBoard } from "@/components/leaderboard/division-period-board";
import { formatWeekTitle } from "@/components/leaderboard/period-leaderboard-view";
import { getWeeklyLeaderboardPage } from "@/lib/period-leaderboard-service";

type WeekLeaderboardPageProps = {
  params: Promise<{ weekNo: string }>;
};

export default async function WeekLeaderboardPage({ params }: WeekLeaderboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const weekNo = Number((await params).weekNo);
  if (!Number.isInteger(weekNo) || weekNo < 1) {
    notFound();
  }

  const page = await getWeeklyLeaderboardPage(weekNo);
  if (!page) {
    notFound();
  }

  const periodEnded = page.week.endDate < page.calendarToday;

  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-black/5 bg-surface p-8 text-center text-muted">
          Loading week board…
        </div>
      }
    >
      <DivisionPeriodBoard
        backHref="/leaderboard/weeks"
        backLabel="All past weeks"
        currentUserId={session.user.id}
        entriesByDivision={page.entriesByDivision}
        metricLabel="steps"
        periodEnded={periodEnded}
        starBonusPoints={page.starOfWeekPoints}
        starPeriod="week"
        subtitle={formatWeekTitle(
          page.week.weekNo,
          page.week.startDate,
          page.week.endDate,
        )}
        title={periodEnded ? "Week board" : "This week’s board"}
      />
    </Suspense>
  );
}
