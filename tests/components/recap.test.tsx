import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkoutCoachRecap } from "../../src/features/coach/recap.js";
import { WorkoutRecapModal } from "../../src/features/workout/WorkoutRecap.js";
import type { useGuidedAppState } from "../../src/guided-state.js";

const recap: WorkoutCoachRecap = {
  sessionId: "session-1",
  generatedAt: "2026-08-05T14:00:00.000Z",
  durationMinutes: 52,
  totalSets: 9,
  volume: 2400,
  prs: [],
  strongestExercise: "Dumbbell Bench Press",
  nextAction: "Tăng lên 22 kg",
  wentWell: [{
    reasonCode: "recap-plan-adherence",
    headline: "Bạn hoàn thành bài chính",
    explanation: "Các working set chính được ghi lại đúng kế hoạch.",
  }],
  attention: [{
    reasonCode: "recap-recovery-attention",
    headline: "Theo dõi hồi phục",
    explanation: "Giữ thêm reps dự trữ khi năng lượng thấp.",
  }],
  nextTime: [{
    reasonCode: "progression-top-range-complete",
    headline: "Dumbbell Bench Press: tăng lên 22 kg",
    explanation: "Mọi working set đạt đầu trên rep range với effort phù hợp.",
    exerciseId: "db_bench",
  }],
  exerciseDecisions: [],
  readinessEvidence: null,
};

describe("WorkoutRecapModal", () => {
  it("promotes the next action while preserving the three coaching questions", () => {
    const dismissRecap = vi.fn();
    const app = {
      state: { lastRecap: recap },
      dismissRecap,
    } as unknown as ReturnType<typeof useGuidedAppState>;

    render(<WorkoutRecapModal app={app} />);

    const priority = screen.getByRole("heading", { name: /ưu tiên buổi tiếp theo/i });
    const promoted = screen.getByRole("heading", { name: /dumbbell bench press: tăng lên 22 kg/i });
    const wentWell = screen.getByRole("heading", { name: /hôm nay bạn làm tốt điều gì/i });
    const attention = screen.getByRole("heading", { name: /có gì cần chú ý/i });
    const nextTime = screen.getByRole("heading", { name: /lần sau sẽ thay đổi gì/i });
    const metrics = screen.getByText(/chi tiết buổi tập/i);

    expect(priority).toBeInTheDocument();
    expect(promoted).toBeInTheDocument();
    expect(promoted.compareDocumentPosition(wentWell) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(wentWell).toBeInTheDocument();
    expect(attention).toBeInTheDocument();
    expect(nextTime).toBeInTheDocument();
    expect(nextTime.compareDocumentPosition(metrics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText(/mọi working set đạt đầu trên rep range/i).length).toBeGreaterThan(0);
  });
});
