"use client";

import { PlusCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  LogActivityForm,
  type LogSubmitResult,
} from "@/components/activities/log-activity-form";
import { AchievementBadgeGrid } from "@/components/badges/achievement-badge-grid";
import { ParticipantCertificatesTab } from "@/components/certificates/participant-certificates-tab";
import { BottomDrawer } from "@/components/ui/bottom-drawer";
import type { EditActivityContext } from "@/lib/activities-service";
import { fireActivityLogConfetti } from "@/lib/confetti";
import { formatDisplayDate } from "@/lib/dates";
import type { UserAchievementState } from "@/lib/achievement-badges";
import { achievementsToDisplay } from "@/lib/achievement-display";
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

type LogTab = "badges" | "certificates";

type LogPageClientProps = {
  logContext: LogContext;
  achievements: UserAchievementState[];
  badgeEarnedCount: number;
  badgeTotalCount: number;
  initialTab?: LogTab;
  initialStarDate?: string | null;
  initialWeekNo?: number | null;
  editActivity?: EditActivityContext;
};

export function LogPageClient({
  logContext,
  achievements,
  badgeEarnedCount,
  badgeTotalCount,
  initialTab = "badges",
  initialStarDate = null,
  initialWeekNo = null,
  editActivity,
}: LogPageClientProps) {
  const router = useRouter();
  const isEdit = Boolean(editActivity);
  const [drawerOpen, setDrawerOpen] = useState(isEdit);
  const [formKey, setFormKey] = useState(0);
  const [activeTab, setActiveTab] = useState<LogTab>(initialTab);
  const [certificatesVisited, setCertificatesVisited] = useState(
    initialTab === "certificates",
  );

  const achievementDisplays = useMemo(
    () => achievementsToDisplay(achievements),
    [achievements],
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

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#certificates") {
      setActiveTab("certificates");
      setCertificatesVisited(true);
    } else if (hash === "#badges") {
      setActiveTab("badges");
    }
  }, []);

  function selectTab(tab: LogTab) {
    setActiveTab(tab);
    if (tab === "certificates") {
      setCertificatesVisited(true);
    }
    window.history.replaceState(
      null,
      "",
      tab === "certificates" ? "/log#certificates" : "/log#badges",
    );
  }

  function openDrawer() {
    if (!canLog) {
      return;
    }
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

    setDrawerOpen(false);
    setFormKey((value) => value + 1);
    router.refresh();

    if (isEdit) {
      router.replace("/log");
    }
  }

  return (
    <div className="space-y-6">
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <button
            className={cn(
              "text-base font-semibold transition",
              activeTab === "badges"
                ? "text-foreground"
                : "text-muted hover:text-foreground",
            )}
            onClick={() => selectTab("badges")}
            type="button"
          >
            Your badges · {badgeEarnedCount} of {badgeTotalCount}
          </button>
          <span aria-hidden="true" className="text-muted">
            |
          </span>
          <button
            className={cn(
              "text-base font-semibold transition",
              activeTab === "certificates"
                ? "text-brand"
                : "text-muted hover:text-brand",
            )}
            onClick={() => selectTab("certificates")}
            type="button"
          >
            Certificates
          </button>
        </div>

        {activeTab === "badges" ? (
          <div className="space-y-4" id="badges">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <BadgeStat label="Earned" value={badgeEarnedCount} />
              <BadgeStat label="Total series" value={badgeTotalCount} />
              <BadgeStat
                label="In progress"
                value={
                  achievements.filter((entry) => entry.earnedTierIndex === null)
                    .length
                }
              />
            </div>

            <AchievementBadgeGrid
              achievements={achievementDisplays}
              emptyMessage="No badges earned yet. Keep logging to unlock achievements."
              hideHeader
            />
          </div>
        ) : certificatesVisited ? (
          <ParticipantCertificatesTab
            initialStarDate={initialStarDate}
            initialWeekNo={initialWeekNo}
          />
        ) : null}
      </section>

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
