import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { SQLiteAsyncDatabase } from "drizzle-orm/sqlite-core";
import {
	combineSummaries,
	type ExpenseSummary,
} from "../categories/category-metrics";
import { expenses } from "./schema";

/** Returns owned expense summaries keyed by category; null is the unclassified bucket.
 * Archived categories are deliberately included. Periods are half-open and use occurredAt.
 */
export async function monthlyExpenseSummaries(
	db: Pick<SQLiteAsyncDatabase<"async", unknown>, "select">,
	userId: string,
	period: { start: Date; end: Date },
): Promise<Map<string | null, ExpenseSummary>> {
	const rows = await db
		.select({
			categoryId: expenses.categoryId,
			currency: expenses.currency,
			expenseCount: sql<number>`count(*)`.mapWith(Number),
			amountMinor: sql<number>`sum(${expenses.amountMinor})`.mapWith(Number),
		})
		.from(expenses)
		.where(
			and(
				eq(expenses.userId, userId),
				gte(expenses.occurredAt, period.start),
				lt(expenses.occurredAt, period.end),
			),
		)
		.groupBy(expenses.categoryId, expenses.currency)
		.all();
	const summaries = new Map<string | null, ExpenseSummary>();
	for (const row of rows) {
		const summary = {
			expenseCount: row.expenseCount,
			totals: [{ currency: row.currency, amountMinor: row.amountMinor }],
		};
		const existing = summaries.get(row.categoryId);
		summaries.set(
			row.categoryId,
			combineSummaries(existing ? [existing, summary] : [summary]),
		);
	}
	return summaries;
}
