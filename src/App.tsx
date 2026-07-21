import { useMemo, useReducer, useState, type CSSProperties, type ReactNode } from "react";
import { Dumbbell, Target, Zap, Activity, Flame, Shield, ArrowUpRight, Search, Play, X, Trash2, Bell, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { EXERCISES, PROGRAM, TRAINING_DAYS, formatSeconds, isCompletableSet, nextScheduledWorkout, nextWorkoutDay, phaseForWeek, todayISO } from "./data";
import { achievements, levelInfo, totalVolume, weeklyStats, weeklyStreak } from "./gamification";
import { useAppState } from "./state";
import { useRestTimer, useTrainingReminder } from "./timers";
import type { BodyStat, DayId, Exercise, ExerciseType, Session, Settings } from "./types";

type Tab = "today" | "program" | "history" | "body";
const NAV: Array<{ id: Tab; icon: string; label: string }> = [
  { id: "today", icon: "🔥", label: "Hôm nay" },
  { id: "program", icon: "📋", label: "Giáo án" },
  { id: "history", icon: "📈", label: "Tiến bộ" },
  { id: "body", icon: "⚖️", label: "Chỉ số" },
];

export default function App() {
  const app = useAppState();
  const [tab, setTab] = useState<Tab>("today");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [permissionRevision, bumpPermission] = useReducer((value: number) => value + 1, 0);
  const timer = useRestTimer(app.state.settings, permissionRevision);
  useTrainingReminder(app.state.settings, app.state.history, permissionRevision);

  const requestPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch { /* browser controlled */ }
      bumpPermission();
    }
  };

  const updateSettings = (settings: Settings) => app.setSettings(settings);

  if (app.state.draft) {
    return (
      <WorkoutView
        draft={app.state.draft}
        week={app.week}
        targetRpe={app.phase.targetRpe}
        timer={timer}
        updateSet={app.updateSet}
        completeSet={(exercise, set) => {
          const rest = app.completeSet(exercise, set); 
          if (rest) timer.start(rest); 
          if ('vibrate' in navigator) navigator.vibrate(50); // Haptic feedback
        }}
        setCurrent={app.setCurrentExercise}
        addSet={app.addSet}
        removeSet={app.removeSet}
        finish={() => { app.finishWorkout(); timer.cancel(); }}
        cancel={() => {
          const proceed = () => { app.cancelWorkout(); timer.cancel(); };
          // Custom confirm logic since window.confirm doesn't work in iframes
          // We can just add a simple dataset state to the button itself where it's called
          // But wait, cancel is passed down to WorkoutView. We should modify WorkoutView's cancel button instead.
          // For now, let's just make it call cancel directly in App, and we will handle the confirmation in WorkoutView.
          proceed();
        }}
      />
    );
  }

  const heads: Record<Tab, [string, string, string]> = {
    today: ["LIFTPATH · PERSONAL", "Sẵn sàng bứt phá? 🔥", `Tuần ${app.week} • ${app.phase.name}`],
    program: ["GIÁO ÁN ĐỘC QUYỀN", "Tập theo nhịp của bạn 📋", "Lịch trình tập & Thư viện bài tập chi tiết"],
    history: ["NHẬT KÝ TIẾN BỘ", "Hành trình vượt giới hạn 📈", `${app.state.history.length} buổi tập đã ghi nhận`],
    body: ["BẢN ĐỒ THỂ CHẤT", "Theo dõi sự thay đổi ⚖️", "Cân nặng & các chỉ số đo cơ thể chính"],
  };
  const head = heads[tab];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-row"><span className="brand-mark">LP</span><span>{head[0]}</span></div>
        <div className="header-line">
          <div><h1>{head[1]}</h1><p>{head[2]}</p></div>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Mở cài đặt">⚙</button>
        </div>
      </header>

      <main className="page-content">
        {tab === "today" && <TodayView history={app.state.history} settings={app.state.settings} week={app.week} phase={app.phase} start={app.startWorkout} />}
        {tab === "program" && <ProgramView week={app.week} history={app.state.history} settings={app.state.settings} updateSettings={updateSettings} requestPermission={requestPermission} start={app.startWorkout} />}
        {tab === "history" && <HistoryView history={app.state.history} deleteSession={app.deleteSession} />}
        {tab === "body" && <BodyView entries={app.state.bodyStats} add={app.addBodyStat} remove={app.deleteBodyStat} />}
      </main>

      <nav className="bottom-nav" aria-label="Điều hướng chính">
        {NAV.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}
      </nav>

      {settingsOpen && <SettingsModal settings={app.state.settings} update={updateSettings} requestPermission={requestPermission} close={() => setSettingsOpen(false)} />}
    </div>
  );
}

