import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { V5PreviewApp } from "../../../src/v5/app/V5PreviewApp";
import { isPreviewDiagnosticsAllowed } from "../../../src/v5/app/preview-diagnostics";
import { LiftPathV5Error } from "../../../src/v5/domain/common/errors";
import { selectRuntime } from "../../../src/v5/app/select-runtime";

describe("selectRuntime", () => {
  it("keeps V4 as default and requires an explicit V5 flag", () => {
    expect(selectRuntime("")).toBe("v4");
    expect(selectRuntime("?v5=1")).toBe("v5");
    expect(selectRuntime("?v5=0")).toBe("v4");
  });
});

describe("preview diagnostics", () => {
  it("allows destructive diagnostics only on local preview hosts", () => {
    expect(isPreviewDiagnosticsAllowed("?v5=1&diagnostics=1", "127.0.0.1")).toBe(true);
    expect(isPreviewDiagnosticsAllowed("?v5=1&diagnostics=1", "localhost")).toBe(true);
    expect(isPreviewDiagnosticsAllowed("?v5=1&diagnostics=1", "liftpath-seven.vercel.app")).toBe(false);
    expect(isPreviewDiagnosticsAllowed("?v5=1", "127.0.0.1")).toBe(false);
  });
});

describe("V5PreviewApp storage health", () => {
  it("surfaces persistence failure and retries instead of swallowing it", async () => {
    const user = userEvent.setup();
    const loadStorageHealth = vi
      .fn()
      .mockRejectedValueOnce(new LiftPathV5Error("STORAGE_ERROR", "quota exceeded"))
      .mockResolvedValueOnce({
        status: "ready" as const,
        databaseInfo: { name: "liftpath-v5", stores: ["metadata"] },
      });

    render(<V5PreviewApp loadStorageHealth={loadStorageHealth} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không thể lưu dữ liệu LiftPath 5");

    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    await waitFor(() => expect(loadStorageHealth).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
