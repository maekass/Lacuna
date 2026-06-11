import { ImageResponse } from "next/og";

export const alt = "Lacuna — Women's Health M&A Diligence Stack";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background:
            "linear-gradient(135deg, #1a0a1e 0%, #2d1433 45%, #0f1a2e 100%)",
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
              }}
            >
              L
            </span>
          </div>
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

        {/* Bottom: pill chips */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 10,
            alignItems: "center",
          }}
        >
          {(
            [
              { value: "50+", label: "verified companies" },
              { value: "30+", label: "M&A deals" },
              { value: "BSL 1.1", label: "open source" },
            ] as { value: string; label: string }[]
          ).map(({ value, label }) => (
            <div
              key={label}
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
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
