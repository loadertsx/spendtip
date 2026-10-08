import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it } from "node:test";
import { type Client, createClient } from "@libsql/client";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { relations } from "../../shared/db/relations";
import { categoryNameFields } from "../categories/category-name";
import { categories } from "../categories/schema";
import { users } from "../users/schema";
import { expenses } from "./schema";

const migrationRoot = new URL("../../../drizzle/", import.meta.url);
const migrations = readdirSync(migrationRoot, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort()
	.map((name) => ({
		name,
		sql: readFileSync(new URL(`${name}/migration.sql`, migrationRoot), "utf8"),
	}));
const userId = "test-user";
const otherUserId = "other-user";
const occurredAt = new Date("2026-10-01T12:00:00.000Z");
const uuidPattern = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

function isUniqueNameViolation(error: unknown): boolean {
	return (
		error instanceof Error &&
		error.cause instanceof Error &&
		/UNIQUE constraint failed: categories.user_id, categories.name_key/.test(
			error.cause.message,
		)
	);
}

describe("user-owned categories and expense persistence", () => {
	let client: Client;
	let db: ReturnType<typeof drizzle<typeof relations>>;

	beforeEach(async () => {
		client = createClient({ url: ":memory:" });
		db = drizzle({ client, relations });
		await client.execute("PRAGMA foreign_keys = ON");
		for (const migration of migrations) {
			await client.executeMultiple(migration.sql);
		}
		await db.insert(users).values([
			{ id: userId, clerkUserId: "clerk-test" },
			{ id: otherUserId, clerkUserId: "clerk-other" },
		]);
	});

	afterEach(() => {
		client.close();
	});

	async function createCategory(ownerId = userId, name = "Café con amigos") {
		const [category] = await db
			.insert(categories)
			.values({
				userId: ownerId,
				...categoryNameFields(name),
				description: "Coffee and snacks shared with friends.",
			})
			.returning();
		return category;
	}

	async function insertExpense(
		overrides: {
			userId?: string | null;
			categoryId?: string | null;
			amountMinor?: number;
			currency?: string;
		} = {},
	) {
		const values = {
			userId,
			categoryId: null,
			amountMinor: 1050,
			currency: "ARS",
			...overrides,
		};
		return client.execute({
			sql: `INSERT INTO expenses
				(id, user_id, category_id, original_text, amount_minor, currency, occurred_at, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			args: [
				crypto.randomUUID(),
				values.userId,
				values.categoryId,
				"almuerzo 10,50",
				values.amountMinor,
				values.currency,
				occurredAt.getTime(),
				occurredAt.getTime(),
			],
		});
	}

	it("starts with no categories and does not create defaults for new users", async () => {
		assert.deepEqual(await db.select().from(categories), []);
		await db.insert(users).values({ clerkUserId: "clerk-new" });
		assert.deepEqual(await db.select().from(categories), []);
		const columns = await client.execute("PRAGMA table_info('categories')");
		assert.deepEqual(
			columns.rows.map((row) => row.name),
			[
				"id",
				"user_id",
				"name",
				"description",
				"archived_at",
				"name_key",
				"emoji",
			],
		);
	});

	it("preserves user-authored names and descriptions without translation", async () => {
		const category = await createCategory();
		assert.match(category.id, uuidPattern);
		assert.equal(category.userId, userId);
		assert.equal(category.name, "Café con amigos");
		assert.equal(
			category.description,
			"Coffee and snacks shared with friends.",
		);
		assert.equal(category.archivedAt, null);
		assert.equal(category.emoji, "🛒");
	});

	it("requires category metadata and an existing owner", async () => {
		for (const column of ["user_id", "name", "name_key", "description"]) {
			await assert.rejects(
				client.execute({
					sql: "INSERT INTO categories (id, user_id, name, name_key, description) VALUES (?, ?, ?, ?, ?)",
					args: [
						crypto.randomUUID(),
						column === "user_id" ? null : userId,
						column === "name" ? null : "Personal",
						column === "name_key" ? null : "personal",
						column === "description" ? null : "Personal expenses",
					],
				}),
				/NOT NULL constraint/,
			);
		}
		await assert.rejects(
			client.execute(
				"INSERT INTO categories (id, user_id, name, name_key, description) VALUES ('missing', 'missing-user', 'Personal', 'personal', 'Personal expenses')",
			),
			/FOREIGN KEY constraint/,
		);
	});

	it("keeps categories separate even when users choose the same name", async () => {
		const first = await createCategory();
		const second = await createCategory(otherUserId);
		assert.equal(first.name, second.name);
		assert.notEqual(first.id, second.id);
		assert.deepEqual(
			await db.select().from(categories).where(eq(categories.userId, userId)),
			[first],
		);
	});

	it("rejects duplicate active names including Unicode case and encoding variants", async () => {
		for (const variants of [
			["CAFÉ", " café ", "CAFE\u0301"],
			["NIÑO", " niño ", "NIN\u0303O"],
		]) {
			await createCategory(userId, variants[0]);
			for (const name of variants.slice(1)) {
				await assert.rejects(
					createCategory(userId, name),
					isUniqueNameViolation,
				);
			}
			await createCategory(otherUserId, variants[0]);
		}
		await createCategory(userId, "cafe");
		await createCategory(userId, "nino");
	});

	it("rejects renaming an active category to another active name", async () => {
		await createCategory(userId, "CAFÉ");
		const other = await createCategory(userId, "Transport");
		await assert.rejects(
			db
				.update(categories)
				.set(categoryNameFields(" café "))
				.where(eq(categories.id, other.id)),
			isUniqueNameViolation,
		);
		const [stored] = await db
			.select()
			.from(categories)
			.where(eq(categories.id, other.id));
		assert.equal(stored.name, "Transport");
		assert.equal(stored.nameKey, "transport");
	});

	it("allows archived-name reuse but rejects conflicting restoration", async () => {
		const old = await createCategory(userId, "NIÑO");
		await db
			.update(categories)
			.set({ archivedAt: new Date() })
			.where(eq(categories.id, old.id));
		const replacement = await createCategory(userId, "niño");
		await assert.rejects(
			db
				.update(categories)
				.set({ archivedAt: null })
				.where(eq(categories.id, old.id)),
			isUniqueNameViolation,
		);
		await db
			.update(categories)
			.set({ archivedAt: new Date() })
			.where(eq(categories.id, replacement.id));
		await db
			.update(categories)
			.set({ archivedAt: null })
			.where(eq(categories.id, old.id));
		await assert.rejects(createCategory(userId, "niño"), isUniqueNameViolation);
	});

	it("stores unclassified expenses and applies Drizzle UUID and timestamp defaults", async () => {
		const before = Date.now();
		const [expense] = await db
			.insert(expenses)
			.values({
				userId,
				originalText: "almuerzo 10,50",
				amountMinor: 1050,
				currency: "ARS",
				occurredAt,
			})
			.returning();
		assert.match(expense.id, uuidPattern);
		assert.equal(expense.userId, userId);
		assert.equal(expense.categoryId, null);
		assert.equal(expense.originalText, "almuerzo 10,50");
		assert.equal(expense.amountMinor, 1050);
		assert.equal(expense.currency, "ARS");
		assert.equal(expense.occurredAt.getTime(), occurredAt.getTime());
		assert.ok(expense.createdAt.getTime() >= before);
		assert.ok(expense.createdAt.getTime() <= Date.now());
		const stored = await client.execute(
			"SELECT occurred_at, created_at FROM expenses",
		);
		assert.equal(stored.rows[0].occurred_at, occurredAt.getTime());
		assert.equal(stored.rows[0].created_at, expense.createdAt.getTime());
	});

	it("accepts a category only when it belongs to the expense owner", async () => {
		const category = await createCategory();
		await insertExpense({ categoryId: category.id });
		await assert.rejects(
			insertExpense({ userId: otherUserId, categoryId: category.id }),
			/FOREIGN KEY constraint/,
		);
	});

	it("rejects ownership mismatches when updating existing records", async () => {
		const own = await createCategory();
		const foreign = await createCategory(otherUserId, "Transport");
		await insertExpense({ categoryId: own.id });
		for (const statement of [
			{ sql: "UPDATE expenses SET category_id = ?", args: [foreign.id] },
			{ sql: "UPDATE expenses SET user_id = ?", args: [otherUserId] },
			{
				sql: "UPDATE categories SET user_id = ? WHERE id = ?",
				args: [otherUserId, own.id],
			},
		]) {
			await assert.rejects(client.execute(statement), /FOREIGN KEY constraint/);
		}
	});

	it("archives categories without losing expenses and excludes them from active lists", async () => {
		const archived = await createCategory();
		const active = await createCategory(userId, "Transport");
		await createCategory(otherUserId);
		await insertExpense({ categoryId: archived.id });
		const before = await db.select().from(expenses);
		const archivedAt = new Date("2026-10-04T12:00:00.000Z");
		await db
			.update(categories)
			.set({ archivedAt })
			.where(eq(categories.id, archived.id));
		const activeCategories = await db
			.select()
			.from(categories)
			.where(and(eq(categories.userId, userId), isNull(categories.archivedAt)));
		assert.deepEqual(activeCategories, [active]);
		assert.deepEqual(await db.select().from(expenses), before);
		const [stored] = await db
			.select()
			.from(categories)
			.where(eq(categories.id, archived.id));
		assert.equal(stored.archivedAt?.getTime(), archivedAt.getTime());
	});

	it("requires an existing expense user and rejects nonexistent categories", async () => {
		await assert.rejects(
			insertExpense({ userId: null }),
			/NOT NULL constraint/,
		);
		await assert.rejects(
			insertExpense({ userId: "missing-user" }),
			/FOREIGN KEY constraint/,
		);
		await assert.rejects(
			insertExpense({ categoryId: "missing-category" }),
			/FOREIGN KEY constraint/,
		);
	});

	it("prevents deleting users or categories with dependent records", async () => {
		const category = await createCategory();
		await assert.rejects(
			client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] }),
			/FOREIGN KEY constraint/,
		);
		await insertExpense({ categoryId: category.id });
		await assert.rejects(
			client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] }),
			/FOREIGN KEY constraint/,
		);
		await assert.rejects(
			client.execute({
				sql: "DELETE FROM categories WHERE id = ?",
				args: [category.id],
			}),
			/FOREIGN KEY constraint/,
		);
	});

	it("accepts only positive, safely representable integer amounts", async () => {
		for (const amountMinor of [0, -1, 10.5, Number.MAX_SAFE_INTEGER + 1]) {
			await assert.rejects(
				insertExpense({ amountMinor }),
				/CHECK constraint failed/,
			);
		}
		await insertExpense({ amountMinor: 1 });
		await insertExpense({ amountMinor: Number.MAX_SAFE_INTEGER });
	});

	it("requires a three-letter uppercase currency code", async () => {
		for (const currency of ["", "usd", "US", "USDD", "123"]) {
			await assert.rejects(
				insertExpense({ currency }),
				/CHECK constraint failed/,
			);
		}
		for (const currency of ["ARS", "USD", "EUR"]) {
			await insertExpense({ currency });
		}
	});

	it("indexes active categories and expense history by user", async () => {
		for (const [name, expected] of [
			["categories_user_archived_at_idx", ["user_id", "archived_at"]],
			["expenses_user_occurred_at_idx", ["user_id", "occurred_at"]],
		]) {
			const columns = await client.execute(`PRAGMA index_info('${name}')`);
			assert.deepEqual(
				columns.rows.map((row) => row.name),
				expected,
			);
		}
	});

	it("loads expense owners and optional categories with relational queries", async () => {
		const own = await createCategory();
		const foreign = await createCategory(otherUserId);
		await insertExpense({ categoryId: own.id });
		await insertExpense();
		await insertExpense({ userId: otherUserId, categoryId: foreign.id });
		const records = await db.query.expenses.findMany({
			where: { userId },
			with: { category: true, user: true },
		});
		assert.equal(records.length, 2);
		for (const record of records) {
			assert.equal(record.user.id, userId);
			assert.deepEqual(
				record.category,
				record.categoryId === null ? null : own,
			);
		}
	});

	it("loads users' categories and expenses, including reverse category relations", async () => {
		const own = await createCategory();
		await createCategory(otherUserId);
		await insertExpense({ categoryId: own.id });
		await insertExpense();
		await insertExpense({ userId: otherUserId });
		const user = await db.query.users.findFirst({
			where: { id: userId },
			with: {
				categories: { with: { user: true, expenses: true } },
				expenses: true,
			},
		});
		assert.ok(user);
		assert.equal(user.categories.length, 1);
		assert.equal(user.categories[0].id, own.id);
		assert.equal(user.categories[0].user.id, userId);
		assert.equal(user.categories[0].expenses.length, 1);
		assert.equal(user.categories[0].expenses[0].categoryId, own.id);
		assert.equal(user.expenses.length, 2);
		assert.ok(user.expenses.every((expense) => expense.userId === userId));
	});

	it("resets old categories and expenses but preserves every user field", async () => {
		const upgrade = createClient({ url: ":memory:" });
		const resetIndex = migrations.findIndex(
			(migration) => migration.name === "20261004141423_keen_warbound",
		);
		assert.ok(resetIndex > 0);
		try {
			await upgrade.execute("PRAGMA foreign_keys = ON");
			for (const migration of migrations.slice(0, resetIndex)) {
				await upgrade.executeMultiple(migration.sql);
			}
			await upgrade.execute(`INSERT INTO users
				(id, clerk_user_id, email, name, avatar_url, created_at, updated_at) VALUES
				('existing', 'clerk-existing', 'test@example.com', 'Test', NULL, 123, 456),
				('second', 'clerk-second', NULL, NULL, 'https://example.com/avatar.png', 789, 987)`);
			await upgrade.execute(`INSERT INTO expenses
				(id, user_id, category_id, original_text, amount_minor, currency, occurred_at, created_at) VALUES
				('classified', 'existing', (SELECT id FROM categories WHERE code = 'food'), 'Food', 1050, 'USD', 123, 456),
				('pending', 'second', NULL, 'Unknown', 200, 'ARS', 789, 987)`);
			const before = await upgrade.execute("SELECT * FROM users ORDER BY id");
			for (const migration of migrations.slice(resetIndex)) {
				await upgrade.executeMultiple(migration.sql);
			}
			assert.deepEqual(
				(await upgrade.execute("SELECT * FROM users ORDER BY id")).rows,
				before.rows,
			);
			for (const table of ["categories", "expenses"]) {
				const result = await upgrade.execute(
					`SELECT count(*) AS total FROM ${table}`,
				);
				assert.equal(result.rows[0].total, 0);
			}
			assert.deepEqual(
				(await upgrade.execute("PRAGMA foreign_key_check")).rows,
				[],
			);
			assert.equal(
				(await upgrade.execute("PRAGMA foreign_keys")).rows[0].foreign_keys,
				1,
			);
		} finally {
			upgrade.close();
		}
	});
});
