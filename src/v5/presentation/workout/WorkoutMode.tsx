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
}

export function WorkoutMode({
  sessionId,
  exerciseId,
  exerciseName,
  setOrdinal,
  prescribed,
  previous,
  onCompleteSet,
}: WorkoutModeProps) {
  return (
    <section className="v5-workout-mode" aria-labelledby="v5-workout-exercise-title">
      <header className="v5-workout-mode__header">
        <p className="v5-workout-mode__eyebrow">WORKOUT MODE</p>
        <h2 id="v5-workout-exercise-title">{exerciseName}</h2>
        <p>Set {setOrdinal}</p>
      </header>

      <SetLogger
        sessionId={sessionId}
        exerciseId={exerciseId}
        setOrdinal={setOrdinal}
        prescribed={prescribed}
        previous={previous}
        onCompleteSet={onCompleteSet}
      />
    </section>
  );
}
