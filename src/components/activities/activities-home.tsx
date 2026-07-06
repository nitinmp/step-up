"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AchievementBadgeCompact } from "@/components/badges/achievement-badge-compact";
import { AchievementUnlockedModal } from "@/components/badges/achievement-unlocked-modal";
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
import { photoProxyUrl } from "@/lib/blob-storage";
import { formatDisplayDate } from "@/lib/dates";
import { formatDistanceKm } from "@/lib/distance";
import type { Division } from "@/lib/divisions";
import { divisionLabel } from "@/lib/divisions";
import type { DashboardAggregates } from "@/lib/dashboard-stats";
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
};

export function ActivitiesHome(props: ActivitiesHomeProps) {
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [unlockQueue, setUnlockQueue] = useState<UserAchievementState[]>([]);

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
    : props.loggedActivities.slice(0, 3);

  const badgeDisplays = achievementsToDisplay(props.badgePreview);

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

      <ClimbSection weeks={props.climbWeeks} />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Your activities
          </h2>
          {props.loggedActivities.length > 3 ? (
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
              <ActivityCard day={day} key={day.activity.id} />
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
                  : "border-black/5 bg-background",
                day.isToday && "ring-2 ring-brand/30",
              )}
            >
              {day.logged ? (
                <span aria-hidden="true" className="text-lg">
                  🔥
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

function ClimbSection({ weeks }: { weeks: ClimbWeek[] }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">The climb</h2>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {weeks.map((week) => (
          <div className="flex flex-col items-center gap-2" key={week.weekNo}>
            <div
              className={cn(
                "flex h-20 w-full items-end justify-center rounded-2xl px-1 pb-2",
                week.status === "completed" && "bg-brand/15",
                week.status === "current" && "bg-brand/25 ring-2 ring-brand/20",
                week.status === "upcoming" && "bg-black/[0.04]",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase",
                  week.status === "upcoming" ? "text-muted" : "text-brand",
                )}
              >
                {week.targetLabel}
              </span>
            </div>
            <p className="text-center text-[10px] font-semibold text-foreground">
              W{week.weekNo}
            </p>
            {week.status === "completed" ? (
              <p className="text-center text-[10px] text-brand">
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
        ))}
      </div>
    </section>
  );
}

function ActivityCard({
  day,
}: {
  day: ActivitiesHomeProps["loggedActivities"][number];
}) {
  const activity = day.activity;
  const met = activity.targetPct !== undefined && activity.targetPct >= 100;
  const canEdit = activity.status === "pending";

  return (
    <article className="rounded-3xl border border-black/5 bg-surface p-4 shadow-sm">
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
            {day.state === "disapproved" ? (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                Disapproved
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-sm text-muted">
            +{activity.basePoints} pts · Target{" "}
            {day.targetSteps.toLocaleString("en-IN")}
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
          {activity.photoUrl ? (
            <Image
              alt={`Activity photo for ${formatDisplayDate(day.date)}`}
              className="size-14 rounded-xl object-cover"
              height={56}
              src={photoProxyUrl(activity.photoUrl)}
              unoptimized
              width={56}
            />
          ) : null}
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

      {day.state === "disapproved" && activity.adminNote ? (
        <p className="mt-3 rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {activity.adminNote}
        </p>
      ) : null}
    </article>
  );
}
