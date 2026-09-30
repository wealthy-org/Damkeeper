import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWhen } from "./time.ts";

test("parseWhen relative seconds and minutes", () => {
  const base = new Date("2026-09-30T10:00:00.000Z");
  
  const in30s = parseWhen("+30s", base);
  assert.equal(in30s?.getTime(), base.getTime() + 30_000);

  const in10m = parseWhen("+10m", base);
  assert.equal(in10m?.getTime(), base.getTime() + 600_000);

  const in2h = parseWhen("+2h", base);
  assert.equal(in2h?.getTime(), base.getTime() + 2 * 3600_000);

  const in1d = parseWhen("+1d", base);
  assert.equal(in1d?.getTime(), base.getTime() + 24 * 3600_000);
});

test("parseWhen 'now' returns null (handled as immediate)", () => {
  assert.equal(parseWhen("now"), null);
  assert.equal(parseWhen("confirm"), null);
});

test("parseWhen rejects invalid string with helpful error", () => {
  assert.throws(() => parseWhen("tomorrowish"), /Can't read "tomorrowish" as a date/);
});
