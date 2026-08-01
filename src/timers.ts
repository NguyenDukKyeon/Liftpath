import { useCallback, useEffect, useRef, useState } from "react";
import { nextScheduledWorkout } from "./data.js";
import type { Session, Settings, TrainingProgram } from "./types.js";

const BASE = import.meta.env.BASE_URL;

async function activeRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return null;
    return registration.active ? registration : await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

async function notify(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options: NotificationOptions = { body, tag, icon: `${BASE}icon-192.png`, data: { url: BASE } };
  try {
    const registration = await activeRegistration();
    if (registration) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    // Notification support varies by browser and platform.
  }
}

export function useRestTimer(settings: Settings, permissionRevision: number) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [now, setNow] = useState(Date.now());
  const audioRef = useRef<AudioContext | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) window.clearInterval(interval);
    };
    const interval = window.setInterval(tick, 200);
    tick();
    return () => window.clearInterval(interval);
  }, [endsAt]);

  const beep = useCallback(() => {
    try {
      const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      audioRef.current ??= new AudioCtor();
      const context = audioRef.current;
      void context.resume();
      [0, 0.22, 0.44].forEach((delay, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = index === 1 ? 1320 : 880;
        gain.gain.setValueAtTime(0.001, context.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.25, context.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delay + 0.3);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + delay);
        oscillator.stop(context.currentTime + delay + 0.32);
      });
    } catch {
      // Audio can be blocked until a user gesture.
    }
  }, []);

  useEffect(() => {
    if (!endsAt || fired.current || now < endsAt) return;
    fired.current = true;
    if (settings.sound) beep();
    if (settings.vibration && "vibrate" in navigator) navigator.vibrate([160, 80, 160]);
    if (settings.notify) void notify("LiftPath · Hết giờ nghỉ", "Bắt đầu hiệp tiếp theo.", "liftpath-rest");
  }, [beep, endsAt, now, settings.notify, settings.sound, settings.vibration]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    void activeRegistration().then((registration) => {
      if (cancelled || !registration?.active) return;
      const granted = settings.notify && "Notification" in window && Notification.permission === "granted";
      registration.active.postMessage(granted && endsAt ? { type: "schedule-rest", endsAt } : { type: "cancel-rest" });
    });
    return () => { cancelled = true; };
  }, [endsAt, permissionRevision, settings.notify]);

  const start = useCallback((seconds: number) => {
    const safe = Math.max(1, Math.round(seconds));
    setEndsAt(Date.now() + safe * 1000);
    setDuration(safe);
    setNow(Date.now());
    fired.current = false;
    try {
      const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) audioRef.current ??= new AudioCtor();
    } catch {
      // Optional enhancement only.
    }
  }, []);

  const cancel = useCallback(() => {
    setEndsAt(null);
    setDuration(0);
    fired.current = false;
    void activeRegistration().then((registration) => registration?.active?.postMessage({ type: "cancel-rest" }));
  }, []);

  const addSeconds = useCallback((delta: number) => {
    if (!endsAt || !Number.isFinite(delta)) return;
    const current = Date.now();
    const base = delta > 0 ? Math.max(endsAt, current) : endsAt;
    setEndsAt(Math.max(current, base + delta * 1000));
    setDuration((value) => Math.max(1, value + delta));
    setNow(current);
    fired.current = false;
  }, [endsAt]);

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  const progress = endsAt && duration ? Math.max(0, Math.min(1, 1 - Math.max(0, endsAt - Date.now()) / (duration * 1000))) : 0;
  return { active: endsAt !== null, remaining, progress, start, cancel, addSeconds };
}

export function useTrainingReminder(
  settings: Settings,
  history: Session[],
  customPrograms: TrainingProgram[],
  permissionRevision: number,
) {
  useEffect(() => {
    if (!settings.notify || !settings.scheduleReminders || !("Notification" in window) || Notification.permission !== "granted") return;
    let timeout: number | undefined;
    let cancelled = false;
    const arm = () => {
      const next = nextScheduledWorkout(settings, history, customPrograms);
      if (!next || cancelled) return;
      timeout = window.setTimeout(() => {
        if (cancelled) return;
        void notify(`Đến giờ tập · ${next.dayId}`, "Mở LiftPath để bắt đầu buổi tập.", "liftpath-training");
        arm();
      }, Math.max(0, Math.min(2_147_000_000, next.date.getTime() - Date.now())));
    };
    arm();
    return () => { cancelled = true; if (timeout) window.clearTimeout(timeout); };
  }, [customPrograms, history, permissionRevision, settings]);
}

export function useWakeLock(active: boolean) {
  const [supported] = useState(() => "wakeLock" in navigator);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!active || !supported) return;
    let disposed = false;
    let lock: { release: () => Promise<void>; addEventListener?: (type: string, handler: () => void) => void } | null = null;
    const request = async () => {
      if (disposed || lock) return;
      try {
        const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<typeof lock> } }).wakeLock;
        lock = await wakeLock?.request("screen") ?? null;
        if (disposed) await lock?.release();
        else {
          setLocked(Boolean(lock));
          lock?.addEventListener?.("release", () => { lock = null; setLocked(false); });
        }
      } catch {
        lock = null;
        setLocked(false);
      }
    };
    void request();
    const onVisibility = () => { if (document.visibilityState === "visible") void request(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lock?.release();
      lock = null;
    };
  }, [active, supported]);

  return { supported, locked };
}
