import type { Division } from "@/lib/divisions";
import { divisionLabel } from "@/lib/divisions";
import { cn } from "@/lib/cn";

export function HeaderDivisionChip({ division }: { division: Division }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
        division === "elite" && "bg-brand/15 text-brand",
        division === "strider" && "bg-emerald-100 text-emerald-800",
        division === "riser" && "bg-amber-100 text-amber-800",
      )}
    >
      {divisionLabel(division)}
    </span>
  );
}
