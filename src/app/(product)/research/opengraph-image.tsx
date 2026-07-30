import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderWorkspaceOgImage,
} from "@/lib/og/workspaceImage";

export const runtime = "edge";
export const alt = "Lacuna · Research workspace";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderWorkspaceOgImage({
    title: "Research",
    subtitle: "Clinical trials · Evidence maturity · Genomics · Health equity",
    tags: ["clinical trials", "evidence", "genomics"],
  });
}
