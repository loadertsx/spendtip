import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { unstable_readConfig as readWranglerConfig } from "wrangler";

const target = process.argv[2];
if (target !== "local" && target !== "stg" && target !== "prod") {
	console.error("Usage: tsx scripts/db-studio.ts <local|stg|prod>");
	process.exit(1);
}

process.env.DB_ENV = target;
try {
	if (target !== "local") {
		const wrangler = readWranglerConfig({
			config: "wrangler.jsonc",
			env: target,
		});
		const databaseId = wrangler.d1_databases.find(
			(database: { binding: string; database_id?: string }) =>
				database.binding === "DB",
		)?.database_id;
		if (!databaseId)
			throw new Error(`No D1 database ID configured for ${target}.`);
		process.env.DB_DATABASE_ID = databaseId;
	}
	// Validate before launching: Drizzle Kit can report config errors with exit code 0.
	await import("../drizzle.studio.config");
	console.log(`Starting Drizzle Studio for ${target}.`);
	if (target === "prod") {
		console.warn("PRODUCTION DATABASE: use a read-only Cloudflare API token.");
	}
	const require = createRequire(import.meta.url);
	const result = spawnSync(
		process.execPath,
		[
			join(dirname(require.resolve("drizzle-kit")), "bin.cjs"),
			"studio",
			"--config=drizzle.studio.config.ts",
			"--host=127.0.0.1",
		],
		{ stdio: "inherit", env: process.env },
	);
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
