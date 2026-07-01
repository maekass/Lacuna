import * as Sentry from "@sentry/nextjs";

export async function register() {
  // `process` is a global in both Node.js and Edge runtimes — no node:process import needed
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
