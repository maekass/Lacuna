import { NextResponse } from "next/server";
import {
  isReviewTokenAuthorized,
  REVIEW_SESSION_COOKIE,
} from "@/lib/infra/reviewAuth";

interface SessionBody {
  token?: string;
}

/**
 * Set an httpOnly review session cookie after validating the API key.
 * Browser UI on Vercel can unlock staging tools without Bearer headers.
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  let body: SessionBody;
  try {
    body = await request.json() as SessionBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const token = body.token?.trim();
  if (!token || !isReviewTokenAuthorized(token)) {
    return NextResponse.json(
      { ok: false, error: "Invalid review API key" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true, probe: "review-session" });
  const secure = process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  response.cookies.set(REVIEW_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

/** Clear review session cookie. */
export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(REVIEW_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
