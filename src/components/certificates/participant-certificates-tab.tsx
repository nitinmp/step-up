"use client";

import { useCallback, useEffect, useState } from "react";

import { CertificateIconCompact } from "@/components/certificates/certificate-icon-compact";
import {
  CertificateViewDrawer,
  type ViewableCertificate,
} from "@/components/certificates/certificate-view-drawer";
import type { CertificateGalleryItem } from "@/lib/certificate-gallery-service";
import type { CertificateLoadStage } from "@/lib/certificate-client-loading";
import {
  fetchGalleryCertificate,
  galleryItemDrawerTitle,
  resolveCertificateWithStages,
} from "@/lib/certificate-client-loading";
import { cn } from "@/lib/cn";

type ParticipantCertificatesTabProps = {
  initialStarDate?: string | null;
  initialWeekNo?: number | null;
};

export function ParticipantCertificatesTab({
  initialStarDate = null,
  initialWeekNo = null,
}: ParticipantCertificatesTabProps) {
  const [items, setItems] = useState<CertificateGalleryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [selected, setSelected] = useState<ViewableCertificate | null>(null);
  const [loadStage, setLoadStage] = useState<CertificateLoadStage | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelected(null);
    setOpenError(null);
    setLoadStage(null);
    setLoadingItemId(null);
    setDrawerTitle("");
  }, []);

  const openCertificate = useCallback(async (item: CertificateGalleryItem) => {
    setDrawerOpen(true);
    setDrawerTitle(galleryItemDrawerTitle(item));
    setSelected(null);
    setLoadingItemId(item.id);
    setLoadStage("fetching");
    setOpenError(null);

    try {
      const certificate = await resolveCertificateWithStages(
        () => fetchGalleryCertificate(item),
        setLoadStage,
      );
      setSelected(certificate);
    } catch (openErr) {
      setOpenError(
        openErr instanceof Error ? openErr.message : "Could not open certificate.",
      );
    } finally {
      setLoadingItemId(null);
      setLoadStage(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGallery() {
      setLoadingGallery(true);
      setError(null);

      try {
        const response = await fetch("/api/certificates/gallery");
        if (!response.ok) {
          throw new Error("Could not load certificates.");
        }

        const data = (await response.json()) as {
          items: CertificateGalleryItem[];
        };

        if (cancelled) {
          return;
        }

        setItems(data.items);

        const initialItem =
          (initialStarDate
            ? data.items.find(
                (item) =>
                  item.kind === "star-day" &&
                  item.activityDate === initialStarDate,
              )
            : null) ??
          (initialWeekNo
            ? data.items.find(
                (item) =>
                  (item.kind === "week-progress" ||
                    item.kind === "star-week") &&
                  item.weekNo === initialWeekNo,
              )
            : null);

        if (initialItem) {
          void openCertificate(initialItem);
        }
      } catch (loadErr) {
        if (!cancelled) {
          setError(
            loadErr instanceof Error
              ? loadErr.message
              : "Could not load certificates.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingGallery(false);
        }
      }
    }

    void loadGallery();

    return () => {
      cancelled = true;
    };
  }, [initialStarDate, initialWeekNo, openCertificate]);

  if (loadingGallery) {
    return (
      <div className="space-y-4" id="certificates">
        <LoadingCard text="Loading your certificates…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4" id="certificates">
        <ErrorCard message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4" id="certificates">
        <EmptyCard text="No certificates yet. Progress reports appear for started weeks. Star certificates show up when you earn them and they are generated." />
      </div>
    );
  }

  return (
    <div className="space-y-4" id="certificates">
      <p className="text-sm text-muted">
        Tap an icon to view, share, or download your certificate.
      </p>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <CertificateIconCompact
              item={item}
              loading={loadingItemId === item.id}
              onClick={() => void openCertificate(item)}
            />
          </li>
        ))}
      </ul>

      <CertificateViewDrawer
        certificate={selected}
        error={openError}
        loadStage={loadStage}
        loading={Boolean(loadStage)}
        onClose={closeDrawer}
        open={drawerOpen}
        title={drawerTitle}
      />
    </div>
  );
}

function LoadingCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-surface px-4 py-10 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-surface px-4 py-8 text-center text-sm text-muted">
      {text}
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-6 text-center">
      <p className="text-sm text-danger">{message}</p>
      <button
        className={cn(
          "mt-3 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark",
        )}
        onClick={onRetry}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}