function TodayView({ history, settings, week, phase, start }: { history: Session[]; settings: Settings; week: number; phase: ReturnType<typeof phaseForWeek>; start: (day: DayId) => void }) {
  const stats = weeklyStats(history);
  const streak = weeklyStreak(history, settings.weeklyGoal);
  const level = levelInfo(history, settings.weeklyGoal);
  const badges = achievements(history, settings.weeklyGoal);
  const next = nextWorkoutDay(history);
  const day = PROGRAM.find((item) => item.id === next)!;
  const setTarget = settings.weeklyGoal * 15;
  const challenges = [
    { icon: "📅", name: "Đủ lịch tuần", value: stats.sessions, target: settings.weeklyGoal, unit: "buổi" },
    { icon: "💪", name: "Set chất lượng", value: stats.sets, target: setTarget, unit: "hiệp" },
    { icon: "🔥", name: "Giữ nhịp đều", value: stats.activeDays, target: Math.min(3, settings.weeklyGoal), unit: "ngày" },
  ];
  return <div className="stack">
    <section className="hero-card fade-in">
      <div className="hero-glow one" /><div className="hero-glow two" />
      <div className="hero-top"><div><span className="eyebrow light">TUẦN HIỆN TẠI</span><strong className="week-number">{week}</strong></div><span className="infinity-pill">💎 LiftPath Pro</span></div>
      <p className="phase-name">{phase.name}</p><p className="phase-hint">{phase.hint} · RPE mục tiêu {phase.targetRpe}</p>
      <div className="level-row"><span>⭐ Cấp {level.level} • {level.rank}</span><span>✨ {level.xp} XP</span></div>
      <Progress value={level.progress} tone="lime" />
    </section>

    <div className="stat-grid">
      <Stat label="STREAK TUẦN" value={`${streak}`} unit="tuần" tone="purple" />
      <Stat label="MỤC TIÊU" value={`${stats.sessions}`} unit={`/${settings.weeklyGoal}`} tone="orange" />
      <Stat label="TỔNG TẢI" value={formatCompact(totalVolume(history))} unit="kg" tone="ink" />
    </div>

    <section className="next-card card">
      <div className={`art small ${["upper","lower","delt"][PROGRAM.findIndex(item => item.id === day.id)]}`}><span>{DAY_ICONS[PROGRAM.findIndex(item => item.id === day.id)]}</span></div>
      <div className="grow"><span className="eyebrow">🚀 BUỔI TIẾP THEO</span><h2>Workout {day.id}</h2><p>{day.name}</p></div>
      <button className="round-play" onClick={() => start(day.id)} aria-label={`Bắt đầu buổi ${day.id}`}><Play fill="currentColor" size={24} /></button>
    </section>
    <div className="exercise-preview">{day.exercises.slice(0, 4).map((id) => <span key={id}>{EXERCISES[id].name}</span>)}</div>

    <SectionHead kicker="THỬ THÁCH" title="Mục tiêu tuần này" meta={`${stats.sessions}/${settings.weeklyGoal} buổi`} />
    <div className="challenge-list">{challenges.map((item) => {
      const progress = Math.min(1, item.value / Math.max(1, item.target));
      return <div className="challenge card" key={item.name}><span className="challenge-icon">{item.icon}</span><div className="grow"><div className="challenge-top"><strong>{item.name}</strong><span>{item.value}/{item.target} {item.unit}</span></div><Progress value={progress} /></div></div>;
    })}</div>

    <SectionHead kicker="BỘ SƯU TẬP" title="Huy hiệu của bạn" meta={`${badges.filter((item) => item.unlocked).length}/${badges.length}`} />
    <div className="badge-strip">{badges.map((badge) => <div className={`badge-card card ${badge.unlocked ? "" : "locked"}`} key={badge.id}><span className="badge-icon">{badge.icon}</span><strong>{badge.name}</strong><p>{badge.hint}</p><Progress value={badge.progress} /></div>)}</div>

    <button className="primary-action dark" onClick={() => start(next)}><span><small>⚡ SẴN SÀNG CHƯA?</small>Kích hoạt Workout {next} ngay</span><b>→</b></button>
  </div>;
}

