import type { Clock } from "../../application/ports/clock.js";
import type { ISODateTime } from "../../domain/common/types.js";

export class SystemClock implements Clock {
  now(): ISODateTime {
    return new Date().toISOString();
  }
}
