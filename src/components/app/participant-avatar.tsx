import Image from "next/image";

import { cn } from "@/lib/cn";
import { photoProxyUrl } from "@/lib/blob-storage";
import { getInitials } from "@/lib/user-display";

type ParticipantAvatarProps = {
  name: string;
  profileImageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: { box: "h-8 w-8", text: "text-xs", img: "32px" },
  md: { box: "h-10 w-10", text: "text-sm", img: "40px" },
  lg: { box: "h-14 w-14", text: "text-lg", img: "56px" },
} as const;

export function ParticipantAvatar({
  name,
  profileImageUrl,
  size = "md",
  className,
}: ParticipantAvatarProps) {
  const dimensions = sizeClasses[size];

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-brand/10",
        dimensions.box,
        className,
      )}
    >
      {profileImageUrl ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes={dimensions.img}
          src={photoProxyUrl(profileImageUrl)}
          unoptimized
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center font-semibold text-brand",
            dimensions.text,
          )}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
