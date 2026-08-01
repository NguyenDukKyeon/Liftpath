import type { DayId, Exercise, ExerciseType, ProgramId, Session, Settings, TrainingProgram } from "./types";

const exercise = (id: string, name: string, primary: string, secondary: string, equipment: string, sets: number, min: number, max: number, rest: number, technique: string, alternatives: string[], type: ExerciseType, suffix = "reps"): Exercise => ({ id, name, primary, secondary, equipment, sets, min, max, rest, technique, alternatives, type, suffix });

export const EXERCISES: Record<string, Exercise> = {
  back_squat: exercise("back_squat", "Back Squat (Squat thanh đòn)", "Đùi trước", "Mông, đùi sau", "Thanh đòn", 3, 5, 8, 150, "Giữ thân chắc, đầu gối đi cùng hướng mũi chân và hạ sâu trong biên độ kiểm soát.", ["Hack Squat", "Leg Press", "Goblet Squat"], "lower"),
  leg_press: exercise("leg_press", "Leg Press (Đạp đùi)", "Đùi trước", "Mông, đùi sau", "Máy", 3, 8, 12, 120, "Giữ lưng áp ghế, hạ có kiểm soát và đẩy qua giữa bàn chân.", ["Hack Squat", "Goblet Squat"], "lower"),
  hack_squat: exercise("hack_squat", "Hack Squat (Squat máy nghiêng)", "Đùi trước", "Mông, đùi sau", "Máy", 3, 8, 12, 120, "Giữ lưng trên đệm, hạ chậm và không khóa gối mạnh ở đỉnh.", ["Leg Press", "Back Squat"], "lower"),
  db_rdl: exercise("db_rdl", "Dumbbell Romanian Deadlift (RDL tạ đơn)", "Đùi sau", "Mông, lưng dưới", "Tạ đơn", 3, 8, 12, 120, "Đẩy hông ra sau, giữ tạ sát chân và dừng khi đùi sau căng rõ.", ["Barbell RDL", "Leg Curl"], "lower"),
  hip_thrust: exercise("hip_thrust", "Hip Thrust (Đẩy hông)", "Mông", "Đùi sau", "Thanh đòn / máy", 3, 8, 12, 120, "Thu cằm, siết mông ở đỉnh mà không ưỡn lưng quá mức.", ["Glute Bridge", "Cable Pull Through"], "lower"),
  leg_curl: exercise("leg_curl", "Leg Curl (Móc đùi sau)", "Đùi sau", "Bắp chân", "Máy", 3, 10, 15, 75, "Giữ hông ổn định và cuốn có kiểm soát trong toàn bộ biên độ.", ["Dumbbell RDL", "Nordic Curl hỗ trợ"], "lower"),
  leg_extension: exercise("leg_extension", "Leg Extension (Duỗi đùi)", "Đùi trước", "—", "Máy", 2, 12, 15, 60, "Căn trục gối với trục máy, duỗi có kiểm soát và không đá quán tính.", ["Sissy Squat hỗ trợ", "Step-Up"], "lower"),
  bulgarian: exercise("bulgarian", "Bulgarian Split Squat (Squat một chân)", "Đùi trước", "Mông, đùi sau", "Tạ đơn", 2, 8, 12, 90, "Hạ thẳng xuống, giữ bàn chân trước ổn định và đầu gối cùng hướng mũi chân.", ["Reverse Lunge", "Step-Up"], "lower", "each leg"),
  walking_lunge: exercise("walking_lunge", "Walking Lunge (Chùng chân bước)", "Đùi trước", "Mông, đùi sau", "Tạ đơn", 2, 10, 14, 90, "Bước đủ dài để giữ gót chân trước bám sàn và thân người ổn định.", ["Reverse Lunge", "Bulgarian Split Squat"], "lower", "total reps"),
  calf_raise: exercise("calf_raise", "Standing Calf Raise (Nhón bắp chân)", "Bắp chân", "—", "Máy / tạ đơn", 3, 10, 15, 60, "Hạ gót chậm, dừng ngắn ở đáy và siết bắp chân ở đỉnh.", ["Seated Calf Raise"], "lower"),
  barbell_bench: exercise("barbell_bench", "Barbell Bench Press (Đẩy ngực thanh đòn)", "Ngực", "Vai trước, tay sau", "Thanh đòn", 3, 5, 8, 150, "Siết bả vai, chân bám sàn, hạ thanh ổn định về giữa ngực.", ["Dumbbell Bench Press", "Machine Chest Press"], "upper"),
  db_bench: exercise("db_bench", "Dumbbell Bench Press (Đẩy ngực tạ đơn)", "Ngực", "Vai trước, tay sau", "Tạ đơn", 3, 8, 12, 120, "Siết bả vai, chân bám sàn và giữ cổ tay thẳng.", ["Machine Chest Press", "Barbell Bench Press"], "upper"),
  incline_db: exercise("incline_db", "Incline Dumbbell Press (Đẩy ngực dốc)", "Ngực trên", "Vai trước, tay sau", "Tạ đơn", 3, 8, 12, 120, "Dùng độ dốc vừa, hạ tạ có kiểm soát và không va tạ ở đỉnh.", ["Incline Machine Press", "Low-to-High Cable Fly"], "upper"),
  machine_press: exercise("machine_press", "Machine Chest Press (Đẩy ngực máy)", "Ngực", "Vai trước, tay sau", "Máy", 3, 8, 12, 90, "Chỉnh ghế để tay cầm ngang giữa ngực và giữ bả vai ổn định.", ["Dumbbell Bench Press", "Push-Up"], "upper"),
  cable_fly: exercise("cable_fly", "Cable Fly (Ép ngực cáp)", "Ngực", "Vai trước", "Máy cáp", 2, 12, 15, 60, "Giữ khuỷu tay hơi cong và khép tay bằng cơ ngực thay vì đẩy vai ra trước.", ["Pec Deck", "Dumbbell Fly"], "upper"),
  pull_up: exercise("pull_up", "Assisted Pull-Up / Pull-Up (Hít xà)", "Cơ xô", "Lưng trên, tay trước", "Máy / xà", 3, 6, 10, 120, "Bắt đầu bằng hạ vai, kéo ngực hướng về xà và tránh đung đưa.", ["Lat Pulldown"], "upper"),
  lat_pulldown: exercise("lat_pulldown", "Neutral-Grip Lat Pulldown (Kéo xô tay khép)", "Cơ xô", "Lưng trên, tay trước", "Máy cáp", 3, 8, 12, 90, "Hạ vai trước khi kéo và đưa khuỷu tay về phía hông.", ["Assisted Pull-Up"], "upper"),
  chest_row: exercise("chest_row", "Chest-Supported Row (Kéo lưng tựa ngực)", "Lưng trên", "Cơ xô, vai sau", "Máy / tạ đơn", 3, 8, 12, 90, "Giữ ngực trên đệm và kéo khuỷu tay ra sau mà không nhún vai.", ["Seated Cable Row"], "upper"),
  cable_row: exercise("cable_row", "Seated Cable Row (Kéo lưng cáp)", "Lưng trên", "Cơ xô, tay trước", "Máy cáp", 3, 8, 12, 90, "Giữ ngực cao, thân ổn định và kéo khuỷu tay ra sau.", ["Chest-Supported Row"], "upper"),
  one_row: exercise("one_row", "One-Arm Cable Row (Kéo lưng cáp một tay)", "Lưng trên", "Cơ xô, tay trước", "Máy cáp", 2, 10, 12, 75, "Giữ thân ổn định và không xoay người để lấy đà.", ["Dumbbell Row", "Seated Cable Row"], "upper", "each side"),
  one_lat: exercise("one_lat", "One-Arm Cable Lat Pulldown (Kéo xô một tay)", "Cơ xô", "Tay trước", "Máy cáp", 2, 10, 12, 75, "Giữ vai thấp và kéo khuỷu tay về hông mà không xoay thân.", ["Lat Pulldown"], "upper", "each side"),
  db_ohp: exercise("db_ohp", "Seated Dumbbell Overhead Press (Đẩy vai tạ đơn)", "Vai", "Tay sau", "Tạ đơn", 3, 6, 10, 120, "Giữ cổ tay trên khuỷu tay, siết bụng và không ưỡn lưng quá mức.", ["Machine Shoulder Press"], "delt"),
  machine_ohp: exercise("machine_ohp", "Machine Shoulder Press (Đẩy vai máy)", "Vai", "Tay sau", "Máy", 3, 8, 12, 90, "Chỉnh ghế để tay cầm ngang tai và giữ lưng áp đệm.", ["Seated Dumbbell Overhead Press"], "delt"),
  db_lateral: exercise("db_lateral", "Dumbbell Lateral Raise (Bay vai tạ đơn)", "Vai giữa", "Vai trước", "Tạ đơn", 3, 12, 20, 60, "Dẫn chuyển động bằng khuỷu tay và tránh nhún người.", ["Cable Lateral Raise", "Machine Lateral Raise"], "delt"),
  cable_lateral: exercise("cable_lateral", "Cable Lateral Raise (Bay vai cáp)", "Vai giữa", "Vai trước", "Máy cáp", 3, 12, 20, 60, "Giữ căng liên tục, khuỷu tay hơi cong và không nâng quá cao nếu vai khó chịu.", ["Dumbbell Lateral Raise"], "delt"),
  face_pull: exercise("face_pull", "Rope Face Pull (Kéo cáp vai sau)", "Vai sau", "Lưng trên", "Máy cáp", 2, 12, 15, 60, "Kéo dây về ngang mắt và xoay ngoài nhẹ ở cuối chuyển động.", ["Reverse Pec Deck"], "delt"),
  reverse_pec: exercise("reverse_pec", "Reverse Pec Deck (Ép vai sau)", "Vai sau", "Lưng trên", "Máy", 2, 12, 20, 60, "Mở tay bằng vai sau, giữ ngực trên đệm và tránh nhún vai.", ["Rope Face Pull"], "delt"),
  triceps_pushdown: exercise("triceps_pushdown", "Cable Triceps Pushdown (Ép tay sau)", "Tay sau", "—", "Máy cáp", 2, 10, 15, 60, "Giữ khuỷu tay sát thân và duỗi cẳng tay mà không đung đưa vai.", ["Machine Dip", "Close-Grip Push-Up"], "arms"),
  overhead_triceps: exercise("overhead_triceps", "Overhead Cable Triceps Extension (Duỗi tay sau qua đầu)", "Tay sau", "—", "Máy cáp", 2, 10, 15, 60, "Giữ khuỷu tay hướng trước và kéo giãn đầu dài tay sau có kiểm soát.", ["Dumbbell Overhead Extension"], "arms"),
  db_curl: exercise("db_curl", "Dumbbell Curl (Cuốn tay trước tạ đơn)", "Tay trước", "Cẳng tay", "Tạ đơn", 2, 10, 15, 60, "Giữ khuỷu tay gần thân và không đung đưa người.", ["Cable Curl", "Machine Curl"], "arms"),
  hammer_curl: exercise("hammer_curl", "Hammer Curl (Cuốn búa)", "Tay trước", "Cẳng tay", "Tạ đơn", 2, 10, 15, 60, "Giữ cổ tay trung lập và hạ tạ chậm.", ["Rope Hammer Curl"], "arms"),
  pallof: exercise("pallof", "Pallof Press (Kháng xoay thân)", "Cơ lõi", "Mông", "Máy cáp", 2, 10, 12, 60, "Giữ thân thẳng và chống lại lực xoay trong suốt chuyển động.", ["Dead Bug"], "core", "each side"),
  plank: exercise("plank", "Front Plank (Plank trước)", "Cơ lõi", "Mông", "Trọng lượng cơ thể", 2, 30, 45, 60, "Giữ đầu, lưng và hông thành một đường, thở đều.", ["Dead Bug", "Ab Wheel hỗ trợ"], "core", "seconds"),
  cable_crunch: exercise("cable_crunch", "Cable Crunch (Gập bụng cáp)", "Cơ bụng", "—", "Máy cáp", 2, 10, 15, 60, "Cuộn xương sườn về phía hông, tránh kéo dây chỉ bằng tay.", ["Machine Crunch"], "core"),
};

