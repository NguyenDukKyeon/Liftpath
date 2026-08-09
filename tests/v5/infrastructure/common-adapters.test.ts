import assert from "node:assert/strict";
import test from "node:test";
import { SystemClock } from "../../../src/v5/infrastructure/common/system-clock.js";
import { CryptoIdGenerator } from "../../../src/v5/infrastructure/common/crypto-id-generator.js";

test("SystemClock returns a parseable ISO timestamp", () => {
  const value = new SystemClock().now();

  assert.equal(Number.isNaN(Date.parse(value)), false);
  assert.equal(new Date(value).toISOString(), value);
});

test("CryptoIdGenerator prefixes ids and does not repeat sequential values", () => {
  const ids = new CryptoIdGenerator();
  const first = ids.next("set");
  const second = ids.next("set");

  assert.match(first, /^set_/);
  assert.match(second, /^set_/);
  assert.notEqual(first, second);
});
