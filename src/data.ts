import type {
  BuiltInProgramId,
  DayId,
  EquipmentId,
  Exercise,
  ExerciseId,
  ExerciseType,
  MuscleGroup,
  ProgramId,
  Session,
  Settings,
  TrainingProgram,
  UserProfile,
} from "./types.js";

const exercise = (
  id: ExerciseId,
  name: string,
  primary: MuscleGroup,
  secondary: MuscleGroup[],
  equipment: string,
  equipmentTags: EquipmentId[],
  sets: number,
  min: number,
  max: number,
  rest: number,
  technique: string,
  alternatives: ExerciseId[],
  type: ExerciseType,
  suffix: Exercise["suffix"] = "reps",
  incrementKg = 2.5,
): Exercise => ({
  id,
  name,
  primary,
  secondary,
  equipment,
  equipmentTags,
  sets,
  min,
  max,
  rest,
  technique,
  alternatives,
  type,
  suffix,
  incrementKg,
});

export const BUILT_IN_EXERCISES: Record<ExerciseId, Exercise> = {
  back_squat: exercise("back_squat", "Back Squat", "Đùi trước", ["Mông", "Đùi sau", "Core"], "Thanh đòn + rack", ["barbell", "rack"], 3, 5, 8, 150, "Siết thân, giữ bàn chân ổn định và để đầu gối đi cùng hướng mũi chân.", ["hack_squat", "leg_press", "goblet_squat"], "lower", "reps", 5),
  goblet_squat: exercise("goblet_squat", "Goblet Squat", "Đùi trước", ["Mông", "Core"], "Tạ đơn", ["dumbbell"], 3, 8, 12, 90, "Ôm tạ sát ngực, hạ trong biên độ kiểm soát và giữ gót chân bám sàn.", ["leg_press", "back_squat"], "lower", "reps", 2),
  leg_press: exercise("leg_press", "Leg Press", "Đùi trước", ["Mông", "Đùi sau"], "Máy", ["machine"], 3, 8, 12, 120, "Giữ lưng áp ghế, hạ chậm và đẩy qua giữa bàn chân.", ["hack_squat", "goblet_squat"], "lower", "reps", 5),
  hack_squat: exercise("hack_squat", "Hack Squat", "Đùi trước", ["Mông", "Đùi sau"], "Máy", ["machine"], 3, 8, 12, 120, "Giữ lưng trên đệm, kiểm soát đáy và không khóa gối mạnh.", ["leg_press", "back_squat"], "lower", "reps", 5),
  db_rdl: exercise("db_rdl", "Dumbbell Romanian Deadlift", "Đùi sau", ["Mông", "Core"], "Tạ đơn", ["dumbbell"], 3, 8, 12, 120, "Đẩy hông ra sau, giữ tạ sát chân và dừng khi đùi sau căng rõ.", ["barbell_rdl", "leg_curl"], "lower", "reps", 4),
  barbell_rdl: exercise("barbell_rdl", "Barbell Romanian Deadlift", "Đùi sau", ["Mông", "Core"], "Thanh đòn", ["barbell"], 3, 6, 10, 150, "Giữ thanh sát chân, lưng trung lập và đẩy hông ra sau.", ["db_rdl", "leg_curl"], "lower", "reps", 5),
  hip_thrust: exercise("hip_thrust", "Hip Thrust", "Mông", ["Đùi sau"], "Thanh đòn / máy", ["barbell", "machine", "bench"], 3, 8, 12, 120, "Thu cằm, siết mông ở đỉnh và tránh ưỡn lưng quá mức.", ["glute_bridge", "db_rdl"], "lower", "reps", 5),
  glute_bridge: exercise("glute_bridge", "Glute Bridge", "Mông", ["Đùi sau"], "Trọng lượng cơ thể / tạ đơn", ["bodyweight", "dumbbell"], 3, 10, 15, 75, "Ép gót chân xuống sàn và siết mông ở đỉnh.", ["hip_thrust"], "lower", "reps", 4),
  leg_curl: exercise("leg_curl", "Leg Curl", "Đùi sau", ["Bắp chân"], "Máy", ["machine"], 3, 10, 15, 75, "Giữ hông ổn định và cuốn có kiểm soát.", ["db_rdl", "barbell_rdl"], "lower", "reps", 2.5),
  leg_extension: exercise("leg_extension", "Leg Extension", "Đùi trước", [], "Máy", ["machine"], 2, 12, 15, 60, "Căn trục gối với máy và tránh đá quán tính.", ["walking_lunge", "goblet_squat"], "lower", "reps", 2.5),
  bulgarian: exercise("bulgarian", "Bulgarian Split Squat", "Đùi trước", ["Mông", "Đùi sau"], "Tạ đơn + ghế", ["dumbbell", "bench"], 2, 8, 12, 90, "Hạ thẳng xuống, giữ chân trước ổn định và thân người kiểm soát.", ["walking_lunge", "goblet_squat"], "lower", "each leg", 2),
  walking_lunge: exercise("walking_lunge", "Walking Lunge", "Đùi trước", ["Mông", "Đùi sau"], "Tạ đơn", ["dumbbell"], 2, 10, 14, 90, "Bước đủ dài để gót chân trước bám sàn và giữ thân ổn định.", ["bulgarian", "goblet_squat"], "lower", "total reps", 2),
  calf_raise: exercise("calf_raise", "Standing Calf Raise", "Bắp chân", [], "Máy / tạ đơn", ["machine", "dumbbell"], 3, 10, 15, 60, "Hạ gót chậm, dừng ngắn ở đáy và siết ở đỉnh.", [], "lower", "reps", 2.5),
  barbell_bench: exercise("barbell_bench", "Barbell Bench Press", "Ngực", ["Vai", "Tay sau"], "Thanh đòn + ghế", ["barbell", "bench"], 3, 5, 8, 150, "Siết bả vai, chân bám sàn và hạ thanh ổn định về giữa ngực.", ["db_bench", "machine_press", "push_up"], "upper", "reps", 2.5),
  db_bench: exercise("db_bench", "Dumbbell Bench Press", "Ngực", ["Vai", "Tay sau"], "Tạ đơn + ghế", ["dumbbell", "bench"], 3, 8, 12, 120, "Siết bả vai, giữ cổ tay thẳng và kiểm soát đáy.", ["machine_press", "push_up", "barbell_bench"], "upper", "reps", 2),
  incline_db: exercise("incline_db", "Incline Dumbbell Press", "Ngực", ["Vai", "Tay sau"], "Tạ đơn + ghế", ["dumbbell", "bench"], 3, 8, 12, 120, "Dùng độ dốc vừa, hạ tạ có kiểm soát và tránh va tạ ở đỉnh.", ["machine_press", "push_up"], "upper", "reps", 2),
  machine_press: exercise("machine_press", "Machine Chest Press", "Ngực", ["Vai", "Tay sau"], "Máy", ["machine"], 3, 8, 12, 90, "Chỉnh ghế để tay cầm ngang giữa ngực và giữ bả vai ổn định.", ["db_bench", "push_up"], "upper", "reps", 2.5),
  push_up: exercise("push_up", "Push-Up", "Ngực", ["Vai", "Tay sau", "Core"], "Trọng lượng cơ thể", ["bodyweight"], 3, 8, 20, 75, "Giữ thân thành một đường và hạ ngực có kiểm soát.", ["machine_press", "db_bench"], "upper", "reps", 0),
  cable_fly: exercise("cable_fly", "Cable Fly", "Ngực", ["Vai"], "Máy cáp", ["cable"], 2, 12, 15, 60, "Giữ khuỷu hơi cong và khép tay bằng cơ ngực.", ["push_up", "machine_press"], "upper", "reps", 2.5),
  pull_up: exercise("pull_up", "Pull-Up / Assisted Pull-Up", "Lưng", ["Tay trước", "Vai"], "Xà / máy hỗ trợ", ["bodyweight", "machine"], 3, 6, 10, 120, "Bắt đầu bằng hạ vai, kéo ngực hướng về xà và tránh đung đưa.", ["lat_pulldown"], "upper", "reps", 2.5),
  lat_pulldown: exercise("lat_pulldown", "Neutral-Grip Lat Pulldown", "Lưng", ["Tay trước"], "Máy cáp", ["cable", "machine"], 3, 8, 12, 90, "Hạ vai trước khi kéo và đưa khuỷu về hông.", ["pull_up"], "upper", "reps", 2.5),
  chest_row: exercise("chest_row", "Chest-Supported Row", "Lưng", ["Tay trước", "Vai"], "Máy / tạ đơn + ghế", ["machine", "dumbbell", "bench"], 3, 8, 12, 90, "Giữ ngực trên đệm và kéo khuỷu ra sau mà không nhún vai.", ["cable_row", "one_row"], "upper", "reps", 2.5),
  cable_row: exercise("cable_row", "Seated Cable Row", "Lưng", ["Tay trước"], "Máy cáp", ["cable", "machine"], 3, 8, 12, 90, "Giữ ngực cao, thân ổn định và kéo khuỷu ra sau.", ["chest_row", "one_row"], "upper", "reps", 2.5),
  one_row: exercise("one_row", "One-Arm Cable Row", "Lưng", ["Tay trước"], "Máy cáp", ["cable"], 2, 10, 12, 75, "Giữ thân ổn định và không xoay người để lấy đà.", ["cable_row", "chest_row"], "upper", "each side", 2.5),
  db_ohp: exercise("db_ohp", "Seated Dumbbell Overhead Press", "Vai", ["Tay sau"], "Tạ đơn + ghế", ["dumbbell", "bench"], 3, 6, 10, 120, "Siết bụng, giữ cổ tay trên khuỷu và tránh ưỡn lưng quá mức.", ["machine_ohp"], "delt", "reps", 2),
  machine_ohp: exercise("machine_ohp", "Machine Shoulder Press", "Vai", ["Tay sau"], "Máy", ["machine"], 3, 8, 12, 90, "Chỉnh ghế để tay cầm ngang tai và giữ lưng áp đệm.", ["db_ohp"], "delt", "reps", 2.5),
  db_lateral: exercise("db_lateral", "Dumbbell Lateral Raise", "Vai", [], "Tạ đơn", ["dumbbell"], 3, 12, 20, 60, "Dẫn chuyển động bằng khuỷu tay và tránh nhún người.", ["cable_lateral"], "delt", "reps", 1),
  cable_lateral: exercise("cable_lateral", "Cable Lateral Raise", "Vai", [], "Máy cáp", ["cable"], 3, 12, 20, 60, "Giữ căng liên tục, khuỷu hơi cong và không nhún người.", ["db_lateral"], "delt", "reps", 1.25),
  face_pull: exercise("face_pull", "Rope Face Pull", "Vai", ["Lưng"], "Máy cáp", ["cable"], 2, 12, 15, 60, "Kéo dây về ngang mắt và xoay ngoài nhẹ ở cuối chuyển động.", ["reverse_pec"], "delt", "reps", 2.5),
  reverse_pec: exercise("reverse_pec", "Reverse Pec Deck", "Vai", ["Lưng"], "Máy", ["machine"], 2, 12, 20, 60, "Mở tay bằng vai sau, giữ ngực trên đệm và tránh nhún vai.", ["face_pull"], "delt", "reps", 2.5),
  triceps_pushdown: exercise("triceps_pushdown", "Cable Triceps Pushdown", "Tay sau", [], "Máy cáp", ["cable"], 2, 10, 15, 60, "Giữ khuỷu sát thân và duỗi cẳng tay mà không đung đưa vai.", ["overhead_triceps", "push_up"], "arms", "reps", 2.5),
  overhead_triceps: exercise("overhead_triceps", "Overhead Triceps Extension", "Tay sau", [], "Máy cáp / tạ đơn", ["cable", "dumbbell"], 2, 10, 15, 60, "Giữ khuỷu hướng trước và kéo giãn đầu dài tay sau có kiểm soát.", ["triceps_pushdown"], "arms", "reps", 2.5),
  db_curl: exercise("db_curl", "Dumbbell Curl", "Tay trước", [], "Tạ đơn", ["dumbbell"], 2, 10, 15, 60, "Giữ khuỷu gần thân và không đung đưa người.", ["hammer_curl"], "arms", "reps", 1),
  hammer_curl: exercise("hammer_curl", "Hammer Curl", "Tay trước", [], "Tạ đơn", ["dumbbell"], 2, 10, 15, 60, "Giữ cổ tay trung lập và hạ tạ chậm.", ["db_curl"], "arms", "reps", 1),
  pallof: exercise("pallof", "Pallof Press", "Core", ["Mông"], "Máy cáp", ["cable"], 2, 10, 12, 60, "Giữ thân thẳng và chống lại lực xoay trong suốt chuyển động.", ["plank"], "core", "each side", 2.5),
  plank: exercise("plank", "Front Plank", "Core", ["Mông"], "Trọng lượng cơ thể", ["bodyweight"], 2, 30, 45, 60, "Giữ đầu, lưng và hông thành một đường, thở đều.", ["pallof"], "core", "seconds", 0),
  cable_crunch: exercise("cable_crunch", "Cable Crunch", "Core", [], "Máy cáp", ["cable"], 2, 10, 15, 60, "Cuộn xương sườn về phía hông, tránh kéo dây chỉ bằng tay.", ["plank"], "core", "reps", 2.5),
};

