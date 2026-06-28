"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { photoProxyUrl } from "@/lib/blob-storage";
import { getInitials } from "@/lib/user-display";

type ProfileUser = {
  id: string;
  name: string;
  mobile: string;
  role: string;
  profileImageUrl: string | null;
};

async function compressImage(file: File): Promise<File> {
  if (file.size <= 1_000_000 || !file.type.startsWith("image/")) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const maxEdge = 800;
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

export function ProfileForm() {
  const router = useRouter();
  const { update } = useSession();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const response = await fetch("/api/me");
      const payload = (await response.json()) as {
        user?: ProfileUser;
        error?: string;
      };

      setLoading(false);

      if (!response.ok || !payload.user) {
        setError(payload.error ?? "Could not load profile.");
        return;
      }

      setProfile(payload.user);
      setName(payload.user.name);
    }

    void loadProfile();
  }, []);

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    setRemovePhoto(false);

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
    setMessage(null);
    setSaving(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    if (photo) {
      formData.append("photo", photo);
    }
    if (removePhoto) {
      formData.append("removePhoto", "true");
    }

    const response = await fetch("/api/me", {
      method: "PATCH",
      body: formData,
    });

    const payload = (await response.json()) as {
      user?: ProfileUser;
      error?: string;
    };

    setSaving(false);

    if (!response.ok || !payload.user) {
      setError(payload.error ?? "Could not save profile.");
      return;
    }

    setProfile(payload.user);
    setPhoto(null);
    setPreviewUrl(null);
    setRemovePhoto(false);
    setMessage("Profile updated.");

    await update({
      user: {
        name: payload.user.name,
        profileImageUrl: payload.user.profileImageUrl,
      },
    });

    router.refresh();
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6 text-muted">
        Loading profile…
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6 text-danger">
        {error ?? "Profile unavailable."}
      </section>
    );
  }

  const currentImageUrl =
    previewUrl ??
    (profile.profileImageUrl && !removePhoto
      ? photoProxyUrl(profile.profileImageUrl)
      : null);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="rounded-3xl border border-black/5 bg-surface p-6">
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="mt-2 text-sm text-muted">
          Update your display name and profile photo. Mobile number cannot be changed here.
        </p>

        <div className="mt-6 flex items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-full bg-brand/10">
            {currentImageUrl ? (
              <Image
                alt={profile.name}
                className="object-cover"
                fill
                sizes="80px"
                src={currentImageUrl}
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-brand">
                {getInitials(profile.name)}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="inline-block cursor-pointer rounded-full bg-brand px-4 py-2 text-sm font-medium text-white">
              Choose photo
              <input
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                type="file"
              />
            </label>
            {profile.profileImageUrl && !photo ? (
              <button
                className="block text-sm font-medium text-danger"
                onClick={() => {
                  setRemovePhoto(true);
                  setPreviewUrl(null);
                  setPhoto(null);
                }}
                type="button"
              >
                Remove photo
              </button>
            ) : null}
          </div>
        </div>

        <label className="mt-6 block space-y-1 text-sm">
          <span className="font-medium text-foreground">Name</span>
          <input
            className="field-input"
            maxLength={60}
            minLength={2}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>

        <label className="mt-4 block space-y-1 text-sm">
          <span className="font-medium text-foreground">Mobile</span>
          <input
            className="field-input bg-background text-muted"
            disabled
            value={profile.mobile}
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-2xl bg-success/10 px-4 py-3 text-sm text-brand">
            {message}
          </p>
        ) : null}

        <button
          className="mt-6 w-full rounded-2xl bg-brand px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </section>
    </form>
  );
}
