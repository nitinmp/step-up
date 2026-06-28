import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  PeriodLeaderboardView,
  formatDayTitle,
} from "@/components/leaderboard/period-leaderboard-view";
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
    <PeriodLeaderboardView
      backHref="/leaderboard/days"
      backLabel="All past days"
      currentUserId={session.user.id}
      entries={page.entries}
      metricLabel="steps"
      periodEnded={periodEnded}
      showBasePoints
      subtitle={`${formatDayTitle(page.day.date)} · target ${page.day.targetSteps.toLocaleString("en-IN")} steps`}
      title={periodEnded ? "Day board" : "Today’s board"}
    />
  );
}
