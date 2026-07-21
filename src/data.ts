import type { DayId, Exercise, ExerciseType, Session, Settings } from "./types";

const exercise = (
  id: string,
  name: string,
  primary: string,
  secondary: string,
  equipment: string,
  sets: number,
  min: number,
  max: number,
  rest: number,
  technique: string,
  alternatives: string[],
  type: ExerciseType,
  suffix = "reps",
): Exercise => ({
  id,
  name,
  primary,
  secondary,
  equipment,
  sets,
  min,
  max,
  rest,
  technique,
  alternatives,
  type,
  suffix,
});

export const EXERCISES: Record<string, Exercise> = {
  leg_press: exercise("leg_press", "Leg Press (Đạp đùi)", "Đùi trước", "Mông, đùi sau", "Máy", 3, 8, 10, 120, "Giữ lưng áp ghế, hạ có kiểm soát và đẩy qua giữa bàn chân.", ["Hack Squat", "Goblet Squat"], "lower"),
  lat_pulldown: exercise("lat_pulldown", "Neutral-Grip Lat Pulldown (Kéo xô tay khép)", "Cơ xô", "Lưng trên, tay trước", "Máy cáp", 3, 8, 12, 90, "Hạ vai trước khi kéo, đưa khuỷu tay về hông.", ["Assisted Pull-Up"], "upper"),
  db_bench: exercise("db_bench", "Dumbbell Bench Press (Đẩy ngực tạ đơn)", "Ngực", "Vai trước, tay sau", "Tạ đơn", 3, 8, 12, 120, "Siết bả vai, chân bám sàn, cổ tay thẳng.", ["Machine Chest Press"], "upper"),
  cable_row: exercise("cable_row", "Seated Cable Row (Kéo lưng cáp)", "Lưng trên", "Cơ xô, tay trước", "Máy cáp", 2, 10, 12, 90, "Giữ ngực cao, kéo khuỷu tay ra sau.", ["Chest-Supported Row"], "upper"),
  leg_curl: exercise("leg_curl", "Leg Curl (Móc đùi sau)", "Đùi sau", "Bắp chân", "Máy", 2, 10, 15, 75, "Giữ hông ổn định, cuốn có kiểm soát.", ["Dumbbell Romanian Deadlift"], "lower"),
  db_lateral: exercise("db_lateral", "Dumbbell Lateral Raise (Bay vai tạ đơn)", "Vai giữa", "Vai trước", "Tạ đơn", 3, 12, 15, 60, "Dẫn chuyển động bằng khuỷu tay, không nhún người.", ["Cable Lateral Raise"], "delt"),
  pallof: exercise("pallof", "Pallof Press (Kháng lực xoay bụng)", "Cơ lõi", "Mông", "Máy cáp", 2, 10, 12, 60, "Giữ thân thẳng và siết bụng trong suốt chuyển động.", ["Dead Bug"], "core", "each side"),
  chest_row: exercise("chest_row", "Chest-Supported Row (Kéo lưng tựa ngực)", "Lưng trên", "Cơ xô, vai sau", "Máy / tạ đơn", 3, 8, 12, 90, "Giữ ngực trên đệm, kéo bằng khuỷu tay.", ["Seated Cable Row"], "upper"),
  hack_squat: exercise("hack_squat", "Hack Squat (Đạp đùi nghiêng)", "Đùi trước", "Mông, đùi sau", "Máy / tạ đơn", 3, 8, 12, 120, "Đầu gối đi cùng hướng mũi chân.", ["Leg Press", "Goblet Squat"], "lower"),
  incline_db: exercise("incline_db", "Incline Dumbbell Press (Đẩy ngực ghế dốc)", "Ngực trên", "Vai trước, tay sau", "Tạ đơn", 3, 8, 12, 120, "Ghế dốc vừa, không va tạ ở đỉnh.", ["Incline Machine Press"], "upper"),
  db_rdl: exercise("db_rdl", "Dumbbell Romanian Deadlift (Deadlift đùi sau)", "Đùi sau", "Mông, lưng dưới", "Tạ đơn", 2, 8, 10, 120, "Đẩy hông ra sau, giữ tạ gần chân.", ["Leg Curl"], "lower"),
  one_lat: exercise("one_lat", "One-Arm Cable Lat Pulldown (Kéo xô cáp 1 tay)", "Cơ xô", "Tay trước", "Máy cáp", 2, 10, 12, 75, "Giữ vai thấp, không xoay thân.", ["Lat Pulldown"], "upper", "each side"),
  cable_lateral: exercise("cable_lateral", "Cable Lateral Raise (Bay vai cáp)", "Vai giữa", "Vai trước", "Máy cáp", 3, 12, 15, 60, "Giữ căng liên tục, khuỷu tay hơi cong.", ["Dumbbell Lateral Raise"], "delt"),
  face_pull: exercise("face_pull", "Rope Face Pull (Kéo cáp vai sau)", "Vai sau", "Lưng trên", "Máy cáp", 2, 12, 15, 60, "Kéo dây về ngang mắt, xoay ngoài nhẹ.", ["Reverse Pec Deck"], "delt"),
  plank: exercise("plank", "Front Plank (B bụng/lõi tĩnh)", "Cơ lõi", "Mông", "Trọng lượng cơ thể", 2, 30, 45, 60, "Giữ đầu, lưng và hông thành một đường.", ["Dead Bug"], "core", "seconds"),
  pull_up: exercise("pull_up", "Assisted Pull-Up / Pull-Up (Hít xà)", "Cơ xô", "Lưng trên, tay trước", "Máy / xà", 3, 6, 10, 120, "Bắt đầu bằng hạ vai, không đung đưa.", ["Lat Pulldown"], "upper"),
  hip_thrust: exercise("hip_thrust", "Hip Thrust (Đẩy hông mông)", "Mông", "Đùi sau", "Thanh đòn / máy", 3, 8, 12, 120, "Thu cằm, siết mông ở đỉnh mà không ưỡn lưng.", ["Glute Bridge"], "lower"),
  db_ohp: exercise("db_ohp", "Seated Dumbbell Overhead Press (Đẩy vai tạ đơn ngồi)", "Vai", "Tay sau", "Tạ đơn", 2, 8, 10, 120, "Cổ tay trên khuỷu tay, không ưỡn lưng quá.", ["Machine Shoulder Press"], "upper"),
  bulgarian: exercise("bulgarian", "Bulgarian Split Squat (Squat 1 chân)", "Đùi trước", "Mông, đùi sau", "Tạ đơn", 2, 8, 10, 90, "Hạ thẳng xuống, đầu gối cùng hướng mũi chân.", ["Reverse Lunge"], "lower", "each leg"),
  one_row: exercise("one_row", "One-Arm Cable Row (Kéo lưng cáp 1 tay)", "Lưng trên", "Cơ xô, tay trước", "Máy cáp", 2, 10, 12, 75, "Giữ thân ổn định, không xoay người.", ["Seated Cable Row"], "upper", "each side"),
  machine_press: exercise("machine_press", "Machine Chest Press (Đẩy ngực bằng máy)", "Ngực", "Vai trước, tay sau", "Máy", 2, 10, 12, 90, "Chỉnh ghế để tay cầm ngang giữa ngực.", ["Dumbbell Bench Press"], "upper"),
  machine_lateral: exercise("machine_lateral", "Machine Lateral Raise (Bay vai bằng máy)", "Vai giữa", "Vai trước", "Máy", 3, 12, 15, 60, "Giữ thân tựa ghế, không giật tạ.", ["Cable Lateral Raise"], "delt"),
  reverse_pec: exercise("reverse_pec", "Reverse Pec Deck (Ép vai sau bằng máy)", "Vai sau", "Lưng trên", "Máy", 2, 12, 15, 60, "Mở tay bằng vai sau, không nhún vai.", ["Rope Face Pull"], "delt"),
};

