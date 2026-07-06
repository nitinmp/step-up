"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type {
  AdminActivityRow,
  AdminUserRow,
} from "@/lib/admin-service";
import type {
  AdminScoringResult,
  DayScoringRunRecord,
  WeekScoringRunRecord,
} from "@/lib/scoring-admin-service";
import type { Division, Gender } from "@/lib/divisions";
import { divisionLabel } from "@/lib/divisions";
import { cn } from "@/lib/cn";
import { photoProxyUrl } from "@/lib/blob-storage";
import { addDaysToDateString, formatDisplayDate } from "@/lib/dates";
import { formatDistanceKm } from "@/lib/distance";
import { DEFAULT_PARTICIPANT_PASSWORD } from "@/lib/default-password";
import type { UserStanding } from "@/lib/standings";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { AdminDivisionBadge } from "@/components/app/division-badge";

type ChallengeDayOption = {
  date: string;
  weekNo: number;
  targetSteps: number;
};

type AdminPanelProps = {
  initialActivities: AdminActivityRow[];
  users: AdminUserRow[];
  challengeDays: ChallengeDayOption[];
  currentAdminId: string;
  initialScoring: AdminScoringResult;
};

type AdminTab = "review" | "approved" | "participants" | "scoring";

const ADMIN_TABS: AdminTab[] = ["review", "approved", "participants", "scoring"];
const VISIBLE_TABS = 2;
const APPROVED_PAGE_SIZE = 20;

const adminTabTriggerClass =
  "shrink-0 rounded-lg px-2 py-2.5 text-sm font-medium sm:px-3";

function getAdminTabLabel(
  tab: AdminTab,
  reviewCount: number,
  approvedCount: number,
): string {
  if (tab === "review") {
    return `Review${reviewCount > 0 ? ` (${reviewCount})` : ""}`;
  }
  if (tab === "approved") {
    return `Approved${approvedCount > 0 ? ` (${approvedCount})` : ""}`;
  }
  if (tab === "participants") {
    return "Participants";
  }
  return "Scoring";
}

function promoteTabToVisibleEnd(
  order: AdminTab[],
  tab: AdminTab,
  visibleCount: number,
): AdminTab[] {
  const rest = order.filter((entry) => entry !== tab);
  return [...rest.slice(0, visibleCount - 1), tab, ...rest.slice(visibleCount - 1)];
}