function ProgramView({ week, history, settings, updateSettings, requestPermission, start }: { week: number; history: Session[]; settings: Settings; updateSettings: (settings: Settings) => void; requestPermission: () => void; start: (day: DayId) => void }) {
  const [mode, setMode] = useState<"plan" | "library">("plan");
  const [selected, setSelected] = useState<DayId>("A");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ExerciseType | "all">("all");
  const [detail, setDetail] = useState<Exercise | null>(null);
  const phase = phaseForWeek(week);
  const next = nextScheduledWorkout(settings, history);
  const day = PROGRAM.find((item) => item.id === selected)!;
  const filtered = Object.values(EXERCISES).filter((item) => (filter === "all" || item.type === filter) && `${item.name} ${item.primary} ${item.equipment}`.toLowerCase().includes(query.trim().toLowerCase()));
  const toggleDay = (value: number) => updateSettings({ ...settings, trainingDays: settings.trainingDays.includes(value) ? settings.trainingDays.filter((day) => day !== value) : [...settings.trainingDays, value] });
  return <div className="stack">
    <section className="program-hero hero-card"><div><span className="infinity-pill">💎 LiftPath Pro</span><p>Tuần hiện tại</p><strong className="week-number">{week}</strong></div><div className="align-right"><span className="eyebrow lime">NHỊP TUẦN NÀY</span><h2>{phase.name}</h2><p>{phase.hint}</p></div><div className="phase-track">{Array.from({ length: 5 }, (_, index) => <div key={index}><i className={index === 0 ? "now" : phaseForWeek(week + index).deload ? "deload" : ""} /><small>T{week + index}</small></div>)}</div></section>
    <div className="segmented"><button className={mode === "plan" ? "active" : ""} onClick={() => setMode("plan")}>📅 Lịch Trình</button><button className={mode === "library" ? "active" : ""} onClick={() => setMode("library")}>📚 Thư Viện</button></div>
    {mode === "plan" ? <>
      <section className="card schedule-card"><SectionHead kicker="LỊCH TẬP CỦA BẠN" title="Chọn ngày, giữ nhịp" /><div className="day-picker">{TRAINING_DAYS.map((item) => <button key={item.value} className={settings.trainingDays.includes(item.value) ? "active" : ""} onClick={() => toggleDay(item.value)}>{item.short}</button>)}</div><div className="form-grid"><Field label="GIỜ NHẮC"><input type="time" value={settings.reminderTime} onChange={(event) => updateSettings({ ...settings, reminderTime: event.target.value })} /></Field><Field label="MỤC TIÊU TUẦN"><select value={settings.weeklyGoal} onChange={(event) => updateSettings({ ...settings, weeklyGoal: Number(event.target.value) })}>{[1,2,3,4,5,6,7].map((value) => <option key={value}>{value}</option>)}</select></Field></div><div className="reminder-row"><span className="reminder-icon">🔔</span><div className="grow"><small>BUỔI TIẾP THEO</small><strong>{next ? `${next.relative}, ${next.date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · Buổi ${next.dayId}` : "Chọn ít nhất một ngày tập"}</strong></div><Toggle checked={settings.scheduleReminders} onChange={(checked) => { updateSettings({ ...settings, scheduleReminders: checked, notify: checked || settings.notify }); if (checked) void requestPermission(); }} /></div></section>
      <SectionHead kicker="GIÁO ÁN A • B • C" title="Chọn buổi tập" meta="Luân phiên toàn thân" />
      <div className="day-cards">{PROGRAM.map((item, index) => <button key={item.id} className={selected === item.id ? "active" : ""} onClick={() => setSelected(item.id)}><div className={`art ${["upper","lower","delt"][index]}`}><span>{DAY_ICONS[index]}</span></div><b>Buổi {item.id}</b><small>{item.exercises.length} bài</small></button>)}</div>
      <section className="card day-detail"><div className="day-title"><span className="day-badge">{day.id}</span><div className="grow"><span className="eyebrow">WORKOUT {day.id}</span><h2>{day.name}</h2></div><button className="mini-start" onClick={() => start(day.id)}>⚡ Bắt đầu</button></div><div className="exercise-list">{day.exercises.map((id, index) => { const item = EXERCISES[id]; return <button key={id} onClick={() => setDetail(item)}><span className={`type-dot ${item.type}`} /><span className="index">{index + 1}</span><div className="grow"><strong>{item.name}</strong><small>{item.sets} × {item.min}–{item.max} · nghỉ {formatSeconds(item.rest)}</small></div><ChevronRight size={16} className="text-gray-400" /></button>; })}</div></section>
    </> : <>
      <div className="search-box"><span>🔍</span><input placeholder="Tìm tên bài, nhóm cơ, dụng cụ..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="filter-strip">{(["all","upper","lower","delt","core"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{({ all: "Tất cả", upper: "Thân trên", lower: "Thân dưới", delt: "Vai", core: "Cơ lõi" })[value]}</button>)}</div>
      <p className="result-count">{filtered.length} bài tập</p>
      <div className="library-grid">{filtered.map((item) => <button className="card" key={item.id} onClick={() => setDetail(item)}><div className={`art ${item.type}`}><span>{artIcon(item.type)}</span></div><span className="eyebrow">{item.primary}</span><strong>{item.name}</strong><small>{item.equipment} · {formatSeconds(item.rest)}</small></button>)}</div>
    </>}
    {detail && <Modal title="Hướng dẫn bài tập" close={() => setDetail(null)}><div className={`art detail-art ${detail.type}`}><span>{artIcon(detail.type)}</span></div><span className="eyebrow">{detail.primary} · {detail.equipment}</span><h2 className="detail-name">{detail.name}</h2><div className="fact-grid"><Fact label="NHÓM CƠ" value={detail.primary} /><Fact label="MỤC TIÊU" value={`${detail.sets}×${detail.min}–${detail.max}`} /><Fact label="NGHỈ" value={formatSeconds(detail.rest)} /></div><div className="technique"><small>ĐIỂM KỸ THUẬT</small><p>{detail.technique}</p></div><dl className="detail-list"><div><dt>Cơ hỗ trợ</dt><dd>{detail.secondary}</dd></div><div><dt>Thay thế</dt><dd>{detail.alternatives.join(" · ")}</dd></div></dl></Modal>}
  </div>;
}

