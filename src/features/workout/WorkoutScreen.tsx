import { useMemo, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Info,
  ListPlus,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { allExercises, defaultProgression, formatSeconds } from "../../data.js";
import { latestExerciseEntry } from "../../domain/training.js";
import { useGuidedAppState } from "../../guided-state.js";
import { useRestTimer, useWakeLock } from "../../timers.js";
import type {
  Draft,
  ExerciseEntry,
  LoggedSet,
  SessionFeedback,
  TrackingMode,
} from "../../types.js";
import { ConfirmDialog, Modal, Progress } from "../../components/common.js";
import type { PainConcern } from "../coach/contracts.js";
import { recommendProgression, type ProgressionExposure } from "../coach/progression.js";
import { ExerciseCoachCard } from "./ExerciseCoachCard.js";
import { ExercisePicker } from "./ExercisePicker.js";
import { PlateCalculator } from "./PlateCalculator.js";
import type { ReadinessSnapshot } from "./preparation.js";
import { SetTable } from "./SetTable.js";
import { WarmupCalculator } from "./WarmupCalculator.js";

const modeFor = (entry: ExerciseEntry): TrackingMode => {
  if (entry.snapshot.trackingMode) return entry.snapshot.trackingMode;
  if (entry.snapshot.suffix === "seconds") return "duration";
  if (entry.snapshot.incrementKg === 0) return "bodyweight-reps";
  return "weight-reps";
};

const effortFromLegacy = (value: string): LoggedSet["effort"] => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 10
    ? { mode: "rpe", value: parsed }
    : null;
};

const loggedSetsFor = (entry: ExerciseEntry): LoggedSet[] => {
  if (entry.loggedSets?.length) return entry.loggedSets;
  const mode = modeFor(entry);
  return entry.sets.map((set) => {
    const base = { id: set.id, kind: set.kind, effort: effortFromLegacy(set.rpe), done: set.done };
    const reps = set.reps === "" ? null : Number(set.reps);
    const weight = set.weight === "" ? null : Number(set.weight);
    if (mode === "duration") return { ...base, trackingMode: "duration", seconds: reps };
    if (mode === "distance") return { ...base, trackingMode: "distance", distanceMeters: reps };
    if (mode === "bodyweight-reps") return { ...base, trackingMode: "bodyweight-reps", reps };
    if (mode === "assisted-reps") return { ...base, trackingMode: "assisted-reps", assistanceKg: weight, reps };
    if (mode === "weighted-bodyweight-reps") return { ...base, trackingMode: "weighted-bodyweight-reps", addedWeightKg: weight, reps };
    return { ...base, trackingMode: "weight-reps", weightKg: weight, reps };
  });
};

const progressionEvidence = (
  history: ReturnType<typeof useGuidedAppState>["state"]["history"],
  exerciseId: string,
): ProgressionExposure[] => [...history]
  .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
  .flatMap((session): ProgressionExposure[] => {
    const entry = session.exercises.find((item) => item.exerciseId === exerciseId);
    return entry ? [{ completedAt: session.endedAt, sets: loggedSetsFor(entry) }] : [];
  })
  .slice(0, 3);

const relevantPain = (
  draft: Draft,
  pattern: ExerciseEntry["snapshot"]["movementPattern"],
): PainConcern | null => {
  const readiness = (draft as Draft & { readiness?: ReadinessSnapshot }).readiness;
  const pain = readiness?.input.pain ?? null;
  if (!pain || !pattern || !pain.affectedPatterns.includes(pattern)) return null;
  return pain;
};