function AdminTabOverflowMenu({
  tabs,
  activeTab,
  getLabel,
  open,
  onOpenChange,
  onSelect,
}: {
  tabs: AdminTab[];
  activeTab: AdminTab;
  getLabel: (tab: AdminTab) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tab: AdminTab) => void;
}) {
  const activeInOverflow = tabs.includes(activeTab);

  return (
    <div className="relative mb-0.5 shrink-0">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More tabs"
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand max-[360px]:px-2",
          activeInOverflow
            ? "bg-brand/10 font-semibold text-brand"
            : "text-muted hover:bg-brand/5 hover:text-foreground",
        )}
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <span className="max-[360px]:hidden">More</span>
        <span aria-hidden="true" className="hidden text-base leading-none max-[360px]:inline">
          ···
        </span>
        <ChevronDownIcon className={cn("size-4 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-20"
            onClick={() => onOpenChange(false)}
            type="button"
          />
          <div
            className="absolute right-0 top-full z-30 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-black/10 bg-surface py-1 shadow-lg ring-1 ring-black/5"
            role="menu"
          >
            {tabs.map((tab) => (
              <button
                className={cn(
                  "block w-full px-4 py-2.5 text-left text-sm transition hover:bg-brand/5",
                  activeTab === tab
                    ? "bg-brand/10 font-semibold text-brand"
                    : "text-foreground",
                )}
                key={tab}
                onClick={() => onSelect(tab)}
                role="menuitem"
                type="button"
              >
                {getLabel(tab)}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function AdminPanel({
  initialActivities,
  users,
  challengeDays,
  currentAdminId,
  initialScoring,
}: AdminPanelProps) {
  const router = useRouter();
  const [adminTab, setAdminTab] = useState<AdminTab>("review");
  const [activities, setActivities] = useState(initialActivities);
  const [participantRows, setParticipantRows] = useState(users);
  const [scoring, setScoring] = useState(initialScoring);
  const endedChallengeDays = useMemo(
    () =>
      challengeDays.filter((day) => day.date < initialScoring.calendarToday),
    [challengeDays, initialScoring.calendarToday],
  );
  const adminLoggableDays = useMemo(() => {
    const today = initialScoring.calendarToday;
    const allowed = new Set([
      today,
      addDaysToDateString(today, -1),
      addDaysToDateString(today, -2),
    ]);
    return challengeDays.filter((day) => allowed.has(day.date));
  }, [challengeDays, initialScoring.calendarToday]);
  const weekOptions = useMemo(() => {
    const weekNos = [...new Set(challengeDays.map((day) => day.weekNo))].sort(
      (a, b) => a - b,
    );
    return weekNos;
  }, [challengeDays]);
  const [scoreDayInput, setScoreDayInput] = useState(
    () =>
      endedChallengeDays.at(-1)?.date ??
      challengeDays.at(-1)?.date ??
      initialScoring.calendarToday,
  );
  const [scoreWeekInput, setScoreWeekInput] = useState(
    () => weekOptions.at(-1) ?? 1,
  );
  const [scoringBusy, setScoringBusy] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [logForParticipantOpen, setLogForParticipantOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mobileTabOrder, setMobileTabOrder] = useState<AdminTab[]>(ADMIN_TABS);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [approvedPage, setApprovedPage] = useState(1);

  const reviewCount = useMemo(
    () =>
      activities.filter(
        (row) => row.status === "pending" || row.status === "disapproved",
      ).length,
    [activities],
  );

  const approvedCount = useMemo(
    () => activities.filter((row) => row.status === "approved").length,
    [activities],
  );

  const hasActiveFilters = Boolean(userFilter || dateFilter || divisionFilter);
  const isActivitiesTab = adminTab === "review" || adminTab === "approved";
  const isApprovedTab = adminTab === "approved";

  const filteredActivities = useMemo(() => {
    return activities.filter((row) => {
      if (userFilter && row.userId !== userFilter) return false;
      if (dateFilter && row.activityDate !== dateFilter) return false;
      if (divisionFilter && row.userDivision !== divisionFilter) return false;
      if (adminTab === "review") {
        return row.status === "pending" || row.status === "disapproved";
      }
      if (adminTab === "approved") {
        return row.status === "approved";
      }
      return false;
    });
  }, [activities, userFilter, dateFilter, divisionFilter, adminTab]);

  const approvedTotalPages = Math.max(
    1,
    Math.ceil(filteredActivities.length / APPROVED_PAGE_SIZE),
  );

  const displayedActivities = useMemo(() => {
    if (!isApprovedTab) {
      return filteredActivities;
    }

    const start = (approvedPage - 1) * APPROVED_PAGE_SIZE;
    return filteredActivities.slice(start, start + APPROVED_PAGE_SIZE);
  }, [approvedPage, filteredActivities, isApprovedTab]);

  const visibleTabs = mobileTabOrder.slice(0, VISIBLE_TABS);
  const overflowTabs = mobileTabOrder.slice(VISIBLE_TABS);

  useEffect(() => {
    setMobileTabOrder((current) => {
      const visible = current.slice(0, VISIBLE_TABS);
      if (visible.includes(adminTab)) {
        return current;
      }
      return promoteTabToVisibleEnd(current, adminTab, VISIBLE_TABS);
    });
  }, [adminTab]);

  useEffect(() => {
    setApprovedPage(1);
  }, [userFilter, dateFilter, divisionFilter, adminTab]);

  useEffect(() => {
    if (approvedPage > approvedTotalPages) {
      setApprovedPage(approvedTotalPages);
    }
  }, [approvedPage, approvedTotalPages]);

  function selectAdminTab(tab: AdminTab) {
    setAdminTab(tab);
    setFiltersOpen(false);
    setOverflowMenuOpen(false);

    if (!visibleTabs.includes(tab)) {
      setMobileTabOrder((current) =>
        promoteTabToVisibleEnd(current, tab, VISIBLE_TABS),
      );
    }
  }

  async function refreshActivities() {
    const params = new URLSearchParams();
    if (userFilter) params.set("userId", userFilter);
    if (dateFilter) params.set("date", dateFilter);

    const response = await fetch(`/api/admin/activities?${params.toString()}`);
    if (response.ok) {
      const payload = (await response.json()) as { activities: AdminActivityRow[] };
      setActivities(payload.activities);
    }
  }

  async function patchActivity(
    id: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) {
    setBusyId(id);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as {
      error?: string;
      pointsDelta?: number;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Update failed.");
      return;
    }

    const delta =
      typeof payload.pointsDelta === "number" && payload.pointsDelta !== 0
        ? ` (${payload.pointsDelta > 0 ? "+" : ""}${payload.pointsDelta} pts)`
        : "";

    setMessage(`${successMessage}${delta}`);
    await refreshActivities();
    router.refresh();
  }

  async function deleteActivity(row: AdminActivityRow) {
    setBusyId(row.id);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/activities/${row.id}`, {
      method: "DELETE",
    });

    const payload = (await response.json()) as {
      error?: string;
      userName?: string;
      activityDate?: string;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Could not delete activity.");
      return;
    }

    setMessage(
      `${payload.userName ?? row.userName} · ${formatDisplayDate(payload.activityDate ?? row.activityDate)} deleted.`,
    );
    await refreshActivities();
    router.refresh();
  }

  async function patchActivityEdit(
    id: string,
    input: {
      steps: number;
      distanceKm: string;
      activityDate: string;
      photo?: File | null;
    },
    successMessage: string,
  ) {
    setBusyId(id);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("steps", String(input.steps));
    formData.append("distanceKm", input.distanceKm);
    formData.append("activityDate", input.activityDate);
    if (input.photo) {
      formData.append("photo", input.photo);
    }

    const response = await fetch(`/api/admin/activities/${id}`, {
      method: "PATCH",
      body: formData,
    });

    const payload = (await response.json()) as {
      error?: string;
      pointsDelta?: number;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Update failed.");
      return;
    }

    const delta =
      typeof payload.pointsDelta === "number" && payload.pointsDelta !== 0
        ? ` (${payload.pointsDelta > 0 ? "+" : ""}${payload.pointsDelta} pts)`
        : "";

    setMessage(`${successMessage}${delta}`);
    await refreshActivities();
    router.refresh();
  }

  async function updateParticipantProfile(
    user: AdminUserRow,
    input: {
      name?: string;
      mobile?: string;
      division?: Division;
      gender?: Gender | null;
    },
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    setBusyId(user.id);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as {
      error?: string;
      user?: AdminUserRow;
    };

    setBusyId(null);

    if (!response.ok) {
      const message = payload.error ?? "Could not update participant.";
      setError(message);
      return { ok: false, error: message };
    }

    if (payload.user) {
      setParticipantRows((rows) =>
        rows.map((row) => (row.id === payload.user!.id ? payload.user! : row)),
      );
      setMessage(`${payload.user.name} updated.`);
      router.refresh();
      return { ok: true };
    }

    return { ok: false, error: "Could not update participant." };
  }

  async function toggleRole(user: AdminUserRow) {
    const nextRole = user.role === "admin" ? "user" : "admin";
    setBusyId(user.id);
    setError(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });

    const payload = (await response.json()) as {
      error?: string;
      user?: AdminUserRow;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Could not update role.");
      return;
    }

    if (payload.user) {
      setParticipantRows((rows) =>
        rows.map((row) => (row.id === payload.user!.id ? payload.user! : row)),
      );
      setMessage(
        `${payload.user.name} is now ${payload.user.role === "admin" ? "an admin" : "a participant"}.`,
      );
    }
  }

  async function deleteParticipant(user: AdminUserRow) {
    setBusyId(user.id);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });

    const payload = (await response.json()) as {
      error?: string;
      deletedUserName?: string;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Could not delete participant.");
      return;
    }

    setParticipantRows((rows) => rows.filter((row) => row.id !== user.id));
    setActivities((rows) => rows.filter((row) => row.userId !== user.id));
    setMessage(`${payload.deletedUserName ?? user.name} was deleted.`);
    router.refresh();
  }

  async function refreshScoringSnapshot() {
    const response = await fetch("/api/admin/scoring");
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as AdminScoringResult;
  }

  async function scoreDay(date: string) {
    setScoringBusy(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/scoring/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });

    const payload = (await response.json()) as {
      error?: string;
      run?: DayScoringRunRecord;
    };

    setScoringBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "Day scoring failed.");
      return;
    }

    const snapshot = await refreshScoringSnapshot();
    if (snapshot) {
      setScoring(snapshot);
    }
    setMessage(`Day ${formatDisplayDate(date)} scored and logged.`);
    router.refresh();
  }

  async function scoreWeek(weekNo: number) {
    setScoringBusy(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/scoring/week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekNo }),
    });

    const payload = (await response.json()) as {
      error?: string;
      run?: WeekScoringRunRecord;
    };

    setScoringBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "Week scoring failed.");
      return;
    }

    const snapshot = await refreshScoringSnapshot();
    if (snapshot) {
      setScoring(snapshot);
    }
    setMessage(`Week ${weekNo} scored and logged.`);
    router.refresh();
  }

  async function createParticipant(name: string, mobile: string) {
    setBusyId("add-participant");
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mobile }),
    });

    const payload = (await response.json()) as {
      error?: string;
      user?: AdminUserRow;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Could not add participant.");
      return;
    }

    if (payload.user) {
      setParticipantRows((rows) =>
        [...rows, payload.user!].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setMessage(
        `${payload.user.name} added. Default password: ${DEFAULT_PARTICIPANT_PASSWORD}`,
      );
    }

    setAddParticipantOpen(false);
    router.refresh();
  }

  async function createParticipantActivity(input: {
    userId: string;
    activityDate: string;
    steps: string;
    distanceKm: string;
    photo: File;
  }): Promise<boolean> {
    setBusyId("create-activity");
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("userId", input.userId);
    formData.append("activityDate", input.activityDate);
    formData.append("steps", input.steps);
    formData.append("distanceKm", input.distanceKm);
    formData.append("photo", input.photo);

    const response = await fetch("/api/admin/activities", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as {
      error?: string;
      userName?: string;
      activityDate?: string;
      basePoints?: number;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Could not create activity.");
      return false;
    }

    setMessage(
      `${payload.userName ?? "Participant"} · ${formatDisplayDate(payload.activityDate ?? input.activityDate)} logged (+${payload.basePoints ?? 0} base pts).`,
    );
    setLogForParticipantOpen(false);
    await refreshActivities();
    router.refresh();
    return true;
  }

  async function resetParticipantPassword(user: AdminUserRow) {
    setBusyId(user.id);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/admin/users/${user.id}/reset-password`,
      { method: "POST" },
    );

    const payload = (await response.json()) as {
      error?: string;
      user?: AdminUserRow;
    };

    setBusyId(null);

    if (!response.ok) {
      setError(payload.error ?? "Could not reset password.");
      return;
    }

    if (payload.user) {
      setParticipantRows((rows) =>
        rows.map((row) => (row.id === payload.user!.id ? payload.user! : row)),
      );
      setMessage(`${payload.user.name}'s password was reset to ${DEFAULT_PARTICIPANT_PASSWORD}.`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 border-b border-black/10">
        <Tabs
          className="min-w-0 flex-1 gap-0"
          onValueChange={(value) => selectAdminTab(value as AdminTab)}
          value={adminTab}
        >
          <TabsList
            className="h-auto w-full justify-start gap-0 border-0 bg-transparent p-0 sm:gap-1"
            variant="line"
          >
            {visibleTabs.map((tab) => (
              <TabsTrigger className={adminTabTriggerClass} key={tab} value={tab}>
                {getAdminTabLabel(tab, reviewCount, approvedCount)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {overflowTabs.length > 0 ? (
          <AdminTabOverflowMenu
            activeTab={adminTab}
            getLabel={(tab) => getAdminTabLabel(tab, reviewCount, approvedCount)}
            onOpenChange={setOverflowMenuOpen}
            onSelect={selectAdminTab}
            open={overflowMenuOpen}
            tabs={overflowTabs}
          />
        ) : null}

      </div>

      <ActivityFilterDrawer
        challengeDays={challengeDays}
        dateFilter={dateFilter}
        divisionFilter={divisionFilter}
        onClose={() => setFiltersOpen(false)}
        onDateChange={setDateFilter}
        onDivisionChange={setDivisionFilter}
        onUserChange={setUserFilter}
        open={filtersOpen && isApprovedTab}
        userFilter={userFilter}
        users={users}
      />

      {message ? (
        <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-brand">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      {isActivitiesTab ? (
        <ActivitiesTab
          activities={displayedActivities}
          approvedPage={approvedPage}
          approvedPageSize={APPROVED_PAGE_SIZE}
          approvedTotalCount={filteredActivities.length}
          approvedTotalPages={approvedTotalPages}
          busyId={busyId}
          challengeDays={challengeDays}
          hasActiveFilters={hasActiveFilters}
          logForParticipantOpen={logForParticipantOpen}
          loggableDays={adminLoggableDays}
          onApprovedPageChange={setApprovedPage}
          onCreateActivity={createParticipantActivity}
          onFilterOpen={() => setFiltersOpen(true)}
          onLogForParticipantOpenChange={setLogForParticipantOpen}
          onDelete={deleteActivity}
          onDisapprove={(row, note) =>
            patchActivity(
              row.id,
              { status: "disapproved", adminNote: note || "Disapproved by admin" },
              "Activity disapproved",
            )
          }
          onApprove={(row) =>
            patchActivity(row.id, { status: "approved" }, "Activity approved")
          }
          onEdit={(row, steps, distanceKm, activityDate, photo) =>
            patchActivityEdit(
              row.id,
              {
                steps: Number(steps),
                distanceKm,
                activityDate,
                photo,
              },
              "Activity updated",
            )
          }
          onPreviewPhoto={setPhotoPreview}
          reviewTab={adminTab === "review" ? "review" : "approved"}
          users={participantRows}
        />
      ) : adminTab === "participants" ? (
        <ParticipantsTab
          addOpen={addParticipantOpen}
          busyId={busyId}
          currentAdminId={currentAdminId}
          onAddOpenChange={setAddParticipantOpen}
          onCreate={createParticipant}
          onDelete={deleteParticipant}
          onResetPassword={resetParticipantPassword}
          onToggleRole={toggleRole}
          onUpdateProfile={updateParticipantProfile}
          users={participantRows}
        />
      ) : (
        <ScoringTab
          busy={scoringBusy}
          challengeDays={challengeDays}
          onScoreDay={() => scoreDay(scoreDayInput)}
          onScoreWeek={() => scoreWeek(scoreWeekInput)}
          scoreDayInput={scoreDayInput}
          scoreWeekInput={scoreWeekInput}
          onScoreDayInputChange={setScoreDayInput}
          onScoreWeekInputChange={setScoreWeekInput}
          scoring={scoring}
          weekOptions={weekOptions}
        />
      )}

      {photoPreview ? (
        <PhotoLightbox onClose={() => setPhotoPreview(null)} url={photoPreview} />
      ) : null}
    </div>
  );
}

function LogForParticipantDrawer({
  open,
  onClose,
  users,
  loggableDays,
  onSubmit,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  users: AdminUserRow[];
  loggableDays: ChallengeDayOption[];
  onSubmit: (input: {
    userId: string;
    activityDate: string;
    steps: string;
    distanceKm: string;
    photo: File;
  }) => Promise<boolean>;
  busy: boolean;
}) {
  const [userId, setUserId] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [steps, setSteps] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setUserId("");
    setSteps("");
    setDistanceKm("");
    setPhoto(null);
    setPhotoPreview((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setFormError(null);
    setActivityDate(loggableDays[0]?.date ?? "");
  }, [open, loggableDays]);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFormError(null);

    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    setFormError(null);

    if (!userId) {
      setFormError("Choose a participant.");
      return;
    }

    if (!activityDate) {
      setFormError("Choose a challenge date.");
      return;
    }

    if (!photo) {
      setFormError("Attach a proof photo.");
      return;
    }

    if (!Number.isInteger(Number(steps)) || Number(steps) <= 0) {
      setFormError("Enter a whole number of steps greater than 0.");
      return;
    }

    if (Number(distanceKm) <= 0) {
      setFormError("Enter distance greater than 0 km.");
      return;
    }

    const saved = await onSubmit({
      userId,
      activityDate,
      steps,
      distanceKm,
      photo,
    });

    if (!saved) {
      setFormError("Could not save activity. Check the message above.");
    }
  }

  return (
    <BottomFilterDrawer onClose={onClose} open={open} title="Log for participant">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Create an approved entry for today or the previous two days when a
          participant could not log themselves.
        </p>

        {loggableDays.length === 0 ? (
          <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
            No challenge days are available to log right now.
          </p>
        ) : (
          <>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">Participant</span>
              <Select
                onChange={setUserId}
                options={users.map((user) => ({
                  value: user.id,
                  label: `${user.name} · ${user.mobile}`,
                }))}
                placeholder="Choose participant"
                value={userId}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">Date</span>
              <Select
                onChange={setActivityDate}
                options={loggableDays.map((day) => ({
                  value: day.date,
                  label: `${formatDisplayDate(day.date)} · W${day.weekNo} · target ${day.targetSteps.toLocaleString("en-IN")}`,
                }))}
                value={activityDate}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="font-medium text-foreground">Steps</span>
                <input
                  className="field-input"
                  inputMode="numeric"
                  onChange={(event) => setSteps(event.target.value)}
                  placeholder="e.g. 10432"
                  type="number"
                  value={steps}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium text-foreground">Distance (km)</span>
                <input
                  className="field-input"
                  inputMode="decimal"
                  onChange={(event) => setDistanceKm(event.target.value)}
                  placeholder="e.g. 5.43"
                  step={0.001}
                  type="number"
                  value={distanceKm}
                />
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">Photo</span>
              <input
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                className="w-full rounded-2xl border border-dashed border-black/15 bg-background px-4 py-3 text-sm"
                onChange={handlePhotoChange}
                type="file"
              />
              {photoPreview ? (
                <div className="overflow-hidden rounded-2xl border border-black/10">
                  <Image
                    alt="Activity preview"
                    className="h-48 w-full object-cover"
                    height={192}
                    src={photoPreview}
                    unoptimized
                    width={400}
                  />
                </div>
              ) : null}
            </label>
          </>
        )}

        {formError ? (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <div className="flex gap-2 pt-1">
          <ActionButton onClick={onClose} variant="ghost">
            Cancel
          </ActionButton>
          <ActionButton
            disabled={busy || loggableDays.length === 0}
            onClick={() => void handleSubmit()}
            variant="primary"
          >
            {busy ? "Saving…" : "Save activity"}
          </ActionButton>
        </div>
      </div>
    </BottomFilterDrawer>
  );
}

function ActivitiesTab({
  activities,
  challengeDays,
  loggableDays,
  users,
  logForParticipantOpen,
  onLogForParticipantOpenChange,
  onCreateActivity,
  reviewTab,
  onPreviewPhoto,
  onApprove,
  onDelete,
  onDisapprove,
  onEdit,
  busyId,
  approvedPage,
  approvedPageSize,
  approvedTotalCount,
  approvedTotalPages,
  onApprovedPageChange,
  hasActiveFilters,
  onFilterOpen,
}: {
  activities: AdminActivityRow[];
  challengeDays: ChallengeDayOption[];
  loggableDays: ChallengeDayOption[];
  users: AdminUserRow[];
  logForParticipantOpen: boolean;
  onLogForParticipantOpenChange: (open: boolean) => void;
  onCreateActivity: (input: {
    userId: string;
    activityDate: string;
    steps: string;
    distanceKm: string;
    photo: File;
  }) => Promise<boolean>;
  reviewTab: "review" | "approved";
  onPreviewPhoto: (url: string) => void;
  onApprove: (row: AdminActivityRow) => void;
  onDelete: (row: AdminActivityRow) => void;
  onDisapprove: (row: AdminActivityRow, note: string) => void;
  onEdit: (
    row: AdminActivityRow,
    steps: string,
    distanceKm: string,
    activityDate: string,
    photo?: File | null,
  ) => void;
  busyId: string | null;
  approvedPage: number;
  approvedPageSize: number;
  approvedTotalCount: number;
  approvedTotalPages: number;
  onApprovedPageChange: (page: number) => void;
  hasActiveFilters: boolean;
  onFilterOpen: () => void;
}) {
  const approvedRangeStart =
    approvedTotalCount === 0 ? 0 : (approvedPage - 1) * approvedPageSize + 1;
  const approvedRangeEnd = Math.min(approvedPage * approvedPageSize, approvedTotalCount);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {reviewTab === "approved" && approvedTotalCount > 0 ? (
          <ApprovedActivitiesPager
            end={approvedRangeEnd}
            onPageChange={onApprovedPageChange}
            page={approvedPage}
            start={approvedRangeStart}
            totalCount={approvedTotalCount}
            totalPages={approvedTotalPages}
          />
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ActionButton
            disabled={loggableDays.length === 0}
            onClick={() => onLogForParticipantOpenChange(true)}
            variant="primary"
          >
            Log for participant
          </ActionButton>

          {reviewTab === "approved" ? (
            <button
              aria-expanded={false}
              aria-label="Open activity filters"
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                hasActiveFilters
                  ? "bg-brand/10 text-brand"
                  : "bg-background text-muted hover:bg-brand/5 hover:text-foreground",
              )}
              onClick={onFilterOpen}
              type="button"
            >
              <FilterIcon className="size-4" />
              <span className="max-[360px]:hidden">Filter</span>
              {hasActiveFilters ? (
                <span className="size-1.5 rounded-full bg-brand" />
              ) : null}
            </button>
          ) : null}
        </div>
      </div>

      <LogForParticipantDrawer
        busy={busyId === "create-activity"}
        loggableDays={loggableDays}
        onClose={() => onLogForParticipantOpenChange(false)}
        onSubmit={onCreateActivity}
        open={logForParticipantOpen}
        users={users}
      />

      {activities.length === 0 ? (
        <EmptyCard
          text={
            reviewTab === "review"
              ? "No activities waiting for review."
              : hasActiveFilters
                ? "No approved activities match these filters."
                : "No approved activities yet."
          }
        />
      ) : (
        activities.map((row) => (
          <ActivityAdminCard
            busy={busyId === row.id}
            challengeDays={challengeDays}
            key={row.id}
            onApprove={() => onApprove(row)}
            onDelete={() => onDelete(row)}
            onDisapprove={(note) => onDisapprove(row, note)}
            onEdit={(steps, distanceKm, activityDate, photo) =>
              onEdit(row, steps, distanceKm, activityDate, photo)
            }
            onPreviewPhoto={() => onPreviewPhoto(photoProxyUrl(row.photoUrl))}
            reviewTab={reviewTab}
            row={row}
          />
        ))
      )}

      {reviewTab === "approved" && approvedTotalPages > 1 ? (
        <ApprovedActivitiesPager
          className="justify-center border-t border-black/5 pt-3"
          end={approvedRangeEnd}
          onPageChange={onApprovedPageChange}
          page={approvedPage}
          start={approvedRangeStart}
          totalCount={approvedTotalCount}
          totalPages={approvedTotalPages}
        />
      ) : null}
    </section>
  );
}

function ApprovedActivitiesPager({
  page,
  totalPages,
  totalCount,
  start,
  end,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2 text-sm",
        className,
      )}
    >
      <p className="text-muted">
        {start}–{end} of {totalCount}
      </p>
      <div className="flex items-center gap-1">
        <button
          aria-label="Previous page"
          className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-brand/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="min-w-[4.5rem] text-center tabular-nums text-foreground">
          {page} / {totalPages}
        </span>
        <button
          aria-label="Next page"
          className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-brand/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ActivityAdminCard({
  row,
  challengeDays,
  reviewTab,
  onPreviewPhoto,
  onApprove,
  onDelete,
  onDisapprove,
  onEdit,
  busy,
}: {
  row: AdminActivityRow;
  challengeDays: ChallengeDayOption[];
  reviewTab: "review" | "approved";
  onPreviewPhoto: () => void;
  onApprove: () => void;
  onDelete: () => void;
  onDisapprove: (note: string) => void;
  onEdit: (
    steps: string,
    distanceKm: string,
    activityDate: string,
    photo?: File | null,
  ) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [steps, setSteps] = useState(String(row.steps));
  const [distanceKm, setDistanceKm] = useState(String(Number(row.distanceKm)));
  const [activityDate, setActivityDate] = useState(row.activityDate);
  const [note, setNote] = useState(row.adminNote ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  function resetEditForm() {
    setSteps(String(row.steps));
    setDistanceKm(String(Number(row.distanceKm)));
    setActivityDate(row.activityDate);
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  function openEdit() {
    resetEditForm();
    setEditing(true);
  }

  function closeEdit() {
    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    resetEditForm();
    setEditing(false);
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  const editPhotoSrc = photoPreview ?? photoProxyUrl(row.photoUrl);

  return (
    <article className="rounded-2xl border border-black/5 bg-surface p-3">
      <ConfirmDialog
        busy={busy}
        confirmLabel="Delete entry"
        description={`Delete ${row.userName}'s disapproved entry for ${formatDisplayDate(row.activityDate)}? This removes the activity and proof photo permanently. The participant can log that day again.`}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          onDelete();
        }}
        open={confirmDeleteOpen}
        title="Delete disapproved entry?"
        variant="danger"
      />

      <div className="flex gap-3">
        <button
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={onPreviewPhoto}
          type="button"
        >
          <Image
            alt={`Proof for ${row.userName}`}
            className="object-cover"
            fill
            sizes="80px"
            src={photoProxyUrl(row.photoUrl)}
            unoptimized
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{row.userName}</p>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
              W{row.weekNo}
            </span>
            <AdminDivisionBadge division={row.userDivision} />
            <StatusBadge status={row.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {formatDisplayDate(row.activityDate)} · target{" "}
            {row.targetSteps.toLocaleString("en-IN")} ·{" "}
            <span className="font-medium text-foreground">
              {row.steps.toLocaleString("en-IN")} steps ·{" "}
              {formatDistanceKm(row.distanceKm)}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            Base points:{" "}
            <span className="font-semibold text-foreground">{row.basePoints}</span>
          </p>
          {row.adminNote ? (
            <p className="mt-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {row.adminNote}
            </p>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-foreground">Steps</span>
            <input
              className="field-input"
              onChange={(event) => setSteps(event.target.value)}
              type="number"
              value={steps}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-foreground">Distance (km)</span>
            <input
              className="field-input"
              onChange={(event) => setDistanceKm(event.target.value)}
              step={0.001}
              type="number"
              value={distanceKm}
            />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span className="font-medium text-foreground">Date</span>
            <Select
              onChange={setActivityDate}
              options={challengeDays.map((day) => ({
                value: day.date,
                label: formatDisplayDate(day.date),
              }))}
              value={activityDate}
            />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span className="font-medium text-foreground">Photo</span>
            <p className="text-xs text-muted">
              Upload a new screenshot to replace the current proof photo.
            </p>
            <input
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              className="w-full rounded-2xl border border-dashed border-black/15 bg-background px-4 py-3 text-sm"
              onChange={handlePhotoChange}
              type="file"
            />
            <div className="overflow-hidden rounded-2xl border border-black/10">
              <Image
                alt={`Proof preview for ${row.userName}`}
                className="h-48 w-full object-cover"
                height={192}
                src={editPhotoSrc}
                unoptimized
                width={400}
              />
            </div>
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <ActionButton
              disabled={busy}
              onClick={() => {
                onEdit(steps, distanceKm, activityDate, photoFile);
                closeEdit();
              }}
              variant="primary"
            >
              Save edit
            </ActionButton>
            <ActionButton onClick={closeEdit} variant="ghost">
              Cancel
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton disabled={busy} onClick={openEdit} variant="ghost">
            Edit
          </ActionButton>
          {reviewTab === "approved" ? (
            <>
              <input
                className="field-input min-w-0 flex-1"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Note if disapproving"
                value={note}
              />
              <ActionButton
                disabled={busy}
                onClick={() => onDisapprove(note)}
                variant="danger"
              >
                Disapprove
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton disabled={busy} onClick={onApprove} variant="primary">
                {row.status === "disapproved" ? "Re-approve" : "Approve"}
              </ActionButton>
              {row.status === "disapproved" ? (
                <ActionButton
                  disabled={busy}
                  onClick={() => setConfirmDeleteOpen(true)}
                  variant="danger"
                >
                  Delete
                </ActionButton>
              ) : null}
            </>
          )}
        </div>
      )}
    </article>
  );
}

function ParticipantsTab({
  users,
  currentAdminId,
  addOpen,
  onAddOpenChange,
  onCreate,
  onToggleRole,
  onResetPassword,
  onDelete,
  onUpdateProfile,
  busyId,
}: {
  users: AdminUserRow[];
  currentAdminId: string;
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
  onCreate: (name: string, mobile: string) => void;
  onToggleRole: (user: AdminUserRow) => void;
  onResetPassword: (user: AdminUserRow) => void;
  onDelete: (user: AdminUserRow) => void;
  onUpdateProfile: (
    user: AdminUserRow,
    input: {
      name?: string;
      mobile?: string;
      division?: Division;
      gender?: Gender | null;
    },
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  busyId: string | null;
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editDivision, setEditDivision] = useState<Division>("strider");
  const [editGender, setEditGender] = useState("");
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ParticipantConfirmAction | null>(
    null,
  );

  function openEdit(user: AdminUserRow) {
    setEditUser(user);
    setEditName(user.name);
    setEditMobile(user.mobile);
    setEditDivision(user.division);
    setEditGender(user.gender ?? "");
    setEditFormError(null);
  }

  function closeEdit() {
    setEditUser(null);
    setEditFormError(null);
  }

  function handleSaveEdit() {
    if (!editUser) {
      return;
    }

    setEditFormError(null);

    if (editName.trim().length < 2) {
      setEditFormError("Enter the participant's name.");
      return;
    }

    if (editMobile.replace(/\D/g, "").length < 10) {
      setEditFormError("Enter a valid 10-digit mobile number.");
      return;
    }

    void (async () => {
      const result = await onUpdateProfile(editUser, {
        name: editName.trim(),
        mobile: editMobile,
        division: editDivision,
        gender: editGender === "" ? null : (editGender as Gender),
      });

      if (result.ok) {
        closeEdit();
        return;
      }

      setEditFormError(result.error);
    })();
  }

  function handleCreate() {
    setFormError(null);
    if (name.trim().length < 2) {
      setFormError("Enter the participant's name.");
      return;
    }
    if (mobile.replace(/\D/g, "").length < 10) {
      setFormError("Enter a valid 10-digit mobile number.");
      return;
    }
    onCreate(name.trim(), mobile);
    setName("");
    setMobile("");
  }

  function handleConfirmAction() {
    if (!confirmAction) {
      return;
    }

    const { type, user } = confirmAction;
    setConfirmAction(null);

    if (type === "reset") {
      onResetPassword(user);
      return;
    }
    if (type === "role") {
      onToggleRole(user);
      return;
    }
    onDelete(user);
  }

  const confirmCopy = confirmAction
    ? getParticipantConfirmCopy(confirmAction)
    : null;

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <ActionButton onClick={() => onAddOpenChange(true)} variant="primary">
          Add participant
        </ActionButton>
      </div>

      <BottomFilterDrawer
        onClose={() => {
          onAddOpenChange(false);
          setFormError(null);
        }}
        open={addOpen}
        title="Add participant"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Default password is{" "}
            <span className="font-medium text-foreground">
              {DEFAULT_PARTICIPANT_PASSWORD}
            </span>
            . They must set a new password on first login.
          </p>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-foreground">Name</span>
            <input
              className="field-input"
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              value={name}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-foreground">Mobile</span>
            <input
              className="field-input"
              inputMode="numeric"
              onChange={(event) => setMobile(event.target.value)}
              placeholder="10-digit mobile number"
              type="tel"
              value={mobile}
            />
          </label>

          {formError ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <ActionButton
              onClick={() => {
                onAddOpenChange(false);
                setFormError(null);
              }}
              variant="ghost"
            >
              Cancel
            </ActionButton>
            <ActionButton
              disabled={busyId === "add-participant"}
              onClick={handleCreate}
              variant="primary"
            >
              Add participant
            </ActionButton>
          </div>
        </div>
      </BottomFilterDrawer>

      <BottomFilterDrawer
        onClose={closeEdit}
        open={Boolean(editUser)}
        title="Edit participant"
      >
        {editUser ? (
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">Name</span>
              <input
                className="field-input"
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Full name"
                value={editName}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">Mobile</span>
              <input
                className="field-input"
                inputMode="numeric"
                onChange={(event) => setEditMobile(event.target.value)}
                placeholder="10-digit mobile number"
                type="tel"
                value={editMobile}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">Division</span>
              <Select
                onChange={(value) => setEditDivision(value as Division)}
                options={[
                  { value: "strider", label: "Strider" },
                  { value: "elite", label: "Elite" },
                  { value: "riser", label: "Riser" },
                ]}
                value={editDivision}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">Gender</span>
              <Select
                onChange={setEditGender}
                options={[
                  { value: "", label: "Not set" },
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
                value={editGender}
              />
            </label>

            {editFormError ? (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
                {editFormError}
              </p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <ActionButton onClick={closeEdit} variant="ghost">
                Cancel
              </ActionButton>
              <ActionButton
                disabled={busyId === editUser.id}
                onClick={handleSaveEdit}
                variant="primary"
              >
                Save changes
              </ActionButton>
            </div>
          </div>
        ) : null}
      </BottomFilterDrawer>

      <ConfirmDialog
        busy={Boolean(confirmAction && busyId === confirmAction.user.id)}
        confirmLabel={confirmCopy?.confirmLabel ?? "Confirm"}
        description={confirmCopy?.description ?? ""}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        open={Boolean(confirmAction)}
        title={confirmCopy?.title ?? ""}
        variant={confirmCopy?.variant ?? "default"}
      />

      {users.length === 0 ? (
        <EmptyCard text="No participants yet." />
      ) : (
        users.map((user) => (
          <article
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-surface px-4 py-3"
            key={user.id}
          >
            <div>
              <p className="font-medium text-foreground">
                {user.name}
                {user.id === currentAdminId ? (
                  <span className="ml-2 text-sm text-brand">You</span>
                ) : null}
              </p>
              <p className="text-sm text-muted">
                {user.mobile} · {formatParticipantMeta(user)}
              </p>
              {user.mustChangePassword ? (
                <p className="mt-1 text-xs font-medium text-warning">
                  Must change password on login
                </p>
              ) : null}
            </div>
            {user.id !== currentAdminId ? (
              <ParticipantActionsMenu
                busy={busyId === user.id}
                onEdit={() => openEdit(user)}
                onSelectAction={(type) => setConfirmAction({ type, user })}
                user={user}
              />
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}

type ParticipantConfirmAction = {
  type: "reset" | "role" | "delete";
  user: AdminUserRow;
};

function formatParticipantMeta(user: AdminUserRow): string {
  const role = user.role === "admin" ? "Admin" : "Participant";
  const division = divisionLabel(user.division);
  const gender =
    user.gender === "male"
      ? "Male"
      : user.gender === "female"
        ? "Female"
        : user.gender === "other"
          ? "Other"
          : null;

  return gender ? `${division} · ${gender} · ${role}` : `${division} · ${role}`;
}

function getParticipantConfirmCopy(action: ParticipantConfirmAction) {
  const { type, user } = action;

  if (type === "reset") {
    return {
      title: "Reset password?",
      description: `Reset ${user.name}'s password to "${DEFAULT_PARTICIPANT_PASSWORD}". They must choose a new password on next login.`,
      confirmLabel: "Reset password",
      variant: "default" as const,
    };
  }

  if (type === "role") {
    const makingAdmin = user.role !== "admin";
    return {
      title: makingAdmin ? "Make admin?" : "Make participant?",
      description: makingAdmin
        ? `${user.name} will be able to access admin tools including activity review.`
        : `${user.name} will lose admin access and remain a participant only.`,
      confirmLabel: makingAdmin ? "Make admin" : "Make participant",
      variant: "default" as const,
    };
  }

  return {
    title: "Delete participant?",
    description: `Delete ${user.name}? This removes all their activities, photos, and profile data permanently.`,
    confirmLabel: "Delete participant",
    variant: "danger" as const,
  };
}

function ParticipantActionsMenu({
  user,
  busy,
  onEdit,
  onSelectAction,
}: {
  user: AdminUserRow;
  busy: boolean;
  onEdit: () => void;
  onSelectAction: (type: ParticipantConfirmAction["type"]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${user.name}`}
        className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-brand/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
        disabled={busy}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreVerticalIcon className="size-5" />
      </button>

      {open ? (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div
            className="absolute right-0 top-full z-30 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-black/10 bg-surface py-1 shadow-lg ring-1 ring-black/5"
            role="menu"
          >
            <ParticipantMenuItem
              label="Edit"
              onSelect={() => {
                setOpen(false);
                onEdit();
              }}
            />
            <ParticipantMenuItem
              label="Reset password"
              onSelect={() => {
                setOpen(false);
                onSelectAction("reset");
              }}
            />
            <ParticipantMenuItem
              label={user.role === "admin" ? "Make participant" : "Make admin"}
              onSelect={() => {
                setOpen(false);
                onSelectAction("role");
              }}
            />
            <ParticipantMenuItem
              destructive
              label="Delete"
              onSelect={() => {
                setOpen(false);
                onSelectAction("delete");
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function ParticipantMenuItem({
  label,
  onSelect,
  destructive = false,
}: {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      className={cn(
        "block w-full px-4 py-2.5 text-left text-sm transition hover:bg-brand/5",
        destructive ? "text-danger" : "text-foreground",
      )}
      onClick={onSelect}
      role="menuitem"
      type="button"
    >
      {label}
    </button>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  variant,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "danger";
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        type="button"
      />
      <div
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-3xl border border-black/10 bg-surface p-5 shadow-lg ring-1 ring-black/5"
        role="alertdialog"
      >
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <ActionButton disabled={busy} onClick={onCancel} variant="ghost">
            Cancel
          </ActionButton>
          <ActionButton disabled={busy} onClick={onConfirm} variant={variant}>
            {busy ? "Working…" : confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function MoreVerticalIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function ScoringTab({
  scoring,
  challengeDays,
  weekOptions,
  scoreDayInput,
  scoreWeekInput,
  busy,
  onScoreDayInputChange,
  onScoreWeekInputChange,
  onScoreDay,
  onScoreWeek,
}: {
  scoring: AdminScoringResult;
  challengeDays: ChallengeDayOption[];
  weekOptions: number[];
  scoreDayInput: string;
  scoreWeekInput: number;
  busy: boolean;
  onScoreDayInputChange: (value: string) => void;
  onScoreWeekInputChange: (value: number) => void;
  onScoreDay: () => void;
  onScoreWeek: () => void;
}) {
  const { calendarToday, standings, recentDayRuns, recentWeekRuns } = scoring;

  return (
    <section className="space-y-4">
      <article className="rounded-3xl border border-black/5 bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Live standings</h2>
        <p className="mt-2 text-sm text-muted">
          Totals are derived from approved activities using calendar today (
          {formatDisplayDate(calendarToday)}). Bonus rules apply only to ended
          days and weeks.
        </p>

        {standings.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No participants yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {standings.map((row) => (
              <ScoringStandingRow key={row.userId} row={row} />
            ))}
          </div>
        )}
      </article>

      <article className="rounded-3xl border border-black/5 bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Score a day</h2>
        <p className="mt-2 text-sm text-muted">
          Records star-of-day winners for review. Re-running recalculates from
          current approved data and appends a new audit entry.
        </p>

        <label className="mt-4 block space-y-1 text-sm">
          <span className="font-medium text-foreground">Challenge day</span>
          <Select
            onChange={onScoreDayInputChange}
            options={challengeDays.map((day) => ({
              value: day.date,
              label: `${formatDisplayDate(day.date)} · Week ${day.weekNo}`,
            }))}
            value={scoreDayInput}
          />
        </label>

        <div className="mt-4">
          <ActionButton disabled={busy} onClick={onScoreDay} variant="primary">
            Score day
          </ActionButton>
        </div>
      </article>

      <article className="rounded-3xl border border-black/5 bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Score a week</h2>
        <p className="mt-2 text-sm text-muted">
          Records week star and consistency bonuses for review. Re-running
          recalculates from current approved data.
        </p>

        <label className="mt-4 block space-y-1 text-sm">
          <span className="font-medium text-foreground">Challenge week</span>
          <Select
            onChange={(value) => onScoreWeekInputChange(Number(value))}
            options={weekOptions.map((weekNo) => ({
              value: String(weekNo),
              label: `Week ${weekNo}`,
            }))}
            value={String(scoreWeekInput)}
          />
        </label>

        <div className="mt-4">
          <ActionButton disabled={busy} onClick={onScoreWeek} variant="primary">
            Score week
          </ActionButton>
        </div>
      </article>

      <article className="rounded-3xl border border-black/5 bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Recent audit runs</h2>
        {recentDayRuns.length === 0 && recentWeekRuns.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No scoring runs yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {recentDayRuns.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-foreground">Day runs</h3>
                <ul className="mt-2 space-y-2">
                  {recentDayRuns.map((run) => (
                    <DayScoringRunSummary key={run.id} run={run} />
                  ))}
                </ul>
              </div>
            ) : null}
            {recentWeekRuns.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-foreground">Week runs</h3>
                <ul className="mt-2 space-y-2">
                  {recentWeekRuns.map((run) => (
                    <WeekScoringRunSummary key={run.id} run={run} />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </article>
    </section>
  );
}

function DayScoringRunSummary({ run }: { run: DayScoringRunRecord }) {
  return (
    <li className="rounded-2xl bg-background px-4 py-3 text-sm">
      <p className="font-medium text-foreground">
        {formatDisplayDate(run.activityDate)} · max {run.maxSteps.toLocaleString()} steps
      </p>
      <p className="mt-1 text-muted">
        {new Date(run.computedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}{" "}
        IST
        {run.triggeredByName ? ` · by ${run.triggeredByName}` : ""}
      </p>
      {run.winners.length > 0 ? (
        <p className="mt-1 text-foreground">
          Star winners (+{run.starPoints}): {run.winners.join(", ")}
        </p>
      ) : (
        <p className="mt-1 text-muted">No star winner (no steps recorded).</p>
      )}
    </li>
  );
}

function WeekScoringRunSummary({ run }: { run: WeekScoringRunRecord }) {
  return (
    <li className="rounded-2xl bg-background px-4 py-3 text-sm">
      <p className="font-medium text-foreground">
        Week {run.weekNo} · max {run.maxWeeklySteps.toLocaleString()} steps
      </p>
      <p className="mt-1 text-muted">
        {new Date(run.computedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}{" "}
        IST
        {run.triggeredByName ? ` · by ${run.triggeredByName}` : ""}
      </p>
      {run.winners.length > 0 ? (
        <p className="mt-1 text-foreground">
          Week star (+{run.weekStarPoints}): {run.winners.join(", ")}
        </p>
      ) : (
        <p className="mt-1 text-muted">No week star (no steps recorded).</p>
      )}
    </li>
  );
}

function ScoringStandingRow({ row }: { row: UserStanding }) {
  return (
    <div className="rounded-2xl bg-background px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            #{row.rank} {row.name}
          </p>
          <p className="mt-1 text-muted">
            Base {row.breakdown.base} · Star {row.breakdown.starDay} · Week{" "}
            {row.breakdown.weekStar} · Streak {row.breakdown.consistency}
          </p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {row.total}
        </p>
      </div>
    </div>
  );
}

function BottomFilterDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        type="button"
      />
      <div
        aria-modal="true"
        className="animate-sheet-slide-up absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(85vh,640px)] max-w-3xl flex-col rounded-t-3xl bg-surface shadow-[0_-8px_30px_rgb(0_0_0/0.12)] ring-1 ring-black/5"
        role="dialog"
      >
        <div className="shrink-0 px-4 pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              className="rounded-lg px-2 py-1 text-sm font-medium text-muted hover:bg-brand/5 hover:text-foreground"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">{children}</div>
      </div>
    </div>
  );
}

type ActivityFilterKey = "participant" | "division" | "date";

function ActivityFilterDrawer({
  open,
  onClose,
  users,
  challengeDays,
  userFilter,
  divisionFilter,
  dateFilter,
  onUserChange,
  onDivisionChange,
  onDateChange,
}: {
  open: boolean;
  onClose: () => void;
  users: AdminUserRow[];
  challengeDays: ChallengeDayOption[];
  userFilter: string;
  divisionFilter: string;
  dateFilter: string;
  onUserChange: (value: string) => void;
  onDivisionChange: (value: string) => void;
  onDateChange: (value: string) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<ActivityFilterKey | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveFilter(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (activeFilter) {
          setActiveFilter(null);
          return;
        }
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFilter, onClose, open]);

  const participantLabel =
    users.find((user) => user.id === userFilter)?.name ?? "All participants";
  const divisionLabelText =
    divisionFilter === "elite"
      ? "Elite"
      : divisionFilter === "riser"
        ? "Risers"
        : divisionFilter === "strider"
          ? "Striders"
          : "All divisions";
  const dateLabel = dateFilter
    ? formatDisplayDate(dateFilter)
    : "All dates";

  const filterRows: Array<{
    key: ActivityFilterKey;
    label: string;
    value: string;
  }> = [
    { key: "participant", label: "Participant", value: participantLabel },
    { key: "division", label: "Division", value: divisionLabelText },
    { key: "date", label: "Date", value: dateLabel },
  ];

  function clearFilters() {
    onUserChange("");
    onDivisionChange("");
    onDateChange("");
    onClose();
  }

  if (!open) {
    return null;
  }

  const detailTitle =
    activeFilter === "participant"
      ? "Participant"
      : activeFilter === "division"
        ? "Division"
        : activeFilter === "date"
          ? "Date"
          : "Filter activities";

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close filters"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        type="button"
      />
      <div
        aria-modal="true"
        className="animate-sheet-slide-up absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(85vh,640px)] max-w-3xl flex-col rounded-t-3xl bg-surface shadow-[0_-8px_30px_rgb(0_0_0/0.12)] ring-1 ring-black/5"
        role="dialog"
      >
        <div className="shrink-0 px-4 pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
          <div className="mb-2 flex items-center gap-2">
            {activeFilter ? (
              <button
                aria-label="Back to filters"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-brand/5 hover:text-foreground"
                onClick={() => setActiveFilter(null)}
                type="button"
              >
                <BackIcon className="size-5" />
              </button>
            ) : null}
            <h2 className="min-w-0 flex-1 text-base font-semibold text-foreground">
              {detailTitle}
            </h2>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            className={cn(
              "absolute inset-0 overflow-y-auto overscroll-contain px-4 pb-4",
              activeFilter && "pointer-events-none invisible",
            )}
          >
            <ul className="divide-y divide-black/5 rounded-2xl border border-black/5">
              {filterRows.map((row) => (
                <li key={row.key}>
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-brand/5"
                    onClick={() => setActiveFilter(row.key)}
                    type="button"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{row.label}</p>
                      <p className="truncate text-sm text-muted">{row.value}</p>
                    </div>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {activeFilter ? (
            <div className="absolute inset-0 overflow-y-auto overscroll-contain px-4 pb-4">
              {activeFilter === "participant" ? (
                <FilterOptionList
                  onSelect={onUserChange}
                  options={[
                    { value: "", label: "All participants" },
                    ...users.map((user) => ({ value: user.id, label: user.name })),
                  ]}
                  selectedValue={userFilter}
                />
              ) : null}
              {activeFilter === "division" ? (
                <FilterOptionList
                  onSelect={onDivisionChange}
                  options={[
                    { value: "", label: "All divisions" },
                    { value: "strider", label: "Striders" },
                    { value: "elite", label: "Elite" },
                    { value: "riser", label: "Risers" },
                  ]}
                  selectedValue={divisionFilter}
                />
              ) : null}
              {activeFilter === "date" ? (
                <FilterOptionList
                  onSelect={onDateChange}
                  options={[
                    { value: "", label: "All dates" },
                    ...challengeDays.map((day) => ({
                      value: day.date,
                      label: formatDisplayDate(day.date),
                    })),
                  ]}
                  selectedValue={dateFilter}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-black/5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <ActionButton onClick={clearFilters} variant="ghost">
            Clear
          </ActionButton>
          <ActionButton onClick={onClose} variant="primary">
            Done
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function FilterOptionList({
  options,
  selectedValue,
  onSelect,
}: {
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ul className="divide-y divide-black/5 rounded-2xl border border-black/5">
      {options.map((option) => {
        const selected = option.value === selectedValue;

        return (
          <li key={option.value || "__all__"}>
            <button
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm transition hover:bg-brand/5",
                selected && "bg-brand/10 font-medium text-brand",
              )}
              onClick={() => onSelect(option.value)}
              type="button"
            >
              <span>{option.label}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0 rounded-full border-2",
                  selected
                    ? "border-brand bg-brand"
                    : "border-black/20 bg-transparent",
                )}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        status === "approved" && "bg-success/10 text-brand",
        status === "pending" && "bg-warning/15 text-warning",
        status === "disapproved" && "bg-danger/10 text-danger",
      )}
    >
      {status === "pending" ? "Pending review" : status}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "primary" | "ghost" | "danger" | "default";
}) {
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        (variant === "ghost" || variant === "default") &&
          "bg-background text-foreground hover:bg-brand/10",
        variant === "danger" && "bg-danger text-white hover:opacity-90",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-surface p-6 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <button
        aria-label="Close photo preview"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 max-h-[85vh] max-w-3xl overflow-hidden rounded-3xl bg-black">
        <Image
          alt="Activity proof"
          className="max-h-[85vh] w-auto object-contain"
          height={900}
          src={url}
          unoptimized
          width={900}
        />
      </div>
    </div>
  );
}
