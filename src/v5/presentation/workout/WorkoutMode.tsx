import { useEffect, useState } from "react";
import type { Clock } from "../../application/ports/clock.js";
import type { CompleteSetInput } from "../../application/workouts/complete-set.js";
import {
  remainingRestSeconds,
  type RestTimerState,
} from "../../application/workouts/rest-timer.js";
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
  clock: Clock;
  restTargetSeconds?: number;
  completedSetCount?: number;
  totalSetCount?: number;
  onCompleteWorkout?: () => Promise<void>;
}

function formatRest(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function WorkoutMode({
  sessionId,
  exerciseId,
  exerciseName,
  setOrdinal,
  prescribed,
  previous,
  onCompleteSet,
  clock,
  restTargetSeconds = 120,
  completedSetCount,
  totalSetCount,
  onCompleteWorkout,
}: WorkoutModeProps) {
  const [finishStatus, setFinishStatus] = useState<"idle" | "saving" | "error">("idle");
  const [finishError, setFinishError] = useState<string | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [restNow, setRestNow] = useState(() => clock.now());
  const allSetsComplete =
    completedSetCount !== undefined &&
    totalSetCount !== undefined &&
    totalSetCount > 0 &&
    completedSetCount >= totalSetCount;
  const restRemaining = restTimer ? remainingRestSeconds(restTimer, restNow) : null;

  useEffect(() => {
    if (!restTimer) return undefined;
    const timer = window.setInterval(() => setRestNow(clock.now()), 1000);
    return () => window.clearInterval(timer);
  }, [clock, restTimer]);

  async function commitSet(input: CompleteSetInput): Promise<CompletedSet> {
    const committed = await onCompleteSet(input);
    setRestTimer({ startedAt: committed.completedAt, targetSeconds: restTargetSeconds });
    setRestNow(clock.now());
    return committed;
  }

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
        {restRemaining !== null && (
          <p data-testid="rest-timer" role="timer" aria-live="off">
            Rest: {formatRest(restRemaining)}
          </p>
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
          onCompleteSet={commitSet}
        />
      )}
    </section>
  );
}
