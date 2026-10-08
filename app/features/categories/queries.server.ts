import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { SQLiteAsyncDatabase } from "drizzle-orm/sqlite-core";
import { categoryNameFields } from "./category-name";
import type { CategoryMutation } from "./category-validation";
import { type Category, categories } from "./schema";

type CategoryDatabase = Pick<
	SQLiteAsyncDatabase<"async", unknown>,
	"select" | "insert" | "update"
>;

/** Lists all owned categories; archived records remain visible with their historical expenses. */
export function listCategories(db: CategoryDatabase, userId: string) {
	return db
		.select()
		.from(categories)
		.where(eq(categories.userId, userId))
		.orderBy(asc(categories.nameKey), asc(categories.id))
		.all();
}

export type CategoryMutationResult =
	| { ok: true; category: Category }
	| { ok: false; reason: "duplicate_name" | "not_found" };

/** Applies one validated operation, enforcing ownership and race-safe active-name uniqueness. */
export async function mutateCategory(
	db: CategoryDatabase,
	userId: string,
	input: CategoryMutation,
): Promise<CategoryMutationResult> {
	try {
		let category: Category | undefined;
		if (input.intent === "create") {
			category = await db
				.insert(categories)
				.values({
					userId,
					...categoryNameFields(input.name),
					description: input.description,
					emoji: input.emoji,
				})
				.returning()
				.get();
		} else {
			const owned = and(
				eq(categories.id, input.id),
				eq(categories.userId, userId),
			);
			if (input.intent === "update") {
				category = await db
					.update(categories)
					.set({
						...categoryNameFields(input.name),
						description: input.description,
						emoji: input.emoji,
					})
					.where(and(owned, isNull(categories.archivedAt)))
					.returning()
					.get();
			} else {
				// Repeated archives preserve the original timestamp; repeated restores are no-ops.
				category = await db
					.update(categories)
					.set({
						archivedAt:
							input.intent === "archive"
								? sql`coalesce(${categories.archivedAt}, ${Date.now()})`
								: null,
					})
					.where(owned)
					.returning()
					.get();
			}
		}
		if (!category && input.intent === "create")
			throw new Error("Category insert returned no record.");
		return category
			? { ok: true, category }
			: { ok: false, reason: "not_found" };
	} catch (error) {
		if (isActiveNameConflict(error))
			return { ok: false, reason: "duplicate_name" };
		throw error;
	}
}

// Drizzle wraps driver errors in `cause`; D1 and libSQL expose the same SQLite constraint text.
function isActiveNameConflict(error: unknown): boolean {
	const seen = new Set<unknown>();
	while (error instanceof Error && !seen.has(error)) {
		seen.add(error);
		if (
			error.message.includes(
				"UNIQUE constraint failed: categories.user_id, categories.name_key",
			)
		)
			return true;
		error = error.cause;
	}
	return false;
}
