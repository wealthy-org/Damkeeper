import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon serverless driver over HTTP — works from Vercel's serverless/edge
// functions without a persistent TCP pool. Free tier: neon.tech.
// The driver sends SQL through fetch(); Next.js caches server-side fetches by
// default, which would serve stale rows (old positions, missed indexer updates).
// Every query must hit the database.
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/damkeeper";

const sql = neon(connectionString, { fetchOptions: { cache: "no-store" } });

export const db = drizzle(sql, { schema });

