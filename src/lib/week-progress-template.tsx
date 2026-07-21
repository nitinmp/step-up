import { ImageResponse } from "next/og";

import type { Division } from "@/lib/divisions";
import { divisionLabel } from "@/lib/divisions";

export type WeekProgressDailyStep = {
  label: string;
  steps: number;
  targetSteps: number;
  metTarget: boolean;
};

export type WeekProgressBadge = {
  name: string;
  type: "perfect" | "streak" | "beast" | "star" | "pb";
};

export type WeekProgressCertificateInput = {
  recipientName: string;
  division: Division;
  weekNo: number;
  weekLabel: string;
  dateRange: string;
  targetLabel: string;
  targetLow: number;
  targetHigh: number;
  daysMet: number;
  totalDays: number;
  totalSteps: number;
  totalDistanceKm: number;
  dailySteps: WeekProgressDailyStep[];
  peakSteps: number;
  peakDayLabel: string;
  weekPoints: number;
  basePoints: number;
  pushPoints: number;
  consistencyPoints: number;
  starPoints: number;
  badgesUnlocked: WeekProgressBadge[];
  rank: number;
  rankDelta: number;
  currentStreak: number;
  headline: string;
  headlineSubline: string;
  pushNote: string;
};

/** Bump when the PNG layout changes so existing certs are regenerated. */
export const WEEK_PROGRESS_TEMPLATE_VERSION = 3;

const BRAND = {
  teal: "#0F6E56",
  tealDark: "#0A5443",
  gold: "#F2B705",
  goldLight: "#FFD24A",
  text: "#3A2E12",
  muted: "#8A7B4F",
  white: "#FFFFFF",
  tileBg: "#FFFFFF",
  bandFill: "rgba(15, 110, 86, 0.08)",
  bandStroke: "rgba(15, 110, 86, 0.25)",
};

const DIVISION_ACCENT: Record<Division, string> = {
  riser: "#C9931E",
  strider: "#3FAE86",
  elite: "#0F6E56",
};

const SANS = "Arial, Helvetica, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

function formatSteps(steps: number): string {
  return steps.toLocaleString("en-IN");
}

function formatKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg height="14" viewBox="0 0 14 14" width="14">
      <circle cx="7" cy="7" fill={color} r="7" />
      <path
        d="M4 7.2 L6.2 9.4 L10 5.2"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function FlameIcon({ color }: { color: string }) {
  return (
    <svg height="14" viewBox="0 0 14 14" width="14">
      <path
        d="M7 1.5 C7 1.5 4.5 4.5 4.5 7 C4.5 8.9 5.6 10.5 7 10.5 C8.4 10.5 9.5 8.9 9.5 7 C9.5 5.5 8.5 4 7 1.5 Z"
        fill={color}
      />
      <path
        d="M7 6.2 C7 6.2 6 7.2 6 8.2 C6 9 6.6 9.6 7 9.6 C7.4 9.6 8 9 8 8.2 C8 7.5 7.5 6.8 7 6.2 Z"
        fill="#FFD24A"
      />
    </svg>
  );
}

function BadgeIcon({ type, accent }: { type: WeekProgressBadge["type"]; accent: string }) {
  if (type === "perfect") {
    return <CheckIcon color={accent} />;
  }

  if (type === "beast" || type === "streak") {
    return <FlameIcon color={type === "beast" ? "#E85D4C" : accent} />;
  }

  return (
    <svg height="14" viewBox="0 0 14 14" width="14">
      <path
        d="M7 1.2 L8.6 5.2 L12.8 5.4 L9.6 8.1 L10.6 12.2 L7 10 L3.4 12.2 L4.4 8.1 L1.2 5.4 L5.4 5.2 Z"
        fill={accent}
      />
    </svg>
  );
}

