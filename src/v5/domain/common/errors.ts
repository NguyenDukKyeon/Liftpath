export type LiftPathV5ErrorCode =
  | "VALIDATION_ERROR"
  | "STORAGE_ERROR"
  | "CORRUPTED_DATA"
  | "BACKUP_ERROR"
  | "COACH_POLICY_ERROR"
  | "UNEXPECTED_ERROR";

export class LiftPathV5Error extends Error {
  constructor(
    public readonly code: LiftPathV5ErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LiftPathV5Error";
  }
}
