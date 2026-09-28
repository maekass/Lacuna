/**
 * Read a publication date or URL that is already written in a citation.
 * This does not look up the web and does not turn a deal announcement field
 * into an economic vintage.
 */

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

export interface CitationVintage {
  readonly publicAsOfDate: string;
  readonly datePrecision: "day" | "month" | "year";
}

function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

/** The first calendar date the citation itself states. */
export function vintageFromCitation(citation: string): CitationVintage | null {
  const day = citation.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2}),?\s+((?:19|20)\d{2})\b/i,
  );
  if (day) {
    const month = MONTHS[day[1].toLowerCase().replace(".", "")];
    const iso = `${day[3]}-${month}-${day[2].padStart(2, "0")}`;
    if (month && validDay(iso)) {
      return { publicAsOfDate: iso, datePrecision: "day" };
    }
  }

  const monthYear = citation.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+((?:19|20)\d{2})\b/i,
  );
  if (monthYear) {
    const month = MONTHS[monthYear[1].toLowerCase()];
    if (month) {
      return {
        publicAsOfDate: `${monthYear[2]}-${month}-01`,
        datePrecision: "month",
      };
    }
  }

  const fiscal = citation.match(/\bFY\s*((?:19|20)\d{2})\b/i);
  const year = fiscal?.[1] ?? citation.match(/\b((?:19|20)\d{2})\b/)?.[1];
  if (year) {
    return { publicAsOfDate: `${year}-01-01`, datePrecision: "year" };
  }
  return null;
}

/** A URL already written in the citation, including a bare host/path. */
export function sourceUrlFromCitation(citation: string): string | undefined {
  const explicit = citation.match(/https?:\/\/[^\s)]+/i);
  if (explicit) {
    return explicit[0].replace(/[.,;]+$/, "");
  }
  const host = citation.match(
    /\b((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[a-z0-9._~:/?#\[\]@!$&'()*+,;=%-]*)?/i,
  );
  if (!host) return undefined;
  const url = `https://${host[1]}${host[2] ?? ""}`.replace(/[.,;]+$/, "");
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes(".")) return undefined;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}
