import { ImageResponse } from "next/og";

/** Shared canvas size for every Lacuna Open Graph card. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const BACKGROUND = "linear-gradient(135deg, #faf7f8 0%, #ede8f5 100%)";
const MARK_GRADIENT = "linear-gradient(135deg, #7c5cbf, #a78bda)";

interface WorkspaceOgImageProps {
  /** Workspace name rendered as the headline (e.g. "Research"). */
  title: string;
  /** Middot-separated capability list under the headline. */
  subtitle: string;
  /** Lowercase pills along the bottom edge. */
  tags: string[];
  /** Small uppercase kicker above the headline. */
  eyebrow?: string;
}

function LacunaMark({ caption }: { caption: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: MARK_GRADIENT,
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
        {caption}
      </span>
    </div>
  );
}

/**
 * Renders the shared workspace Open Graph card used by the product routes.
 * Route files supply only the copy; layout, palette, and size stay identical.
 */
export function renderWorkspaceOgImage({
  title,
  subtitle,
  tags,
  eyebrow = "Workspace",
}: WorkspaceOgImageProps): ImageResponse {
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
          background: BACKGROUND,
        }}
      >
        <LacunaMark caption="Lacuna" />

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
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#3b1f6e",
              lineHeight: 1,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#5b6a8a",
              marginTop: 20,
              maxWidth: 600,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {tags.map((tag) => (
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
    OG_SIZE,
  );
}
