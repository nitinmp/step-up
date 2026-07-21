"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AchievementBadgeCompact } from "@/components/badges/achievement-badge-compact";
import { AchievementUnlockedModal } from "@/components/badges/achievement-unlocked-modal";
import { CertificateViewDrawer } from "@/components/certificates/certificate-view-drawer";
import { BottomDrawer } from "@/components/ui/bottom-drawer";
import type {
  ActivityRecord,
  ClimbWeek,
  DashboardDay,
  PointsBreakdown,
  RankChase,
  StreakCalendarDay,
} from "@/lib/activities-home-types";
import { achievementsToDisplay } from "@/lib/achievement-display";
import type { UserAchievementState } from "@/lib/achievement-badges";
import { formatDisplayDate } from "@/lib/dates";
import { formatDistanceKm } from "@/lib/distance";
import type { Division } from "@/lib/divisions";
import { divisionLabel } from "@/lib/divisions";
import type { DashboardAggregates } from "@/lib/dashboard-stats";
import type { WeekProgressCertificate } from "@/lib/certificate-service";
import { cn } from "@/lib/cn";

export type ActivitiesHomeProps = {
  division: Division;
  currentWeek: number;
  challengeDayIndex: number;
  challengeTotalDays: number;
  points: PointsBreakdown;
  rankChase: RankChase;
  aggregates: DashboardAggregates;
  climbWeeks: ClimbWeek[];
  streakCalendar: StreakCalendarDay[];
  pushCallout: string;
  badgePreview: UserAchievementState[];
  badgeEarnedCount: number;
  badgeTotalCount: number;
  loggedActivities: Array<
    DashboardDay & { activity: ActivityRecord & { isBeast: boolean; isStarOfDay: boolean } }
  >;
  starCertificateDates: string[];
};

