import { allExercises, getProgram, phaseForWeek, programWeek } from "../data.js";
import type {
  AppState,
  Exercise,
  ExerciseEntry,
  ExerciseId,
  ExercisePrescription,
  LoggedSet,
  MuscleGroup,
  PersonalRecord,
  ProgressionRecommendation,
  Session,
  SetEntry,
  SetPrescription,
  TrackingMode,
  WeeklyReview,
  WorkoutRecap,
} from "../types.js";

export const uid = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);

const numeric = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isLoggedSet = (set: SetEntry | LoggedSet): set is LoggedSet => "trackingMode" in set;

export function isCompletableSet(set: LoggedSet): boolean;
export function isCompletableSet(set: SetEntry): boolean;
export function isCompletableSet(set: LoggedSet | SetEntry) {
  if (!isLoggedSet(set)) {
    const reps = numeric(set.reps);
    return Number.isInteger(reps) && reps > 0;
  }
  switch (set.trackingMode) {
    case "weight-reps":
      return set.weightKg != null && set.weightKg >= 0 && set.reps != null && set.reps > 0;
    case "bodyweight-reps":
      return set.reps != null && set.reps > 0;
    case "weighted-bodyweight-reps":
      return set.addedWeightKg != null && set.addedWeightKg >= 0 && set.reps != null && set.reps > 0;
    case "assisted-reps":
      return set.assistanceKg != null && set.assistanceKg >= 0 && set.reps != null && set.reps > 0;
    case "duration":
      return set.seconds != null && set.seconds > 0;
    case "distance":
      return set.distanceMeters != null && set.distanceMeters > 0;
  }
}

export function setVolume(set: LoggedSet): number;
export function setVolume(set: SetEntry): number;
export function setVolume(set: LoggedSet | SetEntry) {
  if (!set.done) return 0;
  if (!isLoggedSet(set)) return numeric(set.weight) * numeric(set.reps);
  if (set.trackingMode === "weight-reps") return numeric(set.weightKg) * numeric(set.reps);
  if (set.trackingMode === "weighted-bodyweight-reps") return numeric(set.addedWeightKg) * numeric(set.reps);
  return 0;
}

export const exerciseVolume = (entry: ExerciseEntry) => {
  if (entry.loggedSets?.length) return entry.loggedSets.reduce((sum, set) => sum + setVolume(set), 0);
  return entry.sets.reduce((sum, set) => sum + setVolume(set), 0);
};
export const sessionVolume = (session: Session) => session.exercises.reduce((sum, entry) => sum + exerciseVolume(entry), 0);
export const totalVolume = (history: Session[]) => history.reduce((sum, session) => sum + sessionVolume(session), 0);

const effortToLegacyRpe = (effort: LoggedSet["effort"]) => {
  if (!effort) return "";
  return String(effort.mode === "rir" ? Math.max(1, Math.min(10, 10 - effort.value)) : effort.value);
};

const trackingModeFor = (exercise: Exercise): TrackingMode => {
  if (exercise.trackingMode) return exercise.trackingMode;
  if (exercise.suffix === "seconds") return "duration";
  if (exercise.incrementKg === 0 && exercise.equipmentTags.includes("bodyweight")) return "bodyweight-reps";
  return "weight-reps";
};

const targetRpeFor = (prescription: ExercisePrescription) => {
  if (prescription.targetEffort.mode === "rpe") return prescription.targetEffort.value;
  if (prescription.targetEffort.mode === "rir") return Math.max(1, Math.min(10, 10 - prescription.targetEffort.value));
  return Math.max(1, Math.min(10, 10 - prescription.targetEffort.repsInReserve));
};

const firstTargetRange = (prescription: ExercisePrescription, exercise: Exercise) => {
  const target = prescription.setScheme.find((set) => set.targetReps || set.targetSeconds || set.targetDistanceMeters);
  if (target?.targetReps) return target.targetReps;
  if (target?.targetSeconds) return target.targetSeconds;
  if (target?.targetDistanceMeters) return target.targetDistanceMeters;
  return { min: exercise.min, max: exercise.max };
};

