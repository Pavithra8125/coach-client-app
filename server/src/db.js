import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config(); // Ensure env vars are loaded

if (!process.env.TURSO_DATABASE_URL) {
  console.warn("WARNING: TURSO_DATABASE_URL is not set. Falling back to local file 'coach.db'.");
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:coach.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
