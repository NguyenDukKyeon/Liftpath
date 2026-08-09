import type { ISODateTime } from "../../domain/common/types.js";

export interface Clock {
  now(): ISODateTime;
}