const loggedSetFromPrescription = (
  set: SetPrescription,
  exercise: Exercise,
  recommendedWeight: number | null,
  previous?: LoggedSet,
): LoggedSet => {
  const base = { id: uid(), kind: set.kind, effort: null, done: false } as const;
  const mode = trackingModeFor(exercise);
  if (mode === "duration") {
    return { ...base, trackingMode: "duration", seconds: previous?.trackingMode === "duration" ? previous.seconds : null };
  }
  if (mode === "distance") {
    return { ...base, trackingMode: "distance", distanceMeters: previous?.trackingMode === "distance" ? previous.distanceMeters : null };
  }
  if (mode === "bodyweight-reps") {
    return { ...base, trackingMode: "bodyweight-reps", reps: null };
  }
  if (mode === "assisted-reps") {
    const assistanceKg = previous?.trackingMode === "assisted-reps" ? previous.assistanceKg : null;
    return { ...base, trackingMode: "assisted-reps", assistanceKg, reps: null };
  }
  if (mode === "weighted-bodyweight-reps") {
    const addedWeightKg = previous?.trackingMode === "weighted-bodyweight-reps" ? previous.addedWeightKg : recommendedWeight;
    return { ...base, trackingMode: "weighted-bodyweight-reps", addedWeightKg, reps: null };
  }
  const previousWeight = previous?.trackingMode === "weight-reps" ? previous.weightKg : null;
  return { ...base, trackingMode: "weight-reps", weightKg: recommendedWeight ?? previousWeight, reps: null };
};

const legacySetFromLogged = (set: LoggedSet): SetEntry => {
  switch (set.trackingMode) {
    case "weight-reps":
      return { id: set.id, kind: set.kind, weight: set.weightKg == null ? "" : String(set.weightKg), reps: set.reps == null ? "" : String(set.reps), rpe: effortToLegacyRpe(set.effort), done: set.done };
    case "weighted-bodyweight-reps":
      return { id: set.id, kind: set.kind, weight: set.addedWeightKg == null ? "" : String(set.addedWeightKg), reps: set.reps == null ? "" : String(set.reps), rpe: effortToLegacyRpe(set.effort), done: set.done };
    case "assisted-reps":
      return { id: set.id, kind: set.kind, weight: set.assistanceKg == null ? "" : String(set.assistanceKg), reps: set.reps == null ? "" : String(set.reps), rpe: effortToLegacyRpe(set.effort), done: set.done };
    case "bodyweight-reps":
      return { id: set.id, kind: set.kind, weight: "", reps: set.reps == null ? "" : String(set.reps), rpe: effortToLegacyRpe(set.effort), done: set.done };
    case "duration":
      return { id: set.id, kind: set.kind, weight: "", reps: set.seconds == null ? "" : String(set.seconds), rpe: effortToLegacyRpe(set.effort), done: set.done };
    case "distance":
      return { id: set.id, kind: set.kind, weight: "", reps: set.distanceMeters == null ? "" : String(set.distanceMeters), rpe: effortToLegacyRpe(set.effort), done: set.done };
  }
};

const legacySetToLogged = (set: SetEntry, mode: TrackingMode): LoggedSet => {
  const effort = set.rpe && numeric(set.rpe) >= 1 && numeric(set.rpe) <= 10
    ? { mode: "rpe" as const, value: numeric(set.rpe) }
    : null;
  const base = { id: set.id, kind: set.kind, effort, done: set.done };
  if (mode === "duration") return { ...base, trackingMode: "duration", seconds: set.reps === "" ? null : numeric(set.reps) };
  if (mode === "distance") return { ...base, trackingMode: "distance", distanceMeters: set.reps === "" ? null : numeric(set.reps) };
  if (mode === "bodyweight-reps") return { ...base, trackingMode: "bodyweight-reps", reps: set.reps === "" ? null : numeric(set.reps) };
  if (mode === "assisted-reps") return { ...base, trackingMode: "assisted-reps", assistanceKg: set.weight === "" ? null : numeric(set.weight), reps: set.reps === "" ? null : numeric(set.reps) };
  if (mode === "weighted-bodyweight-reps") return { ...base, trackingMode: "weighted-bodyweight-reps", addedWeightKg: set.weight === "" ? null : numeric(set.weight), reps: set.reps === "" ? null : numeric(set.reps) };
  return { ...base, trackingMode: "weight-reps", weightKg: set.weight === "" ? null : numeric(set.weight), reps: set.reps === "" ? null : numeric(set.reps) };
};

