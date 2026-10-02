import {
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

// TODO: Add Clerk webhooks to synchronize email, name, and avatar.
// These fields are currently copied only when the local user is created.
export const users = sqliteTable(
	"users",
	{
		id: text("id")
			.notNull()
			.$defaultFn(() => crypto.randomUUID()),
		clerkUserId: text("clerk_user_id").notNull().unique(),
		email: text("email"),
		name: text("name"),
		avatarUrl: text("avatar_url"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date()),
	},
	(table) => [primaryKey({ columns: [table.id] })],
);

export type User = typeof users.$inferSelect;
export type NewUserProfile = Pick<
	typeof users.$inferInsert,
	"clerkUserId" | "email" | "name" | "avatarUrl"
>;