function DailyStepsChart({
  dailySteps,
  targetLow,
  targetHigh,
  targetLabel,
  peakSteps,
}: {
  dailySteps: WeekProgressDailyStep[];
  targetLow: number;
  targetHigh: number;
  targetLabel: string;
  peakSteps: number;
}) {
  const chartHeight = 150;
  const maxSteps = Math.max(
    peakSteps,
    targetHigh,
    ...dailySteps.map((day) => day.steps),
    1,
  );

  const scaleHeight = (steps: number) =>
    Math.max(6, Math.round((steps / maxSteps) * chartHeight));

  const bandTopOffset =
    chartHeight - Math.round((targetHigh / maxSteps) * chartHeight);
  const bandBottomOffset =
    chartHeight - Math.round((targetLow / maxSteps) * chartHeight);
  const bandHeight = Math.max(10, bandBottomOffset - bandTopOffset);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: "20px 22px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            color: BRAND.text,
          }}
        >
          Daily steps
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 18,
            fontWeight: 700,
            color: BRAND.gold,
          }}
        >
          {`Peak ${formatSteps(peakSteps)}`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: chartHeight + 34,
          marginTop: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            right: 0,
            top: bandTopOffset,
            height: bandHeight,
            backgroundColor: BRAND.bandFill,
            border: `1px dashed ${BRAND.bandStroke}`,
            borderRadius: 8,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 8,
            top: bandTopOffset + 6,
            fontSize: 12,
            fontWeight: 600,
            color: BRAND.muted,
          }}
        >
          {targetLabel}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            width: "100%",
            height: chartHeight,
            marginTop: 0,
          }}
        >
          {dailySteps.map((day, index) => {
            const barHeight = scaleHeight(day.steps);
            const isPeak = day.steps === peakSteps && peakSteps > 0;

            return (
              <div
                key={`${day.label}-${index}`}
                style={{
                  display: "flex",
                  flex: 1,
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: chartHeight,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 44,
                    height: barHeight,
                    borderRadius: 10,
                    backgroundColor: isPeak ? BRAND.gold : BRAND.teal,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          marginTop: 8,
        }}
      >
        {dailySteps.map((day, index) => (
          <div
            key={`label-${day.label}-${index}`}
            style={{
              display: "flex",
              flex: 1,
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              color: BRAND.muted,
            }}
          >
            {day.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatTile({
  value,
  label,
  variant = "default",
}: {
  value: string;
  label: string;
  variant?: "default" | "points";
}) {
  const isPoints = variant === "points";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
        minWidth: 0,
        padding: "18px 16px",
        borderRadius: 20,
        backgroundColor: isPoints ? BRAND.teal : BRAND.tileBg,
        border: isPoints ? "none" : "1px solid rgba(58, 46, 18, 0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 800,
          color: isPoints ? BRAND.white : BRAND.text,
          fontFamily: SANS,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 6,
          fontSize: 14,
          fontWeight: 500,
          color: isPoints ? "rgba(255,255,255,0.88)" : BRAND.muted,
          fontFamily: SANS,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function PointsBreakdownBar({
  basePoints,
  pushPoints,
  consistencyPoints,
  starPoints,
  weekPoints,
}: {
  basePoints: number;
  pushPoints: number;
  consistencyPoints: number;
  starPoints: number;
  weekPoints: number;
}) {
  const segments = [
    { key: "base", value: basePoints, color: BRAND.teal, label: "Base" },
    { key: "push", value: pushPoints, color: BRAND.gold, label: "Push" },
    {
      key: "consistency",
      value: consistencyPoints,
      color: "#EA580C",
      label: "Consistency",
    },
    { key: "stars", value: starPoints, color: "#CBD5E1", label: "Stars" },
  ].filter((segment) => segment.value > 0);

  const total = weekPoints || 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: "22px 24px",
        borderRadius: 22,
        backgroundColor: BRAND.tileBg,
        border: "1px solid rgba(58, 46, 18, 0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: BRAND.muted,
            fontFamily: SANS,
          }}
        >
          POINTS BREAKDOWN
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 16,
            fontWeight: 700,
            color: BRAND.teal,
            fontFamily: SANS,
          }}
        >
          {`+${weekPoints} total`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          width: "100%",
          height: 16,
          marginTop: 16,
          borderRadius: 999,
          overflow: "hidden",
          backgroundColor: "rgba(58, 46, 18, 0.06)",
        }}
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            style={{
              display: "flex",
              width: `${(segment.value / total) * 100}%`,
              height: "100%",
              backgroundColor: segment.color,
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginTop: 14,
          width: "100%",
        }}
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: segment.color,
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 14,
                color: BRAND.text,
                fontFamily: SANS,
              }}
            >
              {`${segment.label} ${segment.value}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function renderWeekProgressCertificate(
  input: WeekProgressCertificateInput,
): Promise<ArrayBuffer> {
  const accent = DIVISION_ACCENT[input.division];
  const badgeList =
    input.badgesUnlocked.length > 0
      ? input.badgesUnlocked
      : [{ name: "Week logged", type: "perfect" as const }];

  const response = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, #FCF6E8 0%, #FBEFD2 100%)",
          color: BRAND.text,
          fontFamily: SANS,
          padding: "40px 48px 36px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: BRAND.teal,
              }}
            >
              STEP UP
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 4,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: BRAND.muted,
              }}
            >
              WEEKLY PROGRESS REPORT
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 16,
                fontWeight: 600,
                color: BRAND.text,
              }}
            >
              {input.dateRange}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 4,
                fontSize: 14,
                color: BRAND.muted,
              }}
            >
              {input.weekLabel}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            height: 2,
            marginTop: 18,
            backgroundColor: BRAND.gold,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            marginTop: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: BRAND.muted,
            }}
          >
            PREPARED FOR
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 8,
              fontSize: 46,
              fontWeight: 600,
              fontFamily: SERIF,
              color: BRAND.text,
              lineHeight: 1.05,
            }}
          >
            {input.recipientName}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 12,
              padding: "8px 18px",
              borderRadius: 999,
              backgroundColor: accent,
              color: BRAND.white,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            {`${divisionLabel(input.division).toUpperCase()} GROUP`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            marginTop: 20,
            padding: "22px 28px",
            borderRadius: 22,
            backgroundColor: BRAND.teal,
            color: BRAND.white,
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 800,
              fontFamily: SERIF,
              lineHeight: 1.15,
            }}
          >
            {input.headline}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 8,
              fontSize: 16,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.35,
            }}
          >
            {input.headlineSubline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            gap: 12,
            marginTop: 18,
          }}
        >
          <StatTile label="Total steps" value={formatSteps(input.totalSteps)} />
          <StatTile label="Distance" value={formatKm(input.totalDistanceKm)} />
          <StatTile
            label="Target days met"
            value={`${input.daysMet} / ${input.totalDays}`}
          />
          <StatTile
            label="Points this week"
            value={`+${input.weekPoints}`}
            variant="points"
          />
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            marginTop: 16,
            borderRadius: 22,
            backgroundColor: BRAND.tileBg,
            border: "1px solid rgba(58, 46, 18, 0.08)",
            overflow: "hidden",
          }}
        >
          <DailyStepsChart
            dailySteps={input.dailySteps}
            peakSteps={input.peakSteps}
            targetHigh={input.targetHigh}
            targetLabel={input.targetLabel}
            targetLow={input.targetLow}
          />
        </div>

        <div style={{ display: "flex", width: "100%", marginTop: 14 }}>
          <PointsBreakdownBar
            basePoints={input.basePoints}
            consistencyPoints={input.consistencyPoints}
            pushPoints={input.pushPoints}
            starPoints={input.starPoints}
            weekPoints={input.weekPoints}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            marginTop: 14,
            padding: "18px 22px",
            borderRadius: 22,
            backgroundColor: BRAND.tileBg,
            border: "1px solid rgba(58, 46, 18, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: BRAND.muted,
            }}
          >
            UNLOCKED THIS WEEK
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 12,
              width: "100%",
            }}
          >
            {badgeList.map((badge) => (
              <div
                key={badge.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 999,
                  backgroundColor:
                    badge.type === "perfect"
                      ? "rgba(15, 110, 86, 0.1)"
                      : badge.type === "beast"
                        ? "rgba(232, 93, 76, 0.12)"
                        : "rgba(242, 183, 5, 0.15)",
                  border: "1px solid rgba(58, 46, 18, 0.06)",
                }}
              >
                <BadgeIcon accent={accent} type={badge.type} />
                <div
                  style={{
                    display: "flex",
                    fontSize: 14,
                    fontWeight: 700,
                    color: BRAND.text,
                  }}
                >
                  {badge.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginTop: 16,
            gap: 16,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 14px",
                borderRadius: 999,
                backgroundColor: BRAND.tileBg,
                border: "1px solid rgba(58, 46, 18, 0.08)",
                fontSize: 14,
                fontWeight: 700,
                color: BRAND.text,
              }}
            >
              {`${divisionLabel(input.division)} #${input.rank}`}
              {input.rankDelta > 0 ? (
                <span style={{ display: "flex", marginLeft: 8, color: BRAND.teal }}>
                  {`▲ up ${input.rankDelta}`}
                </span>
              ) : null}
            </div>
            {input.currentStreak > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 14px",
                  borderRadius: 999,
                  backgroundColor: "rgba(242, 183, 5, 0.18)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: BRAND.text,
                }}
              >
                {`${input.currentStreak}-day streak alive`}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 420,
              fontSize: 12,
              lineHeight: 1.35,
              color: BRAND.muted,
              textAlign: "right",
            }}
          >
            {input.pushNote}
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    },
  );

  return response.arrayBuffer();
}
