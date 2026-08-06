import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getProgram } from "../../src/data.js";
import { ReadinessCheck } from "../../src/features/workout/ReadinessCheck.js";
import { prepareWorkoutFromState } from "../../src/features/workout/preparation.js";
import { shortSessionUserState } from "../helpers/app-fixtures.js";

const preparedFixture = () => {
  const state = shortSessionUserState();
  const program = getProgram(state.settings.programId, state.customPrograms);
  const prepared = prepareWorkoutFromState(state, program.workouts[0].id);
  expect(prepared).not.toBeNull();
  return { state, prepared: prepared! };
};

describe("ReadinessCheck", () => {
  it("starts the planned workout through the fast path with the prepared duration", async () => {
    const { state, prepared } = preparedFixture();
    const confirm = vi.fn(() => null);
    const user = userEvent.setup();

    render(<ReadinessCheck prepared={prepared} confirm={confirm} cancel={vi.fn()} />);

    expect(screen.getByRole("button", { name: /tập như kế hoạch/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tôi cần điều chỉnh/i })).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tập như kế hoạch/i }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith({
      energy: "normal",
      soreness: "manageable",
      pain: null,
      availableMinutes: state.profile.sessionMinutes,
    });
  });

  it("reveals adjustment controls and confirms the displayed short-session input", async () => {
    const { prepared } = preparedFixture();
    expect(prepared.prescriptions.slice(0, 2).every((item) => item.priority === "primary")).toBe(true);
    expect(prepared.prescriptions.some((item) => item.optional || item.priority === "accessory")).toBe(true);

    const confirm = vi.fn(() => null);
    const user = userEvent.setup();
    render(<ReadinessCheck prepared={prepared} confirm={confirm} cancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /tôi cần điều chỉnh/i }));
    await user.click(screen.getByRole("button", { name: /thấp/i }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "35" } });

    expect(screen.getByText(/35 phút/i)).toBeInTheDocument();
    expect(screen.getAllByText(/năng lượng hôm nay thấp|thời gian hôm nay ngắn/i).length).toBeGreaterThan(0);
    const removedValue = screen.getByText("bài phụ bỏ").closest("span")?.querySelector("strong");
    expect(removedValue).not.toBeNull();
    expect(removedValue).not.toHaveTextContent("0");

    await user.click(screen.getByRole("button", { name: /áp dụng và bắt đầu/i }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      energy: "low",
      availableMinutes: 35,
      pain: null,
    }));
  });
});
