CREATE TABLE IF NOT EXISTS "position_labels" (
	"chain_id" integer NOT NULL,
	"manager_address" text NOT NULL,
	"position_id" bigint NOT NULL,
	"label" text NOT NULL,
	"set_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "position_labels_chain_id_manager_address_position_id_pk" PRIMARY KEY("chain_id","manager_address","position_id")
);
