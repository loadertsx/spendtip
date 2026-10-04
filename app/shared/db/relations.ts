import { defineRelations } from "drizzle-orm";
import { categories } from "../../features/categories/schema";
import { expenses } from "../../features/expenses/schema";
import { users } from "../../features/users/schema";

/** Query metadata only; ownership constraints remain in the feature schemas. */
export const relations = defineRelations(
	{ users, categories, expenses },
	(r) => ({
		users: {
			categories: r.many.categories({
				from: r.users.id,
				to: r.categories.userId,
			}),
			expenses: r.many.expenses({
				from: r.users.id,
				to: r.expenses.userId,
			}),
		},
		categories: {
			user: r.one.users({
				from: r.categories.userId,
				to: r.users.id,
				optional: false,
			}),
			expenses: r.many.expenses({
				from: [r.categories.userId, r.categories.id],
				to: [r.expenses.userId, r.expenses.categoryId],
			}),
		},
		expenses: {
			user: r.one.users({
				from: r.expenses.userId,
				to: r.users.id,
				optional: false,
			}),
			category: r.one.categories({
				from: [r.expenses.userId, r.expenses.categoryId],
				to: [r.categories.userId, r.categories.id],
				optional: true,
			}),
		},
	}),
);
