import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import type React from "react";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

function PillChip({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.20)",
        borderRadius: 999,
        padding: "6px 16px",
      }}
    >
      <span
        style={{
          fontFamily: "sans-serif",
          fontSize: 13,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: 0.5,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "sans-serif",
          fontSize: 13,
          fontWeight: 400,
          color: "rgba(255,255,255,0.65)",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export async function GET(req: NextRequest): Promise<ImageResponse> {
  const { searchParams } = req.nextUrl;
  const ref = searchParams.get("ref");
  const isReferral = ref === "foreground";

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #1a0a1e 0%, #2d1433 45%, #0f1a2e 100%)",
          position: "relative",
        }}
      >
        {/* Top: mark + wordmark */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          {/* Lacuna mark — stylised L in circle */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #c084fc 0%, #818cf8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "sans-serif",
                fontWeight: 800,
                fontSize: 22,
                color: "#fff",
                letterSpacing: -1,
              }}
            >
              L
            </span>
          </div>

          {/* Wordmark */}
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 700,
              fontSize: 26,
              color: "#fff",
              letterSpacing: -0.5,
            }}
          >
            Lacuna
          </span>
        </div>

        {/* Centre: headline + subline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 800,
              fontSize: 56,
              color: "#fff",
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 820,
            }}
          >
            {"Women's Health\nM&A Diligence Stack"}
          </span>
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 400,
              fontSize: 22,
              color: "rgba(255,255,255,0.70)",
              maxWidth: 680,
              lineHeight: 1.5,
            }}
          >
            Verified deal provenance · Clinical trial search · Genomics
            governance · Cited analytics
          </span>
        </div>

        {/* Bottom: pill chips + optional referral caption */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          {/* Pill chips */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
            }}
          >
            <PillChip value="50+" label="verified companies" />
            <PillChip value="30+" label="M&A deals" />
            <PillChip value="BSL 1.1" label="open source" />
          </div>

          {/* Referral caption */}
          {isReferral && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
              }}
            >
              <span
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: 0.3,
                }}
              >
                shared via
              </span>
              <span
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#c084fc",
                  letterSpacing: 0.2,
                }}
              >
                Foreground
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
    },
  );
}
