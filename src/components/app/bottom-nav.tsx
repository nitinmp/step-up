"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

type BottomNavProps = {
  isAdmin: boolean;
};

const links: Array<{
  href: string;
  label: string;
  adminOnly?: boolean;
}> = [
  { href: "/activities", label: "Activities" },
  { href: "/log", label: "Log" },
  { href: "/leaderboard", label: "Board" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname();
  const visibleLinks = links.filter((link) => !link.adminOnly || isAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-black/5 bg-surface/95 backdrop-blur">
      <div
        className={cn(
          "mx-auto grid max-w-3xl gap-1 px-2 py-2",
          visibleLinks.length === 4 ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        {visibleLinks.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-2xl px-2 py-3 text-center text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                active
                  ? "font-semibold shadow-sm"
                  : "text-muted hover:bg-brand/10 hover:text-brand",
              )}
              data-active={active ? "" : undefined}
              data-slot="bottom-nav-link"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
