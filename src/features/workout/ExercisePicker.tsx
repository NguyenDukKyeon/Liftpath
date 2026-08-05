import { Ban, Check, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  Exercise,
  ExerciseId,
  ExercisePreference,
  ExercisePreferenceReason,
  UserProfile,
} from "../../types.js";
import { findSafeSubstitution } from "../coach/substitution.js";

const normalized = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("vi-VN")
  .trim();

export function ExercisePicker({
  exercises,
  profile,
  preferences,
  currentExerciseId,
  select,
}: {
  exercises: Record<ExerciseId, Exercise>;
  profile: UserProfile;
  preferences: ExercisePreference[];
  currentExerciseId?: ExerciseId;
  select: (exerciseId: ExerciseId, alwaysUse: boolean, reason: ExercisePreferenceReason) => void;
}) {
  const [query, setQuery] = useState("");
  const [showAvoided, setShowAvoided] = useState(false);
  const [alwaysUse, setAlwaysUse] = useState(false);
  const [reason, setReason] = useState<ExercisePreferenceReason>("comfort");
  const preferenceMap = useMemo(() => new Map(preferences.map((item) => [item.exerciseId, item])), [preferences]);
  const needle = normalized(query);

  const options = useMemo(() => Object.values(exercises)
    .filter((exercise) => {
      const preference = preferenceMap.get(exercise.id);
      if (!showAvoided && preference?.status === "avoid") return false;
      if (!needle) return true;
      return normalized(`${exercise.name} ${exercise.id.replaceAll("_", " ")} ${exercise.primary} ${exercise.movementPattern ?? ""}`).includes(needle);
    })
    .map((exercise) => {
      const safety = findSafeSubstitution({
        exerciseId: exercise.id,
        equipment: profile.equipment,
        restrictions: profile.restrictions ?? [],
        exercises,
      });
      const compatible = safety.value?.id === exercise.id;
      const reasonText = compatible
        ? `${exercise.primary} · ${exercise.equipment}`
        : safety.reasonCode === "pain-blocks-movement"
          ? "Bị chặn bởi restriction đã khai báo"
          : "Thiếu thiết bị phù hợp";
      return { exercise, compatible, reasonText, preference: preferenceMap.get(exercise.id) };
    })
    .sort((a, b) => {
      const aPreferred = a.preference?.status === "preferred" ? 1 : 0;
      const bPreferred = b.preference?.status === "preferred" ? 1 : 0;
      return bPreferred - aPreferred || Number(b.compatible) - Number(a.compatible) || a.exercise.name.localeCompare(b.exercise.name);
    }), [exercises, needle, preferenceMap, profile.equipment, profile.restrictions, showAvoided]);

  return (
    <div className="exercise-picker">
      <label className="picker-search">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên bài, nhóm cơ hoặc movement…" />
      </label>
      <div className="picker-preference-row">
        <label><input type="checkbox" checked={alwaysUse} onChange={(event) => setAlwaysUse(event.target.checked)} /> Luôn ưu tiên bài được chọn</label>
        {alwaysUse && (
          <select aria-label="Lý do lưu sở thích" value={reason} onChange={(event) => setReason(event.target.value as ExercisePreferenceReason)}>
            <option value="comfort">Thoải mái hơn</option>
            <option value="equipment">Thiết bị phù hợp</option>
            <option value="availability">Thường có sẵn</option>
            <option value="pain">Tránh khó chịu</option>
            <option value="other">Lý do khác</option>
          </select>
        )}
        <button className="secondary-button small" type="button" onClick={() => setShowAvoided((value) => !value)}>
          <Ban size={14} /> {showAvoided ? "Ẩn bài tránh" : "Hiện bài tránh"}
        </button>
      </div>
      <div className="picker-list">
        {options.map(({ exercise, compatible, reasonText, preference }) => (
          <button
            type="button"
            key={exercise.id}
            className={`${exercise.id === currentExerciseId ? "current" : ""} ${!compatible ? "disabled-option" : ""}`}
            disabled={!compatible || exercise.id === currentExerciseId}
            onClick={() => select(exercise.id, alwaysUse, reason)}
          >
            <span className="exercise-type-icon">{exercise.name.slice(0, 2).toUpperCase()}</span>
            <span className="grow">
              <strong>{exercise.name}</strong>
              <small>{reasonText}</small>
            </span>
            {preference?.status === "preferred" && <Star size={16} aria-label="Bài được ưu tiên" />}
            {exercise.id === currentExerciseId && <Check size={17} aria-label="Bài hiện tại" />}
          </button>
        ))}
        {!options.length && <p className="modal-hint">Không tìm thấy bài phù hợp với bộ lọc hiện tại.</p>}
      </div>
    </div>
  );
}