export const BUILT_IN_PROGRAMS: Record<BuiltInProgramId, TrainingProgram> = {
  "full-body-3": {
    id: "full-body-3",
    name: "Full Body 3 buổi",
    shortName: "3 buổi",
    daysPerWeek: 3,
    level: "Cơ bản · Trung cấp",
    description: "Ba buổi toàn thân luân phiên, phù hợp lịch bận và người cần nhiều ngày hồi phục.",
    sessionMinutes: "55–75 phút",
    scheduleLabel: "Thứ 2 · Thứ 4 · Thứ 6",
    recommendedDays: [1, 3, 5],
    version: 2,
    workouts: [
      { id: "FB-A", name: "Full Body A", shortName: "Toàn thân A", focus: "Đùi trước · Ngực · Lưng", exercises: ["leg_press", "lat_pulldown", "db_bench", "cable_row", "leg_curl", "db_lateral", "pallof"] },
      { id: "FB-B", name: "Full Body B", shortName: "Toàn thân B", focus: "Chuỗi sau · Lưng · Ngực trên", exercises: ["db_rdl", "chest_row", "incline_db", "hack_squat", "pull_up", "face_pull", "calf_raise"] },
      { id: "FB-C", name: "Full Body C", shortName: "Toàn thân C", focus: "Mông · Vai · Chân đơn", exercises: ["hip_thrust", "lat_pulldown", "db_ohp", "bulgarian", "machine_press", "one_row", "cable_lateral", "plank"] },
    ],
  },
  "upper-lower-4": {
    id: "upper-lower-4",
    name: "Upper / Lower 4 buổi",
    shortName: "4 buổi",
    daysPerWeek: 4,
    level: "Trung cấp · Cân bằng",
    description: "Mỗi nhóm cơ chính được tập khoảng hai lần mỗi tuần với thời lượng và hồi phục cân bằng.",
    sessionMinutes: "50–70 phút",
    scheduleLabel: "Thứ 2 · Thứ 3 · Thứ 5 · Thứ 6",
    recommendedDays: [1, 2, 4, 5],
    version: 2,
    workouts: [
      { id: "UL-U1", name: "Upper 1 · Nền tảng", shortName: "Thân trên 1", focus: "Ngực · Lưng · Vai", exercises: ["barbell_bench", "lat_pulldown", "cable_row", "db_ohp", "db_lateral", "triceps_pushdown", "db_curl"] },
      { id: "UL-L1", name: "Lower 1 · Squat", shortName: "Thân dưới 1", focus: "Đùi trước · Đùi sau · Core", exercises: ["back_squat", "db_rdl", "leg_press", "leg_curl", "calf_raise", "pallof"] },
      { id: "UL-U2", name: "Upper 2 · Tăng cơ", shortName: "Thân trên 2", focus: "Ngực trên · Lưng · Vai sau", exercises: ["incline_db", "pull_up", "chest_row", "machine_press", "cable_lateral", "face_pull", "overhead_triceps", "hammer_curl"] },
      { id: "UL-L2", name: "Lower 2 · Mông", shortName: "Thân dưới 2", focus: "Mông · Chân đơn · Bắp chân", exercises: ["hack_squat", "hip_thrust", "bulgarian", "leg_extension", "leg_curl", "calf_raise", "plank"] },
    ],
  },
  "ppl-6": {
    id: "ppl-6",
    name: "Push / Pull / Legs 6 buổi",
    shortName: "6 buổi",
    daysPerWeek: 6,
    level: "Trung cấp cao · Hồi phục tốt",
    description: "Sáu buổi ngắn hơn theo Push/Pull/Legs. Chỉ nên chọn khi lịch sinh hoạt và hồi phục ổn định.",
    sessionMinutes: "40–60 phút",
    scheduleLabel: "Thứ 2 đến Thứ 7 · nghỉ Chủ nhật",
    recommendedDays: [1, 2, 3, 4, 5, 6],
    version: 2,
    workouts: [
      { id: "PPL-PA", name: "Push A · Ngực", shortName: "Push A", focus: "Ngực · Vai · Tay sau", exercises: ["barbell_bench", "incline_db", "db_ohp", "db_lateral", "triceps_pushdown"] },
      { id: "PPL-UA", name: "Pull A · Xô", shortName: "Pull A", focus: "Lưng · Vai sau · Tay trước", exercises: ["pull_up", "chest_row", "lat_pulldown", "face_pull", "db_curl"] },
      { id: "PPL-LA", name: "Legs A · Squat", shortName: "Legs A", focus: "Đùi trước · Đùi sau · Core", exercises: ["back_squat", "db_rdl", "leg_press", "leg_curl", "calf_raise", "pallof"] },
      { id: "PPL-PB", name: "Push B · Vai", shortName: "Push B", focus: "Vai · Ngực · Tay sau", exercises: ["machine_ohp", "machine_press", "cable_fly", "cable_lateral", "overhead_triceps"] },
      { id: "PPL-UB", name: "Pull B · Lưng dày", shortName: "Pull B", focus: "Lưng · Vai sau · Tay trước", exercises: ["lat_pulldown", "cable_row", "one_row", "reverse_pec", "hammer_curl"] },
      { id: "PPL-LB", name: "Legs B · Mông", shortName: "Legs B", focus: "Mông · Chân đơn · Đùi trước", exercises: ["hack_squat", "hip_thrust", "bulgarian", "leg_extension", "leg_curl", "calf_raise", "plank"] },
    ],
  },
};

