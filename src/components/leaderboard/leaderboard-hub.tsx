"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import {
  PeriodLeaderboardView,
  formatDayTitle,
  formatWeekTitle,
} from "@/components/leaderboard/period-leaderboard-view";
import type { PeriodLeaderboardEntry } from "@/lib/period-leaderboard";
import type { ChallengePeriodContext } from "@/lib/period-leaderboard";
import type { UserStanding } from "@/lib/standings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BoardTab = "daily" | "weekly" | "overall";

const boardTabTriggerClass =
  "shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium sm:px-4";

type LeaderboardHubProps = {
  currentUserId: string;
  periods: ChallengePeriodContext;
  overallStandings: UserStanding[];
  currentDaily: PeriodLeaderboardEntry[];
  currentWeekly: PeriodLeaderboardEntry[];
};

function parseBoardTab(value: string | null): BoardTab {
  if (value === "weekly" || value === "overall") {
    return value;
  }
  return "daily";
}

export function LeaderboardHub({
  currentUserId,
  periods,
  overallStandings,
  currentDaily,
  currentWeekly,
}: LeaderboardHubProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseBoardTab(searchParams.get("view"));

  const currentDay = periods.currentDay;
  const currentWeek = periods.currentWeek;
  const dailyEnded = currentDay ? currentDay.date < periods.calendarToday : false;
  const weeklyEnded = currentWeek
    ? currentWeek.endDate < periods.calendarToday
    : false;

  const headerSubtitle =
    activeTab === "daily" && currentDay
      ? `${formatDayTitle(currentDay.date)} · target ${currentDay.targetSteps.toLocaleString("en-IN")} steps`
      : activeTab === "weekly" && currentWeek
        ? formatWeekTitle(
            currentWeek.weekNo,
            currentWeek.startDate,
            currentWeek.endDate,
          )
        : `${overallStandings.length} participants · ranked by total points`;

  function selectBoardTab(tab: BoardTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "daily") {
      params.delete("view");
    } else {
      params.set("view", tab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <header className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-white/80">Step Up</p>
        <h1 className="mt-2 text-3xl font-semibold">Leaderboard</h1>
        <p className="mt-2 text-sm text-white/85">{headerSubtitle}</p>
      </header>

      <Tabs
        className="gap-4"
        onValueChange={(value) => selectBoardTab(parseBoardTab(value))}
        value={activeTab}
      >
        <div className="border-b border-black/10">
          <TabsList
            className="h-auto w-full justify-start gap-0 border-0 bg-transparent p-0 sm:gap-1"
            variant="line"
          >
            <TabsTrigger className={boardTabTriggerClass} value="daily">
              Daily
            </TabsTrigger>
            <TabsTrigger className={boardTabTriggerClass} value="weekly">
              Weekly
            </TabsTrigger>
            <TabsTrigger className={boardTabTriggerClass} value="overall">
              Overall
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent className="mt-2" value="daily">
          {currentDay ? (
            <PeriodLeaderboardView
              archiveHref="/leaderboard/days"
              archiveLabel="Past days"
              currentUserId={currentUserId}
              embedded
              entries={currentDaily}
              metricLabel="steps today"
              periodEnded={dailyEnded}
              showBasePoints
              subtitle={`${formatDayTitle(currentDay.date)} · target ${currentDay.targetSteps.toLocaleString("en-IN")} steps`}
              title="Today’s board"
            />
          ) : (
            <EmptyPeriodState message="No challenge day is active yet." />
          )}
        </TabsContent>

        <TabsContent className="mt-2" value="weekly">
          {currentWeek ? (
            <PeriodLeaderboardView
              archiveHref="/leaderboard/weeks"
              archiveLabel="Past weeks"
              currentUserId={currentUserId}
              embedded
              entries={currentWeekly}
              metricLabel="steps this week"
              periodEnded={weeklyEnded}
              subtitle={formatWeekTitle(
                currentWeek.weekNo,
                currentWeek.startDate,
                currentWeek.endDate,
              )}
              title="This week’s board"
            />
          ) : (
            <EmptyPeriodState message="No challenge week is active yet." />
          )}
        </TabsContent>

        <TabsContent className="mt-2" value="overall">
          <LeaderboardView
            currentUserId={currentUserId}
            embedded
            standings={overallStandings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyPeriodState({ message }: { message: string }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-surface p-8 text-center">
      <p className="text-muted">{message}</p>
      <Link
        className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"
        href="/leaderboard"
      >
        Back to board
      </Link>
    </section>
  );
}