function HistoryView({ history, deleteSession }: { history: Session[]; deleteSession: (id: string) => void }) {
  const volume = totalVolume(history);
  const prs = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach((session) => session.exercises.forEach((entry) => entry.sets.forEach((set) => {
      const weight = Number(set.weight); const reps = Number(set.reps);
      if (weight > 0 && reps > 0) map.set(entry.exerciseId, Math.max(map.get(entry.exerciseId) ?? 0, weight * (1 + reps / 30)));
    })));
    return [...map.entries()].sort((a,b) => b[1]-a[1]).slice(0,5);
  }, [history]);
  const exportCsv = () => {
    const rows = [["date","workout","exercise","set","weight_kg","reps","rpe"]];
    history.forEach((session) => session.exercises.forEach((entry) => entry.sets.forEach((set, index) => rows.push([session.endedAt.slice(0,10), session.dayId, EXERCISES[entry.exerciseId]?.name ?? entry.exerciseId, String(index + 1), set.weight, set.reps, set.rpe]))));
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"','""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = `liftpath-${todayISO()}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="stack"><div className="stat-grid"><Stat label="TỔNG BUỔI" value={String(history.length)} unit="buổi" tone="purple" /><Stat label="TỔNG TẢI" value={formatCompact(volume)} unit="kg" tone="orange" /><Stat label="STREAK" value={String(weeklyStreak(history, 1))} unit="tuần" tone="ink" /></div>
    {prs.length > 0 && <section className="card pr-card"><SectionHead kicker="KỶ LỤC CÁ NHÂN 🏆" title="Sức Mạnh Ước Tính (1RM)" />{prs.map(([id,value], index) => <div className="pr-row" key={id}><span>{["🥇", "🥈", "🥉", "🏅", "🎗️"][index] || `#${index + 1}`}</span><strong className="grow">{EXERCISES[id]?.name ?? id}</strong><b>{Math.round(value)} kg</b></div>)}</section>}
    <div className="row-between"><SectionHead kicker="NHẬT KÝ" title="Các buổi đã lưu" /><button className="ghost-button" disabled={!history.length} onClick={exportCsv}>Xuất CSV</button></div>
    {!history.length ? <Empty icon="🏆" title="Chưa có buổi tập" text="Hoàn thành buổi đầu tiên để bắt đầu ghi dấu ấn tiến bộ tại đây!" /> : <div className="session-list">{history.map((session) => { const minutes = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)); return <article className="card session" key={session.id}><span className="day-badge">{session.dayId}</span><div className="grow"><strong>Workout {session.dayId}</strong><small>{session.totalSets} hiệp · RPE {session.avgRpe?.toFixed(1) ?? "—"} · {minutes} phút</small></div><div className="session-date"><span>{new Date(session.endedAt).toLocaleDateString("vi-VN")}</span><button onClick={(e) => { const btn = e.currentTarget; if (btn.dataset.confirm) { deleteSession(session.id); } else { btn.dataset.confirm = "true"; const old = btn.innerHTML; btn.innerHTML = "Xóa?"; setTimeout(() => { if (!btn.isConnected) return; btn.dataset.confirm = ""; btn.innerHTML = old; }, 3000); } }} aria-label="Xóa buổi" style={{ fontSize: "14px" }}>🗑️</button></div></article>; })}</div>}
  </div>;
}