export const PROGRAM: Array<{ id: DayId; name: string; exercises: string[] }> = [
  { id: "A", name: "🔥 Toàn thân A: Xô, Ngực & Đùi trước", exercises: ["leg_press", "lat_pulldown", "db_bench", "cable_row", "leg_curl", "db_lateral", "pallof"] },
  { id: "B", name: "⚡ Toàn thân B: Độ dày Lưng & Chuỗi cơ sau", exercises: ["chest_row", "hack_squat", "incline_db", "db_rdl", "one_lat", "cable_lateral", "face_pull", "plank"] },
  { id: "C", name: "💪 Toàn thân C: Lưng, Vai & Đùi đơn lẻ", exercises: ["pull_up", "hip_thrust", "db_ohp", "bulgarian", "one_row", "machine_press", "machine_lateral", "reverse_pec"] },
];

export const PHASES = [
  { name: "🛠️ Thiết lập nền tảng", short: "Nền tảng", targetRpe: 6, hint: "RPE khoảng 6", deload: false },
  { name: "🚀 Tăng trưởng khối lượng", short: "Khối lượng", targetRpe: 7, hint: "RPE 6–7", deload: false },
  { name: "⚡ Tăng tải bứt phá", short: "Tăng tải", targetRpe: 7, hint: "RPE khoảng 7", deload: false },
  { name: "🎯 Đỉnh cao phong độ", short: "Đỉnh phong", targetRpe: 8, hint: "RPE 7–8", deload: false },
  { name: "🧘 Hồi phục chủ động", short: "Hồi phục", targetRpe: 6, hint: "Giảm 40–50% hiệp", deload: true },
];