export const BUILT_IN_PROGRAM_ORDER: BuiltInProgramId[] = ["full-body-3", "upper-lower-4", "ppl-6"];
export const DEFAULT_PROGRAM_ID: BuiltInProgramId = "full-body-3";

export const PHASES = [
  { name: "Thiết lập nền tảng", short: "Nền tảng", targetRpe: 6, hint: "Ưu tiên kỹ thuật và còn khoảng 4 reps dự trữ", deload: false },
  { name: "Tăng trưởng", short: "Tăng trưởng", targetRpe: 7, hint: "Tăng reps hoặc tải nhỏ khi hoàn thành tốt", deload: false },
  { name: "Tăng tải", short: "Tăng tải", targetRpe: 7.5, hint: "Giữ kỹ thuật, tiến bộ có kiểm soát", deload: false },
  { name: "Nỗ lực cao", short: "Nỗ lực", targetRpe: 8, hint: "Không cần tập đến thất bại", deload: false },
  { name: "Đánh giá hồi phục", short: "Đánh giá", targetRpe: 6, hint: "App chỉ đề xuất deload khi dữ liệu cho thấy cần thiết", deload: false },
] as const;

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

export const isBuiltInProgramId = (value: unknown): value is BuiltInProgramId =>
  typeof value === "string" && BUILT_IN_PROGRAM_ORDER.includes(value as BuiltInProgramId);

