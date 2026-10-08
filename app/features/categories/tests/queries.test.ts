import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it } from "node:test";
import { type Client, createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { monthlyExpenseSummaries } from "../../expenses/queries.server";
import { expenses } from "../../expenses/schema";
import { users } from "../../users/schema";
import { combineSummaries, emptySummary, utcMonth } from "../category-metrics";
import type { CategoryDraft } from "../category-validation";
import { listCategories, mutateCategory } from "../queries.server";

const root = new URL("../../../../drizzle/", import.meta.url);
const migrations = readdirSync(root, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort()
	.map((name) => readFileSync(new URL(`${name}/migration.sql`, root), "utf8"));
const draft: CategoryDraft = {
	name: "Café",
	description: "Coffee with friends",
	emoji: "☕",
};

describe("category operations and real monthly metrics", () => {
	let client: Client;
	let db: ReturnType<typeof drizzle>;
	beforeEach(async () => {
		client = createClient({ url: ":memory:" });
		db = drizzle({ client });
		await client.execute("PRAGMA foreign_keys = ON");
		for (const migration of migrations) await client.executeMultiple(migration);
		await db.insert(users).values([
			{ id: "owner", clerkUserId: "clerk-owner" },
			{ id: "other", clerkUserId: "clerk-other" },
		]);
	});
	afterEach(() => client.close());

	async function create(name = draft.name, owner = "owner") {
		const result = await mutateCategory(db, owner, {
			intent: "create",
			...draft,
			name,
		});
		assert.equal(result.ok, true);
		if (!result.ok) throw new Error("Expected created category");
		return result.category;
	}

	it("persists emoji and edits across reloads, isolating users", async () => {
		const category = await create();
		assert.equal((await listCategories(db, "owner"))[0].emoji, "☕");
		assert.deepEqual(await listCategories(db, "other"), []);
		for (const intent of ["archive", "restore"] as const) {
			assert.deepEqual(
				await mutateCategory(db, "other", { intent, id: category.id }),
				{ ok: false, reason: "not_found" },
			);
		}
		assert.deepEqual(
			await mutateCategory(db, "other", {
				intent: "update",
				id: category.id,
				...draft,
			}),
			{ ok: false, reason: "not_found" },
		);
		await mutateCategory(db, "owner", {
			intent: "update",
			id: category.id,
			...draft,
			name: "Food",
			emoji: "🍔",
		});
		const [updated] = await listCategories(db, "owner");
		assert.equal(updated.name, "Food");
		assert.equal(updated.nameKey, "food");
		assert.equal(updated.emoji, "🍔");
	});

	it("handles normalized duplicates, conflicting edits and restorations", async () => {
		const category = await create();
		assert.deepEqual(
			await mutateCategory(db, "owner", {
				intent: "create",
				...draft,
				name: " CAFE\u0301 ",
			}),
			{ ok: false, reason: "duplicate_name" },
		);
		await create("Café", "other");
		const second = await create("Food");
		assert.deepEqual(
			await mutateCategory(db, "owner", {
				intent: "update",
				id: second.id,
				...draft,
			}),
			{ ok: false, reason: "duplicate_name" },
		);
		await mutateCategory(db, "owner", { intent: "archive", id: category.id });
		await create();
		assert.deepEqual(
			await mutateCategory(db, "owner", { intent: "restore", id: category.id }),
			{ ok: false, reason: "duplicate_name" },
		);
		assert.ok(
			(await listCategories(db, "owner")).find(
				(record) => record.id === category.id,
			)?.archivedAt,
		);
	});

	it("makes archive/restore idempotent without accepting edits to archived records", async () => {
		const category = await create();
		await mutateCategory(db, "owner", { intent: "archive", id: category.id });
		const [archived] = await listCategories(db, "owner");
		await mutateCategory(db, "owner", { intent: "archive", id: category.id });
		assert.equal(
			(await listCategories(db, "owner"))[0].archivedAt?.getTime(),
			archived.archivedAt?.getTime(),
		);
		assert.deepEqual(
			await mutateCategory(db, "owner", {
				intent: "update",
				id: category.id,
				...draft,
			}),
			{ ok: false, reason: "not_found" },
		);
		for (let attempt = 0; attempt < 2; attempt++)
			assert.equal(
				(
					await mutateCategory(db, "owner", {
						intent: "restore",
						id: category.id,
					})
				).ok,
				true,
			);
		assert.equal((await listCategories(db, "owner"))[0].archivedAt, null);
	});

	it("aggregates UTC month boundaries by currency, including archived and unclassified expenses", async () => {
		const category = await create();
		const period = utcMonth(new Date("2026-10-15T12:00:00Z"));
		for (const [amountMinor, currency, categoryId, occurredAt, userId] of [
			[1050, "USD", category.id, "2026-10-01T00:00:00Z", "owner"],
			[500, "USD", category.id, "2026-10-31T23:59:59.999Z", "owner"],
			[2000, "ARS", category.id, "2026-10-20T12:00:00Z", "owner"],
			[700, "JPY", null, "2026-10-02T12:00:00Z", "owner"],
			[999, "USD", category.id, "2026-09-30T23:59:59.999Z", "owner"],
			[999, "USD", category.id, "2026-11-01T00:00:00Z", "owner"],
			[999, "USD", null, "2026-10-02T12:00:00Z", "other"],
		] as const) {
			await db.insert(expenses).values({
				userId,
				categoryId,
				originalText: "test expense",
				amountMinor,
				currency,
				occurredAt: new Date(occurredAt),
			});
		}
		await mutateCategory(db, "owner", { intent: "archive", id: category.id });
		const summaries = await monthlyExpenseSummaries(db, "owner", period);
		assert.deepEqual(summaries.get(category.id), {
			expenseCount: 3,
			totals: [
				{ currency: "ARS", amountMinor: 2000 },
				{ currency: "USD", amountMinor: 1550 },
			],
		});
		assert.deepEqual(summaries.get(null), {
			expenseCount: 1,
			totals: [{ currency: "JPY", amountMinor: 700 }],
		});
		assert.equal(combineSummaries([...summaries.values()]).expenseCount, 4);
		assert.equal(
			(
				await db
					.select()
					.from(expenses)
					.where(eq(expenses.categoryId, category.id))
			).length,
			5,
		);
		assert.deepEqual(combineSummaries([]), emptySummary);
	});

	it("migrates existing categories without losing authored content", async () => {
		const old = createClient({ url: ":memory:" });
		try {
			for (const migration of migrations.slice(0, -1))
				await old.executeMultiple(migration);
			await old.execute(
				"INSERT INTO users (id, clerk_user_id, created_at, updated_at) VALUES ('legacy', 'clerk-legacy', 0, 0)",
			);
			await old.execute(
				"INSERT INTO categories (id, user_id, name, name_key, description) VALUES ('legacy', 'legacy', 'Personal', 'personal', 'Keep this')",
			);
			await old.executeMultiple(migrations[migrations.length - 1]);
			const result = await old.execute(
				"SELECT name, description, emoji FROM categories",
			);
			assert.deepEqual(
				{ ...result.rows[0] },
				{ name: "Personal", description: "Keep this", emoji: "🛒" },
			);
		} finally {
			old.close();
		}
	});
});
