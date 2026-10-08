import { sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	unique,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "../users/schema";

export const categories = sqliteTable(
	"categories",
	{
		id: text("id")
			.notNull()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		name: text("name").notNull(),
		// Always write with categoryNameFields; SQLite cannot normalize Unicode.
		nameKey: text("name_key").notNull(),
		// User-authored classification guidance; stored without translation.
		description: text("description").notNull(),
		emoji: text("emoji").notNull().default("🛒"),
		archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		primaryKey({ columns: [table.id] }),
		// SQLite requires a unique parent key for the expense ownership reference.
		unique("categories_user_id_id_unique").on(table.userId, table.id),
		index("categories_user_archived_at_idx").on(table.userId, table.archivedAt),
		uniqueIndex("categories_user_active_name_unique")
			.on(table.userId, table.nameKey)
			.where(sql`${table.archivedAt} IS NULL`),
	],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
