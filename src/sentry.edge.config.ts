import * as Sentry from "@sentry/nextjs";

// Edge runtime: avoid node:process — webpack cannot resolve it in edge bundles.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
