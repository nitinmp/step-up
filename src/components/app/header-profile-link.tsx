"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { photoProxyUrl } from "@/lib/blob-storage";
import { getInitials } from "@/lib/user-display";

type HeaderProfileLinkProps = {
  name: string;
  profileImageUrl: string | null;
  photoSrc?: string;
};

export function HeaderProfileLink({
  name: initialName,
  profileImageUrl: initialProfileImageUrl,
  photoSrc: initialPhotoSrc,
}: HeaderProfileLinkProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const active = pathname === "/profile" || pathname.startsWith("/profile/");

  const name = session?.user?.name ?? initialName;
  const profileImageUrl =
    session?.user?.profileImageUrl ?? initialProfileImageUrl;
  const photoSrc = profileImageUrl
    ? photoProxyUrl(profileImageUrl)
    : initialPhotoSrc;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label="View profile"
      className={cn(
        "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        active
          ? "ring-2 ring-brand ring-offset-2 ring-offset-surface"
          : "ring-1 ring-black/10 hover:ring-brand/30",
      )}
      href="/profile"
    >
      {profileImageUrl && photoSrc ? (
        <Image
          alt=""
          className="object-cover"
          fill
          key={profileImageUrl}
          sizes="36px"
          src={photoSrc}
          unoptimized
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-brand">
          {getInitials(name)}
        </span>
      )}
    </Link>
  );
}
