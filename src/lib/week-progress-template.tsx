import { ImageResponse } from "next/og";

import type { Division } from "@/lib/divisions";
import { divisionLabel } from "@/lib/divisions";

export type WeekProgressDailyStep = {
  label: string;
  steps: number;
  targetSteps: number;
  metTarget: boolean;
};

export type WeekProgressCertificateInput = {
  recipientName: string;
  division: Division;
  weekNo: number;
  dateRange: string;
  targetLabel: string;
  daysMet: number;
  totalDays: number;
  totalSteps: number;
  totalDistanceKm: number;
  dailySteps: WeekProgressDailyStep[];
};

const CHALLENGE_NAME = "Step Up - July 26";

/** Bump when the PNG layout changes so existing certs are regenerated. */
export const WEEK_PROGRESS_TEMPLATE_VERSION = 2;

type WeekTheme = {
  background: string;
  text: string;
  accentPrimary: string;
  accentSecondary: string;
  lineColor: string;
  cardBlue: string;
  cardBlueDark: string;
  cardTrack: string;
};

const WEEK_THEMES: Record<Division, WeekTheme> = {
  elite: {
    background:
      "radial-gradient(circle at 50% 35%, #fffdf7 0%, #f7efd8 42%, #ead9a8 100%)",
    text: "#1b2a4a",
    accentPrimary: "#b8860b",
    accentSecondary: "#1b2a4a",
    lineColor: "#1b2a4a",
    cardBlue: "#dbeafe",
    cardBlueDark: "#2563eb",
    cardTrack: "#eff6ff",
  },
  strider: {
    background:
      "radial-gradient(circle at 50% 40%, #ffffff 0%, #f3ecff 45%, #e8dcff 100%)",
    text: "#1b2a4a",
    accentPrimary: "#b83280",
    accentSecondary: "#6b2d7b",
    lineColor: "#1b2a4a",
    cardBlue: "#dbeafe",
    cardBlueDark: "#2563eb",
    cardTrack: "#eff6ff",
  },
  riser: {
    background:
      "radial-gradient(circle at 50% 38%, #fffdf8 0%, #fff1d6 44%, #ffd89a 100%)",
    text: "#5c2f00",
    accentPrimary: "#ea580c",
    accentSecondary: "#c2410c",
    lineColor: "#7c3a12",
    cardBlue: "#dbeafe",
    cardBlueDark: "#2563eb",
    cardTrack: "#eff6ff",
  },
};

function displayRecipientName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "participant";
  }

  return trimmed.toLowerCase();
}

function formatSteps(steps: number): string {
  return steps.toLocaleString("en-IN");
}

function formatKm(km: number): string {
  return km.toFixed(1);
}

