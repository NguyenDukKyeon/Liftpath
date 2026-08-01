import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Info,
  Laptop,
  Minus,
  Moon,
  Play,
  Plus,
  Search,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import {
  DEFAULT_PROGRAM_ID,
  EXERCISES,
  PROGRAM_ORDER,
  PROGRAMS,
  TRAINING_DAYS,
  formatSeconds,
  getProgram,
  getWorkout,
  isCompletableSet,
  nextScheduledWorkout,
  nextWorkoutDay,
  phaseForWeek,
  todayISO,
} from "./data";
import { totalVolume, weeklyStats, weeklyStreak } from "./gamification";
import { useAppState } from "./state";
import { useRestTimer, useTrainingReminder } from "./timers";
import type {
  BodyStat,
  DayId,
  Exercise,
  ExerciseType,
  ProgramId,
  Session,
  Settings,
  ThemePreference,
  TrainingProgram,
} from "./types";

type Tab = "today" | "program" | "history" | "body";
type IconComponent = (props: { size?: number; strokeWidth?: number; className?: string }) => ReactNode;

const NAV: Array<{ id: Tab; label: string; icon: IconComponent }> = [
  { id: "today", label: "Hôm nay", icon: Dumbbell },
  { id: "program", label: "Giáo án", icon: CalendarDays },
  { id: "history", label: "Nhật ký", icon: Activity },
  { id: "body", label: "Cơ thể", icon: Shield },
];

