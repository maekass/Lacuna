import { NextResponse } from "next/server";
import { tryLogReviewAction } from "@/lib/ingestion/reviewAuditLog";
import {
  exchangeGitHubOAuthCode,
  GITHUB_OAUTH_STATE_COOKIE,
  reviewOAuthRedirectUri,
} from "@/lib/infra/reviewGitHubOAuth";
import { setReviewSessionCookie } from "@/lib/infra/reviewAuth";

function parseOAuthState(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${GITHUB_OAUTH_STATE_COOKIE}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** GitHub OAuth callback — sets signed reviewer session and redirects to queue. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/deals?review_auth_error=${encodeURIComponent(error)}#review`,
        url.origin,
      ),
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = parseOAuthState(request.headers.get("cookie"));

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      new URL(
        "/deals?review_auth_error=invalid_oauth_state#review",
        url.origin,
      ),
    );
  }

  try {
    const redirectUri = reviewOAuthRedirectUri(request);
    const { login } = await exchangeGitHubOAuthCode({ code, redirectUri });

    const response = NextResponse.redirect(
      new URL("/deals#review", url.origin),
    );
    setReviewSessionCookie(response, { sub: login, method: "github" });

    const secure = process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production";
    response.cookies.set(GITHUB_OAUTH_STATE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });

    await tryLogReviewAction({
      action: "session_start",
      actorId: `github:${login}`,
      actorMethod: "github",
      metadata: { provider: "github", login },
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(
      new URL(
        `/deals?review_auth_error=${encodeURIComponent(message)}#review`,
        url.origin,
      ),
    );
  }
}
