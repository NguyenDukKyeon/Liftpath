import { useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Copy,
  Download,
  Dumbbell,
  FileJson,
  Flame,
  Info,
  Moon,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import {
  BUILT_IN_EXERCISES,
  BUILT_IN_PROGRAM_ORDER,
  BUILT_IN_PROGRAMS,
  TRAINING_DAYS,
  allExercises,
  allPrograms,
  getProgram,
  getWorkout,
  nextScheduledWorkout,
  nextWorkoutDay,
  todayISO,
} from "../data.js";
import {
  backupFileName,
  parseBackup,
  serializeBackup,
  sessionsToCsv,
} from "../domain/storage.js";
import { pullRemoteState, pushRemoteState } from "../domain/sync.js";
import {
  latestExerciseEntry,
  muscleVolume,
  plateauExercises,
  progressionRecommendation,
  recentExerciseEntries,
  sessionVolume,
  totalVolume,
  uid,
  weeklyStats,
  weeklyStreak,
} from "../domain/training.js";
import type { useAppState } from "../state.js";
import type {
  EquipmentId,
  Exercise,
  ExerciseType,
  MuscleGroup,
  ProgramId,
  ProgramSwitchOptions,
  ThemePreference,
  TrainingProgram,
} from "../types.js";
import {
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  MetricCard,
  Modal,
  Progress,
  Toggle,
  downloadText,
  formatDate,
  formatNumber,
} from "./common.js";

type AppHook = ReturnType<typeof useAppState>;

export function TodayScreen({ app, requestProgramSwitch, goPrograms }: { app: AppHook; requestProgramSwitch: (programId: ProgramId) => void; goPrograms: () => void }) {
  const program = app.currentProgram;
  const nextDay = nextWorkoutDay(app.state.history, program.id, app.state.customPrograms);
  const workout = getWorkout(program.id, nextDay, app.state.customPrograms) ?? program.workouts[0];
  const scheduled = nextScheduledWorkout(app.state.settings, app.state.history, app.state.customPrograms);
  const stats = weeklyStats(app.state.history);
  const streak = weeklyStreak(app.state.history, app.state.settings.weeklyGoal);
  const recent = app.state.history[0];
  const backupAgeDays = app.state.settings.lastBackupAt
    ? Math.floor((Date.now() - new Date(app.state.settings.lastBackupAt).getTime()) / 86_400_000)
    : null;

  return (
    <div className="stack page-enter">
      <section className="workout-hero">
        <div className="hero-copy"><div className="hero-status"><span className="status-dot" />Buổi tiếp theo · {program.shortName}</div><h2>{workout?.name ?? "Chưa có buổi tập"}</h2><p>{workout?.focus} · {workout?.exercises.length ?? 0} bài · RPE mục tiêu {app.phase.targetRpe}{scheduled ? ` · ${scheduled.relative} ${new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(scheduled.date)}` : ""}</p><div className="hero-actions"><button className="primary-button" type="button" disabled={!workout} onClick={() => workout && app.startWorkout(workout.id)}><Play size={18} fill="currentColor" />Bắt đầu tập</button><button className="hero-secondary" type="button" onClick={goPrograms}>Xem giáo án<ChevronRight size={17} /></button></div></div>
        <div className="hero-visual"><Dumbbell size={52} /><span>{program.daysPerWeek}D</span></div>
      </section>

      {app.review.deloadSuggested && <section className="alert-card warning"><Info size={20} /><div><strong>Cân nhắc tuần giảm tải</strong><p>RPE, hồi phục hoặc khối lượng gần đây cho thấy bạn có thể hưởng lợi từ việc giảm 30–50% working set trong một tuần.</p></div></section>}
      {(backupAgeDays == null || backupAgeDays >= 14) && <section className="alert-card"><Shield size={20} /><div><strong>{backupAgeDays == null ? "Bạn chưa có backup" : `Backup gần nhất đã ${backupAgeDays} ngày`}</strong><p>Xuất JSON trong Cài đặt để có thể phục hồi khi đổi thiết bị hoặc xóa dữ liệu trình duyệt.</p></div></section>}

      <section className="program-quick card"><div className="section-title-row compact"><div><span className="eyebrow">NHỊP TẬP</span><h2>Chọn chương trình</h2></div><span>{program.level}</span></div><div className="frequency-switch">{BUILT_IN_PROGRAM_ORDER.map((programId) => { const item = BUILT_IN_PROGRAMS[programId]; return <button key={programId} type="button" className={program.id === programId ? "active" : ""} onClick={() => requestProgramSwitch(programId)}><strong>{item.daysPerWeek}</strong><span>buổi</span>{programId === "upper-lower-4" && <small>Cân bằng</small>}</button>; })}</div><p className="program-quick-note">{program.description}</p></section>

      <section className="weekly-card card"><div className="weekly-card-head"><div><span className="eyebrow">MỤC TIÊU TUẦN</span><h2>{stats.sessions} / {app.state.settings.weeklyGoal} buổi</h2></div><span className="week-pill">Tuần {app.week}</span></div><Progress value={stats.sessions / Math.max(1, app.state.settings.weeklyGoal)} /><div className="weekly-details"><span><Flame size={16} />{streak} tuần liên tiếp</span><span>{app.review.adherenceLabel}</span></div></section>

      <div className="metric-grid"><MetricCard label="Working set tuần này" value={String(stats.sets)} note={`${stats.activeDays} ngày hoạt động`} /><MetricCard label="Volume tuần" value={`${formatNumber(stats.volume)} kg`} note={app.review.volumeChangePercent == null ? "Chưa đủ tuần so sánh" : `${app.review.volumeChangePercent >= 0 ? "+" : ""}${app.review.volumeChangePercent.toFixed(0)}% so tuần trước`} /><MetricCard label="RPE trung bình" value={stats.avgRpe?.toFixed(1) ?? "—"} note="Dựa trên set đã hoàn thành" /></div>

      <Card className="weekly-coach"><div className="section-title-row compact"><div><span className="eyebrow">COACHING TUẦN</span><h2>Điều cần chú ý</h2></div><Sparkles size={21} /></div><div className="coach-message-list">{app.review.messages.map((message) => <p key={message}><Check size={15} />{message}</p>)}</div></Card>

      <div className="section-title-row"><div><span className="eyebrow">CHUẨN BỊ</span><h2>Các bài sắp tới</h2></div><span>{workout?.exercises.length ?? 0} bài</span></div>
      <Card className="exercise-preview-list">{workout?.exercises.map((id, index) => { const exercise = allExercises(app.state.customExercises)[id]; return exercise ? <div className="exercise-preview-row" key={`${id}-${index}`}><span className={`exercise-type-icon ${exercise.type}`}>{index + 1}</span><div className="grow"><strong>{exercise.name}</strong><small>{exercise.sets} hiệp · {exercise.min}–{exercise.max} {exercise.suffix}</small></div><span className="exercise-muscle">{exercise.primary}</span></div> : null; })}</Card>

      <div className="section-title-row"><div><span className="eyebrow">GẦN ĐÂY</span><h2>Buổi tập gần nhất</h2></div></div>
      {recent ? <Card className="recent-session"><span className="session-badge">{recent.programSnapshot.name}</span><div className="grow"><small>{formatDate(recent.endedAt)}</small><h2>{recent.programSnapshot.workoutName}</h2><p>{recent.totalSets} hiệp · RPE {recent.avgRpe?.toFixed(1) ?? "—"}</p></div><strong>{formatNumber(sessionVolume(recent))} kg</strong></Card> : <EmptyState title="Chưa có buổi tập" text="Hoàn thành buổi đầu tiên để tạo dữ liệu đề xuất tăng tải." />}
    </div>
  );
}

export function ProgramsScreen({ app, requestProgramSwitch }: { app: AppHook; requestProgramSwitch: (programId: ProgramId) => void }) {
  const [selected, setSelected] = useState<ProgramId>(app.state.settings.programId);
  const [editor, setEditor] = useState<TrainingProgram | null>(null);
  const [exerciseEditor, setExerciseEditor] = useState<Exercise | null>(null);
  const programs = allPrograms(app.state.customPrograms);
  const program = programs[selected] ?? app.currentProgram;
  const [selectedDay, setSelectedDay] = useState(program.workouts[0]?.id ?? "");
  const workout = program.workouts.find((item) => item.id === selectedDay) ?? program.workouts[0];

  const choose = (programId: ProgramId) => {
    setSelected(programId);
    setSelectedDay(programs[programId]?.workouts[0]?.id ?? "");
  };
  const duplicate = () => {
    const copyId = `custom:${uid()}` as ProgramId;
    setEditor({
      ...program,
      id: copyId,
      name: `${program.name} · Bản của tôi`,
      shortName: "Tùy chỉnh",
      custom: true,
      version: 1,
      workouts: program.workouts.map((day) => ({ ...day, id: `${copyId}:${uid()}`, exercises: [...day.exercises] })),
    });
  };

  return (
    <div className="stack page-enter">
      <section className="program-selection">{Object.values(programs).map((item) => <button key={item.id} className={`program-card card ${item.id === selected ? "active" : ""}`} type="button" onClick={() => choose(item.id)}><div className="program-card-top"><span className="program-frequency"><strong>{item.daysPerWeek}</strong> buổi</span>{item.custom && <span className="recommended-pill">Cá nhân</span>}</div><h2>{item.name}</h2><p>{item.description}</p><div className="program-meta"><span>{item.sessionMinutes}</span><span>{item.level}</span></div><div className="program-select-state">{app.state.settings.programId === item.id ? <><Check size={16} />Đang sử dụng</> : <>Xem chi tiết<ChevronRight size={16} /></>}</div></button>)}</section>

      <div className="program-actions"><button className="secondary-button" type="button" onClick={duplicate}><Copy size={16} />Tạo bản tùy chỉnh</button><button className="secondary-button" type="button" onClick={() => setExerciseEditor(newCustomExercise())}><Plus size={16} />Tạo bài tập</button>{program.custom && <><button className="secondary-button" type="button" onClick={() => setEditor(program)}><Pencil size={16} />Sửa giáo án</button><button className="danger-text-button" type="button" onClick={() => { app.deleteCustomProgram(program.id); choose("full-body-3"); }}><Trash2 size={16} />Xóa</button></>}</div>

      <Card className="program-overview"><div><span className="eyebrow">{program.shortName.toUpperCase()}</span><h2>{program.name}</h2><p>{program.description}</p></div><div className="program-overview-actions"><span>{program.scheduleLabel}</span>{app.state.settings.programId === program.id ? <span className="active-program-label"><Check size={16} />Đang sử dụng</span> : <button className="primary-button" type="button" onClick={() => requestProgramSwitch(program.id)}>Dùng giáo án này</button>}</div></Card>

      <div className="workout-tabs">{program.workouts.map((day) => <button key={day.id} type="button" className={workout?.id === day.id ? "active" : ""} onClick={() => setSelectedDay(day.id)}><span className="workout-tab-icon"><Dumbbell size={18} /></span><span><strong>{day.shortName}</strong><small>{day.exercises.length} bài</small></span></button>)}</div>

      {workout && <Card className="program-detail"><div className="program-detail-head"><div><span className="eyebrow">{workout.shortName.toUpperCase()}</span><h2>{workout.name}</h2><p>{workout.focus}</p></div><button className="primary-button small" type="button" onClick={() => app.startWorkout(workout.id)}><Play size={16} fill="currentColor" />Bắt đầu</button></div><div className="exercise-list">{workout.exercises.map((id, index) => { const item = allExercises(app.state.customExercises)[id]; return item ? <div key={`${id}-${index}`} className="exercise-list-row"><span className={`exercise-type-icon ${item.type}`}>{index + 1}</span><div className="grow"><strong>{item.name}</strong><small>{item.sets} × {item.min}–{item.max} · nghỉ {item.rest}s</small></div><span>{item.primary}</span></div> : null; })}</div></Card>}

      {editor && <ProgramEditor program={editor} exercises={allExercises(app.state.customExercises)} save={(next) => { app.addCustomProgram(next); setEditor(null); choose(next.id); }} close={() => setEditor(null)} />}
      {exerciseEditor && <ExerciseEditor exercise={exerciseEditor} save={(next) => { app.addCustomExercise(next); setExerciseEditor(null); }} close={() => setExerciseEditor(null)} />}
    </div>
  );
}

function newCustomExercise(): Exercise {
  return { id: `custom:${uid()}`, name: "", primary: "Ngực", secondary: [], equipment: "", equipmentTags: ["bodyweight"], sets: 3, min: 8, max: 12, rest: 90, technique: "", alternatives: [], type: "upper", suffix: "reps", incrementKg: 2.5, custom: true };
}

function ExerciseEditor({ exercise, save, close }: { exercise: Exercise; save: (exercise: Exercise) => void; close: () => void }) {
  const [draft, setDraft] = useState(exercise);
  const muscleOptions: MuscleGroup[] = ["Ngực", "Lưng", "Vai", "Tay trước", "Tay sau", "Đùi trước", "Đùi sau", "Mông", "Bắp chân", "Core"];
  const typeOptions: ExerciseType[] = ["upper", "lower", "delt", "arms", "core"];
  const equipmentOptions: EquipmentId[] = ["bodyweight", "dumbbell", "barbell", "rack", "bench", "machine", "cable"];
  return <Modal title="Bài tập tùy chỉnh" close={close}><div className="form-stack"><Field label="Tên bài"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field><div className="form-grid"><Field label="Nhóm cơ chính"><select value={draft.primary} onChange={(event) => setDraft({ ...draft, primary: event.target.value as MuscleGroup })}>{muscleOptions.map((muscle) => <option key={muscle}>{muscle}</option>)}</select></Field><Field label="Loại"><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ExerciseType })}>{typeOptions.map((type) => <option key={type}>{type}</option>)}</select></Field></div><Field label="Thiết bị"><input value={draft.equipment} onChange={(event) => setDraft({ ...draft, equipment: event.target.value })} /></Field><div className="chip-grid compact">{equipmentOptions.map((item) => <button key={item} type="button" className={draft.equipmentTags.includes(item) ? "active" : ""} onClick={() => setDraft({ ...draft, equipmentTags: draft.equipmentTags.includes(item) ? draft.equipmentTags.filter((value) => value !== item) : [...draft.equipmentTags, item] })}>{item}</button>)}</div><div className="form-grid three"><Field label="Số hiệp"><input type="number" min="1" max="10" value={draft.sets} onChange={(event) => setDraft({ ...draft, sets: Number(event.target.value) })} /></Field><Field label="Rep thấp"><input type="number" min="1" value={draft.min} onChange={(event) => setDraft({ ...draft, min: Number(event.target.value) })} /></Field><Field label="Rep cao"><input type="number" min="1" value={draft.max} onChange={(event) => setDraft({ ...draft, max: Number(event.target.value) })} /></Field></div><div className="form-grid"><Field label="Nghỉ (giây)"><input type="number" min="15" value={draft.rest} onChange={(event) => setDraft({ ...draft, rest: Number(event.target.value) })} /></Field><Field label="Bước tăng kg"><input type="number" min="0" step="0.5" value={draft.incrementKg} onChange={(event) => setDraft({ ...draft, incrementKg: Number(event.target.value) })} /></Field></div><Field label="Hướng dẫn kỹ thuật"><textarea value={draft.technique} onChange={(event) => setDraft({ ...draft, technique: event.target.value })} /></Field><div className="dialog-actions"><button className="secondary-button" type="button" onClick={close}>Hủy</button><button className="primary-button" type="button" disabled={!draft.name.trim() || !draft.equipmentTags.length} onClick={() => save(draft)}><Save size={16} />Lưu bài tập</button></div></div></Modal>;
}

