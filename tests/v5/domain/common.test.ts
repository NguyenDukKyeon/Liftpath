import assert from "node:assert/strict";
import test from "node:test";
import { assertFiniteNonNegative } from "../../../src/v5/domain/common/validation.js";
import { LiftPathV5Error } from "../../../src/v5/domain/common/errors.js";

test("rejects negative and non-finite numeric inputs", () => {
  assert.throws(() => assertFiniteNonNegative("load", -1), LiftPathV5Error);
  assert.throws(() => assertFiniteNonNegative("load", Number.NaN), LiftPathV5Error);
  assert.throws(() => assertFiniteNonNegative("load", Number.POSITIVE_INFINITY), LiftPathV5Error);
  assert.doesNotThrow(() => assertFiniteNonNegative("load", 0));
});
