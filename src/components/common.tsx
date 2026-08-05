import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import type { ThemePreference } from "../types.js";

export function Progress({ value, label = "Tiến độ hoàn thành" }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${percent}%` }} /></div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="metric-card card"><small>{label}</small><strong>{value}</strong><span>{note}</span></article>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Modal({ title, close, children, wide = false }: { title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [close]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button className="icon-button subtle" type="button" aria-label="Đóng" onClick={close}><X size={19} /></button></header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

export function ConfirmDialog({ title, text, confirmLabel, cancelLabel = "Quay lại", danger = false, confirm, close }: { title: string; text: string; confirmLabel: string; cancelLabel?: string; danger?: boolean; confirm: () => void; close: () => void }) {
  return <Modal title={title} close={close}><p className="dialog-copy">{text}</p><div className="dialog-actions"><button className="secondary-button" type="button" onClick={close}>{cancelLabel}</button><button className={danger ? "danger-button" : "primary-button"} type="button" onClick={() => { confirm(); close(); }}>{confirmLabel}</button></div></Modal>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state card"><strong>{title}</strong><p>{text}</p>{action}</div>;
}

export function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <button type="button" className={`toggle ${checked ? "active" : ""}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><i /></button>;
}

export function useTheme(preference: ThemePreference) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = preference === "system" ? (media.matches ? "dark" : "light") : preference;
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0b0e13" : "#f4f6f1");
    };
    apply();
    media.addEventListener?.("change", apply);
    return () => media.removeEventListener?.("change", apply);
  }, [preference]);
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
}

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date) : value;
}
