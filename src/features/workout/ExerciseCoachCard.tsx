import { useState } from "react";
import { ChevronDown, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import type { ExerciseEntry } from "../../types.js";
import type { CoachDecision } from "../coach/contracts.js";
import type { ProgressionResult } from "../coach/progression.js";

const confidenceLabel = {
  high: "Đề xuất chắc chắn",
  medium: "Coach gợi ý",
  low: "Cần thêm dữ liệu",
} as const;

const actionLabel = (decision: CoachDecision<ProgressionResult>) => {
  const value = decision.value;
  if (value.action === "increase-load" && value.targetLoadKg != null) return `Tăng lên ${value.targetLoadKg} kg`;
  if (value.action === "reduce-load" && value.targetLoadKg != null) return `Giảm về ${value.targetLoadKg} kg`;
  if (value.action === "increase-reps" && value.targetReps != null) return `Mục tiêu ${value.targetReps} reps`;
  if (value.action === "increase-duration" && value.targetSeconds != null) return `Mục tiêu ${value.targetSeconds} giây`;
  if (value.action === "manual-review") return "Tự đánh giá trước khi tiếp tục";
  if (value.targetLoadKg != null) return `Giữ khoảng ${value.targetLoadKg} kg`;
  return "Giữ mục tiêu hiện tại";
};

export function ExerciseCoachCard({ entry, decision }: {
  entry: ExerciseEntry;
  decision: CoachDecision<ProgressionResult>;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = decision.value.action === "manual-review"
    ? TriangleAlert
    : decision.confidence === "high"
      ? ShieldCheck
      : Sparkles;

  return (
    <section className={`exercise-coach-card focused-coach-summary confidence-${decision.confidence}`} aria-label="Hướng dẫn của LiftPath">
      <div className="coach-card-icon"><Icon size={17} /></div>
      <div className="coach-card-main">
        <span>{confidenceLabel[decision.confidence]}</span>
        <strong>{actionLabel(decision)}</strong>
        <small>{entry.target.min}–{entry.target.max} {entry.snapshot.suffix} · nghỉ {entry.target.rest} giây</small>
        <p className="coach-card-reason" hidden={!expanded}>{decision.explanation}</p>
      </div>
      <button type="button" className="coach-reason-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        {expanded ? "Ẩn lý do" : "Xem lý do"}
        <ChevronDown size={15} className={expanded ? "rotated" : ""} />
      </button>
    </section>
  );
}
