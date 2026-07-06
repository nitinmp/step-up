"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ALL_DIVISIONS, divisionLabel, type Division } from "@/lib/divisions";
import { cn } from "@/lib/cn";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const divisionTabClass = cn(
  "h-full flex-1 rounded-xl px-2 py-2 text-sm font-medium text-muted shadow-none transition-all sm:px-4",
  "data-[active]:bg-surface data-[active]:font-semibold data-[active]:text-foreground data-[active]:shadow-sm",
);

export function parseDivisionParam(value: string | null): Division {
  if (value === "elite" || value === "riser") {
    return value;
  }
  return "strider";
}

export function DivisionSubTabs({
  divisions = ALL_DIVISIONS,
  defaultDivision = "strider",
}: {
  divisions?: Division[];
  defaultDivision?: Division;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visibleDivisions = divisions.length > 0 ? divisions : ALL_DIVISIONS;
  const activeDivision = parseDivisionParam(
    searchParams.get("division") ?? defaultDivision,
  );
  const resolvedDivision = visibleDivisions.includes(activeDivision)
    ? activeDivision
    : (visibleDivisions.includes(defaultDivision)
        ? defaultDivision
        : visibleDivisions[0] ?? "strider");

  useEffect(() => {
    if (resolvedDivision === activeDivision) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (resolvedDivision === "strider") {
      params.delete("division");
    } else {
      params.set("division", resolvedDivision);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [
    activeDivision,
    pathname,
    resolvedDivision,
    router,
    searchParams,
  ]);

  function selectDivision(division: Division) {
    const params = new URLSearchParams(searchParams.toString());
    if (division === "strider") {
      params.delete("division");
    } else {
      params.set("division", division);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Tabs
      onValueChange={(value) => selectDivision(parseDivisionParam(value))}
      value={resolvedDivision}
    >
      <TabsList
        className={cn(
          "grid h-11 w-full rounded-2xl bg-black/[0.06] p-1",
          visibleDivisions.length === 2 ? "grid-cols-2" : "grid-cols-3",
        )}
      >
        {visibleDivisions.map((division) => (
          <TabsTrigger className={divisionTabClass} key={division} value={division}>
            {divisionLabel(division, true)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function useActiveDivision(
  defaultDivision: Division = "strider",
  divisions: Division[] = ALL_DIVISIONS,
): Division {
  const searchParams = useSearchParams();
  const activeDivision = parseDivisionParam(
    searchParams.get("division") ?? defaultDivision,
  );
  const visibleDivisions = divisions.length > 0 ? divisions : ALL_DIVISIONS;

  if (visibleDivisions.includes(activeDivision)) {
    return activeDivision;
  }

  if (visibleDivisions.includes(defaultDivision)) {
    return defaultDivision;
  }

  return visibleDivisions[0] ?? "strider";
}
