import assert from "node:assert/strict";
import { test } from "node:test";
import {
  vestedAmount,
  claimableAmount,
  unvestedAmount,
  vestingStatus,
  lockStatus,
  type VestingTerms,
} from "./vesting.ts";

test("Vesting linear calculation without cliff", () => {
  const terms: VestingTerms = {
    totalAmount: 1000n,
    startTime: 100n,
    cliffTime: 0n,
    endTime: 200n,
    claimedAmount: 0n,
  };

  // Before start
  assert.equal(vestedAmount(terms, 50n), 0n);
  assert.equal(vestingStatus(terms, 50n), "scheduled");

  // At start
  assert.equal(vestedAmount(terms, 100n), 0n);

  // Midpoint
  assert.equal(vestedAmount(terms, 150n), 500n);
  assert.equal(claimableAmount(terms, 150n), 500n);
  assert.equal(unvestedAmount(terms, 150n), 500n);
  assert.equal(vestingStatus(terms, 150n), "vesting");

  // At end & past end
  assert.equal(vestedAmount(terms, 200n), 1000n);
  assert.equal(vestedAmount(terms, 250n), 1000n);
  assert.equal(vestingStatus(terms, 200n), "fully_vested");
});

test("Vesting with cliff", () => {
  const terms: VestingTerms = {
    totalAmount: 1000n,
    startTime: 100n,
    cliffTime: 140n,
    endTime: 200n,
    claimedAmount: 0n,
  };

  // Before cliff
  assert.equal(vestedAmount(terms, 130n), 0n);
  assert.equal(vestingStatus(terms, 130n), "cliff_pending");

  // At cliff: unlocks everything vested since start (40%)
  assert.equal(vestedAmount(terms, 140n), 400n);
  assert.equal(claimableAmount(terms, 140n), 400n);
  assert.equal(vestingStatus(terms, 140n), "vesting");

  // Claiming partial
  terms.claimedAmount = 300n;
  assert.equal(claimableAmount(terms, 140n), 100n);

  // Fully claimed
  terms.claimedAmount = 1000n;
  assert.equal(vestingStatus(terms, 140n), "fully_claimed");
});

test("Lock status progression", () => {
  const unlock = 1000n;
  assert.equal(lockStatus(unlock, false, 500n), "locked");
  assert.equal(lockStatus(unlock, false, 1000n), "withdrawable");
  assert.equal(lockStatus(unlock, false, 1500n), "withdrawable");
  assert.equal(lockStatus(unlock, true, 1500n), "withdrawn");
});