function BodyView({ entries, add, remove }: { entries: BodyStat[]; add: (entry: Omit<BodyStat,"id">) => void; remove: (id: string) => void }) {
  type Metric = "weight" | "waist" | "chest" | "arm";
  const metrics: Array<{ id: Metric; label: string; unit: string }> = [{id:"weight",label:"Cân nặng",unit:"kg"},{id:"waist",label:"Vòng eo",unit:"cm"},{id:"chest",label:"Vòng ngực",unit:"cm"},{id:"arm",label:"Bắp tay",unit:"cm"}];
  const [metric, setMetric] = useState<Metric>("weight"); const [date, setDate] = useState(todayISO());
  const [values, setValues] = useState<Record<Metric,string>>({weight:"",waist:"",chest:"",arm:""});
  const sorted = [...entries].sort((a,b) => a.date.localeCompare(b.date)); const data = sorted.map((entry) => ({date:entry.date,value:entry[metric]})).filter((entry): entry is {date:string;value:number} => entry.value != null);
  const current = data.at(-1)?.value; const first = data[0]?.value; const delta = current != null && first != null ? current-first : null; const unit = metrics.find((item) => item.id === metric)!.unit;
  const save = () => { if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return; const number = (value:string) => { const parsed=Number(value); return value!=="" && parsed>0 && Number.isFinite(parsed) ? parsed : null; }; const entry={date,weight:number(values.weight),waist:number(values.waist),chest:number(values.chest),arm:number(values.arm)}; if (Object.values(entry).slice(1).every((value) => value == null)) return; add(entry); setValues({weight:"",waist:"",chest:"",arm:""}); };
  return <div className="stack"><section className="card body-card"><div className="row-between"><span className="eyebrow">TIẾN BỘ CƠ THỂ</span><div className="metric-tabs">{metrics.map((item) => <button key={item.id} className={metric===item.id?"active":""} onClick={() => setMetric(item.id)}>{item.label.replace("Vòng ","")}</button>)}</div></div><div className="body-number"><strong>{current ?? "—"}</strong><span>{unit}</span>{delta != null && <em className={delta>0?"up":delta<0?"down":""}>{delta>0?"+":""}{delta.toFixed(1)} {unit}</em>}</div><MiniChart data={data.map((item) => item.value)} /> </section>
    <section className="card add-body"><div className="row-between"><h2>📝 Ghi nhận chỉ số mới</h2><input type="date" value={date} onChange={(event)=>setDate(event.target.value)} /></div><div className="measurement-grid">{metrics.map((item) => <Field key={item.id} label={item.label.toUpperCase()}><div className="unit-input"><input type="number" min="0" step="0.1" inputMode="decimal" placeholder="—" value={values[item.id]} onChange={(event)=>setValues((currentValues)=>({...currentValues,[item.id]:event.target.value}))}/><span>{item.unit}</span></div></Field>)}</div><button className="primary-action" onClick={save}>✨ Lưu Số Đo Cơ Thể</button></section>
    {sorted.length > 0 && <><SectionHead kicker="LỊCH SỬ" title="Số đo gần đây" /><div className="body-list">{[...sorted].reverse().slice(0,12).map((entry) => <article className="card" key={entry.id}><div className="grow"><small>{entry.date}</small><p>{entry.weight != null && <b>{entry.weight} kg</b>}{entry.waist != null && <span>eo {entry.waist}</span>}{entry.chest != null && <span>ngực {entry.chest}</span>}{entry.arm != null && <span>tay {entry.arm}</span>}</p></div><button onClick={(e) => { const btn = e.currentTarget; if (btn.dataset.confirm) { remove(entry.id); } else { btn.dataset.confirm = "true"; const old = btn.innerHTML; btn.innerHTML = "Xóa?"; setTimeout(() => { if (!btn.isConnected) return; btn.dataset.confirm = ""; btn.innerHTML = old; }, 3000); } }} style={{ fontSize: "14px" }}>🗑️</button></article>)}</div></>}
  </div>;
}

