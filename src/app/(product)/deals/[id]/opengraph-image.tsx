import { ImageResponse } from "next/og";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { getDealById } from "@/lib/deals";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OgProps {
  params: Promise<{ id: string }>;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default async function Image({ params }: OgProps) {
  const { id } = await params;
  const deal = getDealById(getStaticVerifiedDataset(), id);
  const acq = deal?.acquisition;

  const headline = acq
    ? truncate(`${acq.targetName} → ${acq.acquirerName}`, 52)
    : "Verified deal";
  const subline = acq
    ? `${acq.dealType} · ${acq.announcedDate}${
      typeof acq.dealValue === "number" ? ` · $${acq.dealValue}M` : ""
    }`
    : "Women's health M&A diligence";
  const sector = deal?.target.sector ?? "Lacuna";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background: "linear-gradient(135deg, #faf7f8 0%, #ede8f5 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #7c5cbf, #a78bda)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            L
          </div>
          <span style={{ fontSize: 20, fontWeight: 600, color: "#5b3b8c" }}>
            Lacuna · Deal brief
          </span>
        </div>

        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#7c5cbf",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {truncate(sector, 40)}
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: "#3b1f6e",
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            {headline}
          </div>
          <div style={{ fontSize: 22, color: "#5b6a8a", marginTop: 18 }}>
            {subline}
          </div>
        </div>

        <div style={{ fontSize: 16, color: "#7c5cbf" }}>
          Verified public sources · Educational demo only
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
