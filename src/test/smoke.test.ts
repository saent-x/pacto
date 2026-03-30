import { describe, expect, it } from "vitest";
import { getConvexClient } from "@/src/lib/convex";

describe("test harness", () => {
  it("bootstraps the RN test environment", () => {
    expect((globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT).toBe(true);
    expect(getConvexClient).toBeTypeOf("function");
  });
});