function WorkoutView({ draft, week, targetRpe, timer, updateSet, completeSet, setCurrent, addSet, removeSet, finish, cancel }: { draft: NonNullable<ReturnType<typeof useAppState>["state"]["draft"]>; week: number; targetRpe: number; timer: ReturnType<typeof useRestTimer>; updateSet: ReturnType<typeof useAppState>["updateSet"]; completeSet: (exercise:number,set:number)=>void; setCurrent:(index:number)=>void; addSet:(index:number)=>void; removeSet:(index:number)=>void; finish:()=>void; cancel:()=>void }) {
  const exerciseIndex=draft.currentEx; const entry=draft.exercises[exerciseIndex]; const meta=EXERCISES[entry.exerciseId];
  const complete=draft.exercises.reduce((sum,item)=>sum+item.sets.filter((set)=>set.done).length,0); const total=draft.exercises.reduce((sum,item)=>sum+item.sets.length,0); const percent=total?Math.round(complete/total*100):0; const focus=entry.sets.findIndex((set)=>!set.done);
  return <div className="workout-shell"><header className="workout-header"><button onClick={(e) => { const btn = e.currentTarget; if (btn.dataset.confirm) { cancel(); } else { btn.dataset.confirm = "true"; const old = btn.innerHTML; btn.innerHTML = "Hủy?"; setTimeout(() => { if (!btn.isConnected) return; btn.dataset.confirm = ""; btn.innerHTML = old; }, 3000); } }} aria-label="Hủy buổi tập">✕</button><div><span>WORKOUT {draft.dayId} • TUẦN {week}</span><strong>{complete}/{total} hiệp • {percent}%</strong></div><button className="finish" disabled={!complete} onClick={finish}>Hoàn thành</button><Progress value={percent/100} tone="lime" /></header>
    {timer.active && <section className="rest-card card"><div className="timer-ring" style={{"--progress":`${timer.progress*360}deg`} as CSSProperties}><div><small>{timer.remaining===0?"⏰ HẾT GIỜ!":"⏳ ĐANG NGHỈ"}</small><strong>{formatSeconds(timer.remaining)}</strong><div><button onClick={()=>timer.addSeconds(-15)}>-15s</button><button onClick={()=>timer.addSeconds(15)}>+15s</button><button className="done" onClick={timer.cancel} aria-label="Bỏ qua nghỉ">Bỏ qua</button></div></div></div></section>}
    <div className="exercise-dots">{draft.exercises.map((item,index)=><button key={item.exerciseId} className={`${index===exerciseIndex?"active":""} ${item.sets.every((set)=>set.done)?"complete":""}`} onClick={()=>setCurrent(index)}>{index+1}</button>)}</div>
    <main className="workout-main"><section className="card current-exercise"><div className={`art workout-art ${meta.type}`}><span>{artIcon(meta.type)}</span></div><div className="exercise-content"><span className="eyebrow">{meta.primary} • {meta.equipment}</span><h1>{meta.name}</h1><p className="target">Mục tiêu: <b>{meta.min}–{meta.max}</b> {meta.suffix} • Nghỉ: <b>{formatSeconds(meta.rest)}</b> • RPE: <b>{targetRpe}</b></p><p className="tech-text">{meta.technique}</p><div className="set-head"><span>#</span><span>KG</span><span>REPS</span><span>RPE</span><span /></div><div className="sets">{entry.sets.map((set,index)=>{const can=isCompletableSet(set)&&!set.done; return <div className={`set-row ${set.done?"complete":index===focus?"focused":""}`} key={index}><span>{index+1}</span><input type="number" inputMode="decimal" step="0.5" placeholder="—" value={set.weight} onChange={(event)=>updateSet(exerciseIndex,index,{weight:event.target.value})}/><input type="number" inputMode="numeric" min="1" placeholder="—" value={set.reps} onChange={(event)=>updateSet(exerciseIndex,index,{reps:event.target.value})}/><input type="number" inputMode="decimal" min="1" max="10" step="0.5" placeholder={`~${targetRpe}`} value={set.rpe} onChange={(event)=>updateSet(exerciseIndex,index,{rpe:event.target.value})}/><button disabled={!can} onClick={()=>completeSet(exerciseIndex,index)}>{set.done?"✓":"✓"}</button></div>})}</div><div className="set-actions"><button onClick={()=>removeSet(exerciseIndex)}>➖ Bớt hiệp</button><button onClick={()=>addSet(exerciseIndex)}>➕ Thêm hiệp</button></div></div></section><div className="workout-nav"><button disabled={exerciseIndex===0} onClick={()=>setCurrent(exerciseIndex-1)}>⏮️ Bài trước</button><button disabled={exerciseIndex===draft.exercises.length-1} onClick={()=>setCurrent(exerciseIndex+1)}>Bài tiếp ⏭️</button></div><div className="wake-note">💡 Trình duyệt sẽ giữ màn hình luôn sáng. Hãy tập trung hoàn thành các hiệp tập của bạn!</div></main>
  </div>;
}

