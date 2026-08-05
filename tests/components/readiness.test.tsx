import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getProgram } from "../../src/data.js";
import { defaultState } from "../../src/domain/storage.js";
import { ReadinessCheck } from "../../src/features/workout/ReadinessCheck.js";
import { prepareWorkoutFromState } from "../../src/features/workout/preparation.js";

describe("ReadinessCheck", () => {
  it("shows low-energy short-session changes and confirms the displayed input", async () => {
    const state = defaultState();
    state.profile.onboardingComplete = true;
    const program = getProgram(state.settings.programId, state.customPrograms);
    const prepared = prepareWorkoutFromState(state, program.workouts[0].id);
    expect(prepared).not.toBeNull();

    const confirm = vi.fn(() => null);
    const user = userEvent.setup();
    render(<ReadinessCheck prepared={prepared!} confirm={confirm} cancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /thấp/i }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "35" } });

    expect(screen.getByText(/35 phút/i)).toBeInTheDocument();
    expect(screen.getAllByText(/năng lượng hôm nay thấp|thời gian hôm nay ngắn/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/bài phụ bỏ/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /xác nhận và bắt đầu/i }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      energy: "low",
      availableMinutes: 35,
      pain: null,
    }));
  });
});
