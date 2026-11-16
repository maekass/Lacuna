/**
 * curl-backed fetch for live lift eval runs behind an HTTPS credential proxy.
 *
 * Node's fetch (undici) cannot get through some credential proxies that
 * inject auth (for example `pplx credentials run`), while curl can. This
 * module implements `fetch` with a curl subprocess and installs a gateway
 * provider that uses it as the AI SDK default provider. `runEvidenceAsk`
 * resolves the model id string through that default, so the eval keeps the
 * app's single code path; only the HTTP transport changes.
 *
 * Eval-only. Production inference never imports this module. Request headers
 * (including any Authorization value) go to curl through stdin config, never
 * argv, so they do not show up in the process list. Bodies go through a temp
 * file that is created mode 0600 and removed after the call.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createGateway } from "@ai-sdk/gateway";

export interface CurlFetchOptions {
  /** curl binary. Defaults to `curl` on PATH. */
  curlPath?: string;
  /** Per-request timeout in seconds. */
  timeoutSeconds?: number;
}

export interface CurlGatewayOptions extends CurlFetchOptions {
  /** Gateway base URL override (tests point this at a local server). */
  baseURL?: string;
}

/** Quote a value for a curl config file (double-quoted string syntax). */
export function quoteCurlConfig(value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new Error("curl transport: header values cannot contain newlines");
  }
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * curl sets framing headers itself. Accept-Encoding is dropped so the server
 * sends an identity body, because the buffered body is not decompressed.
 */
const DROPPED_REQUEST_HEADERS = new Set([
  "host",
  "content-length",
  "transfer-encoding",
  "connection",
  "accept-encoding",
]);

/** Build the curl config passed on stdin. Pure, for testing. */
export function buildCurlConfig(input: {
  url: string;
  method: string;
  headers: Array<[string, string]>;
  bodyPath?: string;
  headerOutPath: string;
  bodyOutPath: string;
  timeoutSeconds: number;
}): string {
  const lines = [
    `url = ${quoteCurlConfig(input.url)}`,
    `request = ${quoteCurlConfig(input.method)}`,
    "silent",
    "show-error",
    `max-time = ${input.timeoutSeconds}`,
    `dump-header = ${quoteCurlConfig(input.headerOutPath)}`,
    `output = ${quoteCurlConfig(input.bodyOutPath)}`,
  ];
  for (const [name, value] of input.headers) {
    if (DROPPED_REQUEST_HEADERS.has(name.toLowerCase())) continue;
    if (/[\r\n:]/.test(name)) {
      throw new Error("curl transport: invalid header name");
    }
    lines.push(`header = ${quoteCurlConfig(`${name}: ${value}`)}`);
  }
  if (input.bodyPath) {
    lines.push(`data-binary = ${quoteCurlConfig(`@${input.bodyPath}`)}`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Parse a curl `--dump-header` file. With a proxy (CONNECT) or
 * `100 Continue`, the file holds several header blocks; the last one belongs
 * to the final response.
 */
export function parseCurlHeaderDump(dump: string): {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
} {
  const blocks = dump.replace(/\r\n/g, "\n").split(/\n\n+/).map((block) =>
    block.trim()
  ).filter((block) => /^HTTP\/\S+\s+\d{3}/.test(block));
  const last = blocks.at(-1);
  if (!last) throw new Error("curl transport: no HTTP response headers");
  const [statusLine, ...rest] = last.split("\n");
  const match = statusLine.match(/^HTTP\/\S+\s+(\d{3})\s*(.*)$/);
  const headers: Array<[string, string]> = [];
  for (const line of rest) {
    const index = line.indexOf(":");
    if (index <= 0) continue;
    headers.push([line.slice(0, index).trim(), line.slice(index + 1).trim()]);
  }
  return {
    status: Number(match?.[1] ?? 0),
    statusText: match?.[2] ?? "",
    headers,
  };
}

function runCurl(
  curlPath: string,
  config: string,
  signal: AbortSignal | null | undefined,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("aborted"));
      return;
    }
    const child = spawn(curlPath, ["--config", "-"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const onAbort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.on("error", (error) => {
      signal?.removeEventListener("abort", onAbort);
      reject(error);
    });
    child.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        reject(signal.reason ?? new Error("aborted"));
        return;
      }
      resolve({ code, stdout, stderr });
    });
    child.stdin.end(config);
  });
}

async function requestBody(
  request: Request,
): Promise<Uint8Array | undefined> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  const buffer = new Uint8Array(await request.arrayBuffer());
  return buffer.byteLength > 0 ? buffer : undefined;
}

/** A `fetch` implemented with a curl subprocess. Buffers the full response. */
export function createCurlFetch(
  options: CurlFetchOptions = {},
): typeof fetch {
  const curlPath = options.curlPath ?? "curl";
  const timeoutSeconds = options.timeoutSeconds ?? 120;
  return async (input, init) => {
    const request = new Request(input, init);
    const body = await requestBody(request);
    const dir = mkdtempSync(path.join(tmpdir(), "lift-curl-"));
    try {
      const bodyPath = body ? path.join(dir, "request.body") : undefined;
      if (bodyPath && body) writeFileSync(bodyPath, body, { mode: 0o600 });
      const headerOutPath = path.join(dir, "response.headers");
      const bodyOutPath = path.join(dir, "response.body");
      const config = buildCurlConfig({
        url: request.url,
        method: request.method,
        headers: [...request.headers.entries()],
        bodyPath,
        headerOutPath,
        bodyOutPath,
        timeoutSeconds,
      });
      const result = await runCurl(curlPath, config, init?.signal);
      if (result.code !== 0) {
        throw new TypeError(
          `curl transport failed (exit ${result.code}): ${
            result.stderr.trim().slice(0, 200)
          }`,
        );
      }
      const parsed = parseCurlHeaderDump(readFileSync(headerOutPath, "utf8"));
      const responseBody = readFileSync(bodyOutPath);
      const nullBody = [101, 204, 205, 304].includes(parsed.status);
      // The body is buffered, so drop framing headers that no longer apply.
      const headers = new Headers(
        parsed.headers.filter(([name]) =>
          !["transfer-encoding", "content-length"].includes(
            name.toLowerCase(),
          )
        ),
      );
      return new Response(nullBody ? null : responseBody, {
        status: parsed.status,
        statusText: parsed.statusText,
        headers,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

type GlobalWithProvider = typeof globalThis & {
  AI_SDK_DEFAULT_PROVIDER?: unknown;
};

/**
 * Route AI SDK string model ids (the gateway path in `resolveInferenceModel`)
 * through a gateway provider that uses curl. Returns a restore function.
 */
export function installCurlGatewayTransport(
  options: CurlGatewayOptions = {},
): () => void {
  const target = globalThis as GlobalWithProvider;
  const previous = target.AI_SDK_DEFAULT_PROVIDER;
  target.AI_SDK_DEFAULT_PROVIDER = createGateway({
    fetch: createCurlFetch(options),
    ...(options.baseURL ? { baseURL: options.baseURL } : {}),
  });
  return () => {
    target.AI_SDK_DEFAULT_PROVIDER = previous;
  };
}
