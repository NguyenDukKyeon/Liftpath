import {
  AlertTriangle,
  ArrowRight,
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

  return (
    <Modal title="Coach recap" close={app.dismissRecap} wide>
      <div className="guided-recap">
        <header className="guided-recap-hero">
          <span className="eyebrow">BUỔI TẬP ĐÃ LƯU</span>
          <h2>Ba điều cần biết trước buổi tiếp theo</h2>
          <p>LiftPath dùng đúng dữ liệu và readiness của buổi vừa hoàn thành. Kết luận này được lưu thành snapshot và không thay đổi theo lịch sử tương lai.</p>
        </header>

        <RecapSection
          icon={<CheckCircle2 size={20} />}
          title="Hôm nay bạn làm tốt điều gì?"
          items={recap.wentWell}
          tone="success"
          empty="Buổi tập đã được ghi lại đầy đủ để tiếp tục hiệu chỉnh."
        />
        <RecapSection
          icon={<AlertTriangle size={20} />}
          title="Có gì cần chú ý?"
          items={recap.attention}
          tone="warning"
          empty="Không có tín hiệu bất thường cần ưu tiên từ dữ liệu buổi này."
        />
        <RecapSection
          icon={<ArrowRight size={20} />}
          title="Lần sau sẽ thay đổi gì?"
          items={recap.nextTime}
          tone="coach"
          empty="Giữ kế hoạch hiện tại và thu thập thêm dữ liệu."
        />

        {recap.prs.length > 0 && (
          <section className="recap-prs">
            <div className="recap-section-heading"><Trophy size={19} /><h3>Thành tích cá nhân</h3></div>
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

        <details className="recap-details">
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
    <section className={`guided-recap-section tone-${tone}`}>
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