export const allExercises = (customExercises: Exercise[]) => ({
  ...BUILT_IN_EXERCISES,
  ...Object.fromEntries(customExercises.map((item) => [item.id, item])),
});

export const allPrograms = (customPrograms: TrainingProgram[]) => ({
  ...BUILT_IN_PROGRAMS,
  ...Object.fromEntries(customPrograms.map((item) => [item.id, item])),
}) as Record<ProgramId, TrainingProgram>;

export const getProgram = (programId: ProgramId | string | undefined, customPrograms: TrainingProgram[] = []) =>
  allPrograms(customPrograms)[programId as ProgramId] ?? BUILT_IN_PROGRAMS[DEFAULT_PROGRAM_ID];

export const getWorkout = (
  programId: ProgramId | string | undefined,
  dayId: DayId,
  customPrograms: TrainingProgram[] = [],
) => getProgram(programId, customPrograms).workouts.find((workout) => workout.id === dayId);

export const phaseForWeek = (week: number) => PHASES[(Math.max(1, Math.floor(week)) - 1) % PHASES.length];

export const programWeek = (startedAt: string, now = new Date()) => {
  const date = new Date(`${startedAt}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return 1;
  const start = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const current = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.floor((current - start) / 604_800_000) + 1);
};

const relevantHistory = (history: Session[], programId: ProgramId) =>
  history.filter((session) => session.programId === programId);

export const nextWorkoutDay = (
  history: Session[],
  programId: ProgramId,
  customPrograms: TrainingProgram[] = [],
): DayId => {
  const workouts = getProgram(programId, customPrograms).workouts;
  const latest = [...relevantHistory(history, programId)].sort(
    (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
  )[0];
  if (!latest) return workouts[0]?.id ?? "";
  const index = workouts.findIndex((workout) => workout.id === latest.dayId);
  return workouts[(index >= 0 ? index + 1 : 0) % Math.max(1, workouts.length)]?.id ?? workouts[0]?.id ?? "";
};

export const nextScheduledWorkout = (
  settings: Settings,
  history: Session[],
  customPrograms: TrainingProgram[] = [],
  now = new Date(),
) => {
  if (!settings.trainingDays.length) return null;
  const [hour, minute] = settings.reminderTime.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  for (let offset = 0; offset <= 7; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute);
    if (!settings.trainingDays.includes(date.getDay()) || date <= now) continue;
    return {
      date,
      dayId: nextWorkoutDay(history, settings.programId, customPrograms),
      relative: offset === 0 ? "Hôm nay" : offset === 1 ? "Ngày mai" : TRAINING_DAYS.find((day) => day.value === date.getDay())?.label ?? "Buổi tới",
    };
  }
  return null;
};

export const recommendProgramForProfile = (profile: UserProfile): BuiltInProgramId => {
  if (profile.availableDays === 6 && profile.experience !== "beginner") return "ppl-6";
  if (profile.availableDays >= 4) return "upper-lower-4";
  return "full-body-3";
};

export const availableExerciseIds = (profile: UserProfile, customExercises: Exercise[]) => {
  const equipment = new Set(profile.equipment);
  return Object.values(allExercises(customExercises))
    .filter((item) => item.equipmentTags.some((tag) => equipment.has(tag)) || item.equipmentTags.includes("bodyweight"))
    .map((item) => item.id);
};

export const formatSeconds = (seconds: number) =>
  `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
