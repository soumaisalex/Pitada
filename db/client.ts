import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Uso dentro de uma Cloudflare Pages Function:
//   import { getDb } from "../../db/client";
//   const db = getDb(env.DATABASE_URL);
export function getDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}
