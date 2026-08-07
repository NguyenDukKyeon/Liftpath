import { LiftPathV5Error } from "./errors.js";

export function assertFiniteNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${name} must be finite and >= 0`);
  }
}
