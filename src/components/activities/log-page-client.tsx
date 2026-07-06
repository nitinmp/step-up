"use client";

import { PlusCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  LogActivityForm,
  type LogSubmitResult,
} from "@/components/activities/log-activity-form";
import { AchievementBadgeGrid } from "@/components/badges/achievement-badge-grid";
import { BottomDrawer } from "@/components/ui/bottom-drawer";
import type { EditActivityContext } from "@/lib/activities-service";
import { fireActivityLogConfetti } from "@/lib/confetti";
import { formatDisplayDate } from "@/lib/dates";
import {
  BADGE_CATALOG_LOCKED,
  participantBadgesToDisplay,
} from "@/lib/participant-badge-display";
import type { ParticipantBadge } from "@/lib/participant-badges";
import { cn } from "@/lib/cn";

type LogContext = {
  defaultDate: string;
  selectableDays: Array<{
    date: string;
    weekNo: number;
    targetSteps: number;
  }>;
  loggedDates: string[];
  challengeStartDate: string;
  allowOpenChallengeLogging: boolean;
};

type LogPageClientProps = {
  logContext: LogContext;
  badges: ParticipantBadge[];
  badgeCounts: {
    starDay: number;
    starWeek: number;
    consistency: number;
  };
  editActivity?: EditActivityContext;
};

export function LogPageClient({
  logContext,
  badges,
  badgeCounts,
  editActivity,
}: LogPageClientProps) {
  const router = useRouter();
  const isEdit = Boolean(editActivity);
  const [drawerOpen, setDrawerOpen] = useState(isEdit);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const achievements = useMemo(
    () => participantBadgesToDisplay(badges),
    [badges],
  );

  const canLog = isEdit || logContext.selectableDays.length > 0;

  const unavailableMessage = useMemo(() => {
    if (canLog) {
      return null;
    }

    if (logContext.loggedDates.length > 0) {
      return "You have already logged every available day. Edit a pending entry from Activities if needed.";
    }

    if (logContext.allowOpenChallengeLogging) {
      return "No challenge days are available to log right now.";
    }

    return `You can only log activity for today. Logging opens on ${formatDisplayDate(logContext.challengeStartDate)} if the challenge has not started yet.`;
  }, [canLog, logContext]);

  useEffect(() => {
    if (isEdit) {
      setDrawerOpen(true);
    }
  }, [isEdit]);

  function openDrawer() {
    if (!canLog) {
      return;
    }
    setSuccessMessage(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    if (isEdit) {
      router.replace("/log");
    }
  }

  function handleSuccess(result: LogSubmitResult) {
    if (result.mode === "create") {
      fireActivityLogConfetti();
    }

    const bonusPoints =
      (result.breakdown?.starDay ?? 0) +
      (result.breakdown?.weekStar ?? 0) +
      (result.breakdown?.consistency ?? 0);

    if (result.mode === "edit") {
      setSuccessMessage(
        `Activity updated · +${result.basePoints} base points${result.isBeast ? " · Beast Mode unlocked" : ""}`,
      );
    } else {
      setSuccessMessage(
        bonusPoints > 0
          ? `Logged · +${result.basePoints} base · +${bonusPoints} bonus points`
          : result.isStarOfDay
            ? `Logged · +${result.basePoints} base points · Star of the Day so far`
            : `Logged · +${result.basePoints} base points · pending approval`,
      );
    }

    setDrawerOpen(false);
    setFormKey((value) => value + 1);
    router.refresh();

    if (isEdit) {
      router.replace("/log");
    }
  }

  return (
    <div className="space-y-6">
      {successMessage ? (
        <div className="rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3 text-sm text-foreground">
          {successMessage}
        </div>
      ) : null}

      <button
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
          !canLog && "cursor-not-allowed opacity-50 hover:bg-brand",
        )}
        disabled={!canLog}
        onClick={openDrawer}
        type="button"
      >
        <PlusCircle aria-hidden="true" className="size-5" weight="fill" />
        {isEdit ? "Edit activity" : "Log activity"}
      </button>

      {!canLog && unavailableMessage ? (
        <p className="text-sm text-muted">{unavailableMessage}</p>
      ) : null}

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <BadgeStat label="Day stars" value={badgeCounts.starDay} />
        <BadgeStat label="Week stars" value={badgeCounts.starWeek} />
        <BadgeStat label="Consistency" value={badgeCounts.consistency} />
      </div>

      <AchievementBadgeGrid
        achievements={achievements}
        emptyMessage="No badges earned yet. Stars and consistency awards appear after each day or week ends."
        lockedCatalog={BADGE_CATALOG_LOCKED}
        showLockedCatalogWhenEmpty
        title="Your badges"
      />

      <BottomDrawer
        onClose={closeDrawer}
        open={drawerOpen}
        title={isEdit ? "Edit activity" : "Log activity"}
      >
        <LogActivityForm
          key={formKey}
          allowOpenChallengeLogging={logContext.allowOpenChallengeLogging}
          challengeStartDate={logContext.challengeStartDate}
          defaultDate={logContext.defaultDate}
          editActivity={editActivity}
          embedded
          loggedDates={logContext.loggedDates}
          onSuccess={handleSuccess}
          selectableDays={logContext.selectableDays}
        />
      </BottomDrawer>
    </div>
  );
}

function BadgeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-surface px-3 py-2 shadow-sm">
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
