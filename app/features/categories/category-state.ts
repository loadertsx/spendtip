import type { ExpenseSummary } from "./category-metrics";
import { emptySummary } from "./category-metrics";
import type { CategoryDraft, CategoryMutation } from "./category-validation";

export type CategoryItem = CategoryDraft & {
	id: string;
	archived: boolean;
	summary: ExpenseSummary;
};

/** Projects just the pending mutation; loader data is never changed and dropping it rolls back. */
export function optimisticCategories(
	categories: CategoryItem[],
	mutation?: CategoryMutation,
	createdId?: string,
): CategoryItem[] {
	if (!mutation) return categories;
	if (mutation.intent === "create") {
		if (createdId && categories.some((category) => category.id === createdId))
			return categories;
		return [
			...categories,
			{
				name: mutation.name,
				description: mutation.description,
				emoji: mutation.emoji,
				id: createdId ?? "pending-category",
				archived: false,
				summary: emptySummary,
			},
		];
	}
	return categories.map((category) => {
		if (category.id !== mutation.id) return category;
		if (mutation.intent === "update")
			return {
				...category,
				name: mutation.name,
				description: mutation.description,
				emoji: mutation.emoji,
			};
		return { ...category, archived: mutation.intent === "archive" };
	});
}
