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
      <body>
        <div
          style={{
            padding: 24,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <h2>Something went wrong</h2>
          <p>
            This is an educational demo. If the error persists, please try again
            later.
          </p>
          {props.error?.digest
            ? <p style={{ opacity: 0.7 }}>Error digest: {props.error.digest}</p>
            : null}
          <button
            type="button"
            onClick={() => props.reset()}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
