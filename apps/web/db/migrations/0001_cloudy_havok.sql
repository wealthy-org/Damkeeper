CREATE TABLE IF NOT EXISTS "faucet_claims" (
	"chain_id" integer NOT NULL,
	"address" text NOT NULL,
	"last_claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tx_hash" text NOT NULL,
	CONSTRAINT "faucet_claims_chain_id_address_pk" PRIMARY KEY("chain_id","address")
);