function ProgramEditor({ program, exercises, save, close }: { program: TrainingProgram; exercises: Record<string, Exercise>; save: (program: TrainingProgram) => void; close: () => void }) {
  const [draft, setDraft] = useState(program);
  const [addExercise, setAddExercise] = useState<Record<string, string>>({});
  const updateWorkout = (dayId: string, patch: Partial<TrainingProgram["workouts"][number]>) => setDraft((current) => ({ ...current, workouts: current.workouts.map((day) => day.id === dayId ? { ...day, ...patch } : day) }));
  const move = (dayId: string, index: number, delta: number) => {
    const day = draft.workouts.find((item) => item.id === dayId);
    if (!day) return;
    const next = [...day.exercises];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateWorkout(dayId, { exercises: next });
  };
  return <Modal title="Sửa giáo án tùy chỉnh" wide close={close}><div className="form-stack"><div className="form-grid"><Field label="Tên giáo án"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field><Field label="Số buổi/tuần"><input type="number" min="1" max="7" value={draft.daysPerWeek} onChange={(event) => setDraft({ ...draft, daysPerWeek: Number(event.target.value) })} /></Field></div><Field label="Mô tả"><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>{draft.workouts.map((day, dayIndex) => <Card className="custom-day-editor" key={day.id}><div className="form-grid"><Field label={`Tên buổi ${dayIndex + 1}`}><input value={day.name} onChange={(event) => updateWorkout(day.id, { name: event.target.value, shortName: event.target.value })} /></Field><Field label="Trọng tâm"><input value={day.focus} onChange={(event) => updateWorkout(day.id, { focus: event.target.value })} /></Field></div><div className="editable-exercises">{day.exercises.map((id, index) => <div key={`${id}-${index}`}><span>{index + 1}. {exercises[id]?.name ?? id}</span><div><button type="button" disabled={index === 0} onClick={() => move(day.id, index, -1)}>↑</button><button type="button" disabled={index === day.exercises.length - 1} onClick={() => move(day.id, index, 1)}>↓</button><button type="button" onClick={() => updateWorkout(day.id, { exercises: day.exercises.filter((_, position) => position !== index) })}><Trash2 size={14} /></button></div></div>)}</div><div className="add-exercise-row"><select value={addExercise[day.id] ?? ""} onChange={(event) => setAddExercise({ ...addExercise, [day.id]: event.target.value })}><option value="">Chọn bài để thêm</option>{Object.values(exercises).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="secondary-button" type="button" disabled={!addExercise[day.id]} onClick={() => { const id = addExercise[day.id]; if (id) updateWorkout(day.id, { exercises: [...day.exercises, id] }); setAddExercise({ ...addExercise, [day.id]: "" }); }}><Plus size={15} />Thêm</button></div></Card>)}<button className="secondary-button" type="button" onClick={() => setDraft({ ...draft, workouts: [...draft.workouts, { id: `${draft.id}:${uid()}`, name: "Buổi mới", shortName: "Buổi mới", focus: "Tùy chỉnh", exercises: [] }] })}><Plus size={16} />Thêm buổi tập</button><div className="dialog-actions"><button className="secondary-button" type="button" onClick={close}>Hủy</button><button className="primary-button" type="button" disabled={!draft.name.trim() || draft.workouts.some((day) => !day.exercises.length)} onClick={() => save({ ...draft, shortName: `${draft.daysPerWeek} buổi`, version: draft.version + 1 })}><Save size={16} />Lưu giáo án</button></div></div></Modal>;
}

export function HistoryScreen({ app }: { app: AppHook }) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  if (!app.state.history.length) return <EmptyState title="Nhật ký đang trống" text="Các buổi hoàn thành sẽ xuất hiện tại đây cùng snapshot giáo án, set, reps và RPE." />;
  return <div className="stack page-enter"><div className="metric-grid"><MetricCard label="Tổng buổi" value={String(app.state.history.length)} note="toàn thời gian" /><MetricCard label="Tổng working set" value={String(app.state.history.reduce((sum, item) => sum + item.exercises.reduce((entrySum, entry) => entrySum + entry.sets.filter((set) => set.done && set.kind !== "warmup").length, 0), 0))} note="đã hoàn thành" /><MetricCard label="Tổng volume" value={`${formatNumber(totalVolume(app.state.history))} kg`} note="tham khảo, không so giữa các bài" /></div><div className="session-list">{app.state.history.map((session) => <Card className="session-card" key={session.id}><div className="session-main"><span className="session-badge">{session.programSnapshot.name}</span><div className="grow"><small>{formatDate(session.endedAt)}</small><h2>{session.programSnapshot.workoutName}</h2><p>{session.totalSets} hiệp · RPE {session.avgRpe?.toFixed(1) ?? "—"} · {formatNumber(sessionVolume(session))} kg</p></div></div><details><summary>Chi tiết bài tập<ChevronDown size={16} /></summary><div className="session-exercises">{session.exercises.map((entry) => <div key={`${session.id}-${entry.exerciseId}`}><div><strong>{entry.snapshot.name}</strong><small>{entry.snapshot.primary}</small></div><span>{entry.sets.map((set) => `${set.kind === "warmup" ? "W " : ""}${set.weight || "BW"}kg × ${set.reps} @${set.rpe}`).join(" · ")}</span></div>)}</div>{session.note && <p className="session-note">{session.note}</p>}</details><button className="delete-session" type="button" onClick={() => setDeleteId(session.id)}><Trash2 size={15} />Xóa buổi tập</button></Card>)}</div>{deleteId && <ConfirmDialog title="Xóa buổi tập?" text="Thao tác này thay đổi lịch sử, PR và đề xuất tăng tải. Bạn nên xuất backup trước khi xóa dữ liệu quan trọng." confirmLabel="Xóa" danger confirm={() => app.deleteSession(deleteId)} close={() => setDeleteId(null)} />}</div>;
}

