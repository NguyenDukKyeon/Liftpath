import { useState, type FormEvent } from "react";
import type { CompleteSetInput } from "../../application/workouts/complete-set.js";
import type { CompletedSet } from "../../domain/training/set.js";

export interface SetValues {
  loadKg?: number;
  reps?: number;
  rir?: number;
}

export interface SetLoggerProps {
  sessionId: string;
  exerciseId: string;
  setOrdinal: number;
  prescribed?: SetValues;
  previous?: SetValues;
  onCompleteSet(input: CompleteSetInput): Promise<CompletedSet>;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function initialValue(primary: number | undefined, fallback: number | undefined): string {
  const value = primary ?? fallback;
  return value === undefined ? "" : String(value);
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

function valueLabel(value: number | undefined, suffix = ""): string {
  return value === undefined ? "—" : `${value}${suffix}`;
}

export function SetLogger({
  sessionId,
  exerciseId,
  setOrdinal,
  prescribed,
  previous,
  onCompleteSet,
}: SetLoggerProps) {
  const [loadKg, setLoadKg] = useState(() => initialValue(prescribed?.loadKg, previous?.loadKg));
  const [reps, setReps] = useState(() => initialValue(prescribed?.reps, previous?.reps));
  const [rir, setRir] = useState(() => initialValue(prescribed?.rir, previous?.rir));
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status === "saving") return;

    setStatus("saving");
    setErrorMessage(null);

    const input: CompleteSetInput = { sessionId, exerciseId, setOrdinal };
    const parsedLoad = optionalNumber(loadKg);
    const parsedReps = optionalNumber(reps);
    const parsedRir = optionalNumber(rir);
    if (parsedLoad !== undefined) input.loadKg = parsedLoad;
    if (parsedReps !== undefined) input.reps = parsedReps;
    if (parsedRir !== undefined) input.rir = parsedRir;

    try {
      await onCompleteSet(input);
      setStatus("saved");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save set");
      setStatus("error");
    }
  }

  return (
    <form className="v5-set-logger" onSubmit={(event) => void submit(event)}>
      {previous && (
        <p className="v5-set-logger__previous">
          Previous: {valueLabel(previous.loadKg, " kg")} × {valueLabel(previous.reps)} @ RIR{" "}
          {valueLabel(previous.rir)}
        </p>
      )}

      <div className="v5-set-logger__fields">
        <label>
          <span>Load (kg)</span>
          <input
            type="number"
            min="0"
            step="0.5"
            inputMode="decimal"
            value={loadKg}
            onChange={(event) => setLoadKg(event.currentTarget.value)}
          />
        </label>
        <label>
          <span>Reps</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={reps}
            onChange={(event) => setReps(event.currentTarget.value)}
          />
        </label>
        <label>
          <span>RIR</span>
          <input
            type="number"
            min="0"
            max="10"
            step="1"
            inputMode="numeric"
            value={rir}
            onChange={(event) => setRir(event.currentTarget.value)}
          />
        </label>
      </div>

      <button className="v5-set-logger__primary" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : "Complete set"}
      </button>

      {status === "saved" && <p className="v5-set-logger__saved">Set saved</p>}
      {status === "error" && errorMessage && <p role="alert">{errorMessage}</p>}
    </form>
  );
}
