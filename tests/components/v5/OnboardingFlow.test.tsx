import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CATALOG_SEED } from "../../../src/v5/domain/exercises/catalog-seed";
import { OnboardingFlow } from "../../../src/v5/presentation/onboarding/OnboardingFlow";

describe("OnboardingFlow", () => {
  it("collects one decision at a time and activates only after explicit program approval", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn().mockResolvedValue(undefined);

    render(<OnboardingFlow catalog={[...CATALOG_SEED]} onActivate={onActivate} />);

    await user.click(screen.getByRole("button", { name: "Beginner" }));
    expect(screen.getByRole("heading", { name: "What is your main goal?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Build muscle" }));
    expect(screen.getByRole("heading", { name: "Choose one specialization" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "V-Shape" }));
    expect(screen.getByRole("heading", { name: "Set your training constraints" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "4 days" }));
    await user.click(screen.getByRole("button", { name: "60 min" }));
    await user.click(screen.getByRole("button", { name: "Commercial gym" }));
    await user.click(screen.getByRole("button", { name: "See structure options" }));

    expect(screen.getByRole("heading", { name: "Choose your training structure" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Choose / })).toHaveLength(3);
    await user.click(screen.getAllByRole("button", { name: /^Choose / })[0]);

    expect(screen.getByRole("heading", { name: "Review your program" })).toBeInTheDocument();
    expect(screen.getByText(/lats and lateral delts/i)).toBeInTheDocument();
    expect(onActivate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Start this program" }));

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate.mock.calls[0][1]).toMatchObject({
      level: "beginner",
      goal: "hypertrophy",
      primarySpecialization: "v_shape",
      constraints: {
        daysPerWeek: 4,
        sessionMinutes: 60,
      },
    });
  });
});
