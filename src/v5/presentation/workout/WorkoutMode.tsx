import { useState } from "react";
import type { CompleteSetInput } from "../../application/workouts/complete-set.js";
import type { CompletedSet } from "../../domain/training/set.js";
import { SetLogger, type SetValues } from "./SetLogger.js";
import "./workout.css";

export interface WorkoutModeProps {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  setOrdinal: number;
  prescribed?: SetValues;
  previous?: SetValues;
  onCompleteSet(input: CompleteSetInput): Promise<CompletedSet>;
  completedSetCount?: number;
  totalSetCount?: number;
  onCompleteWorkout?: () => Promise<void>;
}

export function WorkoutMode({
  sessionId,
  exerciseId,
  exerciseName,
  setOrdinal,
  prescribed,
  previous,
  onCompleteSet,
  completedSetCount,
  totalSetCount,
  onCompleteWorkout,
}: WorkoutModeProps) {
  const [finishStatus, setFinishStatus] = useState<"idle" | "saving" | "error">("idle");
  const [finishError, setFinishError] = useState<string | null>(null);
  const allSetsComplete =
    completedSetCount !== undefined &&
    totalSetCount !== undefined &&
    totalSetCount > 0 &&
    completedSetCount >= totalSetCount;

  async function finishWorkout(): Promise<void> {
    if (!onCompleteWorkout || finishStatus === "saving") return;
    setFinishStatus("saving");
    setFinishError(null);
    try {
      await onCompleteWorkout();
    } catch (error: unknown) {
      setFinishError(error instanceof Error ? error.message : "Unable to complete workout");
      setFinishStatus("error");
    }
  }

  return (
    <section className="v5-workout-mode" aria-labelledby="v5-workout-exercise-title">
      <header className="v5-workout-mode__header">
        <p className="v5-workout-mode__eyebrow">WORKOUT MODE</p>
        <h2 id="v5-workout-exercise-title">{exerciseName}</h2>
        <p>Set {setOrdinal}</p>
        {completedSetCount !== undefined && totalSetCount !== undefined && (
          <p>{completedSetCount} / {totalSetCount} sets complete</p>
        )}
      </header>

      {allSetsComplete && onCompleteWorkout ? (
        <>
          <button
            className="v5-set-logger__primary"
            type="button"
            disabled={finishStatus === "saving"}
            onClick={() => void finishWorkout()}
          >
            {finishStatus === "saving" ? "Finishing…" : "Complete workout"}
          </button>
          {finishStatus === "error" && finishError && <p role="alert">{finishError}</p>}
        </>
      ) : (
        <SetLogger
          key={`${exerciseId}:${setOrdinal}`}
          sessionId={sessionId}
          exerciseId={exerciseId}
          setOrdinal={setOrdinal}
          prescribed={prescribed}
          previous={previous}
          onCompleteSet={onCompleteSet}
        />
      )}
    </section>
  );
}
