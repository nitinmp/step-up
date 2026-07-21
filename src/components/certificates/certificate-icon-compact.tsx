"use client";

import type { CertificateGalleryItem } from "@/lib/certificate-gallery-service";
import { cn } from "@/lib/cn";

type CertificateIconCompactProps = {
  item: CertificateGalleryItem;
  loading?: boolean;
  onClick: () => void;
  className?: string;
};

export function CertificateIconCompact({
  item,
  loading = false,
  onClick,
  className,
}: CertificateIconCompactProps) {
  return (
    <button
      className={cn(
        "flex w-full flex-col items-center gap-1.5 rounded-2xl border border-black/5 bg-surface p-2 text-center transition hover:border-brand/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        loading && "cursor-wait opacity-70",
        className,
      )}
      disabled={loading}
      onClick={onClick}
      type="button"
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl text-xl shadow-sm",
          item.accent === "gold" && "bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400",
          item.accent === "amber" &&
            "bg-gradient-to-br from-yellow-100 via-amber-200 to-yellow-300",
          item.accent === "brand" && "bg-brand/10",
        )}
      >
        <span aria-hidden="true">{loading ? "…" : item.emoji}</span>
      </div>
      <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-foreground">
        {item.name}
      </p>
      <p className="line-clamp-2 text-[9px] leading-tight text-muted">
        {item.subtitle}
      </p>
      {item.detail ? (
        <p className="line-clamp-2 text-[9px] leading-tight text-brand">
          {item.detail}
        </p>
      ) : null}
    </button>
  );
}
