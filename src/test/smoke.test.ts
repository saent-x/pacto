import { describe, expect, it } from "vitest";
import { db } from "@/src/lib/instant";

describe("test harness", () => {
  it("bootstraps the RN test environment", () => {
    expect((globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT).toBe(true);
    expect(db).toBeDefined();
  });
});
