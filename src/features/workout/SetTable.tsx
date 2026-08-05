import { Check, Copy, Minus, Plus, Undo2 } from "lucide-react";
import { isCompletableSet } from "../../domain/training.js";
import type {
  EffortLanguage,
  ExerciseEntry,
  SetEntry,
  SetKind,
  TrackingMode,
} from "../../types.js";

const kindLabel: Record<SetKind, string> = {
  warmup: "Khởi động",
  working: "Chính",
  drop: "Drop",
};

const trackingModeFor = (entry: ExerciseEntry): TrackingMode => {
  if (entry.snapshot.trackingMode) return entry.snapshot.trackingMode;
  if (entry.snapshot.suffix === "seconds") return "duration";
  if (entry.snapshot.incrementKg === 0) return "bodyweight-reps";
  return "weight-reps";
};

const previousCandidate = (
  previousEntry: ExerciseEntry | null | undefined,
  index: number,
  kind: SetKind,
) => {
  if (!previousEntry) return null;
  const sameKind = previousEntry.sets.filter((set) => set.done && set.kind === kind);
  const working = previousEntry.sets.filter((set) => set.done && set.kind !== "warmup");
  return sameKind[index] ?? sameKind.at(-1) ?? working[index] ?? working.at(-1) ?? null;
};

const previousLabel = (set: SetEntry | null, mode: TrackingMode) => {
  if (!set) return "Chưa có";
  if (mode === "duration") return `${set.reps || "—"} giây`;
  if (mode === "distance") return `${set.reps || "—"} m`;
  if (mode === "bodyweight-reps") return `${set.reps || "—"} reps`;
  if (mode === "assisted-reps") return `Hỗ trợ ${set.weight || "—"} kg × ${set.reps || "—"}`;
  if (mode === "weighted-bodyweight-reps") return `+${set.weight || "—"} kg × ${set.reps || "—"}`;
  return `${set.weight || "—"} kg × ${set.reps || "—"}`;
};

const metricLabel = (mode: TrackingMode) => {
  if (mode === "duration") return "Giây";
  if (mode === "distance") return "Mét";
  return "Reps";
};

const loadLabel = (mode: TrackingMode) => {
  if (mode === "assisted-reps") return "Hỗ trợ";
  if (mode === "weighted-bodyweight-reps") return "+Kg";
  return "Kg";
};

const hasLoad = (mode: TrackingMode) => mode === "weight-reps"
  || mode === "assisted-reps"
  || mode === "weighted-bodyweight-reps";

export type SetTableProps = {
  entry: ExerciseEntry;
  previousEntry?: ExerciseEntry | null;
  exerciseIndex: number;
  effortLanguage: EffortLanguage;
  updateSet: (exerciseIndex: number, setIndex: number, patch: Partial<SetEntry>) => void;
  completeSet: (exerciseIndex: number, setIndex: number) => number | null;
  undoSet: (exerciseIndex: number, setIndex: number) => void;
  copyPreviousSet: (exerciseIndex: number, setIndex: number) => void;
  onRest: (seconds: number) => void;
};

