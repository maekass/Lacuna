/**
 * Hostname checks that do not treat a domain as a URL substring.
 * CodeQL `js/incomplete-url-substring-sanitization` flags `.includes("sec.gov")`.
 */

const HTTP_URL_IN_TEXT = /https?:\/\/[^\s)\]>"']+/gi;

function hostnameFromHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostnameEqualsOrSubdomain(hostname: string, domain: string): boolean {
  const needle = domain.trim().toLowerCase();
  if (!needle) return false;
  return hostname === needle || hostname.endsWith(`.${needle}`);
}

/**
 * True when `value` is an absolute http(s) URL whose hostname equals
 * `domain` or is a subdomain of it (`www.sec.gov` matches `sec.gov`).
 *
 * Rejects substring spoofs such as `https://evil.example/sec.gov`.
 */
export function urlHostnameMatches(value: string, domain: string): boolean {
  const hostname = hostnameFromHttpUrl(value.trim());
  if (!hostname) return false;
  return hostnameEqualsOrSubdomain(hostname, domain);
}

/**
 * True when any absolute http(s) URL in `text` (the whole string or an
 * embedded citation) has hostname `domain` or a subdomain of it.
 */
export function citationHostnameMatches(
  text: string,
  domain: string,
): boolean {
  if (urlHostnameMatches(text, domain)) return true;
  const embedded = text.match(HTTP_URL_IN_TEXT) ?? [];
  return embedded.some((url) => urlHostnameMatches(url, domain));
}
