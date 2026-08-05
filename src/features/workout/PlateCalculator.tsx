import { CircleGauge } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "../../components/common.js";
import type { ExerciseEntry } from "../../types.js";
import { calculatePlateLoading } from "../coach/plates.js";

const DEFAULT_PLATES = [20, 15, 10, 5, 2.5, 1.25];

const plateText = (plates: number[]) => plates.length ? plates.map((plate) => `${plate}`).join(" + ") : "Không cần đĩa";

export function PlateCalculator({ entry }: { entry: ExerciseEntry }) {
  const [open, setOpen] = useState(false);
  const [barKg, setBarKg] = useState(20);
  const [available, setAvailable] = useState(DEFAULT_PLATES.join(", "));
  const targetKg = Number(entry.sets.find((set) => set.kind !== "warmup")?.weight) || 0;
  const pairs = useMemo(() => available
    .split(/[,;\s]+/)
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0), [available]);
  const result = useMemo(() => calculatePlateLoading({ targetKg, barKg, availablePairsKg: pairs }), [barKg, pairs, targetKg]);
  const mode = entry.snapshot.trackingMode ?? "weight-reps";
  if (mode !== "weight-reps") return null;

  return (
    <>
      <button className="secondary-button small" type="button" onClick={() => setOpen(true)}>
        <CircleGauge size={15} /> Tính đĩa
      </button>
      {open && (
        <Modal title="Plate calculator" close={() => setOpen(false)}>
          <div className="calculator-form">
            <div className="calculator-grid">
              <label className="field">
                <span>Thanh đòn</span>
                <input type="number" inputMode="decimal" min="0" step="0.5" value={barKg} onChange={(event) => setBarKg(Number(event.target.value) || 0)} />
              </label>
              <label className="field">
                <span>Cặp đĩa có sẵn</span>
                <input value={available} onChange={(event) => setAvailable(event.target.value)} placeholder="20, 15, 10, 5, 2.5" />
              </label>
            </div>
            <section className={`plate-result ${result.exact ? "exact" : "approximate"}`}>
              <small>{result.exact ? "Ghép chính xác" : "Mức gần nhất"}</small>
              <strong>Mỗi bên: {plateText(result.perSideKg)} kg</strong>
              <p>Tổng thực tế: {result.actualKg} kg · mục tiêu {result.targetKg} kg</p>
            </section>
            {!result.exact && (
              <div className="calculator-list">
                <div><span>Thấp hơn</span><strong>{result.lowerKg} kg · {plateText(result.lowerPerSideKg)}</strong></div>
                <div><span>Cao hơn</span><strong>{result.higherKg} kg · {plateText(result.higherPerSideKg)}</strong></div>
              </div>
            )}
            <p className="modal-hint">Mỗi số được hiểu là một cặp đĩa, một chiếc cho mỗi bên thanh.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
