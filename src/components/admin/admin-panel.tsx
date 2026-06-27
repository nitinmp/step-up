"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { AdminScoringResult } from "@/lib/scoring-admin-service";
import type {
  AdminActivityRow,
  AdminUserRow,
} from "@/lib/admin-service";
import { cn } from "@/lib/cn";
import { photoProxyUrl } from "@/lib/blob-storage";
import { formatDisplayDate } from "@/lib/dates";
import type { UserStanding } from "@/lib/standings";

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

type Tab = "activities" | "participants" | "scoring";

export function AdminPanel({
  initialActivities,
  users,
  challengeDays,
  currentAdminId,
  initialScoring,
}: AdminPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("activities");
  const [activities, setActivities] = useState(initialActivities);
  const [participantRows, setParticipantRows] = useState(users);
  const [scoring, setScoring] = useState(initialScoring);
  const [scoringDateInput, setScoringDateInput] = useState(
    initialScoring.state.scoringAsOfDate ?? initialScoring.state.effectiveDate,
  );
  const [scoringBusy, setScoringBusy] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredActivities = useMemo(() => {
    return activities.filter((row) => {
      if (userFilter && row.userId !== userFilter) return false;
      if (dateFilter && row.activityDate !== dateFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      return true;
    });
  }, [activities, userFilter, dateFilter, statusFilter]);

  async function refreshActivities() {
    const params = new URLSearchParams();
    if (userFilter) params.set("userId", userFilter);
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter) params.set("status", statusFilter);

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
    const confirmed = window.confirm(
      `Delete ${user.name}? This removes all their activities, photos, and profile data permanently.`,
    );
    if (!confirmed) {
      return;
    }

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

  async function runScoring(body: Record<string, unknown>, successMessage: string) {
    setScoringBusy(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/scoring/recompute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as AdminScoringResult & {
      error?: string;
    };

    setScoringBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "Scoring run failed.");
      return;
    }

    setScoring(payload);
    setScoringDateInput(
      payload.state.scoringAsOfDate ?? payload.state.effectiveDate,
    );
    setMessage(successMessage);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-white/80">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Moderation</h1>
        <p className="mt-2 text-sm text-white/85">
          Review proof photos, edit entries, and manage participants.
        </p>
      </header>

      <div className="flex gap-2 rounded-2xl bg-surface p-1 shadow-sm ring-1 ring-black/5">
        <TabButton active={tab === "activities"} onClick={() => setTab("activities")}>
          Activities
        </TabButton>
        <TabButton active={tab === "participants"} onClick={() => setTab("participants")}>
          Participants
        </TabButton>
        <TabButton active={tab === "scoring"} onClick={() => setTab("scoring")}>
          Scoring
        </TabButton>
      </div>

      {message ? (
        <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm text-brand">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      {tab === "activities" ? (
        <ActivitiesTab
          activities={filteredActivities}
          busyId={busyId}
          challengeDays={challengeDays}
          dateFilter={dateFilter}
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
          onEdit={(row, steps, activityDate) =>
            patchActivity(
              row.id,
              { steps: Number(steps), activityDate },
              "Activity updated",
            )
          }
          onPreviewPhoto={setPhotoPreview}
          setDateFilter={setDateFilter}
          setStatusFilter={setStatusFilter}
          setUserFilter={setUserFilter}
          statusFilter={statusFilter}
          userFilter={userFilter}
          users={users}
        />
      ) : tab === "participants" ? (
        <ParticipantsTab
          busyId={busyId}
          currentAdminId={currentAdminId}
          onDelete={deleteParticipant}
          onToggleRole={toggleRole}
          users={participantRows}
        />
      ) : (
        <ScoringTab
          busy={scoringBusy}
          dateInput={scoringDateInput}
          onAdvanceDay={() =>
            runScoring({ advanceDays: 1 }, "Scoring advanced by one day.")
          }
          onClearOverride={() =>
            runScoring({ asOfDate: null }, "Scoring reset to calendar today.")
          }
          onRecompute={() => runScoring({}, "Scores recomputed.")}
          onSetDate={() =>
            runScoring(
              { asOfDate: scoringDateInput },
              `Scoring date set to ${formatDisplayDate(scoringDateInput)}.`,
            )
          }
          onDateInputChange={setScoringDateInput}
          scoring={scoring}
        />
      )}

      {photoPreview ? (
        <PhotoLightbox onClose={() => setPhotoPreview(null)} url={photoPreview} />
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        active ? "bg-brand text-white" : "text-muted hover:bg-brand/10 hover:text-brand",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ActivitiesTab({
  activities,
  users,
  challengeDays,
  userFilter,
  dateFilter,
  statusFilter,
  setUserFilter,
  setDateFilter,
  setStatusFilter,
  onPreviewPhoto,
  onApprove,
  onDisapprove,
  onEdit,
  busyId,
}: {
  activities: AdminActivityRow[];
  users: AdminUserRow[];
  challengeDays: ChallengeDayOption[];
  userFilter: string;
  dateFilter: string;
  statusFilter: string;
  setUserFilter: (value: string) => void;
  setDateFilter: (value: string) => void;
  setStatusFilter: (value: string) => void;
  onPreviewPhoto: (url: string) => void;
  onApprove: (row: AdminActivityRow) => void;
  onDisapprove: (row: AdminActivityRow, note: string) => void;
  onEdit: (row: AdminActivityRow, steps: string, activityDate: string) => void;
  busyId: string | null;
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <FilterSelect
          label="Participant"
          onChange={setUserFilter}
          value={userFilter}
        >
          <option value="">All</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Date" onChange={setDateFilter} value={dateFilter}>
          <option value="">All</option>
          {challengeDays.map((day) => (
            <option key={day.date} value={day.date}>
              {formatDisplayDate(day.date)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Status"
          onChange={setStatusFilter}
          value={statusFilter}
        >
          <option value="">All</option>
          <option value="approved">Approved</option>
          <option value="disapproved">Disapproved</option>
        </FilterSelect>
      </div>

      {activities.length === 0 ? (
        <EmptyCard text="No activities match these filters." />
      ) : (
        activities.map((row) => (
          <ActivityAdminCard
            busy={busyId === row.id}
            challengeDays={challengeDays}
            key={row.id}
            onApprove={() => onApprove(row)}
            onDisapprove={(note) => onDisapprove(row, note)}
            onEdit={(steps, activityDate) => onEdit(row, steps, activityDate)}
            onPreviewPhoto={() => onPreviewPhoto(photoProxyUrl(row.photoUrl))}
            row={row}
          />
        ))
      )}
    </section>
  );
}

function ActivityAdminCard({
  row,
  challengeDays,
  onPreviewPhoto,
  onApprove,
  onDisapprove,
  onEdit,
  busy,
}: {
  row: AdminActivityRow;
  challengeDays: ChallengeDayOption[];
  onPreviewPhoto: () => void;
  onApprove: () => void;
  onDisapprove: (note: string) => void;
  onEdit: (steps: string, activityDate: string) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [steps, setSteps] = useState(String(row.steps));
  const [activityDate, setActivityDate] = useState(row.activityDate);
  const [note, setNote] = useState(row.adminNote ?? "");

  return (
    <article className="rounded-3xl border border-black/5 bg-surface p-4">
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
            <StatusBadge status={row.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {formatDisplayDate(row.activityDate)} · target{" "}
            {row.targetSteps.toLocaleString("en-IN")} ·{" "}
            <span className="font-medium text-foreground">
              {row.steps.toLocaleString("en-IN")} steps
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
            <span className="font-medium text-foreground">Date</span>
            <select
              className="field-input"
              onChange={(event) => setActivityDate(event.target.value)}
              value={activityDate}
            >
              {challengeDays.map((day) => (
                <option key={day.date} value={day.date}>
                  {formatDisplayDate(day.date)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <ActionButton
              disabled={busy}
              onClick={() => {
                onEdit(steps, activityDate);
                setEditing(false);
              }}
              variant="primary"
            >
              Save edit
            </ActionButton>
            <ActionButton onClick={() => setEditing(false)} variant="ghost">
              Cancel
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton disabled={busy} onClick={() => setEditing(true)} variant="ghost">
            Edit
          </ActionButton>
          {row.status === "approved" ? (
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
            <ActionButton disabled={busy} onClick={onApprove} variant="primary">
              Approve
            </ActionButton>
          )}
        </div>
      )}
    </article>
  );
}

function ParticipantsTab({
  users,
  currentAdminId,
  onToggleRole,
  onDelete,
  busyId,
}: {
  users: AdminUserRow[];
  currentAdminId: string;
  onToggleRole: (user: AdminUserRow) => void;
  onDelete: (user: AdminUserRow) => void;
  busyId: string | null;
}) {
  if (users.length === 0) {
    return <EmptyCard text="No participants yet." />;
  }

  return (
    <section className="space-y-2">
      {users.map((user) => (
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
              {user.mobile} · {user.role === "admin" ? "Admin" : "Participant"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              disabled={busyId === user.id}
              onClick={() => onToggleRole(user)}
              variant={user.role === "admin" ? "ghost" : "primary"}
            >
              {user.role === "admin" ? "Make participant" : "Make admin"}
            </ActionButton>
            {user.id !== currentAdminId ? (
              <ActionButton
                disabled={busyId === user.id}
                onClick={() => onDelete(user)}
                variant="danger"
              >
                Delete
              </ActionButton>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}

function ScoringTab({
  scoring,
  dateInput,
  busy,
  onDateInputChange,
  onRecompute,
  onSetDate,
  onClearOverride,
  onAdvanceDay,
}: {
  scoring: AdminScoringResult;
  dateInput: string;
  busy: boolean;
  onDateInputChange: (value: string) => void;
  onRecompute: () => void;
  onSetDate: () => void;
  onClearOverride: () => void;
  onAdvanceDay: () => void;
}) {
  const { state, standings, computedAt } = scoring;

  return (
    <section className="space-y-4">
      <article className="rounded-3xl border border-black/5 bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Scoring clock</h2>
        <p className="mt-2 text-sm text-muted">
          Star-of-day and week bonuses only apply after the scoring date passes each
          day or week. Use an override to test without waiting for real calendar time.
        </p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl bg-background px-4 py-3">
            <dt className="text-muted">Calendar today (IST)</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {formatDisplayDate(state.calendarToday)}
            </dd>
          </div>
          <div className="rounded-2xl bg-background px-4 py-3">
            <dt className="text-muted">Effective scoring date</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {formatDisplayDate(state.effectiveDate)}
              {state.usingOverride ? (
                <span className="ml-2 text-xs font-medium text-brand">override</span>
              ) : null}
            </dd>
          </div>
        </dl>

        <label className="mt-4 block space-y-1 text-sm">
          <span className="font-medium text-foreground">Scoring as-of date</span>
          <input
            className="field-input"
            onChange={(event) => onDateInputChange(event.target.value)}
            type="date"
            value={dateInput}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton disabled={busy} onClick={onRecompute} variant="primary">
            Recompute scores
          </ActionButton>
          <ActionButton disabled={busy} onClick={onSetDate} variant="ghost">
            Set date & recompute
          </ActionButton>
          <ActionButton disabled={busy} onClick={onAdvanceDay} variant="ghost">
            Advance 1 day
          </ActionButton>
          <ActionButton disabled={busy} onClick={onClearOverride} variant="ghost">
            Use calendar today
          </ActionButton>
        </div>

        <p className="mt-3 text-xs text-muted">
          Last computed {new Date(computedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
        </p>
      </article>

      <article className="rounded-3xl border border-black/5 bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Current standings</h2>
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
    </section>
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

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <select
        className="field-input"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        status === "approved"
          ? "bg-success/10 text-brand"
          : "bg-danger/10 text-danger",
      )}
    >
      {status}
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
  variant: "primary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        variant === "ghost" && "bg-background text-foreground hover:bg-brand/10",
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
    <div className="rounded-3xl border border-black/5 bg-surface p-8 text-center text-muted">
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