export const TRAINING_DAYS = [
  { value: 1, short: "T2", label: "Thứ Hai" },
  { value: 2, short: "T3", label: "Thứ Ba" },
  { value: 3, short: "T4", label: "Thứ Tư" },
  { value: 4, short: "T5", label: "Thứ Năm" },
  { value: 5, short: "T6", label: "Thứ Sáu" },
  { value: 6, short: "T7", label: "Thứ Bảy" },
  { value: 0, short: "CN", label: "Chủ Nhật" },
];

export const todayISO = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const programWeek = (startDate: string, now = new Date()) => {
  const parts = startDate.split("-").map(Number);
  if (parts.length !== 3 || !parts.every(Number.isFinite)) return 1;
  const [year, month, day] = parts;
  const valid = new Date(year, month - 1, day);
  if (valid.getFullYear() !== year || valid.getMonth() !== month - 1 || valid.getDate() !== day) return 1;
  const days = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(year, month - 1, day)) / 86_400_000);
  return Math.max(1, Math.floor(days / 7) + 1);
};

export const phaseForWeek = (week: number) => PHASES[(Math.max(1, Math.floor(week)) - 1) % PHASES.length];
export const formatSeconds = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
export const isCompletableSet = (set: { reps: string; rpe: string }) => {
  const reps = Number(set.reps);
  const rpe = Number(set.rpe);
  return set.reps.trim() !== "" && set.rpe.trim() !== "" && Number.isInteger(reps) && reps > 0 && Number.isFinite(rpe) && rpe >= 1 && rpe <= 10;
};

export const nextWorkoutDay = (history: Session[]): DayId => {
  const latest = [...history].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())[0];
  return latest?.dayId === "A" ? "B" : latest?.dayId === "B" ? "C" : "A";
};

export const nextScheduledWorkout = (settings: Settings, history: Session[], now = new Date()) => {
  if (!settings.trainingDays.length) return null;
  const [hour, minute] = settings.reminderTime.split(":").map(Number);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  for (let offset = 0; offset <= 7; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute);
    if (!settings.trainingDays.includes(date.getDay()) || date <= now) continue;
    return { date, dayId: nextWorkoutDay(history), relative: offset === 0 ? "Hôm nay" : offset === 1 ? "Ngày mai" : TRAINING_DAYS.find((day) => day.value === date.getDay())?.label ?? "Buổi tới" };
  }
  return null;
};
