import { describe, expect, it } from "vitest";
import { formatReviewAuthError } from "@/lib/infra/reviewAuthError";

describe("formatReviewAuthError", () => {
  it("maps known OAuth errors (success)", () => {
    expect(formatReviewAuthError("access_denied")).toBe(
      "GitHub sign-in was cancelled.",
    );
    expect(formatReviewAuthError("invalid_oauth_state")).toBe(
      "Sign-in expired. Try GitHub again.",
    );
  });

  it("hides allowlist internals (error)", () => {
    expect(
      formatReviewAuthError(
        "GitHub user outsider is not on the reviewer allowlist",
      ),
    ).toBe("That GitHub account is not on the reviewer allowlist.");
  });
});