export function ActivitiesHome(props: ActivitiesHomeProps) {
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [unlockQueue, setUnlockQueue] = useState<UserAchievementState[]>([]);
  const activitiesPreviewLimit = 7;

  useEffect(() => {
    const raw = sessionStorage.getItem("stepup:pending-unlocks");
    if (!raw) {
      return;
    }
    sessionStorage.removeItem("stepup:pending-unlocks");
    try {
      const parsed = JSON.parse(raw) as UserAchievementState[];
      if (parsed.length > 0) {
        setUnlockQueue(parsed);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  const visibleActivities = showAllActivities
    ? props.loggedActivities
    : props.loggedActivities.slice(0, activitiesPreviewLimit);

  const badgeDisplays = achievementsToDisplay(props.badgePreview);
  const starCertificateDateSet = new Set(props.starCertificateDates);
  const [selectedWeekCertificate, setSelectedWeekCertificate] =
    useState<WeekProgressCertificate | null>(null);
  const [loadingWeekNo, setLoadingWeekNo] = useState<number | null>(null);
  const [weekReportError, setWeekReportError] = useState<string | null>(null);

  const openWeekProgressReport = useCallback(async (weekNo: number) => {
    setLoadingWeekNo(weekNo);
    setWeekReportError(null);

    try {
      const response = await fetch(`/api/certificates/week/${weekNo}`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        certificate?: WeekProgressCertificate;
        error?: string;
      };

      if (!response.ok || !data.certificate) {
        throw new Error(data.error ?? "Could not load progress report.");
      }

      setSelectedWeekCertificate(data.certificate);
    } catch (error) {
      setWeekReportError(
        error instanceof Error
          ? error.message
          : "Could not load progress report.",
      );
    } finally {
      setLoadingWeekNo(null);
    }
  }, []);

  return (
    <div className="space-y-4 pb-4">
      <StandingCard
        aggregates={props.aggregates}
        challengeDayIndex={props.challengeDayIndex}
        challengeTotalDays={props.challengeTotalDays}
        division={props.division}
        points={props.points}
        rankChase={props.rankChase}
      />

      <BonusCard callout={props.pushCallout} points={props.points} />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Your badges · {props.badgeEarnedCount} of {props.badgeTotalCount}
          </h2>
          <Link
            className="text-sm font-medium text-brand"
            href="/log#badges"
          >
            View all
          </Link>
        </div>
        <ul className="grid grid-cols-4 gap-2">
          {badgeDisplays.map((achievement) => (
            <li key={achievement.id}>
              <AchievementBadgeCompact achievement={achievement} />
            </li>
          ))}
        </ul>
      </section>

      <StreakChainSection
        calendar={props.streakCalendar}
        streak={props.aggregates.currentLoggingStreak}
      />

      <ClimbSection
        loadingWeekNo={loadingWeekNo}
        onWeekClick={openWeekProgressReport}
        weeks={props.climbWeeks}
      />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Your activities
          </h2>
          {props.loggedActivities.length > activitiesPreviewLimit ? (
            <button
              className="text-sm font-medium text-brand"
              onClick={() => setShowAllActivities((value) => !value)}
              type="button"
            >
              {showAllActivities ? "Show less" : "See all"}
            </button>
          ) : null}
        </div>
        {visibleActivities.length === 0 ? (
          <div className="rounded-3xl border border-black/5 bg-surface p-6">
            <p className="text-muted">No activities logged yet.</p>
            <Link
              className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"
              href="/log"
            >
              Log your first activity
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleActivities.map((day) => (
              <ActivityCard
                day={day}
                hasStarCertificate={starCertificateDateSet.has(day.date)}
                key={day.activity.id}
              />
            ))}
          </div>
        )}
      </section>

      {unlockQueue.length > 0 ? (
        <AchievementUnlockedModal
          achievement={unlockQueue[0]!}
          onClose={() => setUnlockQueue((queue) => queue.slice(1))}
        />
      ) : null}

      <CertificateViewDrawer
        certificate={selectedWeekCertificate}
        onClose={() => setSelectedWeekCertificate(null)}
      />

      <BottomDrawer
        onClose={() => setWeekReportError(null)}
        open={Boolean(weekReportError)}
        title="Progress report"
      >
        <p className="text-sm text-danger">{weekReportError}</p>
      </BottomDrawer>
    </div>
  );
}

function StandingCard({
  points,
  rankChase,
  aggregates,
  division,
  challengeDayIndex,
  challengeTotalDays,
}: {
  points: PointsBreakdown;
  rankChase: RankChase;
  aggregates: DashboardAggregates;
  division: Division;
  challengeDayIndex: number;
  challengeTotalDays: number;
}) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-5xl font-bold tabular-nums">{points.total}</p>
          <p className="mt-1 text-sm text-white/85">
            {points.base} base · {points.bonus} bonus
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">
            #{rankChase.rank} of {rankChase.participantCount}{" "}
            {divisionLabel(division, true)}
          </p>
          {rankChase.pointsToRankAbove !== null &&
          rankChase.pointsToRankAbove > 0 ? (
            <p className="mt-1 text-sm font-medium text-gold">
              {rankChase.pointsToRankAbove} pts to #{rankChase.rank - 1} ▲
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatChip icon="🔥" label={`${aggregates.currentLoggingStreak} streak`} />
        <StatChip icon="🎯" label={`${aggregates.targetMetDays} targets hit`} />
        <StatChip icon="🔥" label={`${aggregates.beastDays} beast`} />
      </div>

      <div className="mt-4 border-t border-white/15 pt-3">
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-white/70"
            style={{
              width: `${Math.min(100, (challengeDayIndex / challengeTotalDays) * 100)}%`,
            }}
          />
        </div>
        <p className="text-xs text-white/80">
          Day {challengeDayIndex} of {challengeTotalDays} ·{" "}
          {aggregates.cumulativeSteps.toLocaleString("en-IN")} steps ·{" "}
          {formatDistanceKm(aggregates.cumulativeKm)}
        </p>
      </div>
    </section>
  );
}

function StatChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-xs font-medium">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

function BonusCard({
  points,
  callout,
}: {
  points: PointsBreakdown;
  callout: string;
}) {
  const segments = [
    { key: "push", value: points.pushPoints, color: "bg-brand" },
    { key: "consistency", value: points.consistencyPoints, color: "bg-gold" },
    { key: "stars", value: points.starPoints, color: "bg-black/10" },
  ];
  const bonusTotal = points.bonus || 1;

  return (
    <section className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm">
      <p className="text-lg font-semibold text-foreground">
        +{points.bonus}{" "}
        <span className="font-normal text-muted">of your {points.total}</span>
      </p>

      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-black/[0.06]">
        {segments.map((segment) =>
          segment.value > 0 ? (
            <div
              className={cn(segment.color, "h-full")}
              key={segment.key}
              style={{ width: `${(segment.value / bonusTotal) * 100}%` }}
            />
          ) : null,
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li>
          <span className="mr-1 inline-block size-2 rounded-full bg-brand" />
          Push +{points.pushPoints}
        </li>
        <li>
          <span className="mr-1 inline-block size-2 rounded-full bg-gold" />
          Consistency +{points.consistencyPoints}
        </li>
        <li>
          <span className="mr-1 inline-block size-2 rounded-full bg-black/10" />
          Stars +{points.starPoints}
        </li>
      </ul>

      <p className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-foreground">
        {callout}
      </p>
    </section>
  );
}

function StreakChainSection({
  calendar,
  streak,
}: {
  calendar: StreakCalendarDay[];
  streak: number;
}) {
  return (
    <section className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Don&apos;t break the chain
        </h2>
        <p className="text-sm text-muted">{streak} day streak</p>
      </div>
      <div className="mt-4 flex justify-between gap-1">
        {calendar.map((day) => (
          <div className="flex flex-1 flex-col items-center gap-2" key={day.date}>
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full border",
                day.logged
                  ? "border-orange-200 bg-orange-50"
                  : day.pending
                    ? "border-warning/30 bg-warning/10"
                    : "border-black/5 bg-background",
                day.isToday && "ring-2 ring-brand/30",
              )}
            >
              {day.logged ? (
                <span aria-hidden="true" className="text-lg">
                  🔥
                </span>
              ) : day.pending ? (
                <span aria-hidden="true" className="text-sm">
                  ⏳
                </span>
              ) : day.isToday ? (
                <span className="size-2 rounded-full bg-brand/40" />
              ) : null}
            </div>
            <span className="text-[10px] font-medium uppercase text-muted">
              {day.isToday ? "Today" : day.weekday}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

const CLIMB_BAR_HEIGHTS = ["h-14", "h-[4.5rem]", "h-20", "h-[5.5rem]"] as const;

const CLIMB_WEEK_EMOJIS = ["🥇", "🥈", "🥉", "🏅"] as const;

function ClimbSection({
  weeks,
  loadingWeekNo,
  onWeekClick,
}: {
  weeks: ClimbWeek[];
  loadingWeekNo: number | null;
  onWeekClick: (weekNo: number) => void;
}) {
  return (
    <section className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">The climb</h2>
      <div className="mt-4 flex items-end justify-between gap-2">
        {weeks.map((week) => {
          const progress =
            week.totalDays > 0
              ? Math.min(100, (week.daysMet / week.totalDays) * 100)
              : 0;
          const heightClass = CLIMB_BAR_HEIGHTS[week.weekNo - 1] ?? "h-20";
          const showFill = week.status !== "upcoming" && progress > 0;
          const isInteractive = week.status !== "upcoming";
          const isLoading = loadingWeekNo === week.weekNo;

          return (
            <div
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
              key={week.weekNo}
            >
              <div
                aria-hidden="true"
                className={cn(
                  "relative w-full overflow-hidden rounded-2xl bg-black/[0.06]",
                  heightClass,
                  week.status === "current" && "ring-2 ring-brand/25",
                )}
              >
                {showFill ? (
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 rounded-b-2xl transition-all",
                      week.status === "completed" ? "bg-brand" : "bg-brand/75",
                    )}
                    style={{ height: `${progress}%` }}
                  />
                ) : null}
                <span
                  className={cn(
                    "absolute inset-x-0 bottom-1.5 z-10 px-0.5 text-center text-[10px] font-semibold uppercase leading-tight",
                    week.status === "upcoming"
                      ? "text-muted"
                      : progress >= 35
                        ? "text-white"
                        : "text-brand",
                  )}
                >
                  {week.targetLabel}
                </span>
              </div>

              <button
                aria-label={
                  isInteractive
                    ? `Open Week ${week.weekNo} progress report`
                    : `Week ${week.weekNo} starts ${formatDisplayDate(week.startDate)}`
                }
                className={cn(
                  "inline-flex min-w-[3.5rem] items-center justify-center gap-1 rounded-full border-2 px-3 py-2 text-xs font-extrabold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2",
                  week.status === "completed" &&
                    "border-amber-500 bg-gradient-to-b from-yellow-200 via-amber-300 to-yellow-500 text-amber-950 shadow-[0_4px_14px_rgba(251,191,36,0.45)] hover:from-yellow-100 hover:via-amber-200 hover:to-amber-400 hover:shadow-[0_6px_18px_rgba(251,191,36,0.55)] active:scale-[0.97]",
                  week.status === "current" &&
                    "border-amber-400 bg-gradient-to-b from-amber-100 via-yellow-300 to-amber-400 text-amber-950 shadow-[0_4px_16px_rgba(245,158,11,0.5)] ring-2 ring-amber-300/60 hover:shadow-[0_6px_20px_rgba(245,158,11,0.6)] active:scale-[0.97]",
                  week.status === "upcoming" &&
                    "cursor-not-allowed border-black/10 bg-black/[0.06] text-muted",
                  isLoading && "cursor-wait opacity-70",
                )}
                disabled={!isInteractive || loadingWeekNo !== null}
                onClick={() => onWeekClick(week.weekNo)}
                type="button"
              >
                <span aria-hidden="true" className="text-sm leading-none">
                  {isLoading
                    ? "…"
                    : (CLIMB_WEEK_EMOJIS[week.weekNo - 1] ?? "📊")}
                </span>
                <span>{`W${week.weekNo}`}</span>
              </button>

              {week.status === "completed" ? (
                <p className="text-center text-[10px] font-medium text-brand">
                  Done ✓ {week.daysMet}/{week.totalDays}
                </p>
              ) : week.status === "current" ? (
                <p className="text-center text-[10px] text-muted">
                  {week.daysMet}/{week.totalDays} days
                </p>
              ) : (
                <p className="text-center text-[10px] text-muted">
                  {formatDisplayDate(week.startDate).replace(/, \d{4}$/, "")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActivityCard({
  day,
  hasStarCertificate,
}: {
  day: ActivitiesHomeProps["loggedActivities"][number];
  hasStarCertificate: boolean;
}) {
  const activity = day.activity;
  const isPending = activity.status === "pending";
  const met =
    !isPending && activity.targetPct !== undefined && activity.targetPct >= 100;
  const canEdit = isPending;

  return (
    <article
      className={cn(
        "rounded-3xl border bg-surface p-4 shadow-sm",
        isPending ? "border-warning/30" : "border-black/5",
      )}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">
              {formatDisplayDate(day.date)}
            </p>
            {activity.isBeast ? (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold uppercase text-danger">
                🔥 Beast
              </span>
            ) : null}
            {activity.isStarOfDay ? (
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold">
                ⭐ Star
              </span>
            ) : null}
            {isPending ? (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                Pending review
              </span>
            ) : null}
            {day.state === "disapproved" ? (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                Disapproved
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-sm text-muted">
            {isPending ? (
              <>
                Awaiting approval · ~{activity.basePoints} pts if approved ·
                Target {day.targetSteps.toLocaleString("en-IN")}
              </>
            ) : (
              <>
                +{activity.basePoints} pts · Target{" "}
                {day.targetSteps.toLocaleString("en-IN")}
              </>
            )}
            {activity.targetPct !== undefined
              ? ` · ${activity.targetPct}%`
              : null}
          </p>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className={cn(
                "h-full rounded-full",
                met ? "bg-success" : "bg-brand/40",
              )}
              style={{
                width: `${Math.min(100, activity.targetPct ?? 0)}%`,
              }}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {activity.steps.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted tabular-nums">
              {formatDistanceKm(activity.distanceKm)}
            </p>
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="mt-3 flex justify-end">
          <Link
            className="inline-flex rounded-full border border-brand/20 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/5"
            href={`/log?edit=${activity.id}`}
          >
            Edit
          </Link>
        </div>
      ) : null}

      {activity.isStarOfDay && hasStarCertificate ? (
        <div className="mt-3 flex justify-end">
          <Link
            className="inline-flex rounded-full bg-gold/20 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-gold/30"
            href={`/log?tab=certificates&cert=${day.date}`}
          >
            View certificate
          </Link>
        </div>
      ) : null}

      {day.state === "disapproved" && activity.adminNote ? (
        <p className="mt-3 rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {activity.adminNote}
        </p>
      ) : null}
    </article>
  );
}