export function SetTable({
  entry,
  previousEntry,
  exerciseIndex,
  effortLanguage,
  updateSet,
  completeSet,
  undoSet,
  copyPreviousSet,
  onRest,
}: SetTableProps) {
  const mode = trackingModeFor(entry);
  const loadColumn = hasLoad(mode);
  const increment = entry.snapshot.incrementKg > 0 ? entry.snapshot.incrementKg : 1;

  const finishSet = (setIndex: number) => {
    const rest = completeSet(exerciseIndex, setIndex);
    if (rest) onRest(rest);
  };

  return (
    <div className={`guided-set-table mode-${mode}`} role="table" aria-label={`Các hiệp ${entry.snapshot.name}`}>
      <div className="guided-set-head" role="row">
        <span role="columnheader">Set</span>
        <span role="columnheader">Trước</span>
        {loadColumn && <span role="columnheader">{loadLabel(mode)}</span>}
        <span role="columnheader">{metricLabel(mode)}</span>
        <span role="columnheader">Gắng sức</span>
        <span role="columnheader">Done</span>
      </div>

      {entry.sets.map((set, setIndex) => {
        const previous = previousCandidate(previousEntry, setIndex, set.kind);
        const canComplete = !set.done && isCompletableSet(set);
        return (
          <div className={`guided-set-row ${set.done ? "complete" : ""}`} role="row" key={set.id}>
            <div className="guided-set-index" role="cell">
              <strong>{setIndex + 1}</strong>
              <select
                aria-label={`Loại hiệp ${setIndex + 1}`}
                value={set.kind}
                disabled={set.done}
                onChange={(event) => updateSet(exerciseIndex, setIndex, { kind: event.target.value as SetKind })}
              >
                {(["warmup", "working", "drop"] as SetKind[]).map((kind) => (
                  <option key={kind} value={kind}>{kindLabel[kind]}</option>
                ))}
              </select>
            </div>

            <div role="cell" className="previous-cell">
              <button
                type="button"
                disabled={!previous || set.done}
                aria-label={`Sao chép kết quả lần trước vào hiệp ${setIndex + 1}`}
                onClick={() => copyPreviousSet(exerciseIndex, setIndex)}
              >
                <Copy size={14} />
                <span>{previousLabel(previous, mode)}</span>
              </button>
            </div>

            {loadColumn && (
              <div role="cell" className="load-cell">
                <button
                  type="button"
                  aria-label={`Giảm ${increment} kg ở hiệp ${setIndex + 1}`}
                  disabled={set.done}
                  onClick={() => updateSet(exerciseIndex, setIndex, {
                    weight: String(Math.max(0, (Number(set.weight) || 0) - increment)),
                  })}
                ><Minus size={14} /></button>
                <input
                  aria-label={`${loadLabel(mode)} hiệp ${setIndex + 1}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={set.weight}
                  disabled={set.done}
                  placeholder="—"
                  onChange={(event) => updateSet(exerciseIndex, setIndex, { weight: event.target.value })}
                />
                <button
                  type="button"
                  aria-label={`Tăng ${increment} kg ở hiệp ${setIndex + 1}`}
                  disabled={set.done}
                  onClick={() => updateSet(exerciseIndex, setIndex, {
                    weight: String((Number(set.weight) || 0) + increment),
                  })}
                ><Plus size={14} /></button>
              </div>
            )}

            <div role="cell">
              <input
                aria-label={`${metricLabel(mode)} hiệp ${setIndex + 1}`}
                type="number"
                inputMode={mode === "distance" ? "decimal" : "numeric"}
                min="0"
                step={mode === "distance" ? "0.1" : "1"}
                value={set.reps}
                disabled={set.done}
                placeholder="—"
                onChange={(event) => updateSet(exerciseIndex, setIndex, { reps: event.target.value })}
              />
            </div>

            <div role="cell">
              {effortLanguage === "simple-rir" ? (
                <select
                  aria-label={`Số reps còn dự trữ hiệp ${setIndex + 1}, tùy chọn`}
                  value={set.rpe ? String(Math.max(0, 10 - Number(set.rpe))) : ""}
                  disabled={set.done}
                  onChange={(event) => updateSet(exerciseIndex, setIndex, {
                    rpe: event.target.value === "" ? "" : String(10 - Number(event.target.value)),
                  })}
                >
                  <option value="">Không nhập</option>
                  <option value="4">Còn 4+ reps</option>
                  <option value="3">Còn 3 reps</option>
                  <option value="2">Còn 2 reps</option>
                  <option value="1">Còn 1 rep</option>
                  <option value="0">Không còn rep</option>
                </select>
              ) : (
                <input
                  aria-label={`RPE hiệp ${setIndex + 1}, tùy chọn`}
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="10"
                  step="0.5"
                  value={set.rpe}
                  disabled={set.done}
                  placeholder="Tuỳ chọn"
                  onChange={(event) => updateSet(exerciseIndex, setIndex, { rpe: event.target.value })}
                />
              )}
            </div>

            <div role="cell" className="guided-set-actions">
              {set.done ? (
                <button type="button" aria-label={`Hoàn tác hiệp ${setIndex + 1}`} onClick={() => undoSet(exerciseIndex, setIndex)}>
                  <Undo2 size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  className="complete-set"
                  disabled={!canComplete}
                  aria-label={`Hoàn thành hiệp ${setIndex + 1}`}
                  onClick={() => finishSet(setIndex)}
                >
                  <Check size={18} />
                </button>
              )}
            </div>
          </div>
        );
      })}
      <p className="set-table-hint">Gắng sức là tùy chọn. Warm-up không được tính vào progression hoặc PR.</p>
    </div>
  );
}
