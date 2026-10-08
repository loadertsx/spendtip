import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	categoryDraftSchema,
	categoryMutationSchema,
	categoryValidationErrors,
} from "../category-validation";

describe("category form validation", () => {
	it("trims authored fields and ignores submitted ownership", () => {
		assert.deepEqual(
			categoryMutationSchema.parse({
				intent: "create",
				name: " Café ",
				description: " Coffee ",
				emoji: "☕",
				userId: "someone-else",
			}),
			{ intent: "create", name: "Café", description: "Coffee", emoji: "☕" },
		);
	});
	it("returns inline errors for empty, oversized and invalid fields", () => {
		for (const name of [" ", "a".repeat(41)]) {
			const result = categoryDraftSchema.safeParse({
				name,
				description: " ",
				emoji: "invalid",
			});
			assert.equal(result.success, false);
			if (!result.success) {
				assert.deepEqual(
					Object.keys(
						categoryValidationErrors(result.error).fieldErrors,
					).sort(),
					["description", "emoji", "name"],
				);
			}
		}
		assert.equal(
			categoryDraftSchema.safeParse({
				name: "Food",
				description: "a".repeat(281),
				emoji: "🍔",
			}).success,
			false,
		);
	});
	it("validates operation and target IDs", () => {
		for (const input of [
			{ intent: "delete" },
			{ intent: "restore", id: "not-an-id" },
		]) {
			const result = categoryMutationSchema.safeParse(input);
			assert.equal(result.success, false);
			if (!result.success)
				assert.ok(categoryValidationErrors(result.error).formError);
		}
	});
});
