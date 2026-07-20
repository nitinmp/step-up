import { ImageResponse } from "next/og";

import type { Division } from "@/lib/divisions";
import { formatCertificateDate } from "@/lib/dates";

export type StarDayCertificateInput = {
  recipientName: string;
  steps: number;
  activityDate: string;
  division: Division;
};

const NAVY = "#1b2a4a";
const MAGENTA = "#b83280";
const PURPLE = "#6b2d7b";

function certificateDivisionLabel(division: Division): string {
  if (division === "elite") {
    return "Elite group";
  }
  if (division === "riser") {
    return "Risers GROUP";
  }
  return "Striders GROUP";
}

function displayRecipientName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "participant";
  }

  return trimmed.toLowerCase();
}

export async function renderStarDayCertificate(
  input: StarDayCertificateInput,
): Promise<ArrayBuffer> {
  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background:
            "radial-gradient(circle at 50% 40%, #ffffff 0%, #f3ecff 45%, #e8dcff 100%)",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: NAVY,
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
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: -80,
              left: -60,
              width: 280,
              height: 220,
              borderRadius: "999px",
              background: `linear-gradient(135deg, ${MAGENTA}, ${PURPLE})`,
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
              background: `linear-gradient(135deg, ${PURPLE}, ${MAGENTA})`,
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
              background: `linear-gradient(135deg, ${MAGENTA}, ${PURPLE})`,
              transform: "rotate(-12deg)",
              opacity: 0.82,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: "48px 72px",
            textAlign: "center",
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
              backgroundColor: NAVY,
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
            Has achieved
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
            THE STAR OF THE DAY AWARD
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

          <div
            style={{
              display: "flex",
              width: "100%",
              marginTop: 42,
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            <div style={{ display: "flex" }}>
              {`Date- ${formatCertificateDate(input.activityDate)}`}
            </div>
            <div style={{ display: "flex" }}>
              {certificateDivisionLabel(input.division)}
            </div>
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
