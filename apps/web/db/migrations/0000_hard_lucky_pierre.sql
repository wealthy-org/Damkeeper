CREATE TABLE IF NOT EXISTS "chain_checkpoints" (
	"chain_id" integer NOT NULL,
	"manager_address" text NOT NULL,
	"last_block" bigint NOT NULL,
	"last_block_hash" text NOT NULL,
	"confirmation_tier" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chain_checkpoints_chain_id_manager_address_pk" PRIMARY KEY("chain_id","manager_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deployments" (
	"chain_id" integer NOT NULL,
	"manager_address" text NOT NULL,
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"deploy_tx_hash" text NOT NULL,
	"deploy_block" bigint NOT NULL,
	"abi_hash" text NOT NULL,
	"source_commit" text NOT NULL,
	"verified_source_url" text,
	"admin" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deployments_chain_id_manager_address_pk" PRIMARY KEY("chain_id","manager_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "position_events" (
	"chain_id" integer NOT NULL,
	"manager_address" text NOT NULL,
	"position_id" bigint NOT NULL,
	"block_number" bigint NOT NULL,
	"block_hash" text NOT NULL,
	"tx_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"event_name" text NOT NULL,
	"payload" text NOT NULL,
	"canonical" boolean DEFAULT true NOT NULL,
	CONSTRAINT "position_events_chain_id_block_hash_tx_hash_log_index_pk" PRIMARY KEY("chain_id","block_hash","tx_hash","log_index")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "positions" (
	"chain_id" integer NOT NULL,
	"manager_address" text NOT NULL,
	"position_id" bigint NOT NULL,
	"kind" text NOT NULL,
	"token" text NOT NULL,
	"creator" text NOT NULL,
	"beneficiary" text NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"claimed_amount" numeric(78, 0) DEFAULT '0' NOT NULL,
	"created_at" bigint NOT NULL,
	"unlock_time" bigint,
	"start_time" bigint,
	"cliff_time" bigint,
	"end_time" bigint,
	"withdrawn" boolean DEFAULT false NOT NULL,
	"indexed_at_block" bigint NOT NULL,
	CONSTRAINT "positions_chain_id_manager_address_position_id_pk" PRIMARY KEY("chain_id","manager_address","position_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_policies" (
	"chain_id" integer NOT NULL,
	"manager_address" text NOT NULL,
	"token" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"liability_cap" numeric(78, 0) DEFAULT '0' NOT NULL,
	"last_changed_block" bigint NOT NULL,
	CONSTRAINT "token_policies_chain_id_manager_address_token_pk" PRIMARY KEY("chain_id","manager_address","token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tokens" (
	"chain_id" integer NOT NULL,
	"address" text NOT NULL,
	"symbol" text,
	"name" text,
	"decimals" integer,
	"support_note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tokens_chain_id_address_pk" PRIMARY KEY("chain_id","address")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "position_events_by_position" ON "position_events" USING btree ("chain_id","manager_address","position_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "positions_by_creator" ON "positions" USING btree ("chain_id","manager_address","creator");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "positions_by_beneficiary" ON "positions" USING btree ("chain_id","manager_address","beneficiary");