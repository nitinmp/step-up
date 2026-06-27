import Link from "next/link";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
          SU
        </div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Step Up
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>

      <Card>
        <CardHeader className="sr-only">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">{children}</CardContent>
      </Card>

      <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
    </div>
  );
}

export function AuthFooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="font-medium text-primary hover:underline" href={href}>
      {children}
    </Link>
  );
}
