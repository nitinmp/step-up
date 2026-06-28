"use client";

import Link from "next/link";

import type { DashboardDay, WeekStat } from "@/lib/activities-service";
import type { UserStanding } from "@/lib/standings";
import { formatDisplayDate } from "@/lib/dates";
import { formatDistanceKm } from "@/lib/distance";

type ActivitiesSummaryProps = {
  standing?: UserStanding;
  participantCount: number;
  currentWeek?: number;
  weekStats: WeekStat[];
};

export function ActivitiesSummary({
  standing,
  participantCount,
  currentWeek = 1,
  weekStats,
}: ActivitiesSummaryProps) {
  const breakdown = standing?.breakdown;
  const bonusTotal = breakdown
    ? breakdown.starDay + breakdown.weekStar + breakdown.consistency
    : 0;
  const totalDistanceKm = weekStats.reduce(
    (sum, week) => sum + week.totalDistanceKm,
    0,
  );

  return (
    <section className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <SummaryStat label="Total points" value={standing?.total ?? 0} />
            <SummaryStat
              label="Total steps"
              value={(standing?.totalSteps ?? 0).toLocaleString("en-IN")}
            />
            <SummaryStat
              label="Total km"
              value={formatDistanceKm(totalDistanceKm).replace(" km", "")}
            />
          </div>
          {breakdown && bonusTotal > 0 ? (
            <p className="mt-3 text-sm text-white/85">
              {breakdown.base} from steps · {bonusTotal} in bonuses
            </p>
          ) : null}
          <p className="mt-2 text-sm text-white/85">
            Rank #{standing?.rank ?? "–"} of {participantCount || "–"}
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 px-3 py-2 text-right text-sm">
          <p>⭐ {standing?.starDayCount ?? 0}</p>
          <p className="mt-1">🔥 {standing?.beastCount ?? 0}</p>
        </div>
      </div>

      {breakdown ? (
        <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <BreakdownPill label="Base" value={breakdown.base} />
          <BreakdownPill label="Star day" value={breakdown.starDay} />
          <BreakdownPill label="Week star" value={breakdown.weekStar} />
          <BreakdownPill label="Streak" value={breakdown.consistency} />
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {weekStats.map((week) => (
          <div
            className={`rounded-2xl px-3 py-2 ${week.weekNo <= currentWeek ? "bg-white/15" : "bg-white/10"}`}
            key={week.weekNo}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
              W{week.weekNo}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {week.daysWalked} {week.daysWalked === 1 ? "day" : "days"}
            </p>
            <p className="mt-0.5 text-xs text-white/80 tabular-nums">
              {week.totalSteps.toLocaleString("en-IN")} steps
            </p>
            <p className="mt-0.5 text-xs text-white/80 tabular-nums">
              {formatDistanceKm(week.totalDistanceKm)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80 sm:text-xs sm:tracking-[0.2em]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums sm:mt-2 sm:text-4xl lg:text-5xl">
        {value}
      </p>
    </div>
  );
}

function BreakdownPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2">
      <p className="text-white/70">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

type LoggedActivityDay = DashboardDay & {
  activity: NonNullable<DashboardDay["activity"]>;
};

type ActivityLogListProps = {
  activities: LoggedActivityDay[];
};

export function ActivityLogList({ activities }: ActivityLogListProps) {
  if (activities.length === 0) {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6">
        <p className="text-muted">No activities logged yet.</p>
        <Link
          className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"
          href="/log"
        >
          Log your first activity
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Your activities</h2>
      {activities.map((day) => (
        <ActivityLogRow day={day} key={day.activity.id} />
      ))}
    </section>
  );
}

function ActivityLogRow({ day }: { day: LoggedActivityDay }) {
  const activity = day.activity;

  return (
    <article className="rounded-3xl border border-black/5 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">
              {formatDisplayDate(day.date)}
            </p>
            {activity.isStarOfDay ? (
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-foreground">
                ⭐ Star
              </span>
            ) : null}
            {activity.isBeast ? (
              <span className="text-xs font-semibold">🔥 Beast</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            +{activity.basePoints} base pts
          </p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {activity.steps.toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-muted tabular-nums">
            {formatDistanceKm(activity.distanceKm)}
          </p>
          {day.state === "disapproved" ? (
            <p className="text-sm font-medium text-danger">Disapproved</p>
          ) : activity.status === "pending" ? (
            <p className="text-sm font-medium text-warning">Pending review</p>
          ) : (
            <p className="text-sm text-muted capitalize">{activity.status}</p>
          )}
        </div>
      </div>

      {day.state === "disapproved" && activity.adminNote ? (
        <p className="mt-3 rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {activity.adminNote}
        </p>
      ) : null}
    </article>
  );
}
