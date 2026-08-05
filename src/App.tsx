import { useReducer, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Dumbbell,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { useGuidedAppState } from "./guided-state.js";
import { ReadinessCheck } from "./features/workout/ReadinessCheck.js";
import { useRestTimer, useTrainingReminder } from "./timers.js";
import type { ProgramId } from "./types.js";
import { Onboarding } from "./components/Onboarding.js";
import { WorkoutScreen } from "./components/Workout.js";
import {
  HistoryScreen,
  InsightsScreen,
  ProgramSwitchDialog,
  ProgramsScreen,
  RecapModal,
  SettingsScreen,
  TodayScreen,
} from "./components/Screens.js";
import { useTheme } from "./components/common.js";

type Tab = "today" | "programs" | "history" | "insights" | "settings";
type IconComponent = (props: { size?: number; strokeWidth?: number; className?: string }) => ReactNode;

const NAV: Array<{ id: Tab; label: string; icon: IconComponent }> = [
  { id: "today", label: "Hôm nay", icon: Dumbbell },
  { id: "programs", label: "Giáo án", icon: CalendarDays },
  { id: "history", label: "Nhật ký", icon: Activity },
  { id: "insights", label: "Tiến bộ", icon: BarChart3 },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

export default function App() {
  const app = useGuidedAppState();
  const [tab, setTab] = useState<Tab>("today");
  const [switchTarget, setSwitchTarget] = useState<ProgramId | null>(null);
  const [permissionRevision, bumpPermission] = useReducer((value: number) => value + 1, 0);
  useTheme(app.state.settings.theme);
  const timer = useRestTimer(app.state.settings, permissionRevision);
  useTrainingReminder(app.state.settings, app.state.history, app.state.customPrograms, permissionRevision);

  const requestPermission = async () => {
    if (!("Notification" in window) || Notification.permission !== "default") return;
    try { await Notification.requestPermission(); } catch { /* Browser controls the prompt. */ }
    bumpPermission();
  };

  if (!app.state.profile.onboardingComplete) {
    return <Onboarding initial={app.state.profile} onComplete={app.completeOnboarding} />;
  }
  if (app.preparedWorkout) {
    return <ReadinessCheck prepared={app.preparedWorkout} confirm={app.confirmReadiness} cancel={app.cancelPreparedWorkout} />;
  }
  if (app.state.draft) return <WorkoutScreen app={app} timer={timer} />;

  const meta: Record<Tab, { eyebrow: string; title: string; subtitle: string }> = {
    today: { eyebrow: "LIFTPATH 4.0", title: "Buổi tập của bạn", subtitle: `${app.currentProgram.name} · Tuần ${app.week}` },
    programs: { eyebrow: "PROGRAM BUILDER", title: "Giáo án", subtitle: "Template hệ thống và chương trình của bạn" },
    history: { eyebrow: "WORKOUT LOG", title: "Nhật ký", subtitle: `${app.state.history.length} buổi đã được snapshot an toàn` },
    insights: { eyebrow: "PROGRESSION COACH", title: "Tiến bộ", subtitle: "Khuyến nghị dựa trên reps, effort và lịch sử" },
    settings: { eyebrow: "DATA & SYNC", title: "Cài đặt", subtitle: "Backup, đồng bộ và quyền riêng tư" },
  };

  return (
    <div className="app-shell">
      <aside className="desktop-rail">
        <Brand />
        <nav className="rail-nav" aria-label="Điều hướng chính">
          {NAV.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}><Icon size={20} /><span>{item.label}</span></button>; })}
        </nav>
        <button className="rail-theme" type="button" onClick={() => app.updateSettings({ theme: app.state.settings.theme === "dark" ? "light" : "dark" })}>{app.state.settings.theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}<span>Đổi giao diện</span></button>
      </aside>

      <div className="app-frame">
        <header className="app-header">
          <div className="mobile-brand"><Brand /></div>
          <div className="page-heading"><div><span className="eyebrow">{meta[tab].eyebrow}</span><h1>{meta[tab].title}</h1><p>{meta[tab].subtitle}</p></div><button className="icon-button mobile-theme" type="button" aria-label="Đổi giao diện" onClick={() => app.updateSettings({ theme: app.state.settings.theme === "dark" ? "light" : "dark" })}>{app.state.settings.theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}</button></div>
        </header>

        <main className="page-content">
          {tab === "today" && <TodayScreen app={app} requestProgramSwitch={setSwitchTarget} goPrograms={() => setTab("programs")} />}
          {tab === "programs" && <ProgramsScreen app={app} requestProgramSwitch={setSwitchTarget} />}
          {tab === "history" && <HistoryScreen app={app} />}
          {tab === "insights" && <InsightsScreen app={app} />}
          {tab === "settings" && <SettingsScreen app={app} requestPermission={requestPermission} />}
        </main>

        <nav className="bottom-nav" aria-label="Điều hướng chính">
          {NAV.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}><Icon size={19} /><span>{item.label}</span></button>; })}
        </nav>
      </div>

      {switchTarget && <ProgramSwitchDialog programId={switchTarget} app={app} close={() => setSwitchTarget(null)} />}
      <RecapModal app={app} />
    </div>
  );
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><Dumbbell size={18} /></span><span><strong>LiftPath</strong><small>Guided progression coach</small></span></div>;
}
