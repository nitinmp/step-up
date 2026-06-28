import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PeriodIndexView } from "@/components/leaderboard/period-index-view";
import { getLeaderboardPeriodIndexes } from "@/lib/period-leaderboard-service";

export default async function LeaderboardDaysPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { pastDays } = await getLeaderboardPeriodIndexes();

  return (
    <PeriodIndexView
      backHref="/leaderboard"
      emptyMessage="No past days yet. Check back after today ends."
      items={pastDays.map((day) => ({
        kind: "day" as const,
        day,
        href: `/leaderboard/day/${day.date}`,
      }))}
      subtitle="Tap a day to view that day’s step rankings."
      title="Past days"
    />
  );
}
