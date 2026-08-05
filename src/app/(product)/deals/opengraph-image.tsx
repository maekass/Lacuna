import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderWorkspaceOgImage,
} from "@/lib/og/workspaceImage";

export const runtime = "edge";
export const alt = "Lacuna · Deals workspace";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderWorkspaceOgImage({
    title: "Deals",
    subtitle: "M&A network · Deal flow · Valuation matrix · Acquirer landscape",
    tags: ["network", "valuation", "acquirers"],
  });
}
