export type Division = "elite" | "strider" | "riser";
export type Gender = "male" | "female" | "other";

export const DEFAULT_DIVISION: Division = "strider";

export const ALL_DIVISIONS: Division[] = ["strider", "elite", "riser"];

export function parseDivision(value: string | null | undefined): Division {
  if (value === "elite" || value === "riser") {
    return value;
  }
  return "strider";
}

export function parseGender(value: string | null | undefined): Gender | null {
  if (value === "male" || value === "female" || value === "other") {
    return value;
  }
  return null;
}

export function isValidGender(value: string): value is Gender {
  return value === "male" || value === "female" || value === "other";
}

export function isValidDivision(value: string): value is Division {
  return value === "elite" || value === "strider" || value === "riser";
}

export function divisionLabel(division: Division, plural = false): string {
  if (division === "elite") {
    return "Elite";
  }
  if (division === "riser") {
    return plural ? "Risers" : "Riser";
  }
  return plural ? "Striders" : "Strider";
}

export function divisionParticipantLabel(division: Division, count: number): string {
  return `#${count} ${divisionLabel(division, true)}`;
}
