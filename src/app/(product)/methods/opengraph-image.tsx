import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderWorkspaceOgImage,
} from "@/lib/og/workspaceImage";

export const runtime = "edge";
export const alt = "Lacuna · Methods workspace";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderWorkspaceOgImage({
    title: "Methods",
    subtitle:
      "Causal DAG · Bayesian inference · Temporal analysis · Sensitivity",
    tags: ["causal", "bayesian", "temporal"],
  });
}
