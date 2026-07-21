import { ImageResponse } from "next/og";

import type { Division } from "@/lib/divisions";
import { divisionLabel } from "@/lib/divisions";

export type StarWeekCertificateInput = {
  recipientName: string;
  division: Division;
  weekNo: number;
  dateRange: string;
  steps: number;
};

const CHALLENGE_NAME = "Step Up - July 26";

const WEEK_THEMES: Record<
  Division,
  {
    background: string;
    text: string;
    accentPrimary: string;
    accentSecondary: string;
    lineColor: string;
  }
> = {
  elite: {
    background:
      "radial-gradient(circle at 50% 35%, #fffdf7 0%, #f7efd8 42%, #ead9a8 100%)",
    text: "#1b2a4a",
    accentPrimary: "#b8860b",
    accentSecondary: "#1b2a4a",
    lineColor: "#1b2a4a",
  },
  strider: {
    background:
      "radial-gradient(circle at 50% 40%, #ffffff 0%, #f3ecff 45%, #e8dcff 100%)",
    text: "#1b2a4a",
    accentPrimary: "#b83280",
    accentSecondary: "#6b2d7b",
    lineColor: "#1b2a4a",
  },
  riser: {
    background:
      "radial-gradient(circle at 50% 38%, #fffdf8 0%, #fff1d6 44%, #ffd89a 100%)",
    text: "#5c2f00",
    accentPrimary: "#ea580c",
    accentSecondary: "#c2410c",
    lineColor: "#7c3a12",
  },
};

function displayRecipientName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "participant";
  }

  return trimmed.toLowerCase();
}

export async function renderStarWeekCertificate(
  input: StarWeekCertificateInput,
): Promise<ArrayBuffer> {
  const theme = WEEK_THEMES[input.division];

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
            padding: "48px 72px 56px",
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
                fontSize: 64,
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              CERTIFICATE
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 12,
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: theme.accentPrimary,
              }}
            >
              STAR OF THE WEEK
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 10,
                fontSize: 22,
                fontWeight: 400,
              }}
            >
              Week {input.weekNo} · {CHALLENGE_NAME}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 8,
                fontSize: 20,
                fontWeight: 400,
                opacity: 0.85,
              }}
            >
              {input.dateRange}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 22,
                fontWeight: 400,
              }}
            >
              Proudly presented to
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 58,
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
                marginTop: 10,
                width: 320,
                height: 2,
                backgroundColor: theme.lineColor,
              }}
            />
            <div
              style={{
                display: "flex",
                marginTop: 24,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {`${input.steps.toLocaleString("en-IN")} steps this week`}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 26,
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
      height: 848,
    },
  );

  return response.arrayBuffer();
}
