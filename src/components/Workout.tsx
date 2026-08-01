import { useMemo, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Dumbbell,
  Info,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Timer,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import { allExercises, formatSeconds } from "../data.js";
import { latestExerciseEntry, progressionRecommendation } from "../domain/training.js";
import type { useAppState } from "../state.js";
import type { useRestTimer } from "../timers.js";
import { useWakeLock } from "../timers.js";
import type { SessionFeedback, SetKind } from "../types.js";
import { ConfirmDialog, Modal, Progress } from "./common.js";

const kindLabel: Record<SetKind, string> = { warmup: "Khởi động", working: "Chính", drop: "Drop" };

export function WorkoutScreen({ app, timer }: { app: ReturnType<typeof useAppState>; timer: ReturnType<typeof useRestTimer> }) {
  const draft = app.state.draft!;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback>({ energy: 3, soreness: 3, note: "" });
  const wakeLock = useWakeLock(true);
  const exerciseIndex = draft.currentEx;
  const entry = draft.exercises[exerciseIndex];
  const exercises = useMemo(() => allExercises(app.state.customExercises), [app.state.customExercises]);
  const meta = exercises[entry.exerciseId] ?? entry.snapshot;
  const previous = latestExerciseEntry(app.state.history, entry.exerciseId);
  const recommendation = progressionRecommendation(app.state.history, meta as ReturnType<typeof allExercises>[string], entry.target.targetRpe);
  const complete = draft.exercises.reduce((sum, item) => sum + item.sets.filter((set) => set.done).length, 0);
  const total = draft.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  const exerciseComplete = entry.sets.every((set) => set.done);
  const nextIncomplete = draft.exercises.findIndex((item, index) => index > exerciseIndex && !item.sets.every((set) => set.done));
  const alternatives = (meta.alternatives ?? []).map((id) => exercises[id]).filter(Boolean);

  const completeSet = (setIndex: number) => {
    const rest = app.completeSet(exerciseIndex, setIndex);
    if (rest) timer.start(rest);
    if (app.state.settings.vibration && "vibrate" in navigator) navigator.vibrate(40);
  };

  const finish = () => {
    app.finishWorkout(feedback);
    timer.cancel();
  };

  return (
    <div className="workout-shell">
      <header className="workout-topbar">
        <button className="icon-button subtle" type="button" aria-label="Hủy buổi tập" onClick={() => setConfirmCancel(true)}><X size={20} /></button>
        <div className="workout-title"><span>{draft.programSnapshot.workoutName}</span><strong>{complete}/{total} hiệp hoàn thành</strong></div>
        <button className="finish-button" type="button" disabled={!complete} onClick={() => setFinishOpen(true)}><Save size={16} /> Kết thúc</button>
        <Progress value={total ? complete / total : 0} />
      </header>

      <main className="workout-content">
        <div className="workout-context-bar">
          <span><Dumbbell size={15} />{draft.programSnapshot.name}</span>
          <span><Zap size={15} />RPE {entry.target.targetRpe}</span>
          {wakeLock.supported && <span className={wakeLock.locked ? "success-text" : ""}>{wakeLock.locked ? "Màn hình đang giữ sáng" : "Wake Lock chưa hoạt động"}</span>}
        </div>

        {timer.active && (
          <section className={`rest-timer ${timer.remaining === 0 ? "finished" : ""}`} aria-live="polite">
            <div className="timer-ring" style={{ "--timer-progress": `${timer.progress * 360}deg` } as CSSProperties}><div><small>{timer.remaining === 0 ? "HẾT GIỜ" : "ĐANG NGHỈ"}</small><strong>{formatSeconds(timer.remaining)}</strong></div></div>
            <div className="timer-actions"><button type="button" onClick={() => timer.addSeconds(-15)}>-15s</button><button type="button" onClick={() => timer.addSeconds(15)}>+15s</button><button type="button" onClick={timer.cancel}>Bỏ qua</button></div>
          </section>
        )}

        <div className="exercise-stepper" aria-label="Các bài trong buổi">
          {draft.exercises.map((item, index) => <button key={`${item.exerciseId}-${index}`} type="button" className={`${index === exerciseIndex ? "active" : ""} ${item.sets.every((set) => set.done) ? "complete" : ""}`} onClick={() => app.setCurrentExercise(index)} aria-label={`Bài ${index + 1}`}>{item.sets.every((set) => set.done) ? <Check size={14} /> : index + 1}</button>)}
        </div>

        <section className="active-exercise card">
          <header className="exercise-heading">
            <div className="exercise-index">{exerciseIndex + 1}</div>
            <div className="grow"><span className="eyebrow">{entry.snapshot.primary.toUpperCase()}</span><h1>{entry.snapshot.name}</h1><p>{entry.snapshot.equipment} · {entry.target.min}–{entry.target.max} {entry.snapshot.suffix}</p></div>
            {alternatives.length > 0 && <button className="secondary-button small" type="button" onClick={() => setSwapOpen(true)}><RefreshCw size={15} />Đổi bài</button>}
          </header>

          <div className={`coach-cue confidence-${recommendation.confidence}`}>
            <div><Zap size={18} /></div><span><strong>{recommendation.headline}</strong><small>{recommendation.explanation}</small></span>
          </div>

          {previous && (
            <details className="previous-performance">
              <summary>Lần tập gần nhất <ChevronRight size={16} /></summary>
              <div>{previous.entry.sets.filter((set) => set.done).map((set, index) => <span key={set.id}>Hiệp {index + 1}: <strong>{set.weight || "BW"} kg × {set.reps}</strong> · RPE {set.rpe}</span>)}</div>
            </details>
          )}

          <div className="target-strip"><span><Timer size={16} />Nghỉ {formatSeconds(entry.target.rest)}</span><span><Zap size={16} />Mục tiêu RPE {entry.target.targetRpe}</span><span>{exerciseComplete ? "Đã hoàn thành bài" : `${entry.sets.filter((set) => set.done).length}/${entry.sets.length} hiệp`}</span></div>

          <div className="set-table smart-set-table">
            <div className="set-table-head"><span>Hiệp</span><span>Loại</span><span>Kg</span><span>Reps</span><span>RPE</span><span /></div>
            {entry.sets.map((set, setIndex) => {
              const canComplete = !set.done && Number(set.reps) > 0 && Number(set.rpe) >= 1 && Number(set.rpe) <= 10;
              return (
                <div className={`set-row ${set.done ? "complete" : ""}`} key={set.id}>
                  <span className="set-number">{setIndex + 1}</span>
                  <select aria-label={`Loại hiệp ${setIndex + 1}`} value={set.kind} disabled={set.done} onChange={(event) => app.updateSet(exerciseIndex, setIndex, { kind: event.target.value as SetKind })}>{(["warmup", "working", "drop"] as SetKind[]).map((kind) => <option key={kind} value={kind}>{kindLabel[kind]}</option>)}</select>
                  <input aria-label={`Mức tạ hiệp ${setIndex + 1}`} type="number" inputMode="decimal" min="0" step="0.5" value={set.weight} disabled={set.done} placeholder="—" onChange={(event) => app.updateSet(exerciseIndex, setIndex, { weight: event.target.value })} />
                  <input aria-label={`Số reps hiệp ${setIndex + 1}`} type="number" inputMode="numeric" min="1" value={set.reps} disabled={set.done} placeholder="—" onChange={(event) => app.updateSet(exerciseIndex, setIndex, { reps: event.target.value })} />
                  <input aria-label={`RPE hiệp ${setIndex + 1}`} type="number" inputMode="decimal" min="1" max="10" step="0.5" value={set.rpe} disabled={set.done} placeholder={String(entry.target.targetRpe)} onChange={(event) => app.updateSet(exerciseIndex, setIndex, { rpe: event.target.value })} />
                  <div className="set-actions">
                    {!set.done && setIndex > 0 && <button type="button" aria-label="Sao chép hiệp trước" title="Sao chép hiệp trước" onClick={() => app.copyPreviousSet(exerciseIndex, setIndex)}><Copy size={15} /></button>}
                    {set.done ? <button type="button" aria-label="Hoàn tác hiệp" title="Hoàn tác" onClick={() => app.undoSet(exerciseIndex, setIndex)}><Undo2 size={16} /></button> : <button className="complete-set" type="button" disabled={!canComplete} aria-label="Hoàn thành hiệp" onClick={() => completeSet(setIndex)}><Check size={17} /></button>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="set-controls"><button type="button" disabled={entry.sets.length <= 1} onClick={() => app.removeSet(exerciseIndex)}><Minus size={16} />Bớt hiệp</button><button type="button" onClick={() => app.addSet(exerciseIndex, "warmup")}><Plus size={16} />Khởi động</button><button type="button" onClick={() => app.addSet(exerciseIndex)}><Plus size={16} />Hiệp chính</button></div>

          <label className="note-field"><span>Ghi chú bài tập</span><textarea value={entry.note} placeholder="Kỹ thuật, máy đang dùng, cảm giác đau/mỏi…" onChange={(event) => app.updateExerciseNote(exerciseIndex, event.target.value)} /></label>
          <p className="technique-note"><Info size={16} />{(meta as { technique?: string }).technique ?? "Ưu tiên biên độ kiểm soát và dừng khi có đau bất thường."}</p>
        </section>

        <div className="workout-navigation"><button type="button" disabled={exerciseIndex === 0} onClick={() => app.setCurrentExercise(exerciseIndex - 1)}><ChevronLeft size={18} />Bài trước</button><button className="primary-button" type="button" disabled={exerciseIndex === draft.exercises.length - 1 && nextIncomplete < 0} onClick={() => app.setCurrentExercise(nextIncomplete >= 0 ? nextIncomplete : Math.min(draft.exercises.length - 1, exerciseIndex + 1))}>Bài tiếp theo<ChevronRight size={18} /></button></div>
      </main>

      {confirmCancel && <ConfirmDialog title="Hủy buổi tập?" text="Các hiệp trong draft sẽ bị xóa. Lịch sử đã lưu trước đó không bị ảnh hưởng." confirmLabel="Hủy buổi" danger confirm={() => { app.cancelWorkout(); timer.cancel(); }} close={() => setConfirmCancel(false)} />}

      {swapOpen && <Modal title="Đổi bài tương đương" close={() => setSwapOpen(false)}><div className="swap-list">{alternatives.map((item) => <button key={item.id} type="button" onClick={() => { app.swapExercise(exerciseIndex, item.id); setSwapOpen(false); }}><span><strong>{item.name}</strong><small>{item.primary} · {item.equipment}</small></span><ChevronRight size={17} /></button>)}</div><p className="modal-hint">Việc đổi bài chỉ áp dụng cho buổi hiện tại. Template gốc không bị thay đổi.</p></Modal>}

      {finishOpen && <Modal title="Đánh giá và kết thúc" close={() => setFinishOpen(false)}><div className="feedback-form"><label><span>Năng lượng hôm nay</span><div className="rating-row">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={feedback.energy === value ? "active" : ""} onClick={() => setFeedback({ ...feedback, energy: value as SessionFeedback["energy"] })}>{value}</button>)}</div></label><label><span>Độ đau mỏi</span><div className="rating-row">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={feedback.soreness === value ? "active" : ""} onClick={() => setFeedback({ ...feedback, soreness: value as SessionFeedback["soreness"] })}>{value}</button>)}</div></label><label><span>Ghi chú buổi tập</span><textarea value={feedback.note} placeholder="Điều gì diễn ra tốt hoặc cần điều chỉnh?" onChange={(event) => setFeedback({ ...feedback, note: event.target.value })} /></label><div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setFinishOpen(false)}>Tiếp tục tập</button><button className="primary-button" type="button" onClick={() => { finish(); setFinishOpen(false); }}><Save size={16} />Lưu buổi tập</button></div></div></Modal>}
    </div>
  );
}