function SettingsModal({ settings, update, requestPermission, close }: { settings: Settings; update:(settings:Settings)=>void; requestPermission:()=>void; close:()=>void }) {
  const supported="Notification" in window; const permission=supported?Notification.permission:"unsupported";
  return <Modal title="Cài đặt cá nhân" close={close}><div className="settings-stack"><Field label="NGÀY BẮT ĐẦU HÀNH TRÌNH"><input type="date" value={settings.startDate} onChange={(event)=>update({...settings,startDate:event.target.value})}/></Field><div className="day-picker">{TRAINING_DAYS.map((item)=><button key={item.value} className={settings.trainingDays.includes(item.value)?"active":""} onClick={()=>update({...settings,trainingDays:settings.trainingDays.includes(item.value)?settings.trainingDays.filter((day)=>day!==item.value):[...settings.trainingDays,item.value]})}>{item.short}</button>)}</div><div className="form-grid"><Field label="GIỜ NHẮC TẬP"><input type="time" value={settings.reminderTime} onChange={(event)=>update({...settings,reminderTime:event.target.value})}/></Field><Field label="MỤC TIÊU TUẦN"><select value={settings.weeklyGoal} onChange={(event)=>update({...settings,weeklyGoal:Number(event.target.value)})}>{[1,2,3,4,5,6,7].map((value)=><option key={value} value={value}>{value} buổi / tuần</option>)}</select></Field></div><hr/><SettingToggle label="Nhắc lịch tập" desc="Theo ngày và giờ bạn đã cấu hình" checked={settings.scheduleReminders} change={(checked)=>{update({...settings,scheduleReminders:checked,notify:checked||settings.notify});if(checked)void requestPermission();}}/><SettingToggle label="Cho phép thông báo" desc="Gửi thông báo nhắc lịch và hết giờ nghỉ" checked={settings.notify} change={(checked)=>{update({...settings,notify:checked});if(checked)void requestPermission();}}/><div className="permission">Quyền thông báo: <b>{permission==="granted"?"🟢 Đã bật":permission==="denied"?"🔴 Đã chặn":permission==="unsupported"?"⚠️ Không hỗ trợ":"🟡 Chưa quyết định"}</b>{permission==="default"&&<button onClick={requestPermission}>Cấp quyền</button>}</div><hr/><SettingToggle label="Chuông báo hết giờ nghỉ" desc="Phát âm thanh báo khi đếm ngược về 0" checked={settings.sound} change={(checked)=>update({...settings,sound:checked})}/><SettingToggle label="Rung phản hồi" desc="Khi thiết bị di động hỗ trợ tính năng rung" checked={settings.vibration} change={(checked)=>update({...settings,vibration:checked})}/><p className="notice">Lưu ý: Tính năng nhắc nhở khi đóng ứng dụng hoạt động tốt nhất khi được cài đặt dưới dạng ứng dụng PWA trên điện thoại (thêm vào Màn hình chính).</p></div></Modal>;
}