export const PROGRAMS: Record<ProgramId, TrainingProgram> = {
  "full-body-3": { id: "full-body-3", name: "Full Body 3 buổi", shortName: "3 buổi", daysPerWeek: 3, level: "Cơ bản · Trung cấp", description: "Ba buổi toàn thân luân phiên, phù hợp khi muốn tiến bộ ổn định và vẫn có nhiều ngày hồi phục.", sessionMinutes: "55–75 phút", scheduleLabel: "Thứ 2 · Thứ 4 · Thứ 6", recommendedDays: [1, 3, 5], workouts: [
    { id: "FB-A", name: "Full Body A", shortName: "Toàn thân A", focus: "Đùi trước · Ngực · Xô", exercises: ["leg_press", "lat_pulldown", "db_bench", "cable_row", "leg_curl", "db_lateral", "pallof"] },
    { id: "FB-B", name: "Full Body B", shortName: "Toàn thân B", focus: "Chuỗi sau · Lưng · Ngực trên", exercises: ["db_rdl", "chest_row", "incline_db", "hack_squat", "one_lat", "face_pull", "calf_raise"] },
    { id: "FB-C", name: "Full Body C", shortName: "Toàn thân C", focus: "Mông · Vai · Đơn chân", exercises: ["hip_thrust", "pull_up", "db_ohp", "bulgarian", "machine_press", "one_row", "cable_lateral", "plank"] },
  ] },
  "upper-lower-4": { id: "upper-lower-4", name: "Upper / Lower 4 buổi", shortName: "4 buổi", daysPerWeek: 4, level: "Trung cấp · Khuyên dùng", description: "Chia thân trên và thân dưới để mỗi nhóm cơ được tập hai lần mỗi tuần, cân bằng giữa khối lượng và hồi phục.", sessionMinutes: "50–70 phút", scheduleLabel: "Thứ 2 · Thứ 3 · Thứ 5 · Thứ 6", recommendedDays: [1, 2, 4, 5], workouts: [
    { id: "UL-U1", name: "Upper 1 · Strength base", shortName: "Thân trên 1", focus: "Ngực · Xô · Vai", exercises: ["barbell_bench", "lat_pulldown", "cable_row", "db_ohp", "db_lateral", "triceps_pushdown", "db_curl"] },
    { id: "UL-L1", name: "Lower 1 · Squat focus", shortName: "Thân dưới 1", focus: "Đùi trước · Đùi sau · Core", exercises: ["back_squat", "db_rdl", "leg_press", "leg_curl", "calf_raise", "pallof"] },
    { id: "UL-U2", name: "Upper 2 · Hypertrophy", shortName: "Thân trên 2", focus: "Ngực trên · Lưng · Vai sau", exercises: ["incline_db", "pull_up", "chest_row", "machine_press", "cable_lateral", "face_pull", "overhead_triceps", "hammer_curl"] },
    { id: "UL-L2", name: "Lower 2 · Glute focus", shortName: "Thân dưới 2", focus: "Mông · Đùi đơn · Bắp chân", exercises: ["hack_squat", "hip_thrust", "bulgarian", "leg_extension", "leg_curl", "calf_raise", "plank"] },
  ] },
  "ppl-6": { id: "ppl-6", name: "Push / Pull / Legs 6 buổi", shortName: "6 buổi", daysPerWeek: 6, level: "Trung cấp cao · Hồi phục tốt", description: "Sáu buổi ngắn hơn theo Push/Pull/Legs, lặp hai vòng với biến thể khác nhau. Không cần thiết nếu bạn khó ngủ hoặc hồi phục kém.", sessionMinutes: "40–60 phút", scheduleLabel: "Thứ 2 đến Thứ 7 · nghỉ Chủ nhật", recommendedDays: [1, 2, 3, 4, 5, 6], workouts: [
    { id: "PPL-PA", name: "Push A · Ngực chính", shortName: "Push A", focus: "Ngực · Vai · Tay sau", exercises: ["barbell_bench", "incline_db", "db_ohp", "db_lateral", "triceps_pushdown"] },
    { id: "PPL-UA", name: "Pull A · Xô chính", shortName: "Pull A", focus: "Xô · Lưng trên · Tay trước", exercises: ["pull_up", "chest_row", "one_lat", "face_pull", "db_curl"] },
    { id: "PPL-LA", name: "Legs A · Squat chính", shortName: "Legs A", focus: "Đùi trước · Đùi sau · Core", exercises: ["back_squat", "db_rdl", "leg_press", "leg_curl", "calf_raise", "pallof"] },
    { id: "PPL-PB", name: "Push B · Vai chính", shortName: "Push B", focus: "Vai · Ngực · Tay sau", exercises: ["machine_ohp", "machine_press", "cable_fly", "cable_lateral", "overhead_triceps"] },
    { id: "PPL-UB", name: "Pull B · Lưng dày", shortName: "Pull B", focus: "Lưng trên · Xô · Vai sau", exercises: ["lat_pulldown", "cable_row", "one_row", "reverse_pec", "hammer_curl"] },
    { id: "PPL-LB", name: "Legs B · Mông chính", shortName: "Legs B", focus: "Mông · Đùi đơn · Đùi trước", exercises: ["hack_squat", "hip_thrust", "bulgarian", "leg_extension", "leg_curl", "calf_raise", "plank"] },
  ] },
};

