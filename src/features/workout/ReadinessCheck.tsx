import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock3,
  HeartPulse,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { BUILT_IN_EXERCISES } from "../../data.js";
import type {
  CoachDecision,
  PainConcern,
  ReadinessAdjustment,
  ReadinessInput,
} from "../coach/contracts.js";
import { adjustWorkoutForReadiness } from "../coach/readiness.js";
import type { MovementPattern, RestrictionBodyArea } from "../../types.js";
import type { PreparedWorkout } from "./preparation.js";
import "./readiness.css";

const areaOptions: Array<{ id: RestrictionBodyArea; label: string; patterns: MovementPattern[] }> = [
  { id: "shoulder", label: "Vai", patterns: ["horizontal-push", "vertical-push"] },
  { id: "back", label: "Lưng", patterns: ["hinge", "squat"] },
  { id: "hip", label: "Hông", patterns: ["hinge", "squat", "lunge"] },
  { id: "knee", label: "Gối", patterns: ["squat", "lunge"] },
  { id: "elbow", label: "Khuỷu tay", patterns: ["horizontal-push", "vertical-push", "horizontal-pull", "vertical-pull"] },
  { id: "wrist", label: "Cổ tay", patterns: ["horizontal-push", "vertical-push"] },
  { id: "ankle", label: "Cổ chân", patterns: ["squat", "lunge"] },
  { id: "other", label: "Vùng khác", patterns: [] },
];

