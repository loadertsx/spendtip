import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type CategoryItem, optimisticCategories } from "../category-state";

const category: CategoryItem = {
	id: "existing",
	name: "Food",
	description: "Groceries",
	emoji: "🍔",
	archived: false,
	summary: { expenseCount: 2, totals: [{ currency: "USD", amountMinor: 500 }] },
};

describe("optimistic category projections", () => {
	it("adds a provisional create and avoids duplication once the loader confirms it", () => {
		const mutation = {
			intent: "create" as const,
			name: "Coffee",
			description: "Coffee with friends",
			emoji: "☕" as const,
		};
		const displayed = optimisticCategories([category], mutation);
		assert.equal(displayed.length, 2);
		assert.equal(displayed[1].id, "pending-category");
		assert.deepEqual(displayed[1].summary, { expenseCount: 0, totals: [] });
		const confirmed = { ...displayed[1], id: "confirmed" };
		assert.deepEqual(
			optimisticCategories([category, confirmed], mutation, "confirmed"),
			[category, confirmed],
		);
	});
	it("projects edits without touching loader data or expense metrics", () => {
		const displayed = optimisticCategories([category], {
			intent: "update",
			id: category.id,
			name: "Lunch",
			description: "Lunch at work",
			emoji: "🍔",
		});
		assert.equal(displayed[0].name, "Lunch");
		assert.equal(category.name, "Food");
		assert.deepEqual(displayed[0].summary, category.summary);
		assert.deepEqual(optimisticCategories([category]), [category]);
	});
	it("moves archived/restored categories while keeping all expense associations and rolls back on failure", () => {
		const displayed = optimisticCategories([category], {
			intent: "archive",
			id: category.id,
		});
		assert.equal(displayed[0].archived, true);
		assert.deepEqual(displayed[0].summary, category.summary);
		assert.equal(
			optimisticCategories(displayed, { intent: "restore", id: category.id })[0]
				.archived,
			false,
		);
		assert.equal(optimisticCategories([category])[0].archived, false);
	});
});
