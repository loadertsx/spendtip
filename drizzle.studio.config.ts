import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ quiet: true });

const target = process.env.DB_ENV;
if (target !== "local" && target !== "stg" && target !== "prod") {
	throw new Error("Choose db:studio:local, db:studio:stg or db:studio:prod.");
}

function localDatabaseUrl() {
	const directory = resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
	let files: string[];
	try {
		files = readdirSync(directory).filter(
			(name) => name.endsWith(".sqlite") && name !== "metadata.sqlite",
		);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		files = [];
	}

	if (files.length === 0) {
		throw new Error(
			"Local D1 is not initialized. Run bun run db:init:local first.",
		);
	}
	if (files.length !== 1) {
		throw new Error(
			"Multiple local D1 files found. Studio will not guess. Back up .wrangler/state, " +
				"move aside stale D1 files, then run bun run db:init:local again.",
		);
	}
	return pathToFileURL(resolve(directory, files[0])).href;
}

function requiredVariable(name: string) {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing ${name}. See .env.example.`);
	return value;
}

// Studio introspects the database, so it also works before the first feature schema.
export default target === "local"
	? defineConfig({
			dialect: "sqlite",
			dbCredentials: { url: localDatabaseUrl() },
		})
	: defineConfig({
			dialect: "sqlite",
			driver: "d1-http",
			dbCredentials: {
				accountId: requiredVariable("CLOUDFLARE_ACCOUNT_ID"),
				databaseId: requiredVariable("DB_DATABASE_ID"),
				token: requiredVariable("CLOUDFLARE_API_TOKEN"),
			},
		});