export function InsightsScreen({ app }: { app: AppHook }) {
  const exercises = allExercises(app.state.customExercises);
  const trainedIds = [...new Set(app.state.history.flatMap((session) => session.exercises.map((entry) => entry.exerciseId)))];
  const [exerciseId, setExerciseId] = useState(trainedIds[0] ?? Object.keys(exercises)[0]);
  const selected = exercises[exerciseId];
  const recommendation = selected ? progressionRecommendation(app.state.history, selected, app.phase.targetRpe) : null;
  const recent = selected ? recentExerciseEntries(app.state.history, selected.id, 5) : [];
  const muscles = muscleVolume(app.state.history, app.state.customExercises);
  const maxSets = Math.max(1, ...muscles.map((item) => item.sets));
  const plateaus = plateauExercises(app.state.history, 3);
  const [bodyDate, setBodyDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const latestBody = [...app.state.bodyStats].sort((a, b) => b.date.localeCompare(a.date))[0];

  return <div className="stack page-enter"><Card className="insight-hero"><div><span className="eyebrow">WEEKLY REVIEW</span><h2>{app.review.adherenceLabel}</h2><p>{app.review.messages.join(" ")}</p></div><div className="insight-score"><strong>{Math.round(app.review.completionRate * 100)}%</strong><small>hoàn thành mục tiêu</small></div></Card><div className="metric-grid"><MetricCard label="Buổi tuần này" value={`${app.review.sessions}/${app.review.goal}`} note="so với mục tiêu tại thời điểm hiện tại" /><MetricCard label="RPE trung bình" value={app.review.avgRpe?.toFixed(1) ?? "—"} note="độ nỗ lực đã ghi" /><MetricCard label="Volume thay đổi" value={app.review.volumeChangePercent == null ? "—" : `${app.review.volumeChangePercent >= 0 ? "+" : ""}${app.review.volumeChangePercent.toFixed(0)}%`} note="so với tuần trước" /></div>

  <Card className="progression-panel"><div className="section-title-row compact"><div><span className="eyebrow">PROGRESSION COACH</span><h2>Đề xuất theo từng bài</h2></div><Zap size={21} /></div><Field label="Bài tập"><select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>{Object.values(exercises).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>{recommendation && <div className="coach-recommendation"><strong>{recommendation.headline}</strong><p>{recommendation.explanation}</p><span>Độ tin cậy: {recommendation.confidence}</span></div>}{recent.length ? <div className="exercise-trend-list">{recent.map(({ session, entry }) => <div key={session.id}><span>{formatDate(session.endedAt)}</span><strong>{entry.sets.filter((set) => set.done && set.kind !== "warmup").map((set) => `${set.weight || "BW"}×${set.reps}`).join(" · ")}</strong><small>RPE {session.avgRpe?.toFixed(1) ?? "—"}</small></div>)}</div> : <p className="muted-copy">Chưa đủ dữ liệu. Hoàn thành ít nhất một buổi có bài này.</p>}</Card>

  <Card className="muscle-volume"><div className="section-title-row compact"><div><span className="eyebrow">VOLUME THEO NHÓM CƠ</span><h2>Working set tuần này</h2></div><BarChart3 size={21} /></div>{muscles.length ? <div className="muscle-bars">{muscles.map((item) => <div key={item.muscle}><span>{item.muscle}</span><i><b style={{ width: `${(item.sets / maxSets) * 100}%` }} /></i><strong>{item.sets}</strong></div>)}</div> : <p className="muted-copy">Chưa có working set trong tuần này.</p>}</Card>

  {plateaus.length > 0 && <Card className="plateau-card"><Info size={20} /><div><strong>Có thể đang chững lại</strong><p>{plateaus.slice(0, 4).join(", ")}. Đây chỉ là tín hiệu từ ba lần gần nhất; hãy kiểm tra kỹ thuật, giấc ngủ và mức độ hồi phục trước khi đổi bài.</p></div></Card>}

  <Card className="body-panel"><div className="section-title-row compact"><div><span className="eyebrow">CHỈ SỐ CƠ THỂ</span><h2>Cập nhật cân nặng</h2></div><TrendingUp size={21} /></div><div className="body-summary"><div><small>Gần nhất</small><strong>{latestBody?.weight ?? "—"}<span> kg</span></strong><p>{latestBody ? formatDate(latestBody.date) : "Chưa có dữ liệu"}</p></div><div className="body-quick-form"><input aria-label="Ngày đo" type="date" value={bodyDate} onChange={(event) => setBodyDate(event.target.value)} /><input aria-label="Cân nặng" type="number" step="0.1" min="0" placeholder="kg" value={weight} onChange={(event) => setWeight(event.target.value)} /><button className="primary-button" type="button" disabled={!Number(weight)} onClick={() => { app.addBodyStat({ date: bodyDate, weight: Number(weight), waist: null, chest: null, arm: null }); setWeight(""); }}><Save size={16} />Lưu</button></div></div>{app.state.bodyStats.length > 0 && <div className="body-history-mini">{[...app.state.bodyStats].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((item) => <div key={item.id}><span>{formatDate(item.date)}</span><strong>{item.weight ?? "—"} kg</strong><button type="button" aria-label="Xóa số đo" onClick={() => app.deleteBodyStat(item.id)}><Trash2 size={14} /></button></div>)}</div>}</Card></div>;
}

export function SettingsScreen({ app, requestPermission }: { app: AppHook; requestPermission: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const themes: ThemePreference[] = ["system", "light", "dark"];
  const exportJson = () => { downloadText(backupFileName("json"), serializeBackup(app.state), "application/json"); app.markBackup(); setMessage("Đã xuất backup JSON."); };
  const exportCsv = () => { downloadText(backupFileName("csv"), sessionsToCsv(app.state.history), "text/csv;charset=utf-8"); setMessage("Đã xuất lịch sử CSV."); };
  const importFile = async (file: File) => {
    try { const next = parseBackup(await file.text()); app.replaceState(next); setMessage(`Đã nhập ${next.history.length} buổi tập. Schema được chuẩn hóa về v3.`); }
    catch (error) { setMessage(error instanceof Error ? `Không thể nhập: ${error.message}` : "Không thể nhập backup."); }
  };
  const sync = async (mode: "push" | "pull") => {
    setBusy(true); setMessage("");
    try {
      if (mode === "push") { const date = await pushRemoteState(app.state); app.updateSync({ lastSyncedAt: date, lastError: null }); setMessage("Đã đẩy dữ liệu lên endpoint."); }
      else { const remote = await pullRemoteState(app.state); app.replaceState(remote); setMessage("Đã tải và áp dụng dữ liệu từ endpoint."); }
    } catch (error) { const text = error instanceof Error ? error.message : "Đồng bộ thất bại."; app.updateSync({ lastError: text }); setMessage(text); }
    finally { setBusy(false); }
  };

  return <div className="stack page-enter"><Card className="settings-section"><div className="settings-title"><Sun size={20} /><div><h2>Giao diện</h2><p>Sáng, tối hoặc theo hệ thống.</p></div></div><div className="theme-picker">{themes.map((theme) => <button key={theme} type="button" className={app.state.settings.theme === theme ? "active" : ""} onClick={() => app.updateSettings({ theme })}>{theme === "light" ? <Sun size={17} /> : theme === "dark" ? <Moon size={17} /> : <SettingsIcon size={17} />}{theme === "system" ? "Hệ thống" : theme === "light" ? "Sáng" : "Tối"}</button>)}</div></Card>

  <Card className="settings-section"><div className="settings-title"><Bell size={20} /><div><h2>Nhắc tập và phản hồi</h2><p>Notification nền có thể bị giới hạn bởi trình duyệt.</p></div></div><div className="setting-rows"><div><span><strong>Nhắc lịch tập</strong><small>Theo ngày và giờ cấu hình</small></span><Toggle checked={app.state.settings.scheduleReminders} label="Nhắc lịch" onChange={(checked) => { app.updateSettings({ scheduleReminders: checked, notify: checked || app.state.settings.notify }); if (checked) void requestPermission(); }} /></div><div><span><strong>Thông báo</strong><small>Hết giờ nghỉ và lịch tập</small></span><Toggle checked={app.state.settings.notify} label="Thông báo" onChange={(checked) => { app.updateSettings({ notify: checked }); if (checked) void requestPermission(); }} /></div><div><span><strong>Âm báo</strong><small>Khi timer về 0</small></span><Toggle checked={app.state.settings.sound} label="Âm báo" onChange={(sound) => app.updateSettings({ sound })} /></div><div><span><strong>Rung</strong><small>Khi thiết bị hỗ trợ</small></span><Toggle checked={app.state.settings.vibration} label="Rung" onChange={(vibration) => app.updateSettings({ vibration })} /></div></div><div className="form-grid"><Field label="Giờ nhắc"><input type="time" value={app.state.settings.reminderTime} onChange={(event) => app.updateSettings({ reminderTime: event.target.value })} /></Field><Field label="Mục tiêu tuần"><select value={app.state.settings.weeklyGoal} onChange={(event) => app.updateSettings({ weeklyGoal: Number(event.target.value) })}>{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>{value} buổi</option>)}</select></Field></div><div className="day-picker">{TRAINING_DAYS.map((day) => <button key={day.value} type="button" className={app.state.settings.trainingDays.includes(day.value) ? "active" : ""} onClick={() => app.updateSettings({ trainingDays: app.state.settings.trainingDays.includes(day.value) ? app.state.settings.trainingDays.filter((item) => item !== day.value) : [...app.state.settings.trainingDays, day.value] })}>{day.short}</button>)}</div></Card>

  <Card className="settings-section"><div className="settings-title"><FileJson size={20} /><div><h2>Backup và dữ liệu</h2><p>JSON để phục hồi toàn bộ; CSV để phân tích lịch sử.</p></div></div><div className="backup-actions"><button className="primary-button" type="button" onClick={exportJson}><Download size={16} />Xuất backup JSON</button><button className="secondary-button" type="button" onClick={exportCsv}><Download size={16} />Xuất CSV</button><button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}><Upload size={16} />Nhập backup</button><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.currentTarget.value = ""; }} /></div><p className="backup-status">Backup gần nhất: {app.state.settings.lastBackupAt ? formatDate(app.state.settings.lastBackupAt) : "chưa có"}</p></Card>

  <Card className="settings-section sync-panel"><div className="settings-title"><Cloud size={20} /><div><h2>Đồng bộ endpoint · Beta</h2><p>LiftPath hỗ trợ GET/PUT một file JSON qua endpoint riêng. Token được lưu cục bộ trên thiết bị này.</p></div></div><Field label="Endpoint HTTPS"><input type="url" placeholder="https://example.com/api/liftpath-sync" value={app.state.sync.endpoint} onChange={(event) => app.updateSync({ endpoint: event.target.value })} /></Field><Field label="Bearer token"><input type="password" placeholder="Tùy chọn" value={app.state.sync.token} onChange={(event) => app.updateSync({ token: event.target.value })} /></Field><div className="sync-actions"><button className="secondary-button" type="button" disabled={busy || !app.state.sync.endpoint} onClick={() => void sync("pull")}><RefreshCw size={16} />Tải từ cloud</button><button className="primary-button" type="button" disabled={busy || !app.state.sync.endpoint} onClick={() => void sync("push")}><Cloud size={16} />Đẩy lên cloud</button></div><p className="backup-status">Đồng bộ gần nhất: {app.state.sync.lastSyncedAt ? formatDate(app.state.sync.lastSyncedAt) : "chưa có"}</p></Card>

  <Card className="settings-section"><div className="settings-title"><Shield size={20} /><div><h2>An toàn dữ liệu</h2><p>Schema v3 có migration và snapshot lịch sử. Xóa toàn bộ chỉ nên dùng sau khi đã backup.</p></div></div><button className="danger-button" type="button" onClick={() => setResetOpen(true)}><Trash2 size={16} />Xóa toàn bộ dữ liệu</button></Card>
  {message && <div className="toast-message" role="status">{message}</div>}
  {resetOpen && <ConfirmDialog title="Xóa toàn bộ LiftPath?" text="Giáo án tùy chỉnh, lịch sử, số đo và cài đặt trên thiết bị này sẽ bị xóa. Thao tác không thể hoàn tác." confirmLabel="Xóa tất cả" danger confirm={app.resetAll} close={() => setResetOpen(false)} />}</div>;
}

