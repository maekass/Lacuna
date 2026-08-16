const FRIENDLY_OAUTH_ERRORS: Record<string, string> = {
  access_denied: "GitHub sign-in was cancelled.",
  invalid_oauth_state: "Sign-in expired. Try GitHub again.",
  oauth_failed: "GitHub sign-in failed. Try again.",
};

/** Map `?review_auth_error=` from the OAuth callback to a short UI message. */
export function formatReviewAuthError(raw: string | null | undefined): string {
  const value = raw?.trim();
  if (!value) return "GitHub sign-in failed. Try again.";
  return FRIENDLY_OAUTH_ERRORS[value] ??
    (value.startsWith("GitHub user ") && value.includes("allowlist")
      ? "That GitHub account is not on the reviewer allowlist."
      : "GitHub sign-in failed. Try again.");
}

/** Read and strip `review_auth_error` from the current URL (client only). */
export function consumeReviewAuthErrorFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const raw = url.searchParams.get("review_auth_error");
  if (!raw) return null;
  url.searchParams.delete("review_auth_error");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
  return formatReviewAuthError(raw);
}
