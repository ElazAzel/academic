// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

const { getGlobalErrorMetadata } = await import("@/components/providers");

describe("Providers global error logging", () => {
  it("does not include raw browser error messages, filenames, or stack traces", () => {
    const error = new Error("postgres://secret-global-provider-error");
    error.stack = "stack with postgres://secret-global-provider-stack";

    const payload = getGlobalErrorMetadata({
      error,
      filename: "https://academy.example/app?token=secret-filename-token",
      lineno: 42,
      colno: 7,
    } as ErrorEvent);

    const serialized = JSON.stringify(payload);

    expect(payload).toEqual({
      errorType: "Error",
      hasSource: true,
      lineno: 42,
      colno: 7,
    });
    expect(serialized).not.toContain("secret-global-provider-error");
    expect(serialized).not.toContain("secret-global-provider-stack");
    expect(serialized).not.toContain("secret-filename-token");
  });
});
