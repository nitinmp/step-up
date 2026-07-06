"use client";

import { CalendarDots, Sun, Trophy } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentType } from "react";

import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import {
  DivisionSubTabs,
  parseDivisionParam,
} from "@/components/leaderboard/division-sub-tabs";
import {
  PeriodLeaderboardView,
  StarWinnerBanner,
  formatDayTitle,
  formatWeekTitle,
  getStarWinners,
} from "@/components/leaderboard/period-leaderboard-view";
import type { Division } from "@/lib/divisions";
import { divisionLabel } from "@/lib/divisions";
import type { PeriodLeaderboardEntry } from "@/lib/period-leaderboard";
import type { ChallengePeriodContext, ChallengeWeekSummary } from "@/lib/period-leaderboard";
import type { UserStanding } from "@/lib/standings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BoardTab = "daily" | "weekly" | "overall";

const boardTabTriggerClass =
  "inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium sm:px-4";

const BOARD_TABS: Array<{
  value: BoardTab;
  label: string;
  icon: ComponentType<{ className?: string; weight?: "regular" | "fill" }>;
}> = [
  { value: "daily", label: "Daily", icon: Sun },
  { value: "weekly", label: "Weekly", icon: CalendarDots },
  { value: "overall", label: "Overall", icon: Trophy },
];

type LeaderboardHubProps = {
  currentUserId: string;
  periods: ChallengePeriodContext;
  standingsByDivision: Record<Division, UserStanding[]>;
  currentDaily: Record<Division, PeriodLeaderboardEntry[]>;
  currentWeekly: Record<Division, PeriodLeaderboardEntry[]>;
  lastEndedWeek: ChallengeWeekSummary | null;
  lastWeeklyByDivision: Record<Division, PeriodLeaderboardEntry[]>;
  starOfDayPoints: number;
  starOfWeekPoints: number;
  viewerDivision: Division;
};

function periodBoardHref(
  kind: "day" | "week",
  id: string | number,
  division: Division,
): string {
  const base =
    kind === "day" ? `/leaderboard/day/${id}` : `/leaderboard/week/${id}`;
  if (division === "strider") {
    return base;
  }
  return `${base}?division=${division}`;
}

function parseBoardTab(value: string | null): BoardTab {
  if (value === "weekly" || value === "overall") {
    return value;
  }
  return "daily";
}

export function LeaderboardHub({
  currentUserId,
  periods,
  standingsByDivision,
  currentDaily,
  currentWeekly,
  lastEndedWeek,
  lastWeeklyByDivision,
  starOfDayPoints,
  starOfWeekPoints,
  viewerDivision,
}: LeaderboardHubProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseBoardTab(searchParams.get("view"));
  const activeDivision = parseDivisionParam(
    searchParams.get("division") ?? viewerDivision,
  );

  const currentDay = periods.currentDay;
  const currentWeek = periods.currentWeek;
  const dailyEnded = currentDay ? currentDay.date < periods.calendarToday : false;
  const weeklyEnded = currentWeek
    ? currentWeek.endDate < periods.calendarToday
    : false;

  const divisionStandings = standingsByDivision[activeDivision];
  const lastWeekWinners = lastEndedWeek
    ? getStarWinners(lastWeeklyByDivision[activeDivision])
    : [];
  const showLastWeekStars =
    lastEndedWeek !== null &&
    lastWeekWinners.length > 0 &&
    currentWeek?.weekNo !== lastEndedWeek.weekNo;

  const headerSubtitle =
    activeTab === "daily" && currentDay
      ? `${formatDayTitle(currentDay.date)} · target ${currentDay.targetSteps.toLocaleString("en-IN")} steps`
      : activeTab === "weekly" && currentWeek
        ? formatWeekTitle(
            currentWeek.weekNo,
            currentWeek.startDate,
            currentWeek.endDate,
          )
        : `${divisionStandings.length} ${divisionLabel(activeDivision, true)} · ranked by total points`;

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
            {BOARD_TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger className={boardTabTriggerClass} key={value} value={value}>
                <Icon
                  aria-hidden="true"
                  className="size-4"
                  weight={activeTab === value ? "fill" : "regular"}
                />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="space-y-4">
          <DivisionSubTabs defaultDivision={viewerDivision} />

          <TabsContent className="mt-0" value="daily">
            {currentDay ? (
              <PeriodLeaderboardView
                archiveHref="/leaderboard/days"
                archiveLabel="Past days"
                currentUserId={currentUserId}
                embedded
                entries={currentDaily[activeDivision]}
                metricLabel="steps today"
                periodEnded={dailyEnded}
                showBasePoints
                starBonusPoints={starOfDayPoints}
                starPeriod="day"
                subtitle={`${formatDayTitle(currentDay.date)} · target ${currentDay.targetSteps.toLocaleString("en-IN")} steps`}
                title="Today’s board"
              />
            ) : (
              <EmptyPeriodState message="No challenge day is active yet." />
            )}
          </TabsContent>

          <TabsContent className="mt-0" value="weekly">
            {currentWeek ? (
              <div className="space-y-4">
                {showLastWeekStars && lastEndedWeek ? (
                  <StarWinnerBanner
                    bonusPoints={starOfWeekPoints}
                    currentUserId={currentUserId}
                    detailHref={periodBoardHref(
                      "week",
                      lastEndedWeek.weekNo,
                      activeDivision,
                    )}
                    detailLabel={`View Week ${lastEndedWeek.weekNo} board`}
                    subtitle={formatWeekTitle(
                      lastEndedWeek.weekNo,
                      lastEndedWeek.startDate,
                      lastEndedWeek.endDate,
                    )}
                    title={`Star of the Week · ${divisionLabel(activeDivision, true)}`}
                    winners={lastWeekWinners}
                  />
                ) : null}

                {showLastWeekStars ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-muted">
                      {formatWeekTitle(
                        currentWeek.weekNo,
                        currentWeek.startDate,
                        currentWeek.endDate,
                      )}{" "}
                      · live
                    </h2>
                    <PeriodLeaderboardView
                      archiveHref="/leaderboard/weeks"
                      archiveLabel="Past weeks"
                      currentUserId={currentUserId}
                      embedded
                      entries={currentWeekly[activeDivision]}
                      metricLabel="steps this week"
                      periodEnded={weeklyEnded}
                      subtitle={formatWeekTitle(
                        currentWeek.weekNo,
                        currentWeek.startDate,
                        currentWeek.endDate,
                      )}
                      title="This week’s board"
                    />
                  </div>
                ) : (
                  <PeriodLeaderboardView
                    archiveHref="/leaderboard/weeks"
                    archiveLabel="Past weeks"
                    currentUserId={currentUserId}
                    embedded
                    entries={currentWeekly[activeDivision]}
                    metricLabel="steps this week"
                    periodEnded={weeklyEnded}
                    starBonusPoints={starOfWeekPoints}
                    starPeriod="week"
                    subtitle={formatWeekTitle(
                      currentWeek.weekNo,
                      currentWeek.startDate,
                      currentWeek.endDate,
                    )}
                    title="This week’s board"
                  />
                )}
              </div>
            ) : (
              <EmptyPeriodState message="No challenge week is active yet." />
            )}
          </TabsContent>

          <TabsContent className="mt-0" value="overall">
            <LeaderboardView
              currentUserId={currentUserId}
              embedded
              standings={divisionStandings}
            />
          </TabsContent>
        </div>
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
