CREATE TABLE IF NOT EXISTS "airdrop_campaigns" (
	"chain_id" integer NOT NULL,
	"campaign_id" text NOT NULL,
	"creator" text NOT NULL,
	"token" text NOT NULL,
	"token_symbol" text NOT NULL,
	"token_decimals" integer DEFAULT 18 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"total_amount" numeric(78, 0) NOT NULL,
	"total_recipients" integer NOT NULL,
	"claimed_amount" numeric(78, 0) DEFAULT '0' NOT NULL,
	"claimed_count" integer DEFAULT 0 NOT NULL,
	"mode" text DEFAULT 'instant' NOT NULL,
	"start_time" bigint NOT NULL,
	"end_time" bigint,
	"vesting_duration" bigint,
	"tx_hash" text,
	"created_at" bigint NOT NULL,
	CONSTRAINT "airdrop_campaigns_chain_id_campaign_id_pk" PRIMARY KEY("chain_id","campaign_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "airdrop_recipients" (
	"chain_id" integer NOT NULL,
	"campaign_id" text NOT NULL,
	"recipient" text NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"is_claimed" boolean DEFAULT false NOT NULL,
	"claimed_at" bigint,
	"claim_tx_hash" text,
	CONSTRAINT "airdrop_recipients_chain_id_campaign_id_recipient_pk" PRIMARY KEY("chain_id","campaign_id","recipient")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "airdrop_campaigns_by_creator" ON "airdrop_campaigns" USING btree ("chain_id","creator");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "airdrop_campaigns_by_token" ON "airdrop_campaigns" USING btree ("chain_id","token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "airdrop_recipients_by_recipient" ON "airdrop_recipients" USING btree ("chain_id","recipient");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "airdrop_recipients_by_campaign" ON "airdrop_recipients" USING btree ("chain_id","campaign_id");