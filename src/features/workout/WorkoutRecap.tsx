import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Dumbbell,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Modal, formatNumber } from "../../components/common.js";
import type { useGuidedAppState } from "../../guided-state.js";
import { isWorkoutCoachRecap } from "../coach/recap.js";

export function WorkoutRecapModal({ app }: { app: ReturnType<typeof useGuidedAppState> }) {
  const recap = app.state.lastRecap;
  if (!recap) return null;

  if (!isWorkoutCoachRecap(recap)) {
    return (
      <Modal title="Buổi tập đã được lưu" close={app.dismissRecap}>
        <div className="legacy-recap">
          <div className="recap-metric-grid">
            <span><Clock3 size={17} /><strong>{recap.durationMinutes} phút</strong></span>
            <span><Dumbbell size={17} /><strong>{recap.totalSets} hiệp</strong></span>
            <span><Sparkles size={17} /><strong>{formatNumber(recap.volume)} kg</strong></span>
          </div>
          <p>{recap.nextAction}</p>
          <button className="primary-button full" type="button" onClick={app.dismissRecap}>Hoàn tất</button>
        </div>
      </Modal>
    );
  }

  const primaryNextAction = recap.nextTime[0] ?? null;
  const remainingNextActions = primaryNextAction ? recap.nextTime.slice(1) : recap.nextTime;

  return (
    <Modal title="Buổi tập hoàn tất" close={app.dismissRecap} wide>
      <div className="guided-recap focused-recap" data-ui="focused-coach">
        <header className="guided-recap-hero focused-recap-hero">
          <span className="recap-success-mark"><Check size={26} /></span>
          <span className="eyebrow">BUỔI TẬP ĐÃ LƯU</span>
          <h2>Hoàn tất. Dữ liệu hôm nay đã sẵn sàng cho buổi tiếp theo.</h2>
          <p>Coach recap dùng đúng snapshot readiness và các set vừa ghi; kết luận không thay đổi theo dữ liệu tương lai.</p>
        </header>

        {primaryNextAction && (
          <section className="recap-next-priority">
            <div className="recap-section-heading"><ArrowRight size={19} /><h3>Ưu tiên buổi tiếp theo</h3></div>
            <h2>{primaryNextAction.headline}</h2>
            <p>{primaryNextAction.explanation}</p>
          </section>
        )}

        <div className="recap-coaching-list">
          <RecapSection
            icon={<CheckCircle2 size={19} />}
            title="Hôm nay bạn làm tốt điều gì?"
            items={recap.wentWell}
            tone="success"
            empty="Buổi tập đã được ghi lại đầy đủ để tiếp tục hiệu chỉnh."
          />
          <RecapSection
            icon={<AlertTriangle size={19} />}
            title="Có gì cần chú ý?"
            items={recap.attention}
            tone="warning"
            empty="Không có tín hiệu bất thường cần ưu tiên từ dữ liệu buổi này."
          />
          <RecapSection
            icon={<ArrowRight size={19} />}
            title="Lần sau sẽ thay đổi gì?"
            items={remainingNextActions}
            tone="coach"
            empty={primaryNextAction ? "Ưu tiên chính đã được nêu ở trên." : "Giữ kế hoạch hiện tại và thu thập thêm dữ liệu."}
          />
        </div>

        {recap.prs.length > 0 && (
          <section className="recap-prs focused-recap-prs">
            <div className="recap-section-heading"><Trophy size={19} /><h3>Thành tích cá nhân mới</h3></div>
            <div className="recap-pr-list">
              {recap.prs.map((record, index) => (
                <div key={`${record.exerciseId}-${record.type}-${index}`}>
                  <span>{record.exerciseName}</span>
                  <strong>{formatNumber(record.value)} {record.unit}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        <details className="recap-details focused-recap-details">
          <summary>Chi tiết buổi tập <ChevronDown size={17} /></summary>
          <div className="recap-metric-grid">
            <span><Clock3 size={17} /><small>Thời lượng</small><strong>{recap.durationMinutes} phút</strong></span>
            <span><Dumbbell size={17} /><small>Set đã lưu</small><strong>{recap.totalSets}</strong></span>
            <span><Sparkles size={17} /><small>Volume tham khảo</small><strong>{formatNumber(recap.volume)} kg</strong></span>
          </div>
        </details>

        <button className="primary-button full" type="button" onClick={app.dismissRecap}>Hoàn tất</button>
      </div>
    </Modal>
  );
}

function RecapSection({
  icon,
  title,
  items,
  tone,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  items: Array<{ reasonCode: string; headline: string; explanation: string; exerciseId?: string }>;
  tone: "success" | "warning" | "coach";
  empty: string;
}) {
  return (
    <section className={`guided-recap-section focused-recap-section tone-${tone}`}>
      <div className="recap-section-heading">{icon}<h3>{title}</h3></div>
      {items.length ? (
        <div className="guided-recap-list">
          {items.map((item, index) => (
            <article key={`${item.reasonCode}-${item.exerciseId ?? "general"}-${index}`}>
              <strong>{item.headline}</strong>
              <p>{item.explanation}</p>
            </article>
          ))}
        </div>
      ) : <p className="recap-empty">{empty}</p>}
    </section>
  );
}
