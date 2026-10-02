import { eq } from "drizzle-orm";
import { getDb } from "~/shared/db/client.server";
import { type NewUserProfile, type User, users } from "./schema";

/** Finds the Spendtip user linked to a verified Clerk identity. */
export async function findUserByClerkId(
	clerkUserId: string,
): Promise<User | null> {
	return (
		(await getDb()
			.select()
			.from(users)
			.where(eq(users.clerkUserId, clerkUserId))
			.get()) ?? null
	);
}

/** Creates the profile once, returning the existing user if another request wins. */
export async function createUserIfAbsent(
	profile: NewUserProfile,
): Promise<User> {
	const now = new Date();
	const created = await getDb()
		.insert(users)
		.values({ ...profile, createdAt: now, updatedAt: now })
		.onConflictDoNothing({ target: users.clerkUserId })
		.returning()
		.get();

	if (created) return created;

	const existing = await findUserByClerkId(profile.clerkUserId);
	if (!existing) {
		throw new Error("The Spendtip user could not be resolved after creation.");
	}
	return existing;
}
