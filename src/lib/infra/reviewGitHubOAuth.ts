import process from "node:process";

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";
const GITHUB_USER = "https://api.github.com/user";

export const GITHUB_OAUTH_STATE_COOKIE = "lacuna_github_oauth_state";

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  allowlist: string[];
}

export function isGitHubReviewOAuthConfigured(): boolean {
  return parseGitHubOAuthConfig() !== null;
}

/** Comma-separated GitHub logins allowed to use review console. */
export function parseGitHubOAuthConfig(): GitHubOAuthConfig | null {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
  const allowlistRaw = process.env.LACUNA_REVIEW_GITHUB_ALLOWLIST?.trim();

  if (!clientId || !clientSecret || !allowlistRaw) return null;

  const allowlist = allowlistRaw
    .split(",")
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) return null;

  return { clientId, clientSecret, allowlist };
}

export function buildGitHubAuthorizeUrl(input: {
  redirectUri: string;
  state: string;
}): string {
  const config = parseGitHubOAuthConfig();
  if (!config) {
    throw new Error("GitHub OAuth is not configured");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: input.redirectUri,
    scope: "read:user",
    state: input.state,
  });
  return `${GITHUB_AUTHORIZE}?${params.toString()}`;
}

export function isGitHubLoginAllowed(login: string): boolean {
  const config = parseGitHubOAuthConfig();
  if (!config) return false;
  return config.allowlist.includes(login.trim().toLowerCase());
}

/** Exchange OAuth code for GitHub login (allowlist enforced). */
export async function exchangeGitHubOAuthCode(input: {
  code: string;
  redirectUri: string;
}): Promise<{ login: string }> {
  const config = parseGitHubOAuthConfig();
  if (!config) {
    throw new Error("GitHub OAuth is not configured");
  }

  const tokenResponse = await fetch(GITHUB_TOKEN, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`GitHub token exchange failed: ${tokenResponse.status}`);
  }

  const tokenBody = await tokenResponse.json() as {
    access_token?: string;
    error?: string;
  };
  if (!tokenBody.access_token) {
    throw new Error(
      tokenBody.error ?? "GitHub token exchange returned no token",
    );
  }

  const userResponse = await fetch(GITHUB_USER, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenBody.access_token}`,
      "User-Agent": "Lacuna-Review-Console",
    },
  });

  if (!userResponse.ok) {
    throw new Error(`GitHub user fetch failed: ${userResponse.status}`);
  }

  const user = await userResponse.json() as { login?: string };
  const login = user.login?.trim();
  if (!login) {
    throw new Error("GitHub user response missing login");
  }

  if (!isGitHubLoginAllowed(login)) {
    throw new Error(`GitHub user ${login} is not on the reviewer allowlist`);
  }

  return { login };
}

export function reviewOAuthRedirectUri(request: Request): string {
  const configured = process.env.LACUNA_REVIEW_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  const origin = new URL(request.url).origin;
  return `${origin}/api/deals/review/github/callback`;
}