export function RecapModal({ app }: { app: AppHook }) {
  const recap = app.state.lastRecap;
  if (!recap) return null;
  return <Modal title="Buổi tập đã được lưu" close={app.dismissRecap}><div className="recap"><div className="recap-score"><Sparkles size={26} /><strong>{recap.prs.length}</strong><span>PR mới</span></div><div className="metric-grid"><MetricCard label="Thời lượng" value={`${recap.durationMinutes} phút`} note="từ lúc bắt đầu đến kết thúc" /><MetricCard label="Hiệp hoàn thành" value={String(recap.totalSets)} note="đã lưu" /><MetricCard label="Volume" value={`${formatNumber(recap.volume)} kg`} note="tham khảo" /></div>{recap.prs.length > 0 && <div className="pr-list"><h3>Kỷ lục mới</h3>{recap.prs.slice(0, 8).map((record, index) => <div key={`${record.exerciseId}-${record.type}-${index}`}><span>{record.exerciseName}</span><strong>{record.type}: {formatNumber(record.value)} {record.unit}</strong></div>)}</div>}<p className="recap-next"><Zap size={17} />{recap.nextAction}</p><button className="primary-button full" type="button" onClick={app.dismissRecap}>Hoàn tất</button></div></Modal>;
}

export function ProgramSwitchDialog({ programId, app, close }: { programId: ProgramId; app: AppHook; close: () => void }) {
  const program = getProgram(programId, app.state.customPrograms);
  const [options, setOptions] = useState<ProgramSwitchOptions>({ keepSchedule: false, resetCycle: true });
  return <Modal title={`Chuyển sang ${program.name}`} close={close}><p className="dialog-copy">Lịch sử cũ vẫn giữ nguyên. Bạn có thể giữ lịch đang dùng hoặc áp dụng lịch gợi ý của chương trình mới.</p><div className="option-list"><label><input type="checkbox" checked={options.keepSchedule} onChange={(event) => setOptions({ ...options, keepSchedule: event.target.checked })} /><span><strong>Giữ lịch tập hiện tại</strong><small>Nếu tắt, dùng lịch: {program.scheduleLabel}</small></span></label><label><input type="checkbox" checked={options.resetCycle} onChange={(event) => setOptions({ ...options, resetCycle: event.target.checked })} /><span><strong>Bắt đầu chu kỳ mới từ tuần 1</strong><small>Khuyên dùng khi đổi split hoặc mục tiêu.</small></span></label></div><div className="dialog-actions"><button className="secondary-button" type="button" onClick={close}>Hủy</button><button className="primary-button" type="button" onClick={() => { app.switchProgram(programId, options); close(); }}>Chuyển giáo án<ArrowRight size={16} /></button></div></Modal>;
}
