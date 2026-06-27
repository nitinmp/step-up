"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

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
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur">
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
              className={cn(
                "rounded-2xl px-2 py-3 text-center text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
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
