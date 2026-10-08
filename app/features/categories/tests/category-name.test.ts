import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categoryNameFields, normalizeCategoryName } from "../category-name";

describe("category name keys", () => {
	it("ignores outer whitespace, case, and Unicode encoding differences", () => {
		for (const [name, expected] of [
			["\t CAFÉ \n", "café"],
			["CAFE\u0301", "café"],
			[" NIÑO ", "niño"],
			["NIN\u0303O", "niño"],
		]) {
			assert.equal(normalizeCategoryName(name), expected);
		}
	});

	it("keeps accents and internal whitespace significant", () => {
		assert.notEqual(
			normalizeCategoryName("niño"),
			normalizeCategoryName("nino"),
		);
		assert.notEqual(
			normalizeCategoryName("café"),
			normalizeCategoryName("cafe"),
		);
		assert.equal(normalizeCategoryName("Food  shopping"), "food  shopping");
	});

	it("keeps the original name together with its derived key", () => {
		assert.deepEqual(categoryNameFields(" CAFÉ "), {
			name: " CAFÉ ",
			nameKey: "café",
		});
	});
});
