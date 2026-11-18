import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { generateText } from "ai";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildCurlConfig,
  createCurlFetch,
  installCurlGatewayTransport,
  parseCurlHeaderDump,
  quoteCurlConfig,
} from "@/lib/ai/evals/lift/curlTransport";
import { describeError } from "@/lib/ai/evals/lift/runner";

interface Seen {
  method?: string;
  url?: string;
  headers: IncomingMessage["headers"];
  body: string;
}

let server: Server;
let base = "";
const seen: Seen[] = [];

beforeAll(async () => {
  vi.stubEnv("NO_PROXY", "127.0.0.1,localhost");
  vi.stubEnv("no_proxy", "127.0.0.1,localhost");
  server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => (body += chunk));
    req.on("end", () => {
      seen.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body,
      });
      if (req.url?.startsWith("/gateway")) {
        // Mirrors the AI Gateway's verification error shape.
        res.writeHead(403, { "content-type": "application/json" });
        res.end(JSON.stringify({
          error: {
            message: "AI Gateway requires a valid credit card on file.",
            type: "customer_verification_required",
          },
        }));
        return;
      }
      if (req.url === "/empty") {
        res.writeHead(204);
        res.end();
        return;
      }
      res.writeHead(201, {
        "content-type": "application/json",
        "x-test": "yes",
      });
      res.end(JSON.stringify({ echoed: body }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("curl transport config", () => {
  it("quotes config values and rejects header injection", () => {
    expect(quoteCurlConfig('a "b" \\c')).toBe('"a \\"b\\" \\\\c"');
    expect(() => quoteCurlConfig("x\nurl = evil")).toThrow(/newlines/);
  });

  it("drops framing and encoding headers", () => {
    const config = buildCurlConfig({
      url: "https://example.test/v1",
      method: "POST",
      headers: [
        ["authorization", "Bearer placeholder"],
        ["accept-encoding", "gzip"],
        ["content-length", "12"],
      ],
      bodyPath: "/tmp/b",
      headerOutPath: "/tmp/h",
      bodyOutPath: "/tmp/o",
      timeoutSeconds: 5,
    });
    expect(config).toContain('header = "authorization: Bearer placeholder"');
    expect(config).not.toMatch(/accept-encoding|content-length/);
    expect(config).toContain('data-binary = "@/tmp/b"');
  });

  it("uses the final header block after CONNECT and 100 Continue", () => {
    const parsed = parseCurlHeaderDump(
      "HTTP/1.1 200 Connection established\r\n\r\n" +
        "HTTP/1.1 100 Continue\r\n\r\n" +
        "HTTP/2 403 \r\ncontent-type: application/json\r\nx-a: b:c\r\n\r\n",
    );
    expect(parsed.status).toBe(403);
    expect(parsed.headers).toEqual([
      ["content-type", "application/json"],
      ["x-a", "b:c"],
    ]);
    expect(() => parseCurlHeaderDump("")).toThrow(/no HTTP response/);
  });
});

describe("curl fetch", () => {
  it("round-trips method, headers, body, and status", async () => {
    const curlFetch = createCurlFetch({ timeoutSeconds: 10 });
    const response = await curlFetch(`${base}/echo`, {
      method: "POST",
      headers: {
        authorization: "Bearer placeholder",
        "content-type": "application/json",
        "accept-encoding": "gzip",
      },
      body: JSON.stringify({ q: 'say "ok"' }),
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("x-test")).toBe("yes");
    expect(await response.json()).toEqual({ echoed: '{"q":"say \\"ok\\""}' });
    const request = seen.at(-1) as Seen;
    expect(request.method).toBe("POST");
    expect(request.headers.authorization).toBe("Bearer placeholder");
    expect(request.headers["accept-encoding"]).toBeUndefined();
  });

  it("returns a null body for 204", async () => {
    const response = await createCurlFetch()(`${base}/empty`);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("keeps headers out of argv and surfaces curl failures", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "fake-curl-"));
    const argvFile = path.join(dir, "argv");
    const fakeCurl = path.join(dir, "curl");
    writeFileSync(
      fakeCurl,
      `#!/bin/sh\necho "$@" > "${argvFile}"\ncat > /dev/null\necho "boom" >&2\nexit 7\n`,
    );
    chmodSync(fakeCurl, 0o755);
    await expect(
      createCurlFetch({ curlPath: fakeCurl })(`${base}/echo`, {
        headers: { authorization: "Bearer should-not-leak" },
      }),
    ).rejects.toThrow(/exit 7/);
    expect(readFileSync(argvFile, "utf8").trim()).toBe("--config -");
  });

  it("aborts the subprocess on signal", async () => {
    const controller = new AbortController();
    controller.abort(new Error("stop"));
    await expect(
      createCurlFetch()(`${base}/echo`, { signal: controller.signal }),
    ).rejects.toThrow(/stop/);
  });
});

describe("curl gateway transport", () => {
  it("routes string model ids through curl and restores the default", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "placeholder-not-a-secret");
    const target = globalThis as { AI_SDK_DEFAULT_PROVIDER?: unknown };
    const before = target.AI_SDK_DEFAULT_PROVIDER;
    const restore = installCurlGatewayTransport({
      baseURL: `${base}/gateway/v1/ai`,
    });
    try {
      const hits = seen.length;
      await expect(
        generateText({
          model: "openai/gpt-4o-mini",
          prompt: "Say ok",
          temperature: 0,
          maxRetries: 0,
        }),
      ).rejects.toThrow();
      const request = seen.at(-1) as Seen;
      expect(seen.length).toBe(hits + 1);
      expect(request.url).toMatch(/^\/gateway\/v1\/ai\//);
      expect(request.headers.authorization).toBe(
        "Bearer placeholder-not-a-secret",
      );
    } finally {
      restore();
    }
    expect(target.AI_SDK_DEFAULT_PROVIDER).toBe(before);
  });
});

describe("transport isolation", () => {
  it("keeps the curl transport out of production inference modules", () => {
    const root = path.resolve(__dirname, "../../../..");
    for (
      const file of [
        "src/lib/ai/inference.ts",
        "src/lib/ai/rag/answer.ts",
        "src/lib/ai/rag/index.ts",
        "src/lib/ai/evals/lift/index.ts",
      ]
    ) {
      expect(readFileSync(path.join(root, file), "utf8")).not.toMatch(
        /curlTransport/,
      );
    }
  });
});

describe("error descriptions", () => {
  it("includes name, status, and a capped message", () => {
    const error = Object.assign(new Error("Payment   required\nnow"), {
      name: "GatewayAuthenticationError",
      statusCode: 403,
    });
    expect(describeError(error)).toBe(
      "GatewayAuthenticationError status=403 Payment required now",
    );
    expect(describeError(new Error("x".repeat(500))).length).toBeLessThan(200);
    expect(describeError("nope")).toBe("inference_error");
  });
});
