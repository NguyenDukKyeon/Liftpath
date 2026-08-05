import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SetTable } from "../../src/features/workout/SetTable.js";
import type { ExerciseEntry } from "../../src/types.js";

const entry = (overrides: Partial<ExerciseEntry> = {}): ExerciseEntry => ({
  exerciseId: "db_bench",
  snapshot: {
    id: "db_bench",
    name: "Dumbbell Bench Press",
    primary: "Ngực",
    secondary: ["Tay sau"],
    equipment: "Tạ đơn + ghế",
    suffix: "reps",
    incrementKg: 2,
    trackingMode: "weight-reps",
    movementPattern: "horizontal-push",
  },
  target: {
    sets: 1,
    min: 8,
    max: 12,
    rest: 90,
    targetRpe: 8,
  },
  sets: [{
    id: "set-1",
    kind: "working",
    weight: "20",
    reps: "10",
    rpe: "",
    done: false,
  }],
  note: "",
  ...overrides,
});

describe("SetTable", () => {
  it("requests the corresponding previous set and completes with blank effort", async () => {
    const user = userEvent.setup();
    const copyPreviousSet = vi.fn();
    const completeSet = vi.fn(() => 90);
    const onRest = vi.fn();
    const previousEntry = entry({
      sets: [{
        id: "previous-1",
        kind: "working",
        weight: "20",
        reps: "10",
        rpe: "8",
        done: true,
      }],
    });

    render(
      <SetTable
        entry={entry()}
        previousEntry={previousEntry}
        exerciseIndex={0}
        effortLanguage="simple-rir"
        updateSet={vi.fn()}
        completeSet={completeSet}
        undoSet={vi.fn()}
        copyPreviousSet={copyPreviousSet}
        onRest={onRest}
      />,
    );

    expect(screen.getByText("20 kg × 10")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /sao chép kết quả lần trước vào hiệp 1/i }));
    expect(copyPreviousSet).toHaveBeenCalledWith(0, 0);

    const complete = screen.getByRole("button", { name: /hoàn thành hiệp 1/i });
    expect(complete).toBeEnabled();
    expect(screen.getByRole("combobox", { name: /số reps còn dự trữ hiệp 1, tùy chọn/i })).toHaveValue("");
    await user.click(complete);
    expect(completeSet).toHaveBeenCalledWith(0, 0);
    expect(onRest).toHaveBeenCalledWith(90);
  });
});
