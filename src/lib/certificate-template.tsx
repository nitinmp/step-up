import { ImageResponse } from "next/og";

import type { Division } from "@/lib/divisions";
import { formatCertificateDate } from "@/lib/dates";

export type StarDayCertificateInput = {
  recipientName: string;
  steps: number;
  activityDate: string;
  division: Division;
};

const CHALLENGE_NAME = "Step Up - July 26";

type CertificateTheme = {
  background: string;
  text: string;
  accentPrimary: string;
  accentSecondary: string;
  lineColor: string;
  awardTitle: string;
  achievementLine: string;
  divisionLabel: string;
};

const CERTIFICATE_THEMES: Record<Division, CertificateTheme> = {
  elite: {
    background:
      "radial-gradient(circle at 50% 35%, #fffdf7 0%, #f7efd8 42%, #ead9a8 100%)",
    text: "#1b2a4a",
    accentPrimary: "#b8860b",
    accentSecondary: "#1b2a4a",
    lineColor: "#1b2a4a",
    awardTitle: "ELITE STAR OF THE DAY",
    achievementLine: "Has achieved excellence as",
    divisionLabel: "Elite group",
  },
  strider: {
    background:
      "radial-gradient(circle at 50% 40%, #ffffff 0%, #f3ecff 45%, #e8dcff 100%)",
    text: "#1b2a4a",
    accentPrimary: "#b83280",
    accentSecondary: "#6b2d7b",
    lineColor: "#1b2a4a",
    awardTitle: "THE STAR OF THE DAY AWARD",
    achievementLine: "Has achieved",
    divisionLabel: "Striders GROUP",
  },
  riser: {
    background:
      "radial-gradient(circle at 50% 38%, #fffdf8 0%, #fff1d6 44%, #ffd89a 100%)",
    text: "#5c2f00",
    accentPrimary: "#ea580c",
    accentSecondary: "#c2410c",
    lineColor: "#7c3a12",
    awardTitle: "RISER STAR OF THE DAY",
    achievementLine: "Has risen to",
    divisionLabel: "Risers GROUP",
  },
};

function displayRecipientName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "participant";
  }

  return trimmed.toLowerCase();
}

function EliteDecorations({
  accentPrimary,
  accentSecondary,
}: {
  accentPrimary: string;
  accentSecondary: string;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -70,
          left: -40,
          width: 260,
          height: 180,
          borderRadius: "12px",
          background: `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})`,
          transform: "rotate(-14deg)",
          opacity: 0.95,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -80,
          left: -20,
          width: 340,
          height: 120,
          borderRadius: "8px",
          background: `linear-gradient(135deg, ${accentSecondary}, ${accentPrimary})`,
          transform: "rotate(8deg)",
          opacity: 0.9,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -60,
          right: -30,
          width: 240,
          height: 160,
          borderRadius: "999px",
          background: `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})`,
          transform: "rotate(-10deg)",
          opacity: 0.85,
        }}
      />
    </>
  );
}

function StriderDecorations({
  accentPrimary,
  accentSecondary,
}: {
  accentPrimary: string;
  accentSecondary: string;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -80,
          left: -60,
          width: 280,
          height: 220,
          borderRadius: "999px",
          background: `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})`,
          transform: "rotate(-18deg)",
          opacity: 0.92,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -90,
          left: -40,
          width: 320,
          height: 240,
          borderRadius: "999px",
          background: `linear-gradient(135deg, ${accentSecondary}, ${accentPrimary})`,
          transform: "rotate(24deg)",
          opacity: 0.88,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -70,
          right: -50,
          width: 220,
          height: 180,
          borderRadius: "999px",
          background: `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})`,
          transform: "rotate(-12deg)",
          opacity: 0.82,
        }}
      />
    </>
  );
}

function RiserDecorations({
  accentPrimary,
  accentSecondary,
}: {
  accentPrimary: string;
  accentSecondary: string;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -70,
          left: -50,
          width: 300,
          height: 210,
          borderRadius: "999px",
          background: `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})`,
          transform: "rotate(-16deg)",
          opacity: 0.9,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -95,
          left: -30,
          width: 340,
          height: 230,
          borderRadius: "999px",
          background: `linear-gradient(135deg, ${accentSecondary}, ${accentPrimary})`,
          transform: "rotate(20deg)",
          opacity: 0.86,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 40,
          right: -70,
          width: 200,
          height: 200,
          borderRadius: "999px",
          background: `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})`,
          transform: "rotate(18deg)",
          opacity: 0.78,
        }}
      />
    </>
  );
}

function DivisionDecorations({
  division,
  accentPrimary,
  accentSecondary,
}: {
  division: Division;
  accentPrimary: string;
  accentSecondary: string;
}) {
  if (division === "elite") {
    return (
      <EliteDecorations
        accentPrimary={accentPrimary}
        accentSecondary={accentSecondary}
      />
    );
  }

  if (division === "riser") {
    return (
      <RiserDecorations
        accentPrimary={accentPrimary}
        accentSecondary={accentSecondary}
      />
    );
  }

  return (
    <StriderDecorations
      accentPrimary={accentPrimary}
      accentSecondary={accentSecondary}
    />
  );
}

export async function renderStarDayCertificate(
  input: StarDayCertificateInput,
): Promise<ArrayBuffer> {
  const theme = CERTIFICATE_THEMES[input.division];

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: theme.background,
          fontFamily: "Arial, Helvetica, sans-serif",
          color: theme.text,
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <DivisionDecorations
            accentPrimary={theme.accentPrimary}
            accentSecondary={theme.accentSecondary}
            division={input.division}
          />
        </div>

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
                fontSize: 72,
                fontWeight: 700,
                letterSpacing: "0.08em",
                lineHeight: 1,
              }}
            >
              CERTIFICATE
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 10,
                fontSize: 34,
                fontWeight: 400,
              }}
            >
              Of Achievement
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 22,
                fontWeight: 400,
              }}
            >
              This Certificate is Proudly Presented to
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
                fontSize: 22,
                fontWeight: 400,
              }}
            >
              {theme.achievementLine}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 10,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              {theme.awardTitle}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontSize: 22,
                fontWeight: 400,
                maxWidth: 900,
                lineHeight: 1.4,
              }}
            >
              {`in ${CHALLENGE_NAME} on ${formatCertificateDate(input.activityDate)}`}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {`Step Count-${input.steps.toLocaleString("en-IN")}`}
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
            {theme.divisionLabel}
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