export function ReadinessCheck({
  prepared,
  confirm,
  cancel,
}: {
  prepared: PreparedWorkout;
  confirm: (input: ReadinessInput) => CoachDecision<ReadinessAdjustment> | null;
  cancel: () => void;
}) {
  const [energy, setEnergy] = useState<ReadinessInput["energy"]>("normal");
  const [soreness, setSoreness] = useState<ReadinessInput["soreness"]>("manageable");
  const [painMode, setPainMode] = useState<"none" | "pain">("none");
  const [bodyArea, setBodyArea] = useState<RestrictionBodyArea>("knee");
  const [severity, setSeverity] = useState<NonNullable<PainConcern>["severity"]>("sharp");
  const [availableMinutes, setAvailableMinutes] = useState(60);

  const pain = useMemo<ReadinessInput["pain"]>(() => {
    if (painMode === "none") return null;
    const area = areaOptions.find((item) => item.id === bodyArea) ?? areaOptions[0];
    return { bodyArea, severity, affectedPatterns: area.patterns };
  }, [bodyArea, painMode, severity]);

  const input = useMemo<ReadinessInput>(() => ({
    energy,
    soreness,
    pain,
    availableMinutes,
  }), [availableMinutes, energy, pain, soreness]);
  const preview = useMemo(
    () => adjustWorkoutForReadiness(prepared.prescriptions, input),
    [input, prepared.prescriptions],
  );

  return (
    <main className="readiness-shell">
      <section className="readiness-card">
        <header className="readiness-header">
          <button type="button" className="icon-button" aria-label="Hủy chuẩn bị buổi tập" onClick={cancel}><ArrowLeft size={20} /></button>
          <div><span className="eyebrow">PRE-WORKOUT CHECK</span><h1>Hôm nay cơ thể thế nào?</h1><p>{prepared.workout.name} · trả lời nhanh để xem buổi tập có cần điều chỉnh.</p></div>
        </header>

        <div className="readiness-content">
          <ReadinessSection number="1" title="Năng lượng hiện tại">
            <div className="readiness-choice-grid three">
              {([[
                "low", "Thấp", "Khó tập trung hoặc thiếu sức"
              ], ["normal", "Bình thường", "Sẵn sàng tập như kế hoạch"], ["high", "Tốt", "Tỉnh táo và hồi phục ổn"]] as Array<[ReadinessInput["energy"], string, string]>).map(([value, label, copy]) => (
                <Choice key={value} selected={energy === value} label={label} copy={copy} onClick={() => setEnergy(value)} />
              ))}
            </div>
          </ReadinessSection>

          <ReadinessSection number="2" title="Đau mỏi cơ">
            <div className="readiness-choice-grid three">
              {([[
                "none", "Không đáng kể", "Cơ thể khá tươi"
              ], ["manageable", "Có nhưng kiểm soát", "Vẫn vận động bình thường"], ["high", "Đau mỏi nhiều", "Có thể cần giảm khối lượng"]] as Array<[ReadinessInput["soreness"], string, string]>).map(([value, label, copy]) => (
                <Choice key={value} selected={soreness === value} label={label} copy={copy} onClick={() => setSoreness(value)} />
              ))}
            </div>
          </ReadinessSection>

          <ReadinessSection number="3" title="Có đau bất thường không?">
            <div className="readiness-choice-grid two">
              <Choice selected={painMode === "none"} label="Không đau bất thường" copy="Tiếp tục dựa trên năng lượng và đau mỏi" onClick={() => setPainMode("none")} />
              <Choice selected={painMode === "pain"} label="Có vùng đau cần tránh" copy="LiftPath sẽ chặn mẫu vận động liên quan" onClick={() => setPainMode("pain")} />
            </div>
            {painMode === "pain" && (
              <div className="readiness-pain-fields">
                <label><span>Vùng đau</span><select value={bodyArea} onChange={(event) => setBodyArea(event.target.value as RestrictionBodyArea)}>{areaOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                <label><span>Mức cảnh báo</span><select value={severity} onChange={(event) => setSeverity(event.target.value as PainConcern["severity"])}><option value="mild">Nhẹ, cần thận trọng</option><option value="sharp">Đau nhói</option><option value="unusual">Bất thường</option><option value="worsening">Đang tăng</option><option value="joint-specific">Tập trung tại khớp</option></select></label>
              </div>
            )}
          </ReadinessSection>

          <ReadinessSection number="4" title="Bạn có bao nhiêu phút?">
            <div className="readiness-time-row"><Clock3 size={19} /><input type="range" min={25} max={90} step={5} value={availableMinutes} onChange={(event) => setAvailableMinutes(Number(event.target.value))} /><strong>{availableMinutes} phút</strong></div>
          </ReadinessSection>

          <section className={`readiness-preview ${preview.value.allowStart ? "" : "blocked"}`}>
            <header>{preview.value.allowStart ? <Sparkles size={20} /> : <ShieldAlert size={20} />}<div><span className="eyebrow">ĐIỀU CHỈNH HÔM NAY</span><h2>{preview.value.allowStart ? "Buổi tập sau điều chỉnh" : "Không nên bắt đầu buổi này"}</h2><p>{preview.explanation}</p></div></header>
            <div className="readiness-summary-grid">
              <span><strong>{preview.value.prescriptions.length}</strong><small>bài giữ lại</small></span>
              <span><strong>{preview.value.removedPrescriptionIds.length}</strong><small>bài phụ bỏ</small></span>
              <span><strong>{preview.value.changedSetCounts.length}</strong><small>bài giảm set</small></span>
            </div>
            {preview.value.decisions && preview.value.decisions.length > 0 ? (
              <div className="readiness-decision-list">
                {preview.value.decisions.map((decision, index) => (
                  <div key={`${decision.reasonCode}-${index}`}>{decision.reasonCode === "pain-blocks-movement" ? <AlertTriangle size={16} /> : <Check size={16} />}<p>{decision.explanation}{decision.value.type === "blocked" && ` (${BUILT_IN_EXERCISES[prepared.prescriptions.find((item) => item.id === decision.value.prescriptionId)?.exerciseId ?? ""]?.name ?? "chuyển động liên quan"})`}</p></div>
                ))}
              </div>
            ) : <p className="readiness-no-change">Không có thay đổi cần thiết so với kế hoạch cơ sở.</p>}
            {!preview.value.allowStart && <div className="readiness-stop-copy"><HeartPulse size={19} /><p>Dừng chuyển động gây đau. LiftPath không chẩn đoán chấn thương; hãy cân nhắc trao đổi với chuyên gia y tế hoặc chuyên gia vận động có chuyên môn.</p></div>}
          </section>
        </div>

        <footer className="readiness-actions">
          <button type="button" className="secondary-button" onClick={cancel}>Hủy</button>
          <button type="button" className="primary-button" disabled={!preview.value.allowStart} onClick={() => confirm(input)}>{preview.value.allowStart ? "Xác nhận và bắt đầu" : "Buổi tập đang bị chặn"}</button>
        </footer>
      </section>
    </main>
  );
}

function ReadinessSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="readiness-section"><header><span>{number}</span><h2>{title}</h2></header>{children}</section>;
}

function Choice({ selected, label, copy, onClick }: { selected: boolean; label: string; copy: string; onClick: () => void }) {
  return <button type="button" className={selected ? "selected" : ""} onClick={onClick}>{selected && <Check size={16} />}<strong>{label}</strong><small>{copy}</small></button>;
}
