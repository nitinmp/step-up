"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { DivisionBadge } from "@/components/app/division-badge";
import { CertificateLoadingAnimation } from "@/components/certificates/certificate-loading-animation";
import { BottomDrawer } from "@/components/ui/bottom-drawer";
import { photoProxyUrl } from "@/lib/blob-storage";
import type { CertificateLoadStage } from "@/lib/certificate-client-loading";
import type {
  StarDayCertificate,
  StarWeekCertificate,
  WeekProgressCertificate,
} from "@/lib/certificate-service";
import { formatDisplayDate } from "@/lib/dates";
import { divisionLabel } from "@/lib/divisions";
import { cn } from "@/lib/cn";

export type ViewableCertificate =
  | StarDayCertificate
  | WeekProgressCertificate
  | StarWeekCertificate;

type CertificateViewDrawerProps = {
  open: boolean;
  onClose: () => void;
  certificate: ViewableCertificate | null;
  title?: string;
  loading?: boolean;
  loadStage?: CertificateLoadStage | null;
  error?: string | null;
};

export function CertificateViewDrawer({
  open,
  onClose,
  certificate,
  title,
  loading = false,
  loadStage = null,
  error = null,
}: CertificateViewDrawerProps) {
  const [shareState, setShareState] = useState<
    "idle" | "sharing" | "copied"
  >("idle");

  useEffect(() => {
    setShareState("idle");
  }, [certificate?.id]);

  const meta = certificate ? getCertificateMeta(certificate) : null;
  const drawerTitle =
    title ?? meta?.drawerTitle ?? (loading ? "Certificate" : "Certificate");

  async function handleShare() {
    if (!certificate || !meta || shareState === "sharing") {
      return;
    }

    setShareState("sharing");

    try {
      const response = await fetch(photoProxyUrl(certificate.imageUrl));
      if (!response.ok) {
        throw new Error("Could not load certificate image.");
      }

      const blob = await response.blob();
      const file = new File([blob], meta.downloadName, {
        type: blob.type || "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: meta.shareText,
          title: meta.shareTitle,
        });
        setShareState("idle");
        return;
      }

      if (navigator.share) {
        await navigator.share({
          text: meta.shareText,
          title: meta.shareTitle,
        });
        setShareState("idle");
        return;
      }

      await navigator.clipboard.writeText(meta.shareText);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2000);
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") {
        setShareState("idle");
        return;
      }

      try {
        await navigator.clipboard.writeText(meta.shareText);
        setShareState("copied");
        window.setTimeout(() => setShareState("idle"), 2000);
      } catch {
        setShareState("idle");
      }
    }
  }

  return (
    <BottomDrawer onClose={onClose} open={open} title={drawerTitle}>
      {loading && loadStage ? (
        <CertificateLoadingAnimation stage={loadStage} />
      ) : error ? (
        <div className="space-y-4 px-1 py-6">
          <p className="text-sm text-danger">{error}</p>
          <button
            className="inline-flex w-full items-center justify-center rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      ) : certificate && meta ? (
        <div className="space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-black/10 bg-white">
            <Image
              alt={meta.imageAlt}
              className="object-contain"
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              src={photoProxyUrl(certificate.imageUrl)}
              unoptimized
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">{meta.primaryLine}</p>
              <p className="text-sm text-muted">{meta.secondaryLine}</p>
            </div>
            {"division" in certificate ? (
              <DivisionBadge division={certificate.division} />
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              className={cn(
                "inline-flex flex-1 items-center justify-center rounded-full border border-black/10 px-4 py-3 text-sm font-semibold transition hover:bg-brand/5",
                shareState === "sharing" && "cursor-wait opacity-70",
              )}
              disabled={shareState === "sharing"}
              onClick={() => void handleShare()}
              type="button"
            >
              {shareState === "sharing"
                ? "Sharing…"
                : shareState === "copied"
                  ? "Copied!"
                  : "Share"}
            </button>
            <a
              className="inline-flex flex-1 items-center justify-center rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
              download={meta.downloadName}
              href={photoProxyUrl(certificate.imageUrl)}
            >
              Download PNG
            </a>
          </div>
        </div>
      ) : null}
    </BottomDrawer>
  );
}

function getCertificateMeta(certificate: ViewableCertificate) {
  if (certificate.kind === "star-day") {
    return {
      drawerTitle: `${formatDisplayDate(certificate.activityDate)} certificate`,
      imageAlt: `Star of the Day certificate for ${formatDisplayDate(certificate.activityDate)}`,
      primaryLine: `${certificate.steps.toLocaleString("en-IN")} steps`,
      secondaryLine: `${divisionLabel(certificate.division)} division`,
      downloadName: `star-day-${certificate.activityDate}.png`,
      shareTitle: "Step Up — Star of the Day",
      shareText: `I was Star of the Day in Step Up on ${formatDisplayDate(certificate.activityDate)}! ${certificate.steps.toLocaleString("en-IN")} steps in the ${divisionLabel(certificate.division)} division. ⭐`,
    };
  }

  if (certificate.kind === "star-week") {
    return {
      drawerTitle: `Week ${certificate.weekNo} Star of the Week`,
      imageAlt: `Star of the Week certificate for week ${certificate.weekNo}`,
      primaryLine: `${certificate.steps.toLocaleString("en-IN")} steps this week`,
      secondaryLine: "Star of the Week award",
      downloadName: `star-week-${certificate.weekNo}.png`,
      shareTitle: "Step Up — Star of the Week",
      shareText: `I was Star of the Week in Step Up for Week ${certificate.weekNo}! ${certificate.steps.toLocaleString("en-IN")} steps. 🏆`,
    };
  }

  if (certificate.kind === "week-progress") {
    return {
      drawerTitle: `Week ${certificate.weekNo} progress report`,
      imageAlt: `Week ${certificate.weekNo} progress report`,
      primaryLine: `${certificate.daysMet}/${certificate.totalDays} target days met`,
      secondaryLine: `${certificate.totalSteps.toLocaleString("en-IN")} steps · ${certificate.totalDistanceKm.toFixed(2)} km`,
      downloadName: `week-${certificate.weekNo}-progress-report.png`,
      shareTitle: "Step Up — Week Progress Report",
      shareText: `My Week ${certificate.weekNo} progress in Step Up: ${certificate.daysMet}/${certificate.totalDays} target days, ${certificate.totalSteps.toLocaleString("en-IN")} steps. 📈`,
    };
  }

  throw new Error(`Unknown certificate kind: ${(certificate as ViewableCertificate).kind}`);
}
