"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError(
  props: { error: Error & { digest?: string }; reset: () => void },
) {
  useEffect(() => {
    Sentry.captureException(props.error);
  }, [props.error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "linear-gradient(135deg, #faf7f8 0%, #ede8f5 100%)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "white",
            borderRadius: 16,
            border: "1px solid rgba(167,139,218,0.3)",
            padding: 40,
            boxShadow: "0 4px 24px rgba(91,59,140,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "linear-gradient(135deg, #7c5cbf, #a78bda)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 18,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              L
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#3b1f6e" }}>
              Lacuna
            </span>
          </div>

          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#3b1f6e",
              margin: "0 0 10px",
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "#5b6a8a",
              margin: "0 0 24px",
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Your data has not been affected. If
            the problem persists, check{" "}
            <a
              href="/api/health"
              style={{ color: "#7c5cbf", textDecoration: "underline" }}
            >
              service status
            </a>
            .
          </p>

          {props.error?.digest && (
            <p
              style={{
                fontSize: 12,
                color: "#9aa3b5",
                fontFamily: "monospace",
                background: "#f7f5fb",
                padding: "8px 12px",
                borderRadius: 8,
                marginBottom: 24,
              }}
            >
              Error ref: {props.error.digest}
            </p>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => props.reset()}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #7c5cbf, #a78bda)",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid rgba(167,139,218,0.4)",
                color: "#5b3b8c",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Back to Hub
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
