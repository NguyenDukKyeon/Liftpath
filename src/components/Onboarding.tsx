import { useMemo, useState } from "react";
import { ArrowRight, Check, Dumbbell, ShieldCheck, Sparkles } from "lucide-react";
import { BUILT_IN_PROGRAMS, recommendProgramForProfile } from "../data.js";
import type { EquipmentId, MuscleGroup, UserProfile } from "../types.js";

const equipmentOptions: Array<{ id: EquipmentId; label: string }> = [
  { id: "bodyweight", label: "Trọng lượng cơ thể" },
  { id: "dumbbell", label: "Tạ đơn" },
  { id: "barbell", label: "Thanh đòn" },
  { id: "rack", label: "Rack" },
  { id: "bench", label: "Ghế tập" },
  { id: "machine", label: "Máy tập" },
  { id: "cable", label: "Máy cáp" },
];
const muscles: MuscleGroup[] = ["Ngực", "Lưng", "Vai", "Tay trước", "Tay sau", "Đùi trước", "Đùi sau", "Mông", "Bắp chân", "Core"];

export function Onboarding({ initial, complete }: { initial: UserProfile; complete: (profile: UserProfile) => void }) {
  const [profile, setProfile] = useState<UserProfile>(initial);
  const recommended = useMemo(() => BUILT_IN_PROGRAMS[recommendProgramForProfile(profile)], [profile]);
  const toggleEquipment = (id: EquipmentId) => setProfile((current) => ({
    ...current,
    equipment: current.equipment.includes(id) ? current.equipment.filter((item) => item !== id) : [...current.equipment, id],
  }));
  const toggleMuscle = (muscle: MuscleGroup) => setProfile((current) => ({
    ...current,
    priorityMuscles: current.priorityMuscles.includes(muscle)
      ? current.priorityMuscles.filter((item) => item !== muscle)
      : [...current.priorityMuscles, muscle].slice(0, 3),
  }));

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card card">
        <header className="onboarding-hero">
          <span className="brand-mark"><Dumbbell size={22} /></span>
          <div><span className="eyebrow">LIFTPATH 3.0</span><h1>Tạo lộ trình phù hợp với bạn</h1><p>LiftPath dùng lịch, thiết bị và kinh nghiệm để chọn điểm khởi đầu. Bạn vẫn có thể chỉnh mọi thứ sau.</p></div>
        </header>

        <div className="onboarding-grid">
          <section className="onboarding-section">
            <h2>1. Mục tiêu chính</h2>
            <div className="choice-grid two">
              {([
                ["hypertrophy", "Tăng cơ"],
                ["strength", "Tăng sức mạnh"],
                ["general", "Thể lực chung"],
                ["fat-loss", "Giảm mỡ, giữ cơ"],
              ] as const).map(([value, label]) => <button key={value} type="button" className={profile.goal === value ? "active" : ""} onClick={() => setProfile({ ...profile, goal: value })}>{profile.goal === value && <Check size={16} />}{label}</button>)}
            </div>
          </section>

          <section className="onboarding-section">
            <h2>2. Kinh nghiệm tập</h2>
            <div className="choice-grid three">
              {([
                ["beginner", "Mới tập"],
                ["intermediate", "6–24 tháng"],
                ["advanced", "Trên 2 năm"],
              ] as const).map(([value, label]) => <button key={value} type="button" className={profile.experience === value ? "active" : ""} onClick={() => setProfile({ ...profile, experience: value })}>{label}</button>)}
            </div>
          </section>

          <section className="onboarding-section">
            <h2>3. Số ngày bạn duy trì được</h2>
            <div className="choice-grid three">
              {([3, 4, 6] as const).map((value) => <button key={value} type="button" className={profile.availableDays === value ? "active" : ""} onClick={() => setProfile({ ...profile, availableDays: value })}><strong>{value}</strong><span>buổi/tuần</span></button>)}
            </div>
          </section>

          <section className="onboarding-section">
            <h2>4. Thời lượng mỗi buổi</h2>
            <div className="choice-grid four">
              {([40, 60, 75, 90] as const).map((value) => <button key={value} type="button" className={profile.sessionMinutes === value ? "active" : ""} onClick={() => setProfile({ ...profile, sessionMinutes: value })}>{value} phút</button>)}
            </div>
          </section>

          <section className="onboarding-section full">
            <h2>5. Thiết bị bạn có</h2>
            <div className="chip-grid">{equipmentOptions.map((item) => <button key={item.id} type="button" className={profile.equipment.includes(item.id) ? "active" : ""} onClick={() => toggleEquipment(item.id)}>{profile.equipment.includes(item.id) && <Check size={14} />}{item.label}</button>)}</div>
          </section>

          <section className="onboarding-section full">
            <h2>6. Nhóm cơ ưu tiên <small>tối đa 3</small></h2>
            <div className="chip-grid">{muscles.map((muscle) => <button key={muscle} type="button" className={profile.priorityMuscles.includes(muscle) ? "active" : ""} onClick={() => toggleMuscle(muscle)}>{muscle}</button>)}</div>
          </section>

          <section className="onboarding-section full">
            <h2>7. Hạn chế cần lưu ý</h2>
            <textarea value={profile.limitations} maxLength={500} placeholder="Ví dụ: đau vai khi đẩy qua đầu, không có rack, cần buổi dưới 60 phút…" onChange={(event) => setProfile({ ...profile, limitations: event.target.value })} />
          </section>
        </div>

        <section className="recommended-program">
          <div className="recommendation-icon"><Sparkles size={22} /></div>
          <div><small>ĐIỂM KHỞI ĐẦU ĐƯỢC ĐỀ XUẤT</small><h2>{recommended.name}</h2><p>{recommended.description}</p></div>
          <span>{recommended.sessionMinutes}</span>
        </section>

        <div className="onboarding-safety"><ShieldCheck size={18} /><p>Giáo án dành cho người trưởng thành khỏe mạnh. Dừng tập khi có đau bất thường và tham khảo chuyên gia khi có chấn thương hoặc bệnh lý.</p></div>
        <button className="primary-button onboarding-submit" type="button" disabled={!profile.equipment.length} onClick={() => complete({ ...profile, onboardingComplete: true })}>Tạo lộ trình <ArrowRight size={18} /></button>
      </section>
    </main>
  );
}
