import type { SessionMinutes, TrainingDaysPerWeek } from "../../domain/programming/constraints.js";

export type EquipmentPresetId = "commercial" | "machines" | "free-weights";

interface ConstraintsStepProps {
  daysPerWeek?: TrainingDaysPerWeek;
  sessionMinutes?: SessionMinutes;
  equipmentPresetId?: EquipmentPresetId;
  canContinue: boolean;
  onDays(days: TrainingDaysPerWeek): void;
  onMinutes(minutes: SessionMinutes): void;
  onEquipment(presetId: EquipmentPresetId): void;
  onBack(): void;
  onContinue(): void;
}

const DAY_OPTIONS: readonly TrainingDaysPerWeek[] = [2, 3, 4, 5, 6];
const MINUTE_OPTIONS: readonly SessionMinutes[] = [30, 45, 60, 75, 90];

export const EQUIPMENT_PRESETS = [
  {
    id: "commercial",
    label: "Commercial gym",
    detail: "Barbell, rack, bench, dumbbells, cables, and machines.",
    equipment: ["barbell", "rack", "bench", "dumbbell", "cable", "machine"],
  },
  {
    id: "machines",
    label: "Machines + cable",
    detail: "Stable machine and cable options with no barbell requirement.",
    equipment: ["machine", "cable"],
  },
  {
    id: "free-weights",
    label: "Free weights",
    detail: "Barbell, rack, bench, and dumbbells.",
    equipment: ["barbell", "rack", "bench", "dumbbell"],
  },
] as const satisfies readonly {
  id: EquipmentPresetId;
  label: string;
  detail: string;
  equipment: readonly string[];
}[];

export function equipmentForPreset(presetId?: EquipmentPresetId): string[] | undefined {
  const preset = EQUIPMENT_PRESETS.find((candidate) => candidate.id === presetId);
  return preset ? [...preset.equipment] : undefined;
}

export function ConstraintsStep({
  daysPerWeek,
  sessionMinutes,
  equipmentPresetId,
  canContinue,
  onDays,
  onMinutes,
  onEquipment,
  onBack,
  onContinue,
}: ConstraintsStepProps) {
  return (
    <div className="v5-onboarding-step">
      <h2>Set your training constraints</h2>
      <p>The Coach must fit the program inside the schedule and equipment you actually have.</p>

      <fieldset>
        <legend>Training days</legend>
        <div className="v5-inline-choices">
          {DAY_OPTIONS.map((day) => (
            <button
              type="button"
              key={day}
              aria-pressed={daysPerWeek === day}
              onClick={() => onDays(day)}
            >
              {day} days
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Session duration</legend>
        <div className="v5-inline-choices">
          {MINUTE_OPTIONS.map((minutes) => (
            <button
              type="button"
              key={minutes}
              aria-pressed={sessionMinutes === minutes}
              onClick={() => onMinutes(minutes)}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Equipment</legend>
        <div className="v5-choice-grid">
          {EQUIPMENT_PRESETS.map((preset) => (
            <button
              type="button"
              className="v5-onboarding-choice"
              key={preset.id}
              aria-label={preset.label}
              aria-pressed={equipmentPresetId === preset.id}
              onClick={() => onEquipment(preset.id)}
            >
              <strong>{preset.label}</strong>
              <span>{preset.detail}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="v5-onboarding-actions">
        <button type="button" className="v5-onboarding-back" onClick={onBack}>Back</button>
        <button type="button" disabled={!canContinue} onClick={onContinue}>
          See structure options
        </button>
      </div>
    </div>
  );
}
