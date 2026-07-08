import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  buildGitHubAuthorizeUrl,
  GITHUB_OAUTH_STATE_COOKIE,
  isGitHubReviewOAuthConfigured,
  reviewOAuthRedirectUri,
} from "@/lib/infra/reviewGitHubOAuth";

/** Start GitHub OAuth for production reviewers (allowlist enforced on callback). */
export function GET(request: Request) {
  if (!isGitHubReviewOAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: "GitHub OAuth is not configured for review sign-in" },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = reviewOAuthRedirectUri(request);
  const url = buildGitHubAuthorizeUrl({ redirectUri, state });

  const response = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  response.cookies.set(GITHUB_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 600,
  });
  return response;
}
