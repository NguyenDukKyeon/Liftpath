import { describe, expect, it } from "vitest";
import { selectRuntime } from "../../../src/v5/app/select-runtime";

describe("selectRuntime", () => {
  it("keeps V4 as default and requires an explicit V5 flag", () => {
    expect(selectRuntime("")).toBe("v4");
    expect(selectRuntime("?v5=1")).toBe("v5");
    expect(selectRuntime("?v5=0")).toBe("v4");
  });
});