export const PROGRAM_ORDER: ProgramId[] = ["full-body-3", "upper-lower-4", "ppl-6"];
export const DEFAULT_PROGRAM_ID: ProgramId = "full-body-3";
export const PROGRAM = PROGRAMS[DEFAULT_PROGRAM_ID].workouts;
export const PHASES = [
  { name: "Thiết lập nền tảng", short: "Nền tảng", targetRpe: 6, hint: "RPE khoảng 6", deload: false },
  { name: "Tăng trưởng khối lượng", short: "Khối lượng", targetRpe: 7, hint: "RPE 6–7", deload: false },
  { name: "Tăng tải có kiểm soát", short: "Tăng tải", targetRpe: 7, hint: "RPE khoảng 7", deload: false },
  { name: "Tuần nỗ lực cao", short: "Nỗ lực", targetRpe: 8, hint: "RPE 7–8", deload: false },
  { name: "Hồi phục chủ động", short: "Hồi phục", targetRpe: 6, hint: "Giảm 40–50% hiệp", deload: true },
];
export const TRAINING_DAYS = [
  { value: 1, short: "T2", label: "Thứ Hai" }, { value: 2, short: "T3", label: "Thứ Ba" }, { value: 3, short: "T4", label: "Thứ Tư" }, { value: 4, short: "T5", label: "Thứ Năm" }, { value: 5, short: "T6", label: "Thứ Sáu" }, { value: 6, short: "T7", label: "Thứ Bảy" }, { value: 0, short: "CN", label: "Chủ Nhật" },
];
export const getProgram = (programId: ProgramId | string | undefined) => PROGRAMS[programId as ProgramId] ?? PROGRAMS[DEFAULT_PROGRAM_ID];
export const getWorkout = (programId: ProgramId | string | undefined, dayId: DayId) => getProgram(programId).workouts.find((workout) => workout.id === dayId);
export const isProgramId = (value: unknown): value is ProgramId => typeof value === "string" && PROGRAM_ORDER.includes(value as ProgramId);
export const todayISO = () => { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 10); };
export const programWeek = (startDate: string, now = new Date()) => { const parts = startDate.split("-").map(Number); if (parts.length !== 3 || !parts.every(Number.isFinite)) return 1; const [year, month, day] = parts; const valid = new Date(year, month - 1, day); if (valid.getFullYear() !== year || valid.getMonth() !== month - 1 || valid.getDate() !== day) return 1; const days = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(year, month - 1, day)) / 86_400_000); return Math.max(1, Math.floor(days / 7) + 1); };
export const phaseForWeek = (week: number) => PHASES[(Math.max(1, Math.floor(week)) - 1) % PHASES.length];
export const formatSeconds = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
export const isCompletableSet = (set: { reps: string; rpe: string }) => { const reps = Number(set.reps); const rpe = Number(set.rpe); return set.reps.trim() !== "" && set.rpe.trim() !== "" && Number.isInteger(reps) && reps > 0 && Number.isFinite(rpe) && rpe >= 1 && rpe <= 10; };
const relevantHistory = (history: Session[], programId: ProgramId) => history.filter((session) => session.programId === programId || (!session.programId && programId === DEFAULT_PROGRAM_ID));
export const nextWorkoutDay = (history: Session[], programId: ProgramId = DEFAULT_PROGRAM_ID): DayId => { const workouts = getProgram(programId).workouts; const latest = [...relevantHistory(history, programId)].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())[0]; if (!latest) return workouts[0].id; const index = workouts.findIndex((workout) => workout.id === latest.dayId); return workouts[(index >= 0 ? index + 1 : 0) % workouts.length].id; };
export const nextScheduledWorkout = (settings: Settings, history: Session[], now = new Date()) => { if (!settings.trainingDays.length) return null; const [hour, minute] = settings.reminderTime.split(":").map(Number); if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null; for (let offset = 0; offset <= 7; offset += 1) { const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute); if (!settings.trainingDays.includes(date.getDay()) || date <= now) continue; return { date, dayId: nextWorkoutDay(history, settings.programId), relative: offset === 0 ? "Hôm nay" : offset === 1 ? "Ngày mai" : TRAINING_DAYS.find((day) => day.value === date.getDay())?.label ?? "Buổi tới" }; } return null; };
