import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultProfile } from "../../src/domain/storage.js";
import { OnboardingFlow } from "../../src/features/onboarding/OnboardingFlow.js";

describe("OnboardingFlow", () => {
  it("keeps optional calibration collapsed and submits the exact plan shown in preview", async () => {
    const user = userEvent.setup();
    const complete = vi.fn();
    render(<OnboardingFlow initial={defaultProfile()} onComplete={complete} />);

    expect(screen.getByRole("heading", { name: /bạn muốn ưu tiên điều gì/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /tiếp tục/i }));
    expect(screen.getByRole("heading", { name: /lịch nào bạn thực sự duy trì được/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /tiếp tục/i }));
    expect(screen.getByRole("heading", { name: /hiệu chỉnh mức hướng dẫn/i })).toBeInTheDocument();

    const advanced = screen.getByText(/tùy chỉnh nâng cao/i);
    const restrictionsHeading = screen.getByRole("heading", { name: /^hạn chế chuyển động$/i });
    const recentLoadsHeading = screen.getByRole("heading", { name: /^mức tạ gần đây/i });
    expect(advanced).toBeInTheDocument();
    expect(restrictionsHeading).not.toBeVisible();
    expect(recentLoadsHeading).not.toBeVisible();

    await user.click(advanced);
    expect(restrictionsHeading).toBeVisible();
    expect(recentLoadsHeading).toBeVisible();

    await user.click(screen.getByRole("button", { name: /tiếp tục/i }));

    expect(screen.getByRole("heading", { name: /lộ trình được đề xuất/i })).toBeInTheDocument();
    expect(screen.getByText(/phương án được chọn/i)).toBeInTheDocument();
    expect(screen.getByTestId("athlete-plan-preview")).toHaveAttribute("alt", "");
    const submit = screen.getByRole("button", { name: /dùng lộ trình này/i });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(complete).toHaveBeenCalledTimes(1);
    const [profile, recommendation] = complete.mock.calls[0];
    expect(profile.onboardingComplete).toBe(true);
    expect(recommendation.invalidPrescriptionIds).toHaveLength(0);
    expect(recommendation.program.daysPerWeek).toBe(profile.availableDays);
  });
});
