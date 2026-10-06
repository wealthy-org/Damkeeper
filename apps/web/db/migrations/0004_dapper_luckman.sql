CREATE TABLE IF NOT EXISTS "staking_pools" (
	"chain_id" integer NOT NULL,
	"pool_address" text NOT NULL,
	"staking_token" text NOT NULL,
	"reward_token" text NOT NULL,
	"creator" text NOT NULL,
	"lock_duration" bigint NOT NULL,
	"name" text NOT NULL,
	"created_at" bigint NOT NULL,
	"tx_hash" text,
	CONSTRAINT "staking_pools_chain_id_pool_address_pk" PRIMARY KEY("chain_id","pool_address")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staking_pools_by_staking_token" ON "staking_pools" USING btree ("chain_id","staking_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staking_pools_by_creator" ON "staking_pools" USING btree ("chain_id","creator");