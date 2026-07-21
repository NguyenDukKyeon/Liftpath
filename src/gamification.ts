import type { Session } from "./types";

const localKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
};

export const weeklyStats = (history: Session[], now = new Date(), offset = 0) => {
  const start = startOfWeek(now);
  start.setDate(start.getDate() + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  let sessions = 0;
  let sets = 0;
  let volume = 0;
  const days = new Set<string>();
  history.forEach((session) => {
    const date = new Date(session.endedAt);
    if (date < start || date >= end) return;
    sessions += 1;
    days.add(localKey(date));
    session.exercises.forEach((entry) => entry.sets.forEach((set) => {
      if (!set.done) return;
      sets += 1;
      const weight = Number(set.weight);
      const reps = Number(set.reps);
      if (Number.isFinite(weight) && Number.isFinite(reps)) volume += weight * reps;
    }));
  });
  return { sessions, sets, volume: Math.round(volume), activeDays: days.size };
};

export const weeklyStreak = (history: Session[], goal: number) => {
  const target = Math.max(1, Math.min(7, Math.round(goal)));
  const sessionsByWeek = new Map<string, number>();
  history.forEach((session) => {
    const date = new Date(session.endedAt);
    if (!Number.isFinite(date.getTime())) return;
    const key = localKey(startOfWeek(date));
    sessionsByWeek.set(key, (sessionsByWeek.get(key) ?? 0) + 1);
  });

  const cursor = startOfWeek(new Date());
  if ((sessionsByWeek.get(localKey(cursor)) ?? 0) < target) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while ((sessionsByWeek.get(localKey(cursor)) ?? 0) >= target) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
};

export const totalVolume = (history: Session[]) => history.reduce((total, session) => total + session.exercises.reduce((sum, entry) => sum + entry.sets.reduce((setSum, set) => setSum + (set.done ? (Number(set.weight) || 0) * (Number(set.reps) || 0) : 0), 0), 0), 0);
export const totalSets = (history: Session[]) => history.reduce((total, session) => total + session.totalSets, 0);

export const levelInfo = (history: Session[], goal: number) => {
  const xp = Math.round(history.length * 110 + totalSets(history) * 4 + totalVolume(history) / 100 + weeklyStreak(history, goal) * 90);
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 220)) + 1);
  const start = 220 * (level - 1) ** 2;
  const next = 220 * level ** 2;
  const progress = Math.max(0, Math.min(1, (xp - start) / Math.max(1, next - start)));
  const rank = level < 3 ? "🌱 Tân binh" : level < 6 ? "💪 Bền bỉ" : level < 10 ? "🔥 Bứt phá" : "👑 Bản lĩnh";
  return { xp, level, progress, rank, next };
};

export const achievements = (history: Session[], goal: number) => {
  const streak = weeklyStreak(history, goal);
  const volume = totalVolume(history);
  const total = history.length;
  return [
    { id: "first", icon: "🚀", name: "Khởi Đầu Kỳ Tích", hint: "Hoàn thành buổi đầu tiên", progress: Math.min(1, total), unlocked: total >= 1 },
    { id: "five", icon: "🎯", name: "Vào Guồng Thép", hint: "Hoàn thành 5 buổi tập", progress: Math.min(1, total / 5), unlocked: total >= 5 },
    { id: "streak", icon: "🔥", name: "Ngọn Lửa Kiên Trì", hint: "Đạt mục tiêu 2 tuần liền", progress: Math.min(1, streak / 2), unlocked: streak >= 2 },
    { id: "twelve", icon: "🏅", name: "Thói Quen Sắt Đá", hint: "Tập luyện trở thành hơi thở", progress: Math.min(1, total / 12), unlocked: total >= 12 },
    { id: "volume", icon: "⚡", name: "Hủy Diệt Trọng Lực", hint: "Nâng tổng khối lượng 10.000 kg", progress: Math.min(1, volume / 10_000), unlocked: volume >= 10_000 },
    { id: "thirty", icon: "🏆", name: "Nhà Vô Địch", hint: "Một cột mốc đầy kiêu hãnh", progress: Math.min(1, total / 30), unlocked: total >= 30 },
  ];
};
