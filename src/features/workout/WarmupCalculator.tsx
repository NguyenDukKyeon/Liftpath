import { Flame, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "../../components/common.js";
import type { ExerciseEntry } from "../../types.js";
import { calculateWarmupSets, type WarmupSet } from "../coach/warmup.js";

export function WarmupCalculator({
  entry,
  insert,
}: {
  entry: ExerciseEntry;
  insert: (sets: WarmupSet[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [barWeightKg, setBarWeightKg] = useState(20);
  const mode = entry.snapshot.trackingMode ?? "weight-reps";
  const workingWeightKg = Number(entry.sets.find((set) => set.kind !== "warmup")?.weight) || 0;
  const sets = useMemo(() => calculateWarmupSets({
    workingWeightKg,
    movementPattern: entry.snapshot.movementPattern ?? "isolation",
    barWeightKg,
    trackingMode: mode,
    loadIncrementKg: Math.max(0.5, entry.snapshot.incrementKg || 0.5),
  }), [barWeightKg, entry.snapshot.incrementKg, entry.snapshot.movementPattern, mode, workingWeightKg]);

  if (mode !== "weight-reps") return null;

  return (
    <>
      <button className="secondary-button small" type="button" onClick={() => setOpen(true)}>
        <Flame size={15} /> Tính warm-up
      </button>
      {open && (
        <Modal title="Warm-up calculator" close={() => setOpen(false)}>
          <div className="calculator-form">
            <label className="field">
              <span>Khối lượng thanh/đòn trống</span>
              <input type="number" inputMode="decimal" min="0" step="0.5" value={barWeightKg} onChange={(event) => setBarWeightKg(Number(event.target.value) || 0)} />
            </label>
            <div className="calculator-summary">
              <small>Working load</small>
              <strong>{workingWeightKg || "—"} kg</strong>
            </div>
            {sets.length ? (
              <div className="calculator-list">
                {sets.map((set, index) => (
                  <div key={`${set.weightKg}-${index}`}>
                    <span>Hiệp {index + 1}{set.optional ? " · tùy chọn" : ""}</span>
                    <strong>{set.weightKg} kg × {set.reps}</strong>
                  </div>
                ))}
              </div>
            ) : <p className="modal-hint">Nhập working load hợp lệ để tạo warm-up.</p>}
            <div className="dialog-actions">
              <button className="secondary-button" type="button" onClick={() => setOpen(false)}>Đóng</button>
              <button className="primary-button" type="button" disabled={!sets.length} onClick={() => { insert(sets); setOpen(false); }}>
                <Plus size={16} /> Thêm warm-up
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
