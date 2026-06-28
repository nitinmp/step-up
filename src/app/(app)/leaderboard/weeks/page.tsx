import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PeriodIndexView } from "@/components/leaderboard/period-index-view";
import { getLeaderboardPeriodIndexes } from "@/lib/period-leaderboard-service";

export default async function LeaderboardWeeksPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { pastWeeks } = await getLeaderboardPeriodIndexes();

  return (
    <PeriodIndexView
      backHref="/leaderboard"
      emptyMessage="No past weeks yet. Check back after this week ends."
      items={pastWeeks.map((week) => ({
        kind: "week" as const,
        week,
        href: `/leaderboard/week/${week.weekNo}`,
      }))}
      subtitle="Tap a week to view that week’s step totals."
      title="Past weeks"
    />
  );
}
