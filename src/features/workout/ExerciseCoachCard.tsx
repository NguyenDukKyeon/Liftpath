import { ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import type { ExerciseEntry } from "../../types.js";
import type { CoachDecision } from "../coach/contracts.js";
import type { ProgressionResult } from "../coach/progression.js";

const confidenceLabel = {
  high: "Đề xuất chắc chắn",
  medium: "Đề xuất",
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

export function ExerciseCoachCard({
  entry,
  decision,
}: {
  entry: ExerciseEntry;
  decision: CoachDecision<ProgressionResult>;
}) {
  const Icon = decision.value.action === "manual-review"
    ? TriangleAlert
    : decision.confidence === "high"
      ? ShieldCheck
      : Sparkles;
  return (
    <section className={`exercise-coach-card confidence-${decision.confidence}`} aria-label="Hướng dẫn của LiftPath">
      <div className="coach-card-icon"><Icon size={19} /></div>
      <div>
        <span>{confidenceLabel[decision.confidence]}</span>
        <strong>{actionLabel(decision)}</strong>
        <p>{decision.explanation}</p>
        <small>{entry.target.min}–{entry.target.max} {entry.snapshot.suffix} · nghỉ {entry.target.rest} giây</small>
      </div>
    </section>
  );
}