export default function App() {
  const app = useAppState();
  const [tab, setTab] = useState<Tab>("today");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [permissionRevision, bumpPermission] = useReducer((value: number) => value + 1, 0);
  const timer = useRestTimer(app.state.settings, permissionRevision);
  useTrainingReminder(app.state.settings, app.state.history, permissionRevision);
  const resolvedTheme = useTheme(app.state.settings.theme);

  const requestPermission = async () => {
    if (!("Notification" in window) || Notification.permission !== "default") return;
    try {
      await Notification.requestPermission();
    } catch {
      // Browser controls the permission prompt.
    }
    bumpPermission();
  };

  const cycleTheme = () => {
    const order: ThemePreference[] = ["system", "light", "dark"];
    const index = order.indexOf(app.state.settings.theme);
    app.setSettings({ ...app.state.settings, theme: order[(index + 1) % order.length] });
  };

  if (app.state.draft) {
    return (
      <WorkoutView
        draft={app.state.draft}
        week={app.week}
        targetRpe={app.phase.targetRpe}
        timer={timer}
        updateSet={app.updateSet}
        completeSet={(exerciseIndex, setIndex) => {
          const rest = app.completeSet(exerciseIndex, setIndex);
          if (rest) timer.start(rest);
          if (app.state.settings.vibration && "vibrate" in navigator) navigator.vibrate(45);
        }}
        setCurrent={app.setCurrentExercise}
        addSet={app.addSet}
        removeSet={app.removeSet}
        finish={() => {
          app.finishWorkout();
          timer.cancel();
        }}
        cancel={() => {
          app.cancelWorkout();
          timer.cancel();
        }}
      />
    );
  }

  const pageMeta: Record<Tab, { eyebrow: string; title: string; subtitle: string }> = {
    today: {
      eyebrow: "LIFTPATH · PERSONAL TRAINING",
      title: "Buổi tập của bạn",
      subtitle: `${getProgram(app.state.settings.programId).name} · Tuần ${app.week}`,
    },
    program: {
      eyebrow: "CHƯƠNG TRÌNH TẬP LUYỆN",
      title: "Chọn nhịp tập phù hợp",
      subtitle: "3, 4 hoặc 6 buổi mỗi tuần",
    },
    history: {
      eyebrow: "DỮ LIỆU TẬP LUYỆN",
      title: "Nhật ký tiến bộ",
      subtitle: `${app.state.history.length} buổi đã hoàn thành`,
    },
    body: {
      eyebrow: "THEO DÕI THỂ CHẤT",
      title: "Chỉ số cơ thể",
      subtitle: "Ghi nhận thay đổi theo thời gian",
    },
  };
  const meta = pageMeta[tab];

  return (
    <div className="app-shell">
      <aside className="desktop-rail" aria-label="Điều hướng chính">
        <Brand compact />
        <div className="rail-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "active" : ""}
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => setTab(item.id)}
              >
                <Icon size={20} strokeWidth={1.9} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="rail-actions">
          <button type="button" onClick={cycleTheme} title={`Chế độ hiện tại: ${themeLabel(app.state.settings.theme)}`}>
            <ThemeIcon preference={app.state.settings.theme} size={19} />
            <span>{themeLabel(app.state.settings.theme)}</span>
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon size={20} />
            <span>Cài đặt</span>
          </button>
        </div>
      </aside>

      <div className="app-frame">
        <header className="app-header">
          <Brand />
          <div className="page-heading">
            <div>
              <span className="eyebrow">{meta.eyebrow}</span>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
            <div className="mobile-header-actions">
              <button className="icon-button" type="button" aria-label={`Đổi giao diện, hiện tại ${themeLabel(app.state.settings.theme)}`} onClick={cycleTheme}>
                {resolvedTheme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button className="icon-button" type="button" aria-label="Mở cài đặt" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="page-content">
          {tab === "today" && (
            <TodayView
              history={app.state.history}
              settings={app.state.settings}
              week={app.week}
              phase={app.phase}
              start={app.startWorkout}
              selectProgram={app.selectProgram}
              goToProgram={() => setTab("program")}
            />
          )}
          {tab === "program" && (
            <ProgramView
              week={app.week}
              history={app.state.history}
              settings={app.state.settings}
              updateSettings={app.setSettings}
              selectProgram={app.selectProgram}
              requestPermission={requestPermission}
              start={app.startWorkout}
            />
          )}
          {tab === "history" && <HistoryView history={app.state.history} deleteSession={app.deleteSession} />}
          {tab === "body" && <BodyView entries={app.state.bodyStats} add={app.addBodyStat} remove={app.deleteBodyStat} />}
        </main>

        <nav className="bottom-nav" aria-label="Điều hướng chính">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "active" : ""}
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => setTab(item.id)}
              >
                <Icon size={20} strokeWidth={1.9} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {settingsOpen && (
        <SettingsModal
          settings={app.state.settings}
          update={app.setSettings}
          selectProgram={app.selectProgram}
          requestPermission={requestPermission}
          close={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function useTheme(preference: ThemePreference) {
  const resolve = () => preference === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve());

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = preference === "system" ? (media.matches ? "dark" : "light") : preference;
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0b0e13" : "#f4f6f1");
      setResolved(next);
    };
    apply();
    media.addEventListener?.("change", apply);
    return () => media.removeEventListener?.("change", apply);
  }, [preference]);

  return resolved;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`} aria-label="LiftPath">
      <span className="brand-mark"><Dumbbell size={18} strokeWidth={2.3} /></span>
      <span className="brand-copy"><strong>LiftPath</strong><small>Train with direction</small></span>
    </div>
  );
}

function TodayView({
  history,
  settings,
  week,
  phase,
  start,
  selectProgram,
  goToProgram,
}: {
  history: Session[];
  settings: Settings;
  week: number;
  phase: ReturnType<typeof phaseForWeek>;
  start: (day: DayId) => void;
  selectProgram: (programId: ProgramId) => void;
  goToProgram: () => void;
}) {
  const stats = weeklyStats(history);
  const streak = weeklyStreak(history, settings.weeklyGoal);
  const program = getProgram(settings.programId);
  const nextDay = nextWorkoutDay(history, settings.programId);
  const workout = getWorkout(settings.programId, nextDay) ?? program.workouts[0];
  const scheduled = nextScheduledWorkout(settings, history);
  const latest = [...history].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())[0];
  const weeklyProgress = Math.min(1, stats.sessions / Math.max(1, settings.weeklyGoal));

  return (
    <div className="stack page-enter">
      <section className="workout-hero">
        <div className="hero-copy">
          <div className="hero-status"><span className="status-dot" /><span>Buổi tiếp theo · {workout.shortName}</span></div>
          <h2>{workout.name}</h2>
          <p>{workout.exercises.length} bài · {workout.focus} · RPE mục tiêu {phase.targetRpe}{scheduled ? ` · ${scheduled.relative} ${formatTime(scheduled.date)}` : ""}</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => start(workout.id)}><Play size={18} fill="currentColor" />Bắt đầu tập</button>
            <button className="secondary-button" type="button" onClick={goToProgram}>Xem giáo án<ChevronRight size={17} /></button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true"><Dumbbell size={48} strokeWidth={1.35} /><span>{program.daysPerWeek}D</span></div>
      </section>

      <section className="program-quick card">
        <div className="section-title-row compact">
          <div><span className="eyebrow">NHỊP TẬP</span><h2>Chọn số buổi mỗi tuần</h2></div>
          <span>{program.level}</span>
        </div>
        <div className="frequency-switch" role="radiogroup" aria-label="Số buổi tập mỗi tuần">
          {PROGRAM_ORDER.map((programId) => {
            const item = PROGRAMS[programId];
            return (
              <button
                key={programId}
                type="button"
                role="radio"
                aria-checked={settings.programId === programId}
                className={settings.programId === programId ? "active" : ""}
                onClick={() => selectProgram(programId)}
              >
                <strong>{item.daysPerWeek}</strong><span>buổi</span>{programId === "upper-lower-4" && <small>Khuyên dùng</small>}
              </button>
            );
          })}
        </div>
        <p className="program-quick-note">{program.description}</p>
      </section>

      <section className="weekly-card card">
        <div className="weekly-card-head">
          <div><span className="eyebrow">MỤC TIÊU TUẦN</span><h2>{stats.sessions} / {settings.weeklyGoal} buổi</h2></div>
          <span className="week-pill">Tuần {week}</span>
        </div>
        <Progress value={weeklyProgress} />
        <div className="weekly-details"><span><Flame size={16} />{streak} tuần liên tiếp</span><span>{phase.name}</span></div>
      </section>

      <div className="metric-grid">
        <MetricCard label="Hiệp tuần này" value={String(stats.sets)} note={`${stats.activeDays} ngày hoạt động`} />
        <MetricCard label="Tổng tải" value={formatCompact(totalVolume(history))} note="kg toàn thời gian" />
        <MetricCard label="Thời lượng" value={program.sessionMinutes} note="mỗi buổi dự kiến" />
      </div>

      <div className="section-title-row"><div><span className="eyebrow">CHUẨN BỊ</span><h2>Các bài sắp tới</h2></div><span>{workout.exercises.length} bài</span></div>
      <section className="exercise-preview-list card">
        {workout.exercises.slice(0, 6).map((id, index) => {
          const exercise = EXERCISES[id];
          return (
            <div className="exercise-preview-row" key={id}>
              <span className={`exercise-type-icon ${exercise.type}`}>{index + 1}</span>
              <div className="grow"><strong>{shortExerciseName(exercise.name)}</strong><small>{exercise.sets} hiệp · {exercise.min}–{exercise.max} {translateSuffix(exercise.suffix)}</small></div>
              <span className="exercise-muscle">{exercise.primary}</span>
            </div>
          );
        })}
      </section>

      <div className="section-title-row"><div><span className="eyebrow">GẦN ĐÂY</span><h2>Buổi tập gần nhất</h2></div></div>
      {latest ? <RecentSession session={latest} /> : <EmptyState icon={<Dumbbell size={28} />} title="Chưa có buổi tập" text="Bắt đầu buổi đầu tiên để tạo mốc tiến bộ." action={<button className="secondary-button" type="button" onClick={() => start(workout.id)}>Bắt đầu ngay</button>} />}
    </div>
  );
}

function ProgramView({
  week,
  history,
  settings,
  updateSettings,
  selectProgram,
  requestPermission,
  start,
}: {
  week: number;
  history: Session[];
  settings: Settings;
  updateSettings: (settings: Settings) => void;
  selectProgram: (programId: ProgramId) => void;
  requestPermission: () => void;
  start: (day: DayId) => void;
}) {
  const [mode, setMode] = useState<"plan" | "library">("plan");
  const [selected, setSelected] = useState<DayId>(() => nextWorkoutDay(history, settings.programId));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ExerciseType | "all">("all");
  const [detail, setDetail] = useState<Exercise | null>(null);
  const program = getProgram(settings.programId);
  const phase = phaseForWeek(week);
  const next = nextScheduledWorkout(settings, history);
  const workout = getWorkout(settings.programId, selected) ?? program.workouts[0];

  useEffect(() => {
    setSelected(nextWorkoutDay(history, settings.programId));
  }, [history, settings.programId]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return Object.values(EXERCISES).filter((item) => {
      const matchesType = filter === "all" || item.type === filter;
      const haystack = `${item.name} ${item.primary} ${item.secondary} ${item.equipment}`.toLowerCase();
      return matchesType && (!normalized || haystack.includes(normalized));
    });
  }, [filter, query]);

  const toggleDay = (value: number) => {
    const trainingDays = settings.trainingDays.includes(value)
      ? settings.trainingDays.filter((dayValue) => dayValue !== value)
      : [...settings.trainingDays, value];
    updateSettings({ ...settings, trainingDays });
  };

  return (
    <div className="stack page-enter">
      <div className="segmented-control" role="tablist" aria-label="Nội dung giáo án">
        <button type="button" role="tab" aria-selected={mode === "plan"} className={mode === "plan" ? "active" : ""} onClick={() => setMode("plan")}>Giáo án</button>
        <button type="button" role="tab" aria-selected={mode === "library"} className={mode === "library" ? "active" : ""} onClick={() => setMode("library")}>Thư viện bài tập</button>
      </div>

      {mode === "plan" ? (
        <>
          <section className="program-selection">
            {PROGRAM_ORDER.map((programId) => (
              <ProgramCard key={programId} program={PROGRAMS[programId]} active={settings.programId === programId} onSelect={() => selectProgram(programId)} />
            ))}
          </section>

          <section className="evidence-note card">
            <Info size={20} />
            <div><strong>Nhiều buổi hơn không đồng nghĩa hiệu quả hơn.</strong><p>Các template phân bổ mỗi nhóm cơ khoảng hai lần mỗi tuần. Chọn lịch bạn duy trì và hồi phục được; 4 buổi là phương án cân bằng nhất.</p></div>
          </section>

          <section className="phase-card card">
            <div><span className="eyebrow">GIAI ĐOẠN HIỆN TẠI</span><h2>{phase.name}</h2><p>{phase.hint} · RPE mục tiêu {phase.targetRpe}</p></div>
            <div className="phase-week"><small>Tuần</small><strong>{week}</strong></div>
          </section>

          <section className="schedule-card card">
            <div className="section-title-row compact"><div><span className="eyebrow">LỊCH CỦA BẠN</span><h2>Chọn ngày tập</h2></div><Bell size={20} /></div>
            <div className="day-picker" aria-label="Ngày tập trong tuần">
              {TRAINING_DAYS.map((item) => (
                <button key={item.value} type="button" className={settings.trainingDays.includes(item.value) ? "active" : ""} aria-pressed={settings.trainingDays.includes(item.value)} onClick={() => toggleDay(item.value)}>{item.short}</button>
              ))}
            </div>
            <button className="use-recommended" type="button" onClick={() => updateSettings({ ...settings, trainingDays: [...program.recommendedDays], weeklyGoal: program.daysPerWeek })}>
              <CalendarDays size={16} />Dùng lịch gợi ý: {program.scheduleLabel}
            </button>
            <div className="form-grid">
              <Field label="Giờ nhắc tập"><input type="time" value={settings.reminderTime} onChange={(event) => updateSettings({ ...settings, reminderTime: event.target.value })} /></Field>
              <Field label="Mục tiêu mỗi tuần"><select value={settings.weeklyGoal} onChange={(event) => updateSettings({ ...settings, weeklyGoal: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6, 7].map((value) => <option key={value} value={value}>{value} buổi</option>)}</select></Field>
            </div>
            <div className="schedule-summary">
              <div className="schedule-icon"><Bell size={18} /></div>
              <div className="grow"><small>BUỔI TIẾP THEO</small><strong>{next ? `${next.relative}, ${formatTime(next.date)} · ${getWorkout(settings.programId, next.dayId)?.shortName ?? next.dayId}` : "Chọn ít nhất một ngày tập"}</strong></div>
              <Toggle checked={settings.scheduleReminders} label="Nhắc lịch tập" onChange={(checked) => {
                updateSettings({ ...settings, scheduleReminders: checked, notify: checked || settings.notify });
                if (checked) void requestPermission();
              }} />
            </div>
          </section>

          <div className="section-title-row"><div><span className="eyebrow">{program.name.toUpperCase()}</span><h2>Chọn buổi tập</h2></div><span>{program.sessionMinutes}</span></div>
          <div className="workout-tabs">
            {program.workouts.map((item) => (
              <button key={item.id} type="button" className={workout.id === item.id ? "active" : ""} aria-pressed={workout.id === item.id} onClick={() => setSelected(item.id)}>
                <span className="workout-tab-icon"><Dumbbell size={19} /></span><span><strong>{item.shortName}</strong><small>{item.exercises.length} bài</small></span>
              </button>
            ))}
          </div>

          <section className="program-detail card">
            <div className="program-detail-head">
              <div><span className="eyebrow">{workout.shortName.toUpperCase()}</span><h2>{workout.name}</h2><p>{workout.focus} · khoảng {estimateDuration(workout.exercises)} phút</p></div>
              <button className="primary-button small" type="button" onClick={() => start(workout.id)}><Play size={16} fill="currentColor" />Bắt đầu</button>
            </div>
            <div className="exercise-list">
              {workout.exercises.map((id, index) => {
                const item = EXERCISES[id];
                return (
                  <button key={id} type="button" onClick={() => setDetail(item)}>
                    <span className={`exercise-type-icon ${item.type}`}>{index + 1}</span>
                    <div className="grow"><strong>{shortExerciseName(item.name)}</strong><small>{item.sets} × {item.min}–{item.max} · nghỉ {formatSeconds(item.rest)}</small></div>
                    <span className="exercise-muscle">{item.primary}</span><ChevronRight size={17} />
                  </button>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="library-tools">
            <label className="search-field"><Search size={19} /><input type="search" value={query} placeholder="Tìm tên, nhóm cơ hoặc thiết bị" onChange={(event) => setQuery(event.target.value)} /></label>
            <div className="filter-chips" aria-label="Lọc nhóm bài tập">
              {(["all", "upper", "lower", "delt", "arms", "core"] as const).map((value) => <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{exerciseTypeLabel(value)}</button>)}
            </div>
          </div>
          <section className="library-grid">
            {filtered.map((item) => (
              <button className="library-card card" type="button" key={item.id} onClick={() => setDetail(item)}>
                <span className={`library-icon ${item.type}`}>{artIcon(item.type)}</span><span className="grow"><strong>{shortExerciseName(item.name)}</strong><small>{item.primary} · {item.equipment}</small></span><ChevronRight size={17} />
              </button>
            ))}
          </section>
          {!filtered.length && <EmptyState icon={<Search size={28} />} title="Không tìm thấy bài tập" text="Thử từ khóa hoặc nhóm cơ khác." />}
        </>
      )}
      {detail && <ExerciseModal exercise={detail} close={() => setDetail(null)} />}
    </div>
  );
}

function ProgramCard({ program, active, onSelect }: { program: TrainingProgram; active: boolean; onSelect: () => void }) {
  return (
    <button className={`program-card card ${active ? "active" : ""}`} type="button" aria-pressed={active} onClick={onSelect}>
      <div className="program-card-top"><span className="program-frequency"><strong>{program.daysPerWeek}</strong> buổi</span>{program.id === "upper-lower-4" && <span className="recommended-pill">Khuyên dùng</span>}</div>
      <h2>{program.name}</h2><p>{program.description}</p>
      <div className="program-meta"><span><Timer size={15} />{program.sessionMinutes}</span><span><TrendingUp size={15} />{program.level}</span></div>
      <div className="program-select-state">{active ? <><Check size={16} />Đang sử dụng</> : <>Chọn giáo án<ChevronRight size={16} /></>}</div>
    </button>
  );
}

function HistoryView({ history, deleteSession }: { history: Session[]; deleteSession: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const sorted = useMemo(() => [...history].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime()), [history]);
  const recentWeeks = Array.from({ length: 6 }, (_, index) => weeklyStats(history, new Date(), index - 5));
  const maxSessions = Math.max(1, ...recentWeeks.map((item) => item.sessions));

  if (!history.length) return <div className="page-enter"><EmptyState icon={<Activity size={30} />} title="Nhật ký đang trống" text="Mỗi buổi hoàn thành sẽ xuất hiện tại đây cùng số hiệp, RPE và tổng tải." /></div>;

  const totalSets = history.reduce((sum, session) => sum + session.totalSets, 0);
  const averageRpeValues = history.map((session) => session.avgRpe).filter((value): value is number => value != null);
  const averageRpe = averageRpeValues.length ? averageRpeValues.reduce((sum, value) => sum + value, 0) / averageRpeValues.length : null;

  return (
    <div className="stack page-enter">
      <div className="metric-grid"><MetricCard label="Tổng buổi" value={String(history.length)} note="toàn thời gian" /><MetricCard label="Tổng hiệp" value={String(totalSets)} note="đã hoàn thành" /><MetricCard label="RPE trung bình" value={averageRpe?.toFixed(1) ?? "—"} note="trên thang 10" /></div>
      <section className="history-chart card">
        <div className="section-title-row compact"><div><span className="eyebrow">6 TUẦN GẦN NHẤT</span><h2>Tần suất tập luyện</h2></div><Flame size={20} /></div>
        <div className="bar-chart" aria-label="Số buổi tập trong sáu tuần gần nhất">
          {recentWeeks.map((item, index) => <div className="bar-column" key={index}><span>{item.sessions || ""}</span><i style={{ height: `${Math.max(8, (item.sessions / maxSessions) * 100)}%` }} /><small>{index === 5 ? "Nay" : `T-${5 - index}`}</small></div>)}
        </div>
      </section>
      <div className="section-title-row"><div><span className="eyebrow">LỊCH SỬ</span><h2>Các buổi đã hoàn thành</h2></div></div>
      <div className="session-list">
        {sorted.map((session) => {
          const program = getProgram(session.programId ?? DEFAULT_PROGRAM_ID);
          const workout = program.workouts.find((item) => item.id === session.dayId);
          const volume = sessionVolume(session);
          const duration = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000));
          return (
            <article className="session-card card" key={session.id}>
              <div className="session-main"><span className="session-badge">{program.daysPerWeek}D</span><div className="grow"><small>{formatDateTime(session.endedAt)} · {program.shortName}</small><h2>{workout?.shortName ?? session.dayId}</h2><p>{session.totalSets} hiệp · {duration} phút · RPE {session.avgRpe?.toFixed(1) ?? "—"}</p></div><strong>{formatCompact(volume)} kg</strong></div>
              <details><summary>Chi tiết bài tập<ChevronRight size={17} /></summary><div className="session-exercises">{session.exercises.map((entry) => { const meta = EXERCISES[entry.exerciseId]; return <div key={entry.exerciseId}><div><strong>{shortExerciseName(meta?.name ?? entry.exerciseId)}</strong><small>{meta?.primary ?? ""}</small></div><span>{entry.sets.map((set) => `${set.weight || 0}kg × ${set.reps}`).join(" · ")}</span></div>; })}</div></details>
              <div className="session-actions">{confirmDelete === session.id ? <><span>Xóa buổi tập này?</span><button type="button" onClick={() => setConfirmDelete(null)}>Giữ lại</button><button className="danger-text" type="button" onClick={() => { deleteSession(session.id); setConfirmDelete(null); }}>Xóa</button></> : <button type="button" onClick={() => setConfirmDelete(session.id)}><Trash2 size={16} />Xóa buổi tập</button>}</div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

type Metric = "weight" | "waist" | "chest" | "arm";
const BODY_METRICS: Array<{ id: Metric; label: string; short: string; unit: string }> = [
  { id: "weight", label: "Cân nặng", short: "Cân nặng", unit: "kg" },
  { id: "waist", label: "Vòng eo", short: "Eo", unit: "cm" },
  { id: "chest", label: "Vòng ngực", short: "Ngực", unit: "cm" },
  { id: "arm", label: "Vòng tay", short: "Tay", unit: "cm" },
];

function BodyView({ entries, add, remove }: { entries: BodyStat[]; add: (entry: Omit<BodyStat, "id">) => void; remove: (id: string) => void }) {
  const [metric, setMetric] = useState<Metric>("weight");
  const [date, setDate] = useState(todayISO());
  const [values, setValues] = useState<Record<Metric, string>>({ weight: "", waist: "", chest: "", arm: "" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const sorted = useMemo(() => [...entries].sort((a, b) => a.date.localeCompare(b.date)), [entries]);
  const metricInfo = BODY_METRICS.find((item) => item.id === metric)!;
  const chartData = sorted.map((entry) => ({ date: entry.date, value: entry[metric] })).filter((entry): entry is { date: string; value: number } => entry.value != null);
  const current = chartData.at(-1)?.value;
  const previous = chartData.at(-2)?.value;
  const delta = current != null && previous != null ? current - previous : null;

  const save = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const parse = (value: string) => { const parsed = Number(value); return value.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : null; };
    const entry = { date, weight: parse(values.weight), waist: parse(values.waist), chest: parse(values.chest), arm: parse(values.arm) };
    if ([entry.weight, entry.waist, entry.chest, entry.arm].every((value) => value == null)) return;
    add(entry);
    setValues({ weight: "", waist: "", chest: "", arm: "" });
  };

  return (
    <div className="stack page-enter">
      <section className="body-overview card">
        <div className="body-tabs" role="tablist" aria-label="Chỉ số cơ thể">{BODY_METRICS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={metric === item.id} className={metric === item.id ? "active" : ""} onClick={() => setMetric(item.id)}>{item.short}</button>)}</div>
        <div className="body-current"><div><span className="eyebrow">{metricInfo.label.toUpperCase()}</span><strong>{current ?? "—"}<small>{metricInfo.unit}</small></strong>{delta != null && <span className={`delta ${delta > 0 ? "up" : delta < 0 ? "down" : ""}`}>{delta > 0 ? "+" : ""}{delta.toFixed(1)} {metricInfo.unit} so với lần trước</span>}</div><TrendingUp size={28} /></div>
        <MiniChart data={chartData.map((item) => item.value)} />
      </section>
      <section className="body-form card">
        <div className="section-title-row compact"><div><span className="eyebrow">BẢN GHI MỚI</span><h2>Cập nhật số đo</h2></div><input aria-label="Ngày đo" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
        <div className="measurement-grid">{BODY_METRICS.map((item) => <Field key={item.id} label={item.label}><div className="unit-input"><input type="number" min="0" step="0.1" inputMode="decimal" placeholder="0.0" value={values[item.id]} onChange={(event) => setValues((currentValues) => ({ ...currentValues, [item.id]: event.target.value }))} /><span>{item.unit}</span></div></Field>)}</div>
        <button className="primary-button full" type="button" onClick={save}><Check size={18} />Lưu số đo</button>
      </section>
      <div className="section-title-row"><div><span className="eyebrow">LỊCH SỬ SỐ ĐO</span><h2>Các lần ghi gần đây</h2></div></div>
      {sorted.length ? <div className="body-history">{[...sorted].reverse().slice(0, 12).map((entry) => <article className="body-history-row card" key={entry.id}><div className="body-date"><strong>{new Date(`${entry.date}T00:00:00`).getDate()}</strong><small>{formatMonth(entry.date)}</small></div><div className="body-values grow">{entry.weight != null && <span><small>Cân nặng</small><strong>{entry.weight} kg</strong></span>}{entry.waist != null && <span><small>Eo</small><strong>{entry.waist} cm</strong></span>}{entry.chest != null && <span><small>Ngực</small><strong>{entry.chest} cm</strong></span>}{entry.arm != null && <span><small>Tay</small><strong>{entry.arm} cm</strong></span>}</div>{confirmDelete === entry.id ? <div className="inline-confirm"><button type="button" onClick={() => setConfirmDelete(null)}>Hủy</button><button className="danger" type="button" onClick={() => { remove(entry.id); setConfirmDelete(null); }}>Xóa</button></div> : <button className="icon-button subtle" type="button" aria-label={`Xóa số đo ngày ${entry.date}`} onClick={() => setConfirmDelete(entry.id)}><Trash2 size={17} /></button>}</article>)}</div> : <EmptyState icon={<Shield size={28} />} title="Chưa có số đo" text="Thêm bản ghi đầu tiên để bắt đầu theo dõi xu hướng." />}
    </div>
  );
}

function WorkoutView({
  draft,
  week,
  targetRpe,
  timer,
  updateSet,
  completeSet,
  setCurrent,
  addSet,
  removeSet,
  finish,
  cancel,
}: {
  draft: NonNullable<ReturnType<typeof useAppState>["state"]["draft"]>;
  week: number;
  targetRpe: number;
  timer: ReturnType<typeof useRestTimer>;
  updateSet: ReturnType<typeof useAppState>["updateSet"];
  completeSet: (exercise: number, set: number) => void;
  setCurrent: (index: number) => void;
  addSet: (index: number) => void;
  removeSet: (index: number) => void;
  finish: () => void;
  cancel: () => void;
}) {
  const [confirmAction, setConfirmAction] = useState<"cancel" | "finish" | null>(null);
  const exerciseIndex = draft.currentEx;
  const entry = draft.exercises[exerciseIndex];
  const meta = EXERCISES[entry.exerciseId];
  const program = getProgram(draft.programId ?? DEFAULT_PROGRAM_ID);
  const workout = program.workouts.find((item) => item.id === draft.dayId);
  const complete = draft.exercises.reduce((sum, item) => sum + item.sets.filter((set) => set.done).length, 0);
  const total = draft.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  const percent = total ? Math.round((complete / total) * 100) : 0;
  const focus = entry.sets.findIndex((set) => !set.done);
  const nextIncomplete = draft.exercises.findIndex((item, index) => index > exerciseIndex && !item.sets.every((set) => set.done));

  return (
    <div className="workout-shell">
      <header className="workout-topbar">
        <button className="icon-button subtle" type="button" aria-label="Hủy buổi tập" onClick={() => setConfirmAction("cancel")}><X size={20} /></button>
        <div className="workout-title"><span>{workout?.shortName ?? draft.dayId} · TUẦN {week}</span><strong>{complete}/{total} hiệp hoàn thành</strong></div>
        <button className="finish-button" type="button" disabled={!complete} onClick={() => setConfirmAction("finish")}>Kết thúc</button>
        <Progress value={percent / 100} />
      </header>

      <main className="workout-content">
        {timer.active && (
          <section className={`rest-timer ${timer.remaining === 0 ? "finished" : ""}`} aria-live="polite">
            <div className="timer-ring" style={{ "--timer-progress": `${timer.progress * 360}deg` } as CSSProperties}><div><small>{timer.remaining === 0 ? "HẾT GIỜ NGHỈ" : "ĐANG NGHỈ"}</small><strong>{formatSeconds(timer.remaining)}</strong></div></div>
            <div className="timer-actions"><button type="button" onClick={() => timer.addSeconds(-15)}>-15s</button><button type="button" onClick={() => timer.addSeconds(15)}>+15s</button><button type="button" onClick={timer.cancel}>Bỏ qua</button></div>
          </section>
        )}

        <div className="exercise-stepper" aria-label="Các bài trong buổi tập">
          {draft.exercises.map((item, index) => (
            <button key={`${item.exerciseId}-${index}`} type="button" className={`${index === exerciseIndex ? "active" : ""} ${item.sets.every((set) => set.done) ? "complete" : ""}`} aria-label={`Bài ${index + 1}`} onClick={() => setCurrent(index)}>{item.sets.every((set) => set.done) ? <Check size={15} /> : index + 1}</button>
          ))}
        </div>

        <section className="active-exercise card">
          <div className="exercise-heading"><span className={`large-exercise-icon ${meta.type}`}>{artIcon(meta.type)}</span><div className="grow"><span className="eyebrow">BÀI {exerciseIndex + 1}/{draft.exercises.length} · {meta.primary}</span><h1>{shortExerciseName(meta.name)}</h1><p>{meta.equipment} · {meta.sets} hiệp mục tiêu</p></div></div>
          <div className="exercise-target"><span><Target size={17} />{meta.min}–{meta.max} {translateSuffix(meta.suffix)}</span><span><Timer size={17} />Nghỉ {formatSeconds(meta.rest)}</span><span><Zap size={17} />RPE {targetRpe}</span></div>
          <p className="technique-note"><Info size={17} />{meta.technique}</p>

          <div className="set-table">
            <div className="set-table-head"><span>Hiệp</span><span>Kg</span><span>Reps</span><span>RPE</span><span /></div>
            {entry.sets.map((set, index) => {
              const canComplete = isCompletableSet(set) && !set.done;
              return (
                <div className={`set-row ${set.done ? "complete" : index === focus ? "focused" : ""}`} key={index}>
                  <span className="set-number">{index + 1}</span>
                  <input aria-label={`Mức tạ hiệp ${index + 1}`} type="number" inputMode="decimal" min="0" step="0.5" placeholder="—" value={set.weight} onChange={(event) => updateSet(exerciseIndex, index, { weight: event.target.value })} />
                  <input aria-label={`Số lần hiệp ${index + 1}`} type="number" inputMode="numeric" min="1" placeholder="—" value={set.reps} onChange={(event) => updateSet(exerciseIndex, index, { reps: event.target.value })} />
                  <input aria-label={`RPE hiệp ${index + 1}`} type="number" inputMode="decimal" min="1" max="10" step="0.5" placeholder={`${targetRpe}`} value={set.rpe} onChange={(event) => updateSet(exerciseIndex, index, { rpe: event.target.value })} />
                  <button type="button" disabled={!canComplete} aria-label={`Hoàn thành hiệp ${index + 1}`} onClick={() => completeSet(exerciseIndex, index)}><Check size={18} /></button>
                </div>
              );
            })}
          </div>
          <div className="set-controls"><button type="button" disabled={entry.sets.length <= 1} onClick={() => removeSet(exerciseIndex)}><Minus size={16} />Bớt hiệp</button><button type="button" onClick={() => addSet(exerciseIndex)}><Plus size={16} />Thêm hiệp</button></div>
        </section>

        <div className="workout-navigation">
          <button type="button" disabled={exerciseIndex === 0} onClick={() => setCurrent(exerciseIndex - 1)}><ChevronLeft size={18} />Bài trước</button>
          <button className="primary-button" type="button" disabled={exerciseIndex === draft.exercises.length - 1 && nextIncomplete < 0} onClick={() => setCurrent(nextIncomplete >= 0 ? nextIncomplete : Math.min(draft.exercises.length - 1, exerciseIndex + 1))}>Bài tiếp theo<ChevronRight size={18} /></button>
        </div>
      </main>

      {confirmAction && <ConfirmDialog title={confirmAction === "cancel" ? "Hủy buổi tập?" : "Kết thúc buổi tập?"} text={confirmAction === "cancel" ? "Các hiệp đã nhập trong buổi này sẽ không được lưu." : `LiftPath sẽ lưu ${complete} hiệp đã hoàn thành. Các hiệp chưa đánh dấu sẽ bị bỏ qua.`} confirmLabel={confirmAction === "cancel" ? "Hủy buổi" : "Lưu và kết thúc"} danger={confirmAction === "cancel"} close={() => setConfirmAction(null)} confirm={confirmAction === "cancel" ? cancel : finish} />}
    </div>
  );
}

function SettingsModal({ settings, update, selectProgram, requestPermission, close }: { settings: Settings; update: (settings: Settings) => void; selectProgram: (programId: ProgramId) => void; requestPermission: () => void; close: () => void }) {
  const supported = "Notification" in window;
  const permission = supported ? Notification.permission : "unsupported";
  return (
    <Modal title="Cài đặt LiftPath" close={close}>
      <div className="settings-stack">
        <section className="settings-section"><div className="settings-section-title"><Sun size={18} /><div><strong>Giao diện</strong><small>Đồng bộ hệ thống hoặc chọn thủ công</small></div></div><div className="theme-picker">{(["system", "light", "dark"] as ThemePreference[]).map((theme) => <button key={theme} type="button" className={settings.theme === theme ? "active" : ""} aria-pressed={settings.theme === theme} onClick={() => update({ ...settings, theme })}><ThemeIcon preference={theme} size={18} /><span>{themeLabel(theme)}</span></button>)}</div></section>
        <section className="settings-section"><div className="settings-section-title"><Dumbbell size={18} /><div><strong>Giáo án hiện tại</strong><small>Đổi giáo án không xóa lịch sử cũ</small></div></div><div className="settings-programs">{PROGRAM_ORDER.map((programId) => { const program = PROGRAMS[programId]; return <button key={programId} type="button" className={settings.programId === programId ? "active" : ""} onClick={() => selectProgram(programId)}><span><strong>{program.daysPerWeek} buổi</strong><small>{program.shortName}</small></span>{settings.programId === programId && <Check size={17} />}</button>; })}</div></section>
        <section className="settings-section"><Field label="Ngày bắt đầu chu kỳ"><input type="date" value={settings.startDate} onChange={(event) => update({ ...settings, startDate: event.target.value })} /></Field><div className="form-grid"><Field label="Giờ nhắc tập"><input type="time" value={settings.reminderTime} onChange={(event) => update({ ...settings, reminderTime: event.target.value })} /></Field><Field label="Mục tiêu tuần"><select value={settings.weeklyGoal} onChange={(event) => update({ ...settings, weeklyGoal: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6, 7].map((value) => <option key={value} value={value}>{value} buổi</option>)}</select></Field></div></section>
        <section className="settings-section"><SettingToggle label="Nhắc lịch tập" desc="Theo ngày và giờ đã cấu hình" checked={settings.scheduleReminders} change={(checked) => { update({ ...settings, scheduleReminders: checked, notify: checked || settings.notify }); if (checked) void requestPermission(); }} /><SettingToggle label="Cho phép thông báo" desc="Nhắc lịch và báo hết giờ nghỉ" checked={settings.notify} change={(checked) => { update({ ...settings, notify: checked }); if (checked) void requestPermission(); }} /><div className="permission-status">Quyền thông báo: <strong>{permissionLabel(permission)}</strong>{permission === "default" && <button type="button" onClick={requestPermission}>Cấp quyền</button>}</div><SettingToggle label="Âm báo hết giờ nghỉ" desc="Phát âm thanh khi timer về 0" checked={settings.sound} change={(checked) => update({ ...settings, sound: checked })} /><SettingToggle label="Rung phản hồi" desc="Khi thiết bị hỗ trợ rung" checked={settings.vibration} change={(checked) => update({ ...settings, vibration: checked })} /></section>
        <p className="health-note"><Info size={16} />Các giáo án dành cho người trưởng thành khỏe mạnh. Dừng bài tập nếu xuất hiện đau bất thường và tham khảo chuyên gia khi có chấn thương hoặc bệnh lý.</p>
      </div>
    </Modal>
  );
}

function ExerciseModal({ exercise, close }: { exercise: Exercise; close: () => void }) {
  return <Modal title={shortExerciseName(exercise.name)} close={close}><div className="exercise-modal"><span className={`large-exercise-icon ${exercise.type}`}>{artIcon(exercise.type)}</span><div className="fact-grid"><Fact label="Nhóm cơ chính" value={exercise.primary} /><Fact label="Nhóm cơ phụ" value={exercise.secondary} /><Fact label="Thiết bị" value={exercise.equipment} /><Fact label="Mục tiêu" value={`${exercise.sets} × ${exercise.min}–${exercise.max}`} /></div><section><span className="eyebrow">KỸ THUẬT</span><p>{exercise.technique}</p></section><section><span className="eyebrow">BÀI THAY THẾ</span><div className="alternative-list">{exercise.alternatives.map((item) => <span key={item}>{item}</span>)}</div></section></div></Modal>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [close]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-handle" /><header><h2>{title}</h2><button className="icon-button subtle" type="button" aria-label="Đóng" onClick={close}><X size={19} /></button></header><div className="modal-body">{children}</div></section></div>;
}

function ConfirmDialog({ title, text, confirmLabel, danger = false, close, confirm }: { title: string; text: string; confirmLabel: string; danger?: boolean; close: () => void; confirm: () => void }) {
  return <div className="modal-backdrop"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label={title}><h2>{title}</h2><p>{text}</p><div><button type="button" onClick={close}>Quay lại</button><button className={danger ? "danger" : "primary"} type="button" onClick={confirm}>{confirmLabel}</button></div></section></div>;
}

function ThemeIcon({ preference, size }: { preference: ThemePreference; size: number }) {
  return preference === "system" ? <Laptop size={size} /> : preference === "dark" ? <Moon size={size} /> : <Sun size={size} />;
}
function SettingToggle({ label, desc, checked, change }: { label: string; desc: string; checked: boolean; change: (checked: boolean) => void }) { return <div className="setting-toggle"><div className="grow"><strong>{label}</strong><small>{desc}</small></div><Toggle checked={checked} label={label} onChange={change} /></div>; }
function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) { return <button role="switch" aria-label={label} aria-checked={checked} type="button" className={`toggle ${checked ? "active" : ""}`} onClick={() => onChange(!checked)}><span /></button>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="fact"><small>{label}</small><strong>{value}</strong></div>; }
function Progress({ value }: { value: number }) { const percent = Math.round(Math.max(0, Math.min(1, value)) * 100); return <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${percent}%` }} /></div>; }
function MetricCard({ label, value, note }: { label: string; value: string; note: string }) { return <article className="metric-card card"><small>{label}</small><strong>{value}</strong><span>{note}</span></article>; }
function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) { return <section className="empty-state card"><span>{icon}</span><h2>{title}</h2><p>{text}</p>{action}</section>; }
function RecentSession({ session }: { session: Session }) { const program = getProgram(session.programId ?? DEFAULT_PROGRAM_ID); const workout = program.workouts.find((item) => item.id === session.dayId); return <article className="recent-session card"><span className="session-badge">{program.daysPerWeek}D</span><div className="grow"><small>{formatDateTime(session.endedAt)}</small><h2>{workout?.shortName ?? session.dayId}</h2><p>{session.totalSets} hiệp · RPE {session.avgRpe?.toFixed(1) ?? "—"}</p></div><strong>{formatCompact(sessionVolume(session))} kg</strong></article>; }
function MiniChart({ data }: { data: number[] }) { if (data.length < 2) return <div className="empty-chart">Thêm ít nhất hai bản ghi để xem xu hướng.</div>; const min = Math.min(...data); const max = Math.max(...data); const range = Math.max(1, max - min); const points = data.map((value, index) => `${(index / (data.length - 1)) * 300},${100 - ((value - min) / range) * 78}`).join(" "); return <svg className="mini-chart" viewBox="0 0 300 110" preserveAspectRatio="none" aria-label="Biểu đồ xu hướng"><polygon points={`0,110 ${points} 300,110`} className="chart-fill" /><polyline points={points} className="chart-line" vectorEffect="non-scaling-stroke" /></svg>; }

