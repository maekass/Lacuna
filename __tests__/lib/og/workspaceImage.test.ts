import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderWorkspaceOgImage,
} from "@/lib/og/workspaceImage";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

// ImageResponse loads its bundled Yoga/resvg WASM through fetch("data:...").
// The global test stub blocks all fetches, so pass embedded (non-network)
// schemes through to the real fetch while still rejecting outbound HTTP.
const nativeFetch = globalThis.fetch;

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.startsWith("data:") || url.startsWith("file:")) {
        return nativeFetch(input, init);
      }
      throw new Error(
        "Outbound HTTP is disabled in unit tests; mock fetch explicitly.",
      );
    }),
  );
});

const ogRoutes = [
  ["deals", () => import("@/app/(product)/deals/opengraph-image")],
  ["research", () => import("@/app/(product)/research/opengraph-image")],
  [
    "intelligence",
    () => import("@/app/(product)/intelligence/opengraph-image"),
  ],
  ["methods", () => import("@/app/(product)/methods/opengraph-image")],
] as const;

describe("workspace Open Graph images", () => {
  it("renders a PNG (regression: Satori requires explicit display on multi-child divs)", async () => {
    const response = renderWorkspaceOgImage({
      title: "Deals",
      subtitle: "M&A network · Deal flow",
      tags: ["network", "valuation"],
    });
    // Pre-fix this rejected with "Expected <div> to have explicit
    // 'display: flex' ... if it has more than one child node."
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(response.status).toBe(200);
    expect([...bytes.slice(0, 4)]).toEqual(PNG_MAGIC);
  });

  it.each(ogRoutes)(
    "%s route renders and does not opt into the deprecated edge runtime",
    async (_name, load) => {
      const route = await load();
      expect(
        (route as { runtime?: string }).runtime,
        "Edge runtime is deprecated in Next.js 16 — omit the runtime export",
      ).toBeUndefined();
      expect(route.size).toEqual(OG_SIZE);
      expect(route.contentType).toBe(OG_CONTENT_TYPE);
      const bytes = new Uint8Array(await route.default().arrayBuffer());
      expect([...bytes.slice(0, 4)]).toEqual(PNG_MAGIC);
    },
  );
});
