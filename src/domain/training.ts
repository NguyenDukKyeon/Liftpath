import { allExercises, getProgram, phaseForWeek, programWeek } from "../data.js";
import type {
  AppState,
  Exercise,
  ExerciseEntry,
  ExerciseId,
  MuscleGroup,
  PersonalRecord,
  ProgressionRecommendation,
  Session,
  SetEntry,
  WeeklyReview,
  WorkoutRecap,
} from "../types.js";

export const uid = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);

const numeric = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isCompletableSet = (set: SetEntry) => {
  const reps = numeric(set.reps);
  const rpe = numeric(set.rpe);
  return Number.isInteger(reps) && reps > 0 && rpe >= 1 && rpe <= 10;
};

export const setVolume = (set: SetEntry) => set.done ? numeric(set.weight) * numeric(set.reps) : 0;
export const exerciseVolume = (entry: ExerciseEntry) => entry.sets.reduce((sum, set) => sum + setVolume(set), 0);
export const sessionVolume = (session: Session) => session.exercises.reduce((sum, entry) => sum + exerciseVolume(entry), 0);
export const totalVolume = (history: Session[]) => history.reduce((sum, session) => sum + sessionVolume(session), 0);

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
  const avgRpe = working.reduce((sum, set) => sum + numeric(set.rpe), 0) / working.length;
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

  if (belowRange || avgRpe >= targetRpe + 1.5) {
    const nextWeight = averageWeight > 0
      ? roundedIncrement(Math.max(0, averageWeight - exercise.incrementKg), exercise.incrementKg)
      : null;
    return {
      exerciseId: exercise.id,
      headline: nextWeight == null ? "Giảm độ khó" : `Giảm về khoảng ${nextWeight} kg`,
      explanation: `Buổi trước chưa đạt đáy rep range hoặc RPE ${avgRpe.toFixed(1)} cao hơn mục tiêu. Giảm một bước để giữ kỹ thuật.`,
      weight: nextWeight,
      minReps: exercise.min,
      maxReps: exercise.max,
      confidence: "high",
    };
  }

  return {
    exerciseId: exercise.id,
    headline: averageWeight > 0 ? `Giữ khoảng ${roundedIncrement(averageWeight, exercise.incrementKg)} kg` : "Giữ độ khó hiện tại",
    explanation: `Tiếp tục tích lũy reps trong khoảng ${exercise.min}–${exercise.max}. Khi toàn bộ working set đạt trần rep với RPE phù hợp, app sẽ đề xuất tăng tải.`,
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
      : "Buổi tới app sẽ dựa trên reps và RPE hôm nay để đề xuất mức tải.",
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
