"use client";

import type { CertificateLoadStage } from "@/lib/certificate-client-loading";
import { CERTIFICATE_LOAD_STAGE_LABELS } from "@/lib/certificate-client-loading";
import { cn } from "@/lib/cn";

const STAGE_ORDER: CertificateLoadStage[] = ["fetching", "printing", "done"];

type CertificateLoadingAnimationProps = {
  stage: CertificateLoadStage;
};

export function CertificateLoadingAnimation({
  stage,
}: CertificateLoadingAnimationProps) {
  const stageIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
      <div
        aria-hidden="true"
        className={cn(
          "relative flex size-20 items-center justify-center rounded-full border-2 border-amber-300/70 bg-gradient-to-br from-yellow-100 via-amber-200 to-yellow-300 shadow-[0_8px_24px_rgba(251,191,36,0.35)]",
          stage === "done"
            ? "scale-100"
            : "animate-[certificate-pulse_1.4s_ease-in-out_infinite]",
        )}
      >
        <span className="text-3xl leading-none">
          {stage === "fetching" ? "📊" : stage === "printing" ? "🖨️" : "✅"}
        </span>
        {stage !== "done" ? (
          <span className="absolute inset-0 rounded-full border-2 border-amber-400/40 border-t-amber-600 animate-spin" />
        ) : null}
      </div>

      <p
        className="mt-6 text-lg font-semibold text-foreground animate-[certificate-fade-in_0.35s_ease-out]"
        key={stage}
      >
        {CERTIFICATE_LOAD_STAGE_LABELS[stage]}
      </p>

      <div className="mt-5 flex items-center gap-2">
        {STAGE_ORDER.map((step, index) => (
          <span
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index <= stageIndex
                ? "w-8 bg-gradient-to-r from-amber-400 to-yellow-500"
                : "w-2 bg-black/10",
            )}
            key={step}
          />
        ))}
      </div>

      <p className="mt-4 max-w-xs text-sm text-muted">
        {stage === "done"
          ? "Opening your certificate…"
          : "This usually takes a few seconds."}
      </p>
    </div>
  );
}
