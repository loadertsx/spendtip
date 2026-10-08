import { z } from "zod";
import { categoryEmojis } from "./category-options";

export const nameMaxLength = 40;
export const descriptionMaxLength = 280;

export const categoryDraftSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Give it a name.")
		.max(nameMaxLength, "Use 40 characters or fewer."),
	description: z
		.string()
		.trim()
		.min(1, "Tell us what goes here so we can sort it for you.")
		.max(descriptionMaxLength, "Use 280 characters or fewer."),
	emoji: z.enum(categoryEmojis, { error: "Choose an emoji from the list." }),
});

const categoryId = z.uuid({ error: "This category could not be found." });
export const categoryMutationSchema = z.discriminatedUnion("intent", [
	categoryDraftSchema.extend({ intent: z.literal("create") }),
	categoryDraftSchema.extend({ intent: z.literal("update"), id: categoryId }),
	z.object({ intent: z.literal("archive"), id: categoryId }),
	z.object({ intent: z.literal("restore"), id: categoryId }),
]);

export type CategoryDraft = z.infer<typeof categoryDraftSchema>;
export type CategoryMutation = z.infer<typeof categoryMutationSchema>;
export type CategoryFieldErrors = Partial<Record<keyof CategoryDraft, string>>;
export const emptyDraft: CategoryDraft = {
	name: "",
	description: "",
	emoji: "🛒",
};

/** Maps only editable fields to inline errors; malformed operations get a general error. */
export function categoryValidationErrors(error: z.ZodError): {
	fieldErrors: CategoryFieldErrors;
	formError?: string;
} {
	const fieldErrors: CategoryFieldErrors = {};
	let formError: string | undefined;
	for (const issue of error.issues) {
		const field = issue.path[0];
		if (field === "name" || field === "description" || field === "emoji") {
			fieldErrors[field] ??= issue.message;
		} else {
			formError = "This request is invalid. Refresh the page and try again.";
		}
	}
	return { fieldErrors, formError };
}
