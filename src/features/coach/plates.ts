export type PlateLoadingInput = {
  targetKg: number;
  barKg: number;
  availablePairsKg: number[];
};

export type PlateLoadingOption = {
  totalKg: number;
  perSideKg: number[];
};

export type PlateLoadingResult = {
  targetKg: number;
  barKg: number;
  exact: boolean;
  actualKg: number;
  perSideKg: number[];
  lowerKg: number;
  higherKg: number;
  lowerPerSideKg: number[];
  higherPerSideKg: number[];
};

const normalized = (value: number) => Math.round(value * 1000) / 1000;

const enumerateOptions = (barKg: number, availablePairsKg: number[]): PlateLoadingOption[] => {
  const plates = availablePairsKg
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a);
  const options: PlateLoadingOption[] = [];
  const seen = new Set<number>();

  const visit = (index: number, selected: number[], perSideTotal: number) => {
    if (index === plates.length) {
      const totalKg = normalized(barKg + perSideTotal * 2);
      if (!seen.has(totalKg)) {
        seen.add(totalKg);
        options.push({ totalKg, perSideKg: [...selected].sort((a, b) => b - a) });
      }
      return;
    }
    visit(index + 1, selected, perSideTotal);
    selected.push(plates[index]);
    visit(index + 1, selected, perSideTotal + plates[index]);
    selected.pop();
  };

  visit(0, [], 0);
  return options.sort((a, b) => a.totalKg - b.totalKg);
};

const closest = (options: PlateLoadingOption[], targetKg: number) =>
  options.reduce((best, option) => {
    const delta = Math.abs(option.totalKg - targetKg);
    const bestDelta = Math.abs(best.totalKg - targetKg);
    if (delta < bestDelta) return option;
    if (delta === bestDelta && option.totalKg < best.totalKg) return option;
    return best;
  });

export const calculatePlateLoading = ({
  targetKg,
  barKg,
  availablePairsKg,
}: PlateLoadingInput): PlateLoadingResult => {
  const safeBar = Number.isFinite(barKg) && barKg >= 0 ? normalized(barKg) : 0;
  const safeTarget = Number.isFinite(targetKg) ? normalized(targetKg) : safeBar;
  const options = enumerateOptions(safeBar, availablePairsKg);
  const exactOption = options.find((option) => Math.abs(option.totalKg - safeTarget) < 0.001);
  const lower = [...options].reverse().find((option) => option.totalKg <= safeTarget) ?? options[0];
  const higher = options.find((option) => option.totalKg >= safeTarget) ?? options.at(-1)!;
  const actual = exactOption ?? closest(options, safeTarget);

  return {
    targetKg: safeTarget,
    barKg: safeBar,
    exact: Boolean(exactOption),
    actualKg: actual.totalKg,
    perSideKg: actual.perSideKg,
    lowerKg: lower.totalKg,
    higherKg: higher.totalKg,
    lowerPerSideKg: lower.perSideKg,
    higherPerSideKg: higher.perSideKg,
  };
};
