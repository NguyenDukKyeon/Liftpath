import { useMemo, useReducer, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Dumbbell,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { BUILT_IN_EXERCISES, TRAINING_DAYS } from "../../data.js";
import { buildPlanRecommendation } from "../coach/plan-builder.js";
import type { PlanBuilderInput, PlanRecommendation } from "../coach/contracts.js";
import type {
  AvailableTrainingDays,
  EquipmentId,
  ExperienceLevel,
  MovementFamiliarity,
  MovementPattern,
  RestrictionBodyArea,
  TrainingGoal,
  UserProfile,
} from "../../types.js";
import {
  createOnboardingState,
  onboardingReducer,
  type OnboardingStep,
} from "./onboarding-state.js";
import "./onboarding.css";

const equipmentOptions: Array<{ id: EquipmentId; label: string }> = [
  { id: "bodyweight", label: "Trọng lượng cơ thể" },
  { id: "dumbbell", label: "Tạ đơn" },
  { id: "barbell", label: "Thanh đòn" },
  { id: "rack", label: "Rack" },
  { id: "bench", label: "Ghế tập" },
  { id: "machine", label: "Máy tập" },
  { id: "cable", label: "Máy cáp" },
];

const stepMeta: Array<{ id: OnboardingStep; label: string }> = [
  { id: "goal", label: "Mục tiêu" },
  { id: "schedule", label: "Lịch & thiết bị" },
  { id: "experience", label: "Hiệu chỉnh" },
  { id: "preview", label: "Lộ trình" },
];

const restrictionAreas: Array<{ id: RestrictionBodyArea; label: string; patterns: MovementPattern[] }> = [
  { id: "shoulder", label: "Vai", patterns: ["horizontal-push", "vertical-push"] },
  { id: "back", label: "Lưng", patterns: ["hinge", "squat"] },
  { id: "hip", label: "Hông", patterns: ["hinge", "squat", "lunge"] },
  { id: "knee", label: "Gối", patterns: ["squat", "lunge"] },
  { id: "elbow", label: "Khuỷu tay", patterns: ["horizontal-push", "vertical-push", "horizontal-pull", "vertical-pull"] },
  { id: "wrist", label: "Cổ tay", patterns: ["horizontal-push", "vertical-push"] },
];

const toPlanInput = (profile: UserProfile): PlanBuilderInput => ({
  goal: profile.goal,
  experience: profile.experience,
  availableDays: profile.availableDays,
  sessionMinutes: profile.sessionMinutes,
  equipment: profile.equipment,
  preferredDays: profile.preferredDays ?? [],
  priorityMuscles: profile.priorityMuscles,
  restrictions: profile.restrictions ?? [],
  effortLanguage: profile.effortLanguage ?? "simple-rir",
  movementFamiliarity: profile.movementFamiliarity ?? "new",
  consistencyWeeks: profile.consistencyWeeks ?? 0,
  recentLoads: profile.recentLoads ?? {},
});

export function OnboardingFlow({
  initial,
  onComplete,
}: {
  initial: UserProfile;
  onComplete: (profile: UserProfile, recommendation: PlanRecommendation) => void;
}) {
  const [state, dispatch] = useReducer(onboardingReducer, initial, createOnboardingState);
  const [restrictionEnabled, setRestrictionEnabled] = useState((state.profile.restrictions?.length ?? 0) > 0);
  const recommendation = useMemo(
    () => buildPlanRecommendation(toPlanInput(state.profile)),
    [state.profile],
  );
  const currentIndex = stepMeta.findIndex((item) => item.id === state.step);

  const patch = (profilePatch: Partial<UserProfile>) => dispatch({ type: "patch-profile", patch: profilePatch });
  const toggleEquipment = (id: EquipmentId) => patch({
    equipment: state.profile.equipment.includes(id)
      ? state.profile.equipment.filter((item) => item !== id)
      : [...state.profile.equipment, id],
  });
  const toggleDay = (value: number) => {
    const preferred = state.profile.preferredDays ?? [];
    if (preferred.includes(value)) {
      patch({ preferredDays: preferred.filter((day) => day !== value) });
      return;
    }
    if (preferred.length < state.profile.availableDays) patch({ preferredDays: [...preferred, value] });
  };
  const toggleRestriction = (bodyArea: RestrictionBodyArea, patterns: MovementPattern[]) => {
    const restrictions = state.profile.restrictions ?? [];
    const existing = restrictions.find((item) => item.bodyArea === bodyArea);
    patch({
      restrictions: existing
        ? restrictions.filter((item) => item.id !== existing.id)
        : [...restrictions, { id: `restriction-${bodyArea}`, bodyArea, affectedPatterns: patterns, note: "Hạn chế do người dùng khai báo" }],
    });
  };

  return (
    <main className="guided-onboarding-shell focused-coach-surface" data-ui="focused-coach">
      <section className="guided-onboarding-card">
        <header className="guided-onboarding-header">
          <span className="brand-mark"><Dumbbell size={21} /></span>
          <div>
            <span className="eyebrow">LIFTPATH · FOCUSED COACH</span>
            <h1>Thiết lập kế hoạch tập thông minh</h1>
            <p>Chọn mục tiêu, lịch và thiết bị. LiftPath sẽ tạo một điểm khởi đầu an toàn, rõ lý do và có thể điều chỉnh.</p>
          </div>
        </header>

        <ol className="guided-progress" aria-label="Tiến trình thiết lập">
          {stepMeta.map((item, index) => (
            <li key={item.id} className={index <= currentIndex ? "active" : ""} aria-current={item.id === state.step ? "step" : undefined}>
              <span>{index + 1}</span><small>{item.label}</small>
            </li>
          ))}
        </ol>

        <div className="guided-step" key={state.step}>
          {state.step === "goal" && (
            <StepSection eyebrow="BƯỚC 1 / 4" title="Bạn muốn ưu tiên điều gì?" description="Chọn một mục tiêu chính. LiftPath vẫn giữ sức khỏe và khả năng duy trì làm giới hạn.">
              <div className="guided-choice-grid three goal-list">
                {([
                  ["hypertrophy", "Tăng cơ", "Tích lũy khối lượng với rep range kiểm soát."],
                  ["strength", "Tăng sức mạnh", "Ưu tiên bài chính, nghỉ lâu và tăng tải nhỏ."],
                  ["general", "Thể lực chung", "Cân bằng sức mạnh, cơ bắp và khả năng duy trì."],
                ] as Array<[Exclude<TrainingGoal, "fat-loss">, string, string]>).map(([value, label, copy]) => (
                  <ChoiceButton key={value} active={state.profile.goal === value} onClick={() => patch({ goal: value })} title={label} copy={copy} />
                ))}
              </div>
              <div className="guided-context-note">
                <ShieldCheck size={18} />
                <p>Giảm mỡ chủ yếu phụ thuộc cân bằng năng lượng. Giáo án vẫn ưu tiên giữ cơ, kỹ thuật và khả năng hồi phục.</p>
              </div>
            </StepSection>
          )}

          {state.step === "schedule" && (
            <StepSection eyebrow="BƯỚC 2 / 4" title="Lịch nào bạn thực sự duy trì được?" description="Không chọn lịch lý tưởng. Chọn số buổi và thiết bị bạn có trong phần lớn tuần.">
              <FieldGroup icon={<CalendarDays size={18} />} title="Số buổi mỗi tuần">
                <div className="guided-choice-grid five compact">
                  {([2, 3, 4, 5, 6] as AvailableTrainingDays[]).map((value) => (
                    <button key={value} type="button" className={state.profile.availableDays === value ? "selected" : ""} onClick={() => patch({ availableDays: value })}>
                      <strong>{value}</strong><small>buổi</small>
                    </button>
                  ))}
                </div>
              </FieldGroup>
              <FieldGroup icon={<Clock3 size={18} />} title="Thời lượng mỗi buổi">
                <div className="guided-choice-grid four compact">
                  {([40, 60, 75, 90] as const).map((value) => (
                    <button key={value} type="button" className={state.profile.sessionMinutes === value ? "selected" : ""} onClick={() => patch({ sessionMinutes: value })}>{value} phút</button>
                  ))}
                </div>
              </FieldGroup>
              <FieldGroup icon={<Dumbbell size={18} />} title="Thiết bị hiện có">
                <div className="guided-chip-grid">
                  {equipmentOptions.map((item) => (
                    <button key={item.id} type="button" className={state.profile.equipment.includes(item.id) ? "selected" : ""} onClick={() => toggleEquipment(item.id)}>
                      {state.profile.equipment.includes(item.id) && <Check size={14} />}{item.label}
                    </button>
                  ))}
                </div>
              </FieldGroup>
              <FieldGroup icon={<CalendarDays size={18} />} title={`Chọn ${state.profile.availableDays} ngày ưu tiên`}>
                <div className="guided-day-grid">
                  {TRAINING_DAYS.map((day) => (
                    <button key={day.value} type="button" className={(state.profile.preferredDays ?? []).includes(day.value) ? "selected" : ""} onClick={() => toggleDay(day.value)}>
                      <strong>{day.short}</strong><small>{day.label}</small>
                    </button>
                  ))}
                </div>
              </FieldGroup>
              {state.validationMessage && <p className="guided-validation" role="alert">{state.validationMessage}</p>}
            </StepSection>
          )}

          {state.step === "experience" && (
            <StepSection eyebrow="BƯỚC 3 / 4" title="Hiệu chỉnh mức hướng dẫn" description="Ba lựa chọn chính giúp coach dùng đúng độ chi tiết. Các dữ liệu còn lại hoàn toàn tùy chọn.">
              <FieldGroup title="Kinh nghiệm tập">
                <div className="guided-choice-grid three">
                  {([
                    ["beginner", "Mới tập", "Cần hướng dẫn kỹ thuật và mức tăng nhỏ."],
                    ["intermediate", "Đã có nền", "Đã duy trì và hiểu phần lớn bài cơ bản."],
                    ["advanced", "Nhiều kinh nghiệm", "Có khả năng tự đánh giá tải và hồi phục."],
                  ] as Array<[ExperienceLevel, string, string]>).map(([value, label, copy]) => (
                    <ChoiceButton key={value} active={state.profile.experience === value} onClick={() => patch({ experience: value })} title={label} copy={copy} />
                  ))}
                </div>
              </FieldGroup>
              <div className="guided-two-column">
                <FieldGroup title="Mức quen với bài cơ bản">
                  <select value={state.profile.movementFamiliarity ?? "new"} onChange={(event) => patch({ movementFamiliarity: event.target.value as MovementFamiliarity })}>
                    <option value="new">Phần lớn còn mới</option>
                    <option value="some">Đã tập một số bài</option>
                    <option value="comfortable">Tự tin với bài cơ bản</option>
                  </select>
                </FieldGroup>
                <FieldGroup title="Số tuần duy trì gần đây">
                  <input type="number" min={0} max={520} value={state.profile.consistencyWeeks ?? 0} onChange={(event) => patch({ consistencyWeeks: Math.max(0, Number(event.target.value) || 0) })} />
                </FieldGroup>
              </div>
              <FieldGroup title="Cách mô tả gắng sức">
                <div className="guided-choice-grid two compact">
                  <button type="button" className={(state.profile.effortLanguage ?? "simple-rir") === "simple-rir" ? "selected" : ""} onClick={() => patch({ effortLanguage: "simple-rir" })}>Còn bao nhiêu reps</button>
                  <button type="button" className={state.profile.effortLanguage === "rpe" ? "selected" : ""} onClick={() => patch({ effortLanguage: "rpe" })}>RPE 1–10</button>
                </div>
              </FieldGroup>

              <details className="guided-advanced">
                <summary><span><SlidersHorizontal size={18} /><strong>Tùy chỉnh nâng cao</strong><small>Hạn chế chuyển động, ghi chú và mức tạ gần đây</small></span><ChevronDown size={18} /></summary>
                <div className="guided-advanced-content">
                  <FieldGroup title="Hạn chế chuyển động">
                    <label className="guided-toggle-row">
                      <input type="checkbox" checked={restrictionEnabled} onChange={(event) => {
                        setRestrictionEnabled(event.target.checked);
                        if (!event.target.checked) patch({ restrictions: [] });
                      }} />
                      <span>Tôi có vùng cần tránh hoặc cần thận trọng</span>
                    </label>
                    {restrictionEnabled && (
                      <div className="guided-chip-grid restriction-grid">
                        {restrictionAreas.map((item) => (
                          <button key={item.id} type="button" className={(state.profile.restrictions ?? []).some((restriction) => restriction.bodyArea === item.id) ? "selected" : ""} onClick={() => toggleRestriction(item.id, item.patterns)}>{item.label}</button>
                        ))}
                      </div>
                    )}
                    <textarea maxLength={500} value={state.profile.profileNotes ?? ""} placeholder="Ghi chú tùy chọn. Đây không phải nơi chẩn đoán chấn thương." onChange={(event) => patch({ profileNotes: event.target.value })} />
                  </FieldGroup>
                  <FieldGroup title="Mức tạ gần đây — tùy chọn">
                    <div className="guided-two-column">
                      {(["db_bench", "back_squat"] as const).map((exerciseId) => (
                        <label key={exerciseId} className="guided-load-field">
                          <span>{BUILT_IN_EXERCISES[exerciseId].name}</span>
                          <input type="number" min={0} step="0.5" placeholder="kg" value={state.profile.recentLoads?.[exerciseId] ?? ""} onChange={(event) => patch({ recentLoads: { ...(state.profile.recentLoads ?? {}), [exerciseId]: event.target.value === "" ? undefined : Number(event.target.value) } })} />
                        </label>
                      ))}
                    </div>
                  </FieldGroup>
                </div>
              </details>
            </StepSection>
          )}

          {state.step === "preview" && (
            <StepSection eyebrow="BƯỚC 4 / 4" title="Lộ trình được đề xuất" description="Đây là phương án chính xác sẽ được lưu khi bạn xác nhận.">
              <article className="guided-plan-preview">
                <div className="guided-plan-hero">
                  <div className="guided-plan-heading">
                    <span className="guided-plan-icon"><Sparkles size={22} /></span>
                    <div><small>PHƯƠNG ÁN ĐƯỢC CHỌN</small><h2>{recommendation.value.program.name}</h2><p>{recommendation.explanation}</p></div>
                    <strong>{recommendation.value.estimatedDurationMinutes} phút</strong>
                  </div>
                  <div className="guided-athlete-media" aria-hidden="true">
                    <img src="/images/liftpath-athlete-preview.png" alt="" data-testid="athlete-plan-preview" />
                  </div>
                </div>
                <div className="guided-plan-metrics">
                  <span><strong>{recommendation.value.program.daysPerWeek}</strong><small>buổi/tuần</small></span>
                  <span><strong>{recommendation.value.stimulusLabel}</strong><small>mức kích thích</small></span>
                  <span><strong>{recommendation.value.substitutions.length}</strong><small>bài được thay</small></span>
                </div>
                <div className="guided-reason-list">
                  {recommendation.value.decisions.slice(0, 6).map((item, index) => (
                    <div key={`${item.reasonCode}-${index}`}><Check size={16} /><p>{item.explanation}</p></div>
                  ))}
                </div>
                {recommendation.value.substitutions.length > 0 && (
                  <div className="guided-substitutions">
                    <h3>Thay bài theo thiết bị hoặc hạn chế</h3>
                    {recommendation.value.substitutions.map((item) => (
                      <p key={item.prescriptionId}><strong>{BUILT_IN_EXERCISES[item.fromExerciseId]?.name}</strong> → {BUILT_IN_EXERCISES[item.toExerciseId]?.name}</p>
                    ))}
                  </div>
                )}
                {recommendation.value.warnings.length > 0 && (
                  <div className="guided-warning"><ShieldCheck size={18} /><p>{recommendation.value.warnings[0]}</p></div>
                )}
              </article>
            </StepSection>
          )}
        </div>

        <footer className="guided-actions">
          <button className="secondary-button" type="button" disabled={state.step === "goal"} onClick={() => dispatch({ type: "back" })}><ArrowLeft size={17} /> Quay lại</button>
          {state.step !== "preview" ? (
            <button className="primary-button" type="button" onClick={() => dispatch({ type: "next" })}>Tiếp tục <ArrowRight size={17} /></button>
          ) : (
            <button className="primary-button" type="button" disabled={recommendation.value.invalidPrescriptionIds.length > 0} onClick={() => onComplete({ ...state.profile, onboardingComplete: true }, recommendation.value)}>Dùng lộ trình này <ArrowRight size={17} /></button>
          )}
        </footer>
      </section>
    </main>
  );
}

function StepSection({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section><span className="eyebrow">{eyebrow}</span><h2 className="guided-step-title">{title}</h2><p className="guided-step-description">{description}</p><div className="guided-fields">{children}</div></section>;
}

function FieldGroup({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="guided-field-group"><header>{icon}<h3>{title}</h3></header>{children}</section>;
}

function ChoiceButton({ active, onClick, title, copy }: { active: boolean; onClick: () => void; title: string; copy: string }) {
  return <button type="button" className={`guided-choice-card ${active ? "selected" : ""}`} onClick={onClick}>{active && <Check size={16} />}<strong>{title}</strong><small>{copy}</small></button>;
}
