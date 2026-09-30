import assert from "node:assert/strict";
import { test } from "node:test";
import { saveSession, loadSession, clearSession, type SessionData } from "./session.ts";

test("Session save, load, and clear lifecycle", () => {
  const dummy: SessionData = {
    deviceKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
    deviceAddress: "0x1111111111111111111111111111111111111111",
    authorizedBy: "0x2222222222222222222222222222222222222222",
    createdAt: Date.now(),
  };

  saveSession(dummy);
  const loaded = loadSession();
  assert.equal(loaded?.deviceKey, dummy.deviceKey);
  assert.equal(loaded?.authorizedBy, dummy.authorizedBy);

  const cleared = clearSession();
  assert.equal(cleared, true);
  assert.equal(loadSession(), null);
});
