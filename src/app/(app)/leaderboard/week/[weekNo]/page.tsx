import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  PeriodLeaderboardView,
  formatWeekTitle,
} from "@/components/leaderboard/period-leaderboard-view";
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
    <PeriodLeaderboardView
      backHref="/leaderboard/weeks"
      backLabel="All past weeks"
      currentUserId={session.user.id}
      entries={page.entries}
      metricLabel="steps"
      periodEnded={periodEnded}
      subtitle={formatWeekTitle(
        page.week.weekNo,
        page.week.startDate,
        page.week.endDate,
      )}
      title={periodEnded ? "Week board" : "This week’s board"}
    />
  );
}
