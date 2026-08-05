import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderWorkspaceOgImage,
} from "@/lib/og/workspaceImage";

export const runtime = "edge";
export const alt = "Lacuna · Intelligence workspace";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderWorkspaceOgImage({
    title: "Intelligence",
    subtitle: "Reimbursement context · Acquirer fit scores · Deck export",
    tags: ["reimbursement", "fit scores", "export"],
  });
}
