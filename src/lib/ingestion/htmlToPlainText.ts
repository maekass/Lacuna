/**
 * HTML → plain text for SEC filing ingestion.
 *
 * Uses a scanner instead of tag-matching regexes. Regex HTML filters miss
 * browser-tolerated closers such as `</script foo>` (CodeQL js/bad-tag-filter).
 * Output is for keyword search / Item 2.01 parsing, not browser rendering.
 */

const SKIP_CONTENT_TAGS = new Set(["script", "style"]);

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  bull: "•",
  copy: "©",
  gt: ">",
  ldquo: "“",
  lpar: "(",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: "”",
  reg: "®",
  rpar: ")",
  rsquo: "’",
  sect: "§",
  trade: "™",
};

interface ParsedTag {
  kind: "open" | "close";
  name: string;
  selfClosing: boolean;
  end: number;
}

/**
 * Strip tags (dropping script/style content) and decode HTML entities.
 */
export function htmlToPlainText(html: string): string {
  const chunks: string[] = [];
  const length = html.length;
  let index = 0;
  let skipUntil: string | null = null;

  while (index < length) {
    if (skipUntil) {
      const end = findEndTag(html, index, skipUntil);
      if (end < 0) {
        // Unterminated script/style is common in SEC HTML. Aborting here
        // dropped every subsequent token (including Item 2.01). Resume as
        // text from the current index; the opener was already consumed.
        skipUntil = null;
        continue;
      }
      chunks.push(" ");
      index = end;
      skipUntil = null;
      continue;
    }

    const lt = html.indexOf("<", index);
    if (lt < 0) {
      chunks.push(decodeHtmlEntities(html.slice(index)));
      break;
    }
    if (lt > index) {
      chunks.push(decodeHtmlEntities(html.slice(index, lt)));
    }

    if (html.startsWith("<!--", lt)) {
      chunks.push(" ");
      index = skipHtmlComment(html, lt);
      continue;
    }
    if (html.startsWith("<![CDATA[", lt)) {
      const close = html.indexOf("]]>", lt + 9);
      if (close < 0) {
        chunks.push(html.slice(lt + 9));
        break;
      }
      chunks.push(html.slice(lt + 9, close));
      index = close + 3;
      continue;
    }
    if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) {
      chunks.push(" ");
      const gt = html.indexOf(">", lt + 2);
      index = gt < 0 ? length : gt + 1;
      continue;
    }

    const tag = parseTag(html, lt);
    if (!tag) {
      chunks.push("<");
      index = lt + 1;
      continue;
    }
    chunks.push(" ");
    index = tag.end;
    if (
      tag.kind === "open" &&
      !tag.selfClosing &&
      SKIP_CONTENT_TAGS.has(tag.name)
    ) {
      skipUntil = tag.name;
    }
  }

  return chunks.join("").replace(/\s+/g, " ").trim();
}

function isTagNameStart(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isTagNameChar(code: number): boolean {
  return (
    isTagNameStart(code) ||
    (code >= 48 && code <= 57) ||
    code === 45 ||
    code === 58
  );
}

function parseTag(html: string, lt: number): ParsedTag | null {
  const length = html.length;
  let index = lt + 1;
  const isClose = html.charAt(index) === "/";
  if (isClose) index += 1;
  while (index < length && html.charCodeAt(index) <= 32) index += 1;
  if (index >= length || !isTagNameStart(html.charCodeAt(index))) {
    return null;
  }

  const nameStart = index;
  while (index < length && isTagNameChar(html.charCodeAt(index))) {
    index += 1;
  }
  const name = html.slice(nameStart, index).toLowerCase();
  const end = skipToTagEnd(html, index);
  const beforeGt = end > 0 ? html.charAt(end - 2) : "";
  return {
    kind: isClose ? "close" : "open",
    name,
    selfClosing: !isClose && beforeGt === "/",
    end,
  };
}

/** Advance past `>` while ignoring `>` inside quoted attributes. */
function skipToTagEnd(html: string, from: number): number {
  const length = html.length;
  let quote: '"' | "'" | null = null;
  for (let index = from; index < length; index += 1) {
    const ch = html.charAt(index);
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ">") return index + 1;
  }
  return length;
}

function startsWithIgnoreCase(
  html: string,
  index: number,
  lowerNeedle: string,
): boolean {
  if (index + lowerNeedle.length > html.length) return false;
  for (let offset = 0; offset < lowerNeedle.length; offset += 1) {
    const actual = html.charAt(index + offset).toLowerCase();
    if (actual !== lowerNeedle.charAt(offset)) {
      return false;
    }
  }
  return true;
}

/**
 * Find `</name ...>` allowing attributes/whitespace on the closer
 * (`</script foo>`, `</script\t\n bar>`).
 */
function findEndTag(html: string, from: number, name: string): number {
  let index = from;
  while (index < html.length) {
    const lt = html.indexOf("<", index);
    if (lt < 0) return -1;
    if (html.charAt(lt + 1) !== "/") {
      index = lt + 1;
      continue;
    }
    let nameStart = lt + 2;
    while (nameStart < html.length && html.charCodeAt(nameStart) <= 32) {
      nameStart += 1;
    }
    if (!startsWithIgnoreCase(html, nameStart, name)) {
      index = lt + 1;
      continue;
    }
    const afterName = nameStart + name.length;
    if (afterName < html.length && isTagNameChar(html.charCodeAt(afterName))) {
      index = lt + 1;
      continue;
    }
    return skipToTagEnd(html, afterName);
  }
  return -1;
}

/** Comments end at `-->` or the HTML comment-end-bang `--!>`. */
function skipHtmlComment(html: string, from: number): number {
  const start = from + 4;
  const standard = html.indexOf("-->", start);
  const bang = html.indexOf("--!>", start);
  if (standard < 0 && bang < 0) return html.length;
  if (standard < 0) return bang + 4;
  if (bang < 0) return standard + 3;
  return standard <= bang ? standard + 3 : bang + 4;
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body: string) => {
    const named = NAMED_ENTITIES[body.toLowerCase()];
    if (named !== undefined) return named;
    if (body.charAt(0) !== "#") return entity;
    const hex = body.charAt(1) === "x" || body.charAt(1) === "X";
    const digits = hex ? body.slice(2) : body.slice(1);
    const code = hex ? Number.parseInt(digits, 16) : Number(digits);
    if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return entity;
    try {
      return String.fromCodePoint(code);
    } catch {
      return entity;
    }
  });
}
