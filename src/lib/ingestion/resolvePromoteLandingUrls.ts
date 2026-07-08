export interface PromoteLandingUrls {
  verifiedDealUrl: string;
  networkUrl?: string;
}

interface PromoteApiBody {
  verifiedDealUrl?: string;
  networkUrl?: string;
  result?: {
    acquisitionId?: string;
    networkHighlightId?: string;
  };
}

/** Normalize promote API payload into deal-spine navigation targets. */
export function resolvePromoteLandingUrls(
  body: PromoteApiBody,
): PromoteLandingUrls | null {
  const verifiedDealUrl = body.verifiedDealUrl ??
    (body.result?.acquisitionId ? `/deals/${body.result.acquisitionId}` : null);
  if (!verifiedDealUrl) return null;

  const networkUrl = body.networkUrl ??
    (body.result?.networkHighlightId
      ? `/deals?highlight=${
        encodeURIComponent(body.result.networkHighlightId)
      }#network`
      : undefined);

  return { verifiedDealUrl, networkUrl };
}