function DailyBarChart({
  dailySteps,
  theme,
}: {
  dailySteps: WeekProgressDailyStep[];
  theme: WeekTheme;
}) {
  const maxSteps = Math.max(...dailySteps.map((day) => day.steps), 1);
  const peakDay = dailySteps.reduce(
    (best, day) => (day.steps > best.steps ? day : best),
    dailySteps[0] ?? { label: "", steps: 0, targetSteps: 0, metTarget: false },
  );
  const chartHeight = 150;
  const barWidth = 34;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "28px 32px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            color: theme.text,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Daily steps
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 6,
            fontSize: 22,
            fontWeight: 600,
            color: theme.accentPrimary,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {`${formatSteps(peakDay.steps)} steps peak`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: 28,
          height: chartHeight + 48,
          width: "100%",
        }}
      >
        {dailySteps.map((day) => {
          const fillHeight = Math.max(
            8,
            Math.round((day.steps / maxSteps) * chartHeight),
          );
          const isPeak = day.steps === peakDay.steps && day.steps > 0;

          return (
            <div
              key={day.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: barWidth + 12,
              }}
            >
              {isPeak ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginBottom: 10,
                    padding: "8px 12px",
                    borderRadius: 16,
                    backgroundColor: "#ffffff",
                    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 16,
                      fontWeight: 700,
                      color: theme.text,
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    {formatSteps(day.steps)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 13,
                      color: "#64748b",
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    Steps
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    height: 46,
                    marginBottom: 10,
                  }}
                />
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  width: barWidth,
                  height: chartHeight,
                  borderRadius: 999,
                  backgroundColor: theme.cardTrack,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: "#cbd5e1",
                    position: "absolute",
                    top: 8,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: fillHeight,
                    borderRadius: 999,
                    backgroundColor: day.metTarget
                      ? theme.cardBlueDark
                      : "#93c5fd",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#64748b",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                {day.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WalkingSummaryCard({
  totalSteps,
  totalDistanceKm,
  progressPct,
  theme,
}: {
  totalSteps: number;
  totalDistanceKm: number;
  progressPct: number;
  theme: WeekTheme;
}) {
  const ringSize = 148;
  const ringBorder = 14;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "28px 32px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 999,
              backgroundColor: "#ffffff",
              fontSize: 18,
            }}
          >
            🚶
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              color: theme.text,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Walking
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 52,
            fontWeight: 800,
            color: theme.text,
            lineHeight: 1,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {formatSteps(totalSteps)}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 10,
            fontSize: 18,
            fontWeight: 500,
            color: "#475569",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Total steps this week
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 16,
            fontWeight: 600,
            color: theme.accentSecondary,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {`${progressPct}% target days met`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: ringSize,
          height: ringSize,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            width: ringSize,
            height: ringSize,
            borderRadius: 999,
            border: `${ringBorder}px solid ${theme.cardBlue}`,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            width: ringSize,
            height: ringSize,
            borderRadius: 999,
            border: `${ringBorder}px solid ${theme.cardBlueDark}`,
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
            transform: "rotate(35deg)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 800,
              color: theme.text,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            {`${formatKm(totalDistanceKm)} km`}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 4,
              fontSize: 15,
              color: "#64748b",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Distance
          </div>
        </div>
      </div>
    </div>
  );
}

export async function renderWeekProgressCertificate(
  input: WeekProgressCertificateInput,
): Promise<ArrayBuffer> {
  const theme = WEEK_THEMES[input.division];
  const progressPct =
    input.totalDays > 0
      ? Math.round((input.daysMet / input.totalDays) * 100)
      : 0;

  const response = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: theme.background,
          color: theme.text,
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "44px 56px 48px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: theme.accentPrimary,
              }}
            >
              WEEK {input.weekNo} PROGRESS REPORT
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 10,
                fontSize: 22,
                fontWeight: 400,
              }}
            >
              {CHALLENGE_NAME}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 6,
                fontSize: 18,
                fontWeight: 400,
                opacity: 0.85,
              }}
            >
              {input.dateRange}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 20,
                fontSize: 20,
                fontWeight: 400,
              }}
            >
              Prepared for
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: 52,
                fontStyle: "italic",
                fontWeight: 600,
                lineHeight: 1.1,
              }}
            >
              {displayRecipientName(input.recipientName)}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 8,
                width: 280,
                height: 2,
                backgroundColor: theme.lineColor,
              }}
            />

            <div
              style={{
                display: "flex",
                marginTop: 28,
                width: "100%",
                gap: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  height: 250,
                  borderRadius: 28,
                  backgroundColor: theme.cardBlue,
                  overflow: "hidden",
                }}
              >
                <WalkingSummaryCard
                  totalSteps={input.totalSteps}
                  totalDistanceKm={input.totalDistanceKm}
                  progressPct={progressPct}
                  theme={theme}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flex: 1,
                  height: 250,
                  borderRadius: 28,
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
                }}
              >
                <DailyBarChart dailySteps={input.dailySteps} theme={theme} />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {`${input.daysMet}/${input.totalDays} target days · Target ${input.targetLabel}`}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {`${divisionLabel(input.division)} group`.toUpperCase()}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 900,
    },
  );

  return response.arrayBuffer();
}