export const makeDraftEntry = (
  prescription: ExercisePrescription,
  exercise: Exercise,
  history: Session[],
): ExerciseEntry => {
  const targetRpe = targetRpeFor(prescription);
  const recommendation = progressionRecommendation(history, exercise, targetRpe);
  const latest = latestExerciseEntry(history, exercise.id)?.entry;
  const mode = trackingModeFor(exercise);
  const previousLogged = latest?.loggedSets?.length
    ? latest.loggedSets.filter((set) => set.kind !== "warmup")
    : latest?.sets.filter((set) => set.kind !== "warmup").map((set) => legacySetToLogged(set, mode)) ?? [];
  const loggedSets = prescription.setScheme.map((set, index) => loggedSetFromPrescription(
    set,
    exercise,
    recommendation.weight,
    previousLogged[index] ?? previousLogged.at(-1),
  ));
  const range = firstTargetRange(prescription, exercise);
  return {
    exerciseId: exercise.id,
    snapshot: {
      id: exercise.id,
      name: exercise.name,
      primary: exercise.primary,
      secondary: exercise.secondary,
      equipment: exercise.equipment,
      suffix: exercise.suffix,
      incrementKg: exercise.incrementKg,
      trackingMode: mode,
      movementPattern: exercise.movementPattern,
      unilateral: exercise.unilateral,
    },
    target: {
      sets: prescription.setScheme.length,
      min: range.min,
      max: range.max,
      rest: prescription.restSeconds,
      targetRpe,
      prescriptionId: prescription.id,
      targetEffort: prescription.targetEffort,
      progression: prescription.progression,
    },
    sets: loggedSets.map(legacySetFromLogged),
    loggedSets,
    note: "",
  };
};