function Modal({ title, close, children }: { title:string;close:()=>void;children:ReactNode }) { return <div className="modal-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)close();}}><section className="modal"><div className="modal-handle"/><header><h2>{title}</h2><button onClick={close}>✕</button></header><div className="modal-body">{children}</div></section></div>; }
function SettingToggle({label,desc,checked,change}:{label:string;desc:string;checked:boolean;change:(checked:boolean)=>void}) { return <div className="setting-toggle"><div className="grow"><strong>{label}</strong><small>{desc}</small></div><Toggle checked={checked} onChange={change}/></div>; }
function Toggle({checked,onChange}:{checked:boolean;onChange:(checked:boolean)=>void}) { return <button role="switch" aria-checked={checked} className={`toggle ${checked?"active":""}`} onClick={()=>onChange(!checked)}><span/></button>; }
function SectionHead({kicker,title,meta}:{kicker:string;title:string;meta?:string}) { return <div className="section-head"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2></div>{meta&&<small>{meta}</small>}</div>; }
function Field({label,children}:{label:string;children:ReactNode}) { return <label className="field"><span>{label}</span>{children}</label>; }
function Fact({label,value}:{label:string;value:string}) { return <div className="fact"><small>{label}</small><strong>{value}</strong></div>; }
function Progress({value,tone}:{value:number;tone?:"lime"}) { return <div className={`progress ${tone??""}`}><i style={{width:`${Math.round(Math.max(0,Math.min(1,value))*100)}%`}}/></div>; }
function Stat({label,value,unit,tone}:{label:string;value:string;unit:string;tone:"purple"|"orange"|"ink"}) { return <div className={`stat ${tone}`}><small>{label}</small><p><strong>{value}</strong><span>{unit}</span></p></div>; }
function Empty({icon,title,text}:{icon:string;title:string;text:string}) { return <div className="empty card"><span>{icon}</span><h2>{title}</h2><p>{text}</p></div>; }
function MiniChart({data}:{data:number[]}) { if(data.length<2)return <div className="empty-chart">Thêm ít nhất 2 bản ghi để xem biểu đồ.</div>; const min=Math.min(...data),max=Math.max(...data),range=Math.max(1,max-min); const points=data.map((value,index)=>`${(index/(data.length-1))*300},${100-((value-min)/range)*80}`).join(" "); return <svg className="mini-chart" viewBox="0 0 300 110" preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".28"/><stop offset="1" stopColor="#8b5cf6" stopOpacity="0"/></linearGradient></defs><polygon points={`0,110 ${points} 300,110`} fill="url(#chartFill)"/><polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg>; }
function formatCompact(value:number) { return value>=1000?`${(value/1000).toFixed(1)}k`:String(Math.round(value)); }
function artIcon(type:ExerciseType) { 
  return type === "lower" ? <Activity size={28} strokeWidth={1.5} /> 
    : type === "core" ? <Target size={28} strokeWidth={1.5} /> 
    : type === "delt" ? <Zap size={28} strokeWidth={1.5} /> 
    : <Dumbbell size={28} strokeWidth={1.5} />; 
}
const DAY_ICONS = [<Dumbbell size={32} strokeWidth={1.5} />, <Target size={32} strokeWidth={1.5} />, <Zap size={32} strokeWidth={1.5} />];
