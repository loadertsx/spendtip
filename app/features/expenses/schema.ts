import { sql } from "drizzle-orm";
import {
	check,
	foreignKey,
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { categories } from "../categories/schema";
import { users } from "../users/schema";

export const expenses = sqliteTable(
	"expenses",
	{
		id: text("id")
			.notNull()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		// NULL means pending classification; assigned categories must belong to this user.
		categoryId: text("category_id"),
		originalText: text("original_text").notNull(),
		// Smallest currency unit, e.g. 1050 represents USD 10.50.
		amountMinor: integer("amount_minor").notNull(),
		currency: text("currency").notNull(),
		occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		primaryKey({ columns: [table.id] }),
		foreignKey({
			name: "expenses_user_category_fk",
			columns: [table.userId, table.categoryId],
			foreignColumns: [categories.userId, categories.id],
		}).onDelete("restrict"),
		index("expenses_user_occurred_at_idx").on(table.userId, table.occurredAt),
		// SQLite integer affinity alone also accepts fractions; JS must read amounts exactly.
		check(
			"expenses_amount_minor_check",
			sql`typeof(${table.amountMinor}) = 'integer' AND ${table.amountMinor} > 0 AND ${table.amountMinor} <= 9007199254740991`,
		),
		check(
			"expenses_currency_check",
			sql`${table.currency} GLOB '[A-Z][A-Z][A-Z]'`,
		),
	],
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