export function WorkoutScreen({
  app,
  timer,
}: {
  app: ReturnType<typeof useGuidedAppState>;
  timer: ReturnType<typeof useRestTimer>;
}) {
  const draft = app.state.draft!;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"replace" | "add" | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback>({ energy: 3, soreness: 3, note: "" });
  const wakeLock = useWakeLock(true);
  const exerciseIndex = draft.currentEx;
  const entry = draft.exercises[exerciseIndex];
  const exercises = useMemo(() => allExercises(app.state.customExercises), [app.state.customExercises]);
  const meta = exercises[entry.exerciseId] ?? entry.snapshot;
  const previous = latestExerciseEntry(app.state.history, entry.exerciseId)?.entry ?? null;
  const recent = progressionEvidence(app.state.history, entry.exerciseId);
  const latestDate = recent[0]?.completedAt ? new Date(recent[0].completedAt).getTime() : Date.now();
  const interruptionDays = Math.max(0, Math.floor((Date.now() - latestDate) / 86_400_000));
  const decision = recommendProgression({
    exerciseId: entry.exerciseId,
    strategy: entry.target.progression ?? defaultProgression(meta),
    trackingMode: modeFor(entry),
    target: { min: entry.target.min, max: entry.target.max },
    recentExposures: recent,
    interruptionDays,
    painConcern: relevantPain(draft, entry.snapshot.movementPattern),
    availableIncrementKg: Math.max(0.5, entry.snapshot.incrementKg || 0.5),
  });
  const complete = draft.exercises.reduce((sum, item) => sum + item.sets.filter((set) => set.done).length, 0);
  const total = draft.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  const exerciseComplete = entry.sets.every((set) => set.done);
  const nextIncomplete = draft.exercises.findIndex((item, index) => index > exerciseIndex && !item.sets.every((set) => set.done));

  const afterSet = (seconds: number) => {
    timer.start(seconds);
    if (app.state.settings.vibration && "vibrate" in navigator) navigator.vibrate(40);
  };

  const finish = () => {
    app.finishWorkout(feedback);
    timer.cancel();
  };

  return (
    <div className="workout-shell guided-workout-shell">
      <header className="workout-topbar">
        <button className="icon-button subtle" type="button" aria-label="Hủy buổi tập" onClick={() => setConfirmCancel(true)}><X size={20} /></button>
        <div className="workout-title"><span>{draft.programSnapshot.workoutName}</span><strong>{complete}/{total} hiệp hoàn thành</strong></div>
        <button className="finish-button" type="button" disabled={!complete} onClick={() => setFinishOpen(true)}><Save size={16} /> Kết thúc</button>
        <Progress value={total ? complete / total : 0} />
      </header>

      <main className="workout-content guided-workout-content">
        <div className="workout-context-bar">
          <span><Dumbbell size={15} />{draft.programSnapshot.name}</span>
          <span><Zap size={15} />{app.state.profile.effortLanguage === "rpe" ? `RPE ${entry.target.targetRpe}` : "Còn khoảng 2 reps"}</span>
          {wakeLock.supported && <span className={wakeLock.locked ? "success-text" : ""}>{wakeLock.locked ? "Màn hình đang giữ sáng" : "Wake Lock chưa hoạt động"}</span>}
        </div>

        <div className="exercise-stepper" aria-label="Các bài trong buổi">
          {draft.exercises.map((item, index) => (
            <button
              key={`${item.exerciseId}-${index}`}
              type="button"
              className={`${index === exerciseIndex ? "active" : ""} ${item.sets.every((set) => set.done) ? "complete" : ""}`}
              onClick={() => app.setCurrentExercise(index)}
              aria-label={`Bài ${index + 1}: ${item.snapshot.name}`}
            >
              {item.sets.every((set) => set.done) ? <Check size={14} /> : index + 1}
            </button>
          ))}
        </div>

        <section className="active-exercise card">
          <header className="exercise-heading guided-exercise-heading">
            <div className="exercise-index">{exerciseIndex + 1}</div>
            <div className="grow">
              <span className="eyebrow">BÀI HIỆN TẠI · {entry.snapshot.primary.toUpperCase()}</span>
              <h1>{entry.snapshot.name}</h1>
              <p>{entry.snapshot.equipment} · {entry.target.min}–{entry.target.max} {entry.snapshot.suffix}</p>
            </div>
          </header>

          <ExerciseCoachCard entry={entry} decision={decision} />

          <SetTable
            entry={entry}
            previousEntry={previous}
            exerciseIndex={exerciseIndex}
            effortLanguage={app.state.profile.effortLanguage ?? "simple-rir"}
            updateSet={app.updateSet}
            completeSet={app.completeSet}
            undoSet={app.undoSet}
            copyPreviousSet={app.copyPreviousSet}
            onRest={afterSet}
          />

          <p className="technique-note guided-technique-note"><Info size={16} />{meta.technique ?? "Ưu tiên biên độ kiểm soát và dừng khi có đau bất thường."}</p>

          {timer.active && (
            <section className={`rest-timer ${timer.remaining === 0 ? "finished" : ""}`} aria-live="polite">
              <div className="timer-ring" style={{ "--timer-progress": `${timer.progress * 360}deg` } as CSSProperties}>
                <div><small>{timer.remaining === 0 ? "HẾT GIỜ" : "ĐANG NGHỈ"}</small><strong>{formatSeconds(timer.remaining)}</strong></div>
              </div>
              <div className="timer-actions"><button type="button" onClick={() => timer.addSeconds(-15)}>-15s</button><button type="button" onClick={() => timer.addSeconds(15)}>+15s</button><button type="button" onClick={timer.cancel}>Bỏ qua</button></div>
            </section>
          )}

          <section className="workout-tools" aria-label="Công cụ và chỉnh sửa buổi tập">
            <div className="workout-tool-row">
              <WarmupCalculator entry={entry} insert={(sets) => app.insertWarmupSets(exerciseIndex, sets)} />
              <PlateCalculator entry={entry} />
              <button className="secondary-button small" type="button" onClick={() => setPickerMode("replace")}><RefreshCw size={15} />Đổi bài</button>
            </div>
            <div className="workout-tool-row">
              <button type="button" className="secondary-button small" disabled={entry.sets.length <= 1} onClick={() => app.removeSet(exerciseIndex)}><Minus size={15} />Bớt hiệp</button>
              <button type="button" className="secondary-button small" onClick={() => app.addSet(exerciseIndex, "working")}><Plus size={15} />Thêm hiệp</button>
              <button type="button" className="secondary-button small" onClick={() => setPickerMode("add")}><ListPlus size={15} />Thêm bài</button>
            </div>
            <div className="workout-tool-row">
              <button type="button" className="secondary-button small" disabled={exerciseIndex === 0} onClick={() => app.moveExerciseInDraft(exerciseIndex, -1)}><ArrowUp size={15} />Đưa lên</button>
              <button type="button" className="secondary-button small" disabled={exerciseIndex === draft.exercises.length - 1} onClick={() => app.moveExerciseInDraft(exerciseIndex, 1)}><ArrowDown size={15} />Đưa xuống</button>
              <button type="button" className="danger-text-button" disabled={draft.exercises.length <= 1} onClick={() => app.removeExerciseFromDraft(exerciseIndex)}><Trash2 size={15} />Bỏ bài</button>
            </div>
          </section>

          <label className="note-field"><span>Ghi chú bài tập</span><textarea value={entry.note} placeholder="Kỹ thuật, máy đang dùng, cảm giác đau/mỏi…" onChange={(event) => app.updateExerciseNote(exerciseIndex, event.target.value)} /></label>
        </section>

        <div className="workout-navigation">
          <button type="button" disabled={exerciseIndex === 0} onClick={() => app.setCurrentExercise(exerciseIndex - 1)}><ChevronLeft size={18} />Bài trước</button>
          <button className="primary-button" type="button" disabled={exerciseIndex === draft.exercises.length - 1 && nextIncomplete < 0} onClick={() => app.setCurrentExercise(nextIncomplete >= 0 ? nextIncomplete : Math.min(draft.exercises.length - 1, exerciseIndex + 1))}>Bài tiếp theo<ChevronRight size={18} /></button>
        </div>
      </main>

      {confirmCancel && <ConfirmDialog title="Hủy buổi tập?" text="Các hiệp trong draft sẽ bị xóa. Lịch sử đã lưu trước đó không bị ảnh hưởng." confirmLabel="Hủy buổi" danger confirm={() => { app.cancelWorkout(); timer.cancel(); }} close={() => setConfirmCancel(false)} />}

      {pickerMode && (
        <Modal title={pickerMode === "replace" ? "Đổi bài an toàn" : "Thêm bài vào buổi"} close={() => setPickerMode(null)} wide>
          <ExercisePicker
            exercises={exercises}
            profile={app.state.profile}
            preferences={app.state.exercisePreferences ?? []}
            currentExerciseId={pickerMode === "replace" ? entry.exerciseId : undefined}
            select={(exerciseId, alwaysUse, reason) => {
              if (pickerMode === "replace") app.replaceExerciseInDraft(exerciseIndex, exerciseId, reason, alwaysUse);
              else app.addExerciseToDraft(exerciseId);
              setPickerMode(null);
            }}
          />
        </Modal>
      )}

      {finishOpen && (
        <Modal title="Đánh giá và kết thúc" close={() => setFinishOpen(false)}>
          <div className="feedback-form">
            <label><span>Năng lượng hôm nay</span><div className="rating-row">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={feedback.energy === value ? "active" : ""} onClick={() => setFeedback({ ...feedback, energy: value as SessionFeedback["energy"] })}>{value}</button>)}</div></label>
            <label><span>Độ đau mỏi</span><div className="rating-row">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={feedback.soreness === value ? "active" : ""} onClick={() => setFeedback({ ...feedback, soreness: value as SessionFeedback["soreness"] })}>{value}</button>)}</div></label>
            <label><span>Ghi chú buổi tập</span><textarea value={feedback.note} placeholder="Điều gì diễn ra tốt hoặc cần điều chỉnh?" onChange={(event) => setFeedback({ ...feedback, note: event.target.value })} /></label>
            <div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setFinishOpen(false)}>Tiếp tục tập</button><button className="primary-button" type="button" onClick={() => { finish(); setFinishOpen(false); }}><Save size={16} />Lưu buổi tập</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
