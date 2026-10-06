import {
  pgTable,
  text,
  integer,
  bigint,
  numeric,
  boolean,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// One row per manager deployment (LockManager / VestingManager), per chain.
export const deployments = pgTable("deployments", {
  chainId: integer("chain_id").notNull(),
  managerAddress: text("manager_address").notNull(),
  kind: text("kind").notNull(), // 'lock' | 'vesting'
  version: text("version").notNull(),
  deployTxHash: text("deploy_tx_hash").notNull(),
  deployBlock: bigint("deploy_block", { mode: "bigint" }).notNull(),
  abiHash: text("abi_hash").notNull(),
  sourceCommit: text("source_commit").notNull(),
  verifiedSourceUrl: text("verified_source_url"),
  admin: text("admin").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.chainId, t.managerAddress] }),
}));

export const tokens = pgTable("tokens", {
  chainId: integer("chain_id").notNull(),
  address: text("address").notNull(),
  symbol: text("symbol"),
  name: text("name"),
  decimals: integer("decimals"),
  supportNote: text("support_note"), // e.g. fee-on-transfer, rebase, restricted
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.chainId, t.address] }),
}));

// Composite identity: chainId + managerAddress + positionId, per brief 8.1.
export const positions = pgTable("positions", {
  chainId: integer("chain_id").notNull(),
  managerAddress: text("manager_address").notNull(),
  positionId: bigint("position_id", { mode: "bigint" }).notNull(),
  kind: text("kind").notNull(), // 'lock' | 'vesting'
  token: text("token").notNull(),
  creator: text("creator").notNull(),
  beneficiary: text("beneficiary").notNull(),
  amount: numeric("amount", { precision: 78, scale: 0 }).notNull(),
  claimedAmount: numeric("claimed_amount", { precision: 78, scale: 0 }).default("0").notNull(),
  createdAt: bigint("created_at", { mode: "bigint" }).notNull(), // onchain timestamp
  unlockTime: bigint("unlock_time", { mode: "bigint" }), // lock only
  startTime: bigint("start_time", { mode: "bigint" }), // vesting only
  cliffTime: bigint("cliff_time", { mode: "bigint" }), // vesting only
  endTime: bigint("end_time", { mode: "bigint" }), // vesting only
  withdrawn: boolean("withdrawn").default(false).notNull(),
  indexedAtBlock: bigint("indexed_at_block", { mode: "bigint" }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.chainId, t.managerAddress, t.positionId] }),
  byCreator: index("positions_by_creator").on(t.chainId, t.managerAddress, t.creator),
  byBeneficiary: index("positions_by_beneficiary").on(t.chainId, t.managerAddress, t.beneficiary),
}));

export const positionEvents = pgTable("position_events", {
  chainId: integer("chain_id").notNull(),
  managerAddress: text("manager_address").notNull(),
  positionId: bigint("position_id", { mode: "bigint" }).notNull(),
  blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
  blockHash: text("block_hash").notNull(),
  txHash: text("tx_hash").notNull(),
  logIndex: integer("log_index").notNull(),
  eventName: text("event_name").notNull(),
  payload: text("payload").notNull(), // JSON string
  canonical: boolean("canonical").default(true).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.chainId, t.blockHash, t.txHash, t.logIndex] }),
  byPosition: index("position_events_by_position").on(t.chainId, t.managerAddress, t.positionId),
}));

export const chainCheckpoints = pgTable("chain_checkpoints", {
  chainId: integer("chain_id").notNull(),
  managerAddress: text("manager_address").notNull(),
  lastBlock: bigint("last_block", { mode: "bigint" }).notNull(),
  lastBlockHash: text("last_block_hash").notNull(),
  confirmationTier: text("confirmation_tier").notNull(), // 'sequencer' | 'l1_posted' | 'l1_final'
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.chainId, t.managerAddress] }),
}));

// Optional human label for a position ("Team vesting — Alice"). Offchain only and
// never part of the onchain proof; only accepted with a signature from the
// position's onchain creator (see app/api/labels/route.ts).
export const positionLabels = pgTable("position_labels", {
  chainId: integer("chain_id").notNull(),
  managerAddress: text("manager_address").notNull(),
  positionId: bigint("position_id", { mode: "bigint" }).notNull(),
  label: text("label").notNull(),
  setBy: text("set_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.chainId, t.managerAddress, t.positionId] }),
}));

// Rate-limits the testnet EXMPL faucet (one claim per wallet per window).
export const faucetClaims = pgTable("faucet_claims", {
  chainId: integer("chain_id").notNull(),
  address: text("address").notNull(),
  lastClaimedAt: timestamp("last_claimed_at", { withTimezone: true }).defaultNow().notNull(),
  txHash: text("tx_hash").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.chainId, t.address] }),
}));

// One row per ERC-20 Transfer into a burn sink: 0x0 (native burn()) or 0x…dEaD.
// Ingested per transaction via /api/burns/sync; there is no log backfill.
export const burns = pgTable("burns", {
  chainId: integer("chain_id").notNull(),
  txHash: text("tx_hash").notNull(),
  logIndex: integer("log_index").notNull(),
  token: text("token").notNull(),
  burner: text("burner").notNull(),
  mode: text("mode").notNull(), // 'burn' | 'dead'
  amount: numeric("amount", { precision: 78, scale: 0 }).notNull(),
  totalSupplyAfter: numeric("total_supply_after", { precision: 78, scale: 0 }), // null if the read failed
  blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
  timestamp: bigint("timestamp", { mode: "bigint" }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.chainId, t.txHash, t.logIndex] }),
  byToken: index("burns_by_token").on(t.chainId, t.token),
  byBurner: index("burns_by_burner").on(t.chainId, t.burner),
}));

export const tokenPolicies = pgTable("token_policies", {
  chainId: integer("chain_id").notNull(),
  managerAddress: text("manager_address").notNull(),
  token: text("token").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  liabilityCap: numeric("liability_cap", { precision: 78, scale: 0 }).default("0").notNull(),
  lastChangedBlock: bigint("last_changed_block", { mode: "bigint" }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.chainId, t.managerAddress, t.token] }),
}));

export const stakingPools = pgTable("staking_pools", {
  chainId: integer("chain_id").notNull(),
  poolAddress: text("pool_address").notNull(),
  stakingToken: text("staking_token").notNull(),
  rewardToken: text("reward_token").notNull(),
  creator: text("creator").notNull(),
  lockDuration: bigint("lock_duration", { mode: "bigint" }).notNull(),
  name: text("name").notNull(),
  createdAt: bigint("created_at", { mode: "bigint" }).notNull(),
  txHash: text("tx_hash"),
}, (t) => ({
  pk: primaryKey({ columns: [t.chainId, t.poolAddress] }),
  byStakingToken: index("staking_pools_by_staking_token").on(t.chainId, t.stakingToken),
  byCreator: index("staking_pools_by_creator").on(t.chainId, t.creator),
}));

