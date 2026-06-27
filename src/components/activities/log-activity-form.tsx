"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { formatDisplayDate } from "@/lib/dates";

type SelectableDay = {
  date: string;
  weekNo: number;
  targetSteps: number;
};

type LogActivityFormProps = {
  defaultDate: string;
  selectableDays: SelectableDay[];
  loggedDates: string[];
};

type SubmitResult = {
  basePoints: number;
  isStarOfDay: boolean;
  isBeast: boolean;
  total: number | null;
  rank: number | null;
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

export function LogActivityForm({
  defaultDate,
  selectableDays,
  loggedDates,
}: LogActivityFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [steps, setSteps] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const selectedDay = useMemo(
    () => selectableDays.find((day) => day.date === date),
    [date, selectableDays],
  );

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);

    if (!file) {
      setPhoto(null);
      setPreviewUrl(null);
      return;
    }

    const compressed = await compressImage(file);
    setPhoto(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!photo) {
      setError("Attach a photo before logging steps.");
      return;
    }

    if (!selectedDay) {
      setError("Choose a valid challenge date.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("date", date);
    formData.append("steps", steps);
    formData.append("photo", photo);

    const response = await fetch("/api/activities", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as SubmitResult & { error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not log activity.");
      return;
    }

    setResult({
      basePoints: payload.basePoints,
      isStarOfDay: payload.isStarOfDay,
      isBeast: payload.isBeast,
      total: payload.total,
      rank: payload.rank,
    });
  }

  if (result) {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-brand">Logged</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">
          +{result.basePoints} points today
        </h1>
        <p className="mt-3 text-muted">
          {result.isStarOfDay
            ? "Nice — Star of the Day so far!"
            : "Steps saved and counted toward your score."}
        </p>
        {result.isBeast ? (
          <p className="mt-2 font-medium text-foreground">🔥 Beast Mode unlocked</p>
        ) : null}
        {result.total !== null ? (
          <p className="mt-4 text-sm text-muted">
            Total score {result.total}
            {result.rank ? ` · Rank #${result.rank}` : ""}
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

  if (selectableDays.length === 0) {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6">
        <h1 className="text-2xl font-semibold text-foreground">Log steps</h1>
        <p className="mt-3 text-muted">
          {loggedDates.length > 0
            ? "You have already logged every available day. Ask an admin to edit an entry if needed."
            : "No challenge days are available to log right now."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-black/5 bg-surface p-6">
      <h1 className="text-2xl font-semibold text-foreground">Log steps</h1>
      <p className="mt-2 text-sm text-muted">
        Photo proof is required. Targets climb each week.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Date</span>
          <select
            className="w-full rounded-2xl border border-black/10 bg-background px-4 py-3 text-base outline-none ring-brand focus:ring-2"
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

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Steps</span>
          <input
            className="w-full rounded-2xl border border-black/10 bg-background px-4 py-3 text-base outline-none ring-brand focus:ring-2"
            inputMode="numeric"
            min={0}
            onChange={(event) => setSteps(event.target.value)}
            placeholder="Steps walked"
            required
            type="number"
            value={steps}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Photo</span>
          <input
            accept="image/*"
            capture="environment"
            className="w-full rounded-2xl border border-dashed border-black/15 bg-background px-4 py-3 text-sm"
            onChange={handlePhotoChange}
            required
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
          disabled={loading || !photo}
          type="submit"
        >
          {loading ? "Uploading…" : "Log steps"}
        </button>
      </form>
    </section>
  );
}