function themeLabel(theme: ThemePreference) { return theme === "system" ? "Theo hệ thống" : theme === "dark" ? "Tối" : "Sáng"; }
function permissionLabel(permission: NotificationPermission | "unsupported") { return permission === "granted" ? "Đã bật" : permission === "denied" ? "Đã chặn" : permission === "unsupported" ? "Không hỗ trợ" : "Chưa quyết định"; }
function exerciseTypeLabel(type: ExerciseType | "all") { return type === "all" ? "Tất cả" : type === "upper" ? "Ngực & lưng" : type === "lower" ? "Thân dưới" : type === "delt" ? "Vai" : type === "arms" ? "Tay" : "Core"; }
function artIcon(type: ExerciseType) { return type === "lower" ? <Activity size={25} /> : type === "core" ? <Target size={25} /> : type === "delt" ? <Zap size={25} /> : type === "arms" ? <Flame size={25} /> : <Dumbbell size={25} />; }
function shortExerciseName(name: string) { return name.replace(/\s*\([^)]*\)\s*$/, ""); }
function translateSuffix(suffix: string) { return suffix === "seconds" ? "giây" : suffix === "each side" ? "mỗi bên" : suffix === "each leg" ? "mỗi chân" : suffix === "total reps" ? "tổng reps" : "reps"; }
function estimateDuration(exerciseIds: string[]) { const work = exerciseIds.reduce((sum, id) => { const item = EXERCISES[id]; return sum + item.sets * (45 + item.rest); }, 0); return Math.max(30, Math.round(work / 300) * 5); }
function formatCompact(value: number) { return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}m` : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value)); }
function formatTime(date: Date) { return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }); }
function formatDateTime(value: string) { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) : value; }
function formatMonth(value: string) { const date = new Date(`${value}T00:00:00`); return Number.isFinite(date.getTime()) ? date.toLocaleDateString("vi-VN", { month: "short" }) : ""; }
function sessionVolume(session: Session) { return session.exercises.reduce((total, entry) => total + entry.sets.reduce((sum, set) => sum + (set.done ? (Number(set.weight) || 0) * (Number(set.reps) || 0) : 0), 0), 0); }
