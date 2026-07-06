"use client";

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
  defaultDivision = "strider",
}: {
  defaultDivision?: Division;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeDivision = parseDivisionParam(
    searchParams.get("division") ?? defaultDivision,
  );

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
      value={activeDivision}
    >
      <TabsList className="grid h-11 w-full grid-cols-3 rounded-2xl bg-black/[0.06] p-1">
        {ALL_DIVISIONS.map((division) => (
          <TabsTrigger className={divisionTabClass} key={division} value={division}>
            {divisionLabel(division, true)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function useActiveDivision(defaultDivision: Division = "strider"): Division {
  const searchParams = useSearchParams();
  return parseDivisionParam(searchParams.get("division") ?? defaultDivision);
}
