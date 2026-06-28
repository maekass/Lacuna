import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lacuna · Research workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          background: "linear-gradient(135deg, #faf7f8 0%, #ede8f5 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "linear-gradient(135deg, #7c5cbf, #a78bda)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            L
          </div>
          <span style={{ fontSize: 22, fontWeight: 600, color: "#5b3b8c" }}>
            Lacuna
          </span>
        </div>

        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "#7c5cbf",
              marginBottom: 16,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Workspace
          </div>
          <div
            style={{ fontSize: 72, fontWeight: 800, color: "#3b1f6e", lineHeight: 1 }}
          >
            Research
          </div>
          <div
            style={{ fontSize: 24, color: "#5b6a8a", marginTop: 20, maxWidth: 600 }}
          >
            Clinical trials · Evidence maturity · Genomics · Health equity
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {["clinical trials", "evidence", "genomics"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "6px 14px",
                borderRadius: 99,
                background: "rgba(167,139,218,0.15)",
                border: "1px solid rgba(167,139,218,0.4)",
                fontSize: 14,
                color: "#5b3b8c",
                fontWeight: 500,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
