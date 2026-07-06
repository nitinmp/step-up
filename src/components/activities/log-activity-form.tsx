"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { EditActivityContext } from "@/lib/activities-service";
import { photoProxyUrl } from "@/lib/blob-storage";
import { fireActivityLogConfetti } from "@/lib/confetti";
import { formatDisplayDate } from "@/lib/dates";
import { parseDistanceKm } from "@/lib/distance";

type SelectableDay = {
  date: string;
  weekNo: number;
  targetSteps: number;
};

export type LogSubmitResult = {
  basePoints: number;
  isStarOfDay: boolean;
  isBeast: boolean;
  total: number | null;
  rank: number | null;
  breakdown: {
    base: number;
    starDay: number;
    weekStar: number;
    consistency: number;
  } | null;
  mode: "create" | "edit";
};

type LogActivityFormProps = {
  defaultDate?: string;
  selectableDays?: SelectableDay[];
  loggedDates?: string[];
  challengeStartDate?: string;
  allowOpenChallengeLogging?: boolean;
  editActivity?: EditActivityContext;
  embedded?: boolean;
  onSuccess?: (result: LogSubmitResult) => void;
};

async function compressImage(file: File): Promise<File> {
  if (file.size <= 1_000_000 || !file.type.startsWith("image/")) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  if (!blob) {
    return file;
  }

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

export function LogActivityForm(props: LogActivityFormProps) {
  const router = useRouter();
  const isEdit = Boolean(props.editActivity);
  const editActivity = props.editActivity;

  const defaultDate = editActivity?.activityDate ?? props.defaultDate ?? "";
  const selectableDays = editActivity
    ? [editActivity.day]
    : (props.selectableDays ?? []);
  const loggedDates = props.loggedDates ?? [];
  const challengeStartDate =
    editActivity?.challengeStartDate ?? props.challengeStartDate ?? "";
  const allowOpenChallengeLogging =
    editActivity?.allowOpenChallengeLogging ??
    props.allowOpenChallengeLogging ??
    false;

  const [date, setDate] = useState(defaultDate);
  const [steps, setSteps] = useState(
    editActivity ? String(editActivity.steps) : "",
  );
  const [distanceKm, setDistanceKm] = useState(
    editActivity ? editActivity.distanceKm : "",
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    editActivity ? photoProxyUrl(editActivity.photoUrl) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LogSubmitResult | null>(null);

  const loggedDateSet = useMemo(() => new Set(loggedDates), [loggedDates]);

  const selectedDay = useMemo(
    () => selectableDays.find((day) => day.date === date),
    [date, selectableDays],
  );

  const hasPhoto = Boolean(photo || editActivity?.photoUrl);

  useEffect(() => {
    if (result && result.mode === "create") {
      fireActivityLogConfetti();
    }
  }, [result]);

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);

    if (!file) {
      setPhoto(null);
      setPreviewUrl(
        editActivity ? photoProxyUrl(editActivity.photoUrl) : null,
      );
      return;
    }

    const compressed = await compressImage(file);
    setPhoto(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isEdit && loggedDateSet.has(date)) {
      setError(
        "You already logged activity for this day. Each participant can log once per day.",
      );
      return;
    }

    if (!photo && !editActivity?.photoUrl) {
      setError("Attach a photo before logging activity.");
      return;
    }

    if (!selectedDay) {
      setError("Choose a valid challenge date.");
      return;
    }

    const stepsValue = Number(steps);
    if (!Number.isInteger(stepsValue) || stepsValue <= 0) {
      setError("Enter a whole number of steps greater than 0.");
      return;
    }

    try {
      const distanceValue = parseDistanceKm(distanceKm);
      if (distanceValue <= 0) {
        setError("Enter distance greater than 0 km.");
        return;
      }
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Enter a valid distance in km.",
      );
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("steps", steps);
    formData.append("distanceKm", distanceKm);

    if (isEdit && editActivity) {
      if (photo) {
        formData.append("photo", photo);
      }

      const response = await fetch(`/api/activities/${editActivity.activityId}`, {
        method: "PATCH",
        body: formData,
      });

      const payload = (await response.json()) as {
        basePoints?: number;
        isBeast?: boolean;
        error?: string;
      };
      setLoading(false);

      if (!response.ok) {
        setError(payload.error ?? "Could not save activity.");
        return;
      }

      const editResult: LogSubmitResult = {
        basePoints: payload.basePoints ?? 0,
        isStarOfDay: false,
        isBeast: payload.isBeast ?? false,
        total: null,
        rank: null,
        breakdown: null,
        mode: "edit",
      };

      if (props.onSuccess) {
        props.onSuccess(editResult);
        return;
      }

      setResult(editResult);
      return;
    }

    if (!photo) {
      setLoading(false);
      setError("Attach a photo before logging activity.");
      return;
    }

    formData.append("date", date);
    formData.append("photo", photo);

    const response = await fetch("/api/activities", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as LogSubmitResult & { error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not log activity.");
      return;
    }

    const createResult: LogSubmitResult = {
      basePoints: payload.basePoints,
      isStarOfDay: payload.isStarOfDay,
      isBeast: payload.isBeast,
      total: payload.total,
      rank: payload.rank,
      breakdown: payload.breakdown ?? null,
      mode: "create",
    };

    if (props.onSuccess) {
      props.onSuccess(createResult);
      return;
    }

    setResult(createResult);
  }

  if (result) {
    if (result.mode === "edit") {
      return (
        <section className="rounded-3xl border border-black/5 bg-surface p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-brand">Updated</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            +{result.basePoints} base points
          </h1>
          {result.isBeast ? (
            <p className="mt-2 font-medium text-foreground">🔥 Beast Mode unlocked</p>
          ) : null}
          <p className="mt-4 text-sm text-muted">
            Your changes were saved and submitted for admin review again.
          </p>
          <button
            className="mt-6 w-full rounded-2xl bg-brand px-4 py-3 text-base font-semibold text-white"
            onClick={() => router.push("/activities")}
            type="button"
          >
            View activities
          </button>
        </section>
      );
    }

    const bonusPoints =
      (result.breakdown?.starDay ?? 0) +
      (result.breakdown?.weekStar ?? 0) +
      (result.breakdown?.consistency ?? 0);

    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-brand">Logged</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">
          +{result.basePoints} base points
        </h1>
        {bonusPoints > 0 ? (
          <div className="mt-3 space-y-1 text-sm text-muted">
            {result.breakdown?.starDay ? (
              <p>+{result.breakdown.starDay} Star of the Day</p>
            ) : null}
            {result.breakdown?.weekStar ? (
              <p>+{result.breakdown.weekStar} Star of the Week</p>
            ) : null}
            {result.breakdown?.consistency ? (
              <p>+{result.breakdown.consistency} consistency bonus</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-muted">
            {result.isStarOfDay
              ? "Nice — Star of the Day so far (after approval)!"
              : "Submitted for admin review. Points count after approval."}
          </p>
        )}
        {result.isBeast ? (
          <p className="mt-2 font-medium text-foreground">🔥 Beast Mode unlocked</p>
        ) : null}
        <p className="mt-4 text-sm text-muted">
          Submitted for admin review. Points count after approval.
        </p>
        {result.total !== null ? (
          <p className="mt-4 text-sm text-muted">
            Total score {result.total}
            {result.rank ? ` · Rank #${result.rank}` : ""}
            {bonusPoints > 0 ? " (base + bonuses)" : ""}
          </p>
        ) : null}
        <button
          className="mt-6 w-full rounded-2xl bg-brand px-4 py-3 text-base font-semibold text-white"
          onClick={() => router.push("/activities")}
          type="button"
        >
          View activities
        </button>
      </section>
    );
  }

  if (!props.embedded && !isEdit && selectableDays.length === 0) {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6">
        <h1 className="text-2xl font-semibold text-foreground">Log activity</h1>
        <p className="mt-3 text-muted">
          {loggedDates.length > 0
            ? "You have already logged every available day. Each participant can log once per day — edit a pending entry from Activities if needed."
            : allowOpenChallengeLogging
              ? "No challenge days are available to log right now."
              : `You can only log activity for today. Logging opens on ${formatDisplayDate(challengeStartDate)} if the challenge has not started yet.`}
        </p>
      </section>
    );
  }

  const form = (
      <form className={props.embedded ? "space-y-4 pb-2" : "mt-6 space-y-4"} onSubmit={handleSubmit}>
        {isEdit && selectedDay ? (
          <div className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Date</span>
            <p className="field-input bg-background text-foreground">
              {formatDisplayDate(selectedDay.date)} · W{selectedDay.weekNo} · target{" "}
              {selectedDay.targetSteps.toLocaleString("en-IN")}
            </p>
          </div>
        ) : (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Date</span>
            <select
              className="field-input"
              onChange={(event) => setDate(event.target.value)}
              required
              value={date}
            >
              {selectableDays.map((day) => (
                <option key={day.date} value={day.date}>
                  {formatDisplayDate(day.date)} · W{day.weekNo} · target{" "}
                  {day.targetSteps.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Steps</span>
            <input
              className="field-input"
              inputMode="numeric"
              min={1}
              onChange={(event) => setSteps(event.target.value)}
              placeholder="e.g. 10432"
              required
              step={1}
              type="number"
              value={steps}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Distance (km)</span>
            <input
              className="field-input"
              inputMode="decimal"
              min={0}
              onChange={(event) => setDistanceKm(event.target.value)}
              placeholder="e.g. 5.43"
              required
              step={0.001}
              type="number"
              value={distanceKm}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Photo</span>
          <p className="text-xs text-muted">
            {isEdit
              ? "Choose a new screenshot to replace the current one, or keep the photo already attached."
              : "Choose a screenshot from your fitness app (photo library)."}
          </p>
          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
            className="w-full rounded-2xl border border-dashed border-black/15 bg-background px-4 py-3 text-sm"
            onChange={handlePhotoChange}
            required={!isEdit}
            type="file"
          />
          {previewUrl ? (
            <div className="overflow-hidden rounded-2xl border border-black/10">
              <Image
                alt="Activity preview"
                className="h-48 w-full object-cover"
                height={192}
                src={previewUrl}
                unoptimized
                width={400}
              />
            </div>
          ) : null}
        </label>

        {error ? (
          <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-2xl bg-brand px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          disabled={loading || !hasPhoto}
          type="submit"
        >
          {loading
            ? isEdit
              ? "Saving…"
              : "Uploading…"
            : isEdit
              ? "Save changes"
              : "Log activity"}
        </button>
      </form>
  );

  if (props.embedded) {
    return (
      <div>
        <p className="mb-4 text-sm text-muted">
          {isEdit
            ? "Update steps, distance, or screenshot while your entry is awaiting approval."
            : "One entry per day. Add steps and distance from your fitness app screenshot."}
        </p>
        {form}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-black/5 bg-surface p-6">
      <h1 className="text-2xl font-semibold text-foreground">
        {isEdit ? "Edit activity" : "Log activity"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {isEdit
          ? "Update steps, distance, or screenshot while your entry is awaiting approval."
          : "One entry per day. Add steps and distance from your fitness app screenshot."}
      </p>
      {form}
    </section>
  );
}
