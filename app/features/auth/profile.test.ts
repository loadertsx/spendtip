import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toUserProfile } from "./profile";

const profile = {
	id: "user_test",
	primaryEmailAddressId: "email_primary",
	emailAddresses: [
		{ id: "email_secondary", emailAddress: "secondary@example.com" },
		{ id: "email_primary", emailAddress: "primary@example.com" },
	],
	firstName: " Ada ",
	lastName: " Lovelace ",
	imageUrl: "https://img.clerk.com/avatar.png",
};

describe("initial Spendtip user profile", () => {
	it("copies the primary email, trimmed full name, avatar, and stable Clerk ID", () => {
		assert.deepEqual(toUserProfile(profile), {
			clerkUserId: "user_test",
			email: "primary@example.com",
			name: "Ada Lovelace",
			avatarUrl: "https://img.clerk.com/avatar.png",
		});
	});

	it("allows identities without email, name, or avatar", () => {
		assert.deepEqual(
			toUserProfile({
				...profile,
				primaryEmailAddressId: null,
				emailAddresses: [],
				firstName: null,
				lastName: null,
				imageUrl: null,
			}),
			{ clerkUserId: "user_test", email: null, name: null, avatarUrl: null },
		);
	});

	it("does not substitute a secondary email when the primary one is missing", () => {
		assert.equal(
			toUserProfile({ ...profile, primaryEmailAddressId: "missing" }).email,
			null,
		);
	});

	it("treats whitespace-only names and empty avatar URLs as absent", () => {
		const result = toUserProfile({
			...profile,
			firstName: "  ",
			lastName: "",
			imageUrl: "  ",
		});
		assert.equal(result.name, null);
		assert.equal(result.avatarUrl, null);
	});

	it("supports either name part on its own", () => {
		assert.equal(
			toUserProfile({ ...profile, firstName: null }).name,
			"Lovelace",
		);
		assert.equal(toUserProfile({ ...profile, lastName: null }).name, "Ada");
	});

	it("never adds timestamps or internal IDs to the identity snapshot", () => {
		assert.deepEqual(Object.keys(toUserProfile(profile)).sort(), [
			"avatarUrl",
			"clerkUserId",
			"email",
			"name",
		]);
	});
});
