import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { relations } from "./relations";

/** Uses the current Worker's D1 binding; features never select an environment. */
export function getDb() {
	return drizzle(env.DB, { relations });
}
