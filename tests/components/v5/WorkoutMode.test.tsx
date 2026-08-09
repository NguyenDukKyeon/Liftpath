import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkoutMode } from "../../../src/v5/presentation/workout/WorkoutMode";
import type { CompletedSet } from "../../../src/v5/domain/training/set";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function completedSet(reps: number): CompletedSet {
  return {
    id: "set-committed",
    sessionId: "session-1",
    exerciseId: "exercise-1",
    setOrdinal: 1,
    loadKg: 30,
    reps,
    rir: 2,
    completedAt: "2026-08-07T08:20:00.000Z",
    createdAt: "2026-08-07T08:20:00.000Z",
    updatedAt: "2026-08-07T08:20:00.000Z",
    revision: 1,
  };
}

describe("WorkoutMode", () => {
  it("shows saved only after persistence resolves", async () => {
    const user = userEvent.setup();
    const pending = deferred<CompletedSet>();
    const onCompleteSet = vi.fn(() => pending.promise);

    render(
      <WorkoutMode
        sessionId="session-1"
        exerciseId="exercise-1"
        exerciseName="Lat Pulldown"
        setOrdinal={1}
        prescribed={{ loadKg: 30, reps: 10, rir: 2 }}
        previous={{ loadKg: 27.5, reps: 9, rir: 2 }}
        onCompleteSet={onCompleteSet}
      />,
    );

    expect(screen.getByText(/Previous: 27.5 kg × 9 @ RIR 2/i)).toBeInTheDocument();
    const reps = screen.getByRole("spinbutton", { name: "Reps" });
    await user.clear(reps);
    await user.type(reps, "11");
    await user.click(screen.getByRole("button", { name: "Complete set" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.queryByText("Set saved")).not.toBeInTheDocument();

    pending.resolve(completedSet(11));

    expect(await screen.findByText("Set saved")).toBeInTheDocument();
    expect(onCompleteSet).toHaveBeenCalledWith({
      sessionId: "session-1",
      exerciseId: "exercise-1",
      setOrdinal: 1,
      loadKg: 30,
      reps: 11,
      rir: 2,
    });
  });

  it("keeps entered values when persistence rejects", async () => {
    const user = userEvent.setup();
    const onCompleteSet = vi.fn().mockRejectedValue(new Error("storage failed"));

    render(
      <WorkoutMode
        sessionId="session-1"
        exerciseId="exercise-1"
        exerciseName="Lat Pulldown"
        setOrdinal={1}
        prescribed={{ loadKg: 30, reps: 10, rir: 2 }}
        previous={{ loadKg: 27.5, reps: 9, rir: 2 }}
        onCompleteSet={onCompleteSet}
      />,
    );

    const reps = screen.getByRole("spinbutton", { name: "Reps" });
    await user.clear(reps);
    await user.type(reps, "11");
    await user.click(screen.getByRole("button", { name: "Complete set" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("storage failed");
    expect(reps).toHaveValue(11);
    expect(screen.queryByText("Set saved")).not.toBeInTheDocument();
  });
});