const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
};

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const weeklySessions = (history: Session[], now = new Date(), offset = 0) => {
  const start = startOfWeek(now);
  start.setDate(start.getDate() + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return history.filter((session) => {
    const ended = new Date(session.endedAt);
    return ended >= start && ended < end;
  });
};

export const weeklyStats = (history: Session[], now = new Date(), offset = 0) => {
  const sessions = weeklySessions(history, now, offset);
  const sets = sessions.reduce((sum, session) => sum + session.exercises.reduce((entrySum, entry) => entrySum + entry.sets.filter((set) => set.done && set.kind !== "warmup").length, 0), 0);
  const volume = sessions.reduce((sum, session) => sum + sessionVolume(session), 0);
  const activeDays = new Set(sessions.map((session) => dateKey(new Date(session.endedAt)))).size;
  const rpes = sessions.flatMap((session) => session.avgRpe == null ? [] : [session.avgRpe]);
  const avgRpe = rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : null;
  return { sessions: sessions.length, sets, volume: Math.round(volume), activeDays, avgRpe };
};

export const weeklyGoalForWeek = (sessions: Session[], fallback: number) => {
  const goals = sessions.map((session) => session.weeklyGoalAtCompletion).filter((goal) => Number.isFinite(goal) && goal > 0);
  if (!goals.length) return Math.max(1, fallback);
  const counts = new Map<number, number>();
  goals.forEach((goal) => counts.set(goal, (counts.get(goal) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

export const weeklyStreak = (history: Session[], currentGoal: number, now = new Date()) => {
  const cursor = startOfWeek(now);
  let streak = 0;
  let first = true;
  for (let guard = 0; guard < 260; guard += 1) {
    const start = new Date(cursor);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const sessions = history.filter((session) => {
      const ended = new Date(session.endedAt);
      return ended >= start && ended < end;
    });
    const goal = weeklyGoalForWeek(sessions, currentGoal);
    if (sessions.length >= goal) {
      streak += 1;
    } else if (!first) {
      break;
    }
    first = false;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
};

export const latestExerciseEntry = (history: Session[], exerciseId: ExerciseId) => {
  const sorted = [...history].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  for (const session of sorted) {
    const entry = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (entry?.sets.some((set) => set.done && set.kind !== "warmup")) return { session, entry };
  }
  return null;
};

export const recentExerciseEntries = (history: Session[], exerciseId: ExerciseId, limit = 3) => {
  const results: Array<{ session: Session; entry: ExerciseEntry }> = [];
  const sorted = [...history].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  for (const session of sorted) {
    const entry = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (entry) results.push({ session, entry });
    if (results.length >= limit) break;
  }
  return results;
};

const roundedIncrement = (value: number, increment: number) => {
  if (!increment) return value;
  return Math.round(value / increment) * increment;
};

export const progressionRecommendation = (
  history: Session[],
  exercise: Exercise,
  targetRpe: number,
): ProgressionRecommendation => {
  const latest = latestExerciseEntry(history, exercise.id);
  if (!latest) {
    return {
      exerciseId: exercise.id,
      headline: "Thiết lập mức khởi đầu",
      explanation: `Chọn mức tạ giúp bạn đạt ${exercise.min}–${exercise.max} reps với RPE khoảng ${targetRpe}.`,
      weight: null,
      minReps: exercise.min,
      maxReps: exercise.max,
      confidence: "low",
    };
  }

  const working = latest.entry.sets.filter((set) => set.done && set.kind !== "warmup");
  if (!working.length) {
    return {
      exerciseId: exercise.id,
      headline: "Lặp lại mức thử nghiệm",
      explanation: "Buổi trước chưa có working set hoàn chỉnh để đánh giá.",
      weight: null,
      minReps: exercise.min,
      maxReps: exercise.max,
      confidence: "low",
    };
  }

  const averageWeight = working.reduce((sum, set) => sum + numeric(set.weight), 0) / working.length;
  const minRepsDone = Math.min(...working.map((set) => numeric(set.reps)));
  const rpeValues = working.map((set) => numeric(set.rpe)).filter((value) => value >= 1 && value <= 10);
  const avgRpe = rpeValues.length ? rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length : targetRpe;
  const allAtTop = working.every((set) => numeric(set.reps) >= exercise.max);
  const belowRange = minRepsDone < exercise.min;

  if (allAtTop && avgRpe <= targetRpe + 0.5 && averageWeight > 0) {
    const nextWeight = roundedIncrement(averageWeight + exercise.incrementKg, exercise.incrementKg);
    return {
      exerciseId: exercise.id,
      headline: `Tăng lên khoảng ${nextWeight} kg`,
      explanation: `Bạn đã đạt trần rep ở các working set với RPE trung bình ${avgRpe.toFixed(1)}. Tăng một bước nhỏ và quay về đáy rep range.`,
      weight: nextWeight,
      minReps: exercise.min,
      maxReps: exercise.max,
      confidence: "high",
    };
  }

  if (belowRange || (rpeValues.length > 0 && avgRpe >= targetRpe + 1.5)) {
    const nextWeight = averageWeight > 0
      ? roundedIncrement(Math.max(0, averageWeight - exercise.incrementKg), exercise.incrementKg)
      : null;
    return {
      exerciseId: exercise.id,
      headline: nextWeight == null ? "Giảm độ khó" : `Giảm về khoảng ${nextWeight} kg`,
      explanation: `Buổi trước chưa đạt đáy rep range${rpeValues.length ? ` hoặc RPE ${avgRpe.toFixed(1)} cao hơn mục tiêu` : ""}. Giảm một bước để giữ kỹ thuật.`,
      weight: nextWeight,
      minReps: exercise.min,
      maxReps: exercise.max,
      confidence: "high",
    };
  }

  return {
    exerciseId: exercise.id,
    headline: averageWeight > 0 ? `Giữ khoảng ${roundedIncrement(averageWeight, exercise.incrementKg)} kg` : "Giữ độ khó hiện tại",
    explanation: `Tiếp tục tích lũy reps trong khoảng ${exercise.min}–${exercise.max}. Khi toàn bộ working set đạt trần rep với effort phù hợp, app sẽ đề xuất tăng tải.`,
    weight: averageWeight > 0 ? roundedIncrement(averageWeight, exercise.incrementKg) : null,
    minReps: exercise.min,
    maxReps: exercise.max,
    confidence: "medium",
  };
};

export const autofillSetsFromHistory = (
  history: Session[],
  exercise: Exercise,
  setCount: number,
  targetRpe: number,
): SetEntry[] => {
  const latest = latestExerciseEntry(history, exercise.id);
  const recommendation = progressionRecommendation(history, exercise, targetRpe);
  const previousWorking = latest?.entry.sets.filter((set) => set.kind !== "warmup") ?? [];
  return Array.from({ length: setCount }, (_, index) => {
    const previous = previousWorking[index] ?? previousWorking.at(-1);
    return {
      id: uid(),
      kind: "working",
      weight: recommendation.weight != null ? String(recommendation.weight) : previous?.weight ?? "",
      reps: "",
      rpe: "",
      done: false,
    };
  });
};

const estimatedOneRepMax = (weight: number, reps: number) => reps > 0 ? weight * (1 + reps / 30) : 0;

const bestMetrics = (entries: ExerciseEntry[]) => {
  let weight = 0;
  let reps = 0;
  let volume = 0;
  let oneRm = 0;
  entries.forEach((entry) => entry.sets.forEach((set) => {
    if (!set.done || set.kind === "warmup") return;
    const w = numeric(set.weight);
    const r = numeric(set.reps);
    weight = Math.max(weight, w);
    reps = Math.max(reps, r);
    volume = Math.max(volume, w * r);
    oneRm = Math.max(oneRm, estimatedOneRepMax(w, r));
  }));
  return { weight, reps, volume, oneRm };
};

export const detectPersonalRecords = (session: Session, historyBefore: Session[]): PersonalRecord[] => {
  const records: PersonalRecord[] = [];
  session.exercises.forEach((entry) => {
    const previousEntries = historyBefore.flatMap((item) => item.exercises.filter((exercise) => exercise.exerciseId === entry.exerciseId));
    const before = bestMetrics(previousEntries);
    const current = bestMetrics([entry]);
    const name = entry.snapshot.name;
    const candidates: Array<[PersonalRecord["type"], keyof typeof current, string]> = [
      ["weight", "weight", "kg"],
      ["reps", "reps", "reps"],
      ["volume", "volume", "kg·rep"],
      ["estimated-1rm", "oneRm", "kg"],
    ];
    candidates.forEach(([type, key, unit]) => {
      if (current[key] > 0 && current[key] > before[key] + 0.001) {
        records.push({ exerciseId: entry.exerciseId, exerciseName: name, type, previous: before[key], value: current[key], unit });
      }
    });
  });
  return records;
};

export const muscleVolume = (
  history: Session[],
  customExercises: Exercise[],
  now = new Date(),
  offset = 0,
) => {
  const exercises = allExercises(customExercises);
  const result = new Map<MuscleGroup, number>();
  weeklySessions(history, now, offset).forEach((session) => session.exercises.forEach((entry) => {
    const meta = exercises[entry.exerciseId] ?? entry.snapshot;
    const workingSets = entry.sets.filter((set) => set.done && set.kind !== "warmup").length;
    result.set(meta.primary, (result.get(meta.primary) ?? 0) + workingSets);
    meta.secondary.forEach((muscle) => result.set(muscle, (result.get(muscle) ?? 0) + workingSets * 0.5));
  }));
  return [...result.entries()].map(([muscle, sets]) => ({ muscle, sets: Math.round(sets * 10) / 10 })).sort((a, b) => b.sets - a.sets);
};

export const plateauExercises = (history: Session[], limit = 3) => {
  const exerciseIds = new Set(history.flatMap((session) => session.exercises.map((entry) => entry.exerciseId)));
  const plateaus: string[] = [];
  exerciseIds.forEach((exerciseId) => {
    const entries = recentExerciseEntries(history, exerciseId, limit);
    if (entries.length < limit) return;
    const scores = entries.map(({ entry }) => bestMetrics([entry]).oneRm).reverse();
    const improved = scores.some((score, index) => index > 0 && score > scores[index - 1] * 1.01);
    if (!improved) plateaus.push(entries[0].entry.snapshot.name);
  });
  return plateaus;
};

export const weeklyReview = (state: AppState, now = new Date()): WeeklyReview => {
  const current = weeklyStats(state.history, now, 0);
  const previous = weeklyStats(state.history, now, -1);
  const goal = state.settings.weeklyGoal;
  const completionRate = Math.min(1, current.sessions / Math.max(1, goal));
  const volumeChangePercent = previous.volume > 0 ? ((current.volume - previous.volume) / previous.volume) * 100 : null;
  const recent = weeklySessions(state.history, now, 0);
  const highRpe = current.avgRpe != null && current.avgRpe >= 8.7;
  const lowEnergy = recent.filter((session) => session.feedback && session.feedback.energy <= 2).length >= 2;
  const highSoreness = recent.filter((session) => session.feedback && session.feedback.soreness >= 4).length >= 2;
  const sharpVolumeSpike = volumeChangePercent != null && volumeChangePercent > 30;
  const performanceDrop = plateauExercises(state.history, 3).length >= 2;
  const progress = state.programProgress[state.settings.programId];
  const phase = phaseForWeek(progress ? programWeek(progress.startedAt, now) : 1);
  const deloadSuggested = Boolean(progress?.autoDeload && (highRpe || lowEnergy || highSoreness || sharpVolumeSpike || performanceDrop) && phase.short === "Đánh giá");
  const messages: string[] = [];
  if (completionRate >= 1) messages.push("Bạn đã hoàn thành mục tiêu tuần.");
  else messages.push(`Còn ${Math.max(0, goal - current.sessions)} buổi để đạt mục tiêu tuần.`);
  if (volumeChangePercent != null && volumeChangePercent > 20) messages.push("Khối lượng tăng nhanh; theo dõi RPE và khả năng hồi phục.");
  if (current.avgRpe != null && current.avgRpe > 8.5) messages.push("RPE trung bình cao hơn vùng mục tiêu của phần lớn buổi tập.");
  if (deloadSuggested) messages.push("Dữ liệu cho thấy nên cân nhắc một tuần giảm tải.");
  return {
    sessions: current.sessions,
    goal,
    completionRate,
    sets: current.sets,
    volume: current.volume,
    avgRpe: current.avgRpe,
    volumeChangePercent,
    adherenceLabel: completionRate >= 1 ? "Đạt mục tiêu" : completionRate >= 0.66 ? "Đang đúng hướng" : "Cần điều chỉnh lịch",
    deloadSuggested,
    messages,
  };
};

export const makeRecap = (session: Session, historyBefore: Session[]): WorkoutRecap => {
  const volume = sessionVolume(session);
  const prs = detectPersonalRecords(session, historyBefore);
  const strongest = [...session.exercises].sort((a, b) => exerciseVolume(b) - exerciseVolume(a))[0];
  const durationMinutes = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000));
  return {
    sessionId: session.id,
    durationMinutes,
    totalSets: session.totalSets,
    volume: Math.round(volume),
    prs,
    strongestExercise: strongest?.snapshot.name,
    nextAction: prs.length
      ? `Bạn có ${prs.length} PR mới. Buổi tới hãy giữ kỹ thuật trước khi tiếp tục tăng tải.`
      : "Buổi tới app sẽ dựa trên reps và effort hôm nay để đề xuất mức tải.",
  };
};

export const estimateDuration = (entries: ExerciseEntry[]) => {
  const seconds = entries.reduce((sum, entry) => sum + entry.sets.length * (entry.target.rest + 45), 0);
  return Math.max(10, Math.round(seconds / 60));
};

export const programCompletion = (state: AppState) => {
  const program = getProgram(state.settings.programId, state.customPrograms);
  const completed = new Set(state.history.filter((session) => session.programId === program.id).map((session) => session.dayId));
  return { completed: completed.size, total: program.workouts.length };
};
