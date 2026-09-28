import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon serverless driver over HTTP — works from Vercel's serverless/edge
// functions without a persistent TCP pool. Free tier: neon.tech.
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
