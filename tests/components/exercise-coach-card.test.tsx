import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ExerciseCoachCard } from "../../src/features/workout/ExerciseCoachCard.js";
import type { CoachDecision } from "../../src/features/coach/contracts.js";
import type { ProgressionResult } from "../../src/features/coach/progression.js";
import type { ExerciseEntry } from "../../src/types.js";

const entry: ExerciseEntry = {
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
  target: { sets: 3, min: 8, max: 12, rest: 90, targetRpe: 8 },
  sets: [],
  note: "",
};

const decision: CoachDecision<ProgressionResult> = {
  value: {
    action: "hold-load",
    targetLoadKg: 20,
    targetReps: null,
    targetSeconds: null,
  },
  reasonCode: "progression-hold-current",
  explanation: "Giữ mức tải hiện tại để hoàn tất toàn bộ rep range với kỹ thuật ổn định.",
  confidence: "medium",
  evidence: [],
};

describe("ExerciseCoachCard", () => {
  it("keeps the long explanation collapsed until requested", async () => {
    const user = userEvent.setup();
    render(<ExerciseCoachCard entry={entry} decision={decision} />);

    expect(screen.getByText(/giữ khoảng 20 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/8–12 reps · nghỉ 90 giây/i)).toBeInTheDocument();
    expect(screen.getByText(decision.explanation)).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: /xem lý do/i }));
    expect(screen.getByText(decision.explanation)).toBeVisible();
    expect(screen.getByRole("button", { name: /ẩn lý do/i })).toBeInTheDocument();
  });
});
