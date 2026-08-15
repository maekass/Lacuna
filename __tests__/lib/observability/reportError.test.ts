import { beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.fn();
const addBreadcrumb = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  addBreadcrumb: (...args: unknown[]) => addBreadcrumb(...args),
}));

describe("reportError", () => {
  beforeEach(() => {
    captureException.mockClear();
    addBreadcrumb.mockClear();
  });

  it("logs, captures and returns the message (success)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    const { reportError } = await import("@/lib/observability/reportError");

    const message = reportError("db.rollback", new Error("connection lost"), {
      dealId: "sec-1",
    });

    expect(message).toBe("connection lost");
    expect(consoleError).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledOnce();
    const [captured, options] = captureException.mock.calls[0] as [
      Error,
      { extra: Record<string, unknown> },
    ];
    expect(captured.message).toBe("connection lost");
    expect(options.extra).toEqual({ scope: "db.rollback", dealId: "sec-1" });
  });

  it("wraps non-Error throwables (edge)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { reportError } = await import("@/lib/observability/reportError");

    expect(reportError("scope", { weird: true })).toBe("Unknown error");
    const [captured] = captureException.mock.calls[0] as [Error];
    expect(captured).toBeInstanceOf(Error);
    expect(captured.message).toBe("scope: Unknown error");
  });

  it("reportWarning breadcrumbs instead of capturing (success)", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { reportWarning } = await import("@/lib/observability/reportError");

    expect(reportWarning("watchlist.save", "quota exceeded")).toBe(
      "quota exceeded",
    );
    expect(consoleWarn).toHaveBeenCalledOnce();
    expect(addBreadcrumb).toHaveBeenCalledOnce();
    expect(captureException).not.toHaveBeenCalled();
  });
});
