"use client";

import Link from "next/link";
import { Flame, Star } from "lucide-react";

import type { DashboardDay, WeekStat } from "@/lib/activities-service";
import type { UserStanding } from "@/lib/standings";
import { formatDisplayDate } from "@/lib/dates";
import { PointsBadge } from "@/components/ui/points-badge";
import { StreakBadge } from "@/components/ui/streak-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-white/80">
          Your progress
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Activities</h1>
        <p className="mt-2 text-sm text-white/85">
          Rank #{standing?.rank ?? "–"} of {participantCount || "–"}
          {breakdown && bonusTotal > 0
            ? ` · ${breakdown.base} base · ${bonusTotal} bonuses`
            : null}
        </p>

        <div className="mt-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">Total points</p>
            <p className="mt-1 text-5xl font-semibold tabular-nums">
              {standing?.total ?? 0}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-right text-sm">
            <p>⭐ {standing?.starDayCount ?? 0}</p>
            <p className="mt-1">🔥 {standing?.beastCount ?? 0}</p>
          </div>
        </div>

        {breakdown ? (
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <HeroStat label="Base" value={breakdown.base} />
            <HeroStat label="Star day" value={breakdown.starDay} />
            <HeroStat label="Week star" value={breakdown.weekStar} />
            <HeroStat label="Streak" value={breakdown.consistency} />
          </div>
        ) : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <PointsBadge name="Total points" total={standing?.total ?? 0} />
        <StreakBadge frequency="daily" length={standing?.daysMet ?? 0} size="sm" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly summary</CardTitle>
          <CardDescription>Days walked and steps per week</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {weekStats.map((week) => (
            <div
              className={`rounded-xl px-3 py-2 ${
                week.weekNo <= currentWeek ? "bg-accent" : "bg-muted/60"
              }`}
              key={week.weekNo}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                W{week.weekNo}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {week.daysWalked} {week.daysWalked === 1 ? "day" : "days"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {week.totalSteps.toLocaleString("en-IN")} steps
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
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
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground">No activities logged yet.</p>
          <Button asChild className="mt-4">
            <Link href="/log">Log your first activity</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Your activities</h2>
      {activities.map((day) => (
        <ActivityLogRow day={day} key={day.activity.id} />
      ))}
    </section>
  );
}

function ActivityLogRow({ day }: { day: LoggedActivityDay }) {
  const activity = day.activity;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{formatDisplayDate(day.date)}</p>
            {activity.isStarOfDay ? (
              <Badge variant="secondary">
                <Star className="mr-1 h-3 w-3" />
                Star
              </Badge>
            ) : null}
            {activity.isBeast ? (
              <Badge variant="secondary">
                <Flame className="mr-1 h-3 w-3" />
                Beast
              </Badge>
            ) : null}
            {day.state === "disapproved" ? (
              <Badge variant="destructive">Disapproved</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            +{activity.basePoints} base pts
          </p>
          {day.state === "disapproved" && activity.adminNote ? (
            <>
              <Separator className="my-3" />
              <p className="text-sm text-destructive">{activity.adminNote}</p>
            </>
          ) : null}
        </div>

        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">
            {activity.steps.toLocaleString("en-IN")}
          </p>
          <p className="text-sm capitalize text-muted-foreground">
            {activity.status}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
