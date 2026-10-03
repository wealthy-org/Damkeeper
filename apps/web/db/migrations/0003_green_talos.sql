CREATE TABLE IF NOT EXISTS "burns" (
	"chain_id" integer NOT NULL,
	"tx_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"token" text NOT NULL,
	"burner" text NOT NULL,
	"mode" text NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"total_supply_after" numeric(78, 0),
	"block_number" bigint NOT NULL,
	"timestamp" bigint NOT NULL,
	CONSTRAINT "burns_chain_id_tx_hash_log_index_pk" PRIMARY KEY("chain_id","tx_hash","log_index")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "burns_by_token" ON "burns" USING btree ("chain_id","token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "burns_by_burner" ON "burns" USING btree ("chain_id","burner");