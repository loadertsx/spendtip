import type { NewUserProfile } from "../users/schema";

type ClerkProfile = {
	id: string;
	primaryEmailAddressId: string | null;
	emailAddresses: readonly { id: string; emailAddress: string }[];
	firstName: string | null;
	lastName: string | null;
	imageUrl: string | null;
};

/** Copies the identity's primary email and optional display profile into Spendtip. */
export function toUserProfile(profile: ClerkProfile): NewUserProfile {
	const primaryEmail = profile.emailAddresses.find(
		(email) => email.id === profile.primaryEmailAddressId,
	);
	const name = [profile.firstName?.trim(), profile.lastName?.trim()]
		.filter(Boolean)
		.join(" ");

	return {
		clerkUserId: profile.id,
		email: primaryEmail?.emailAddress ?? null,
		name: name || null,
		avatarUrl: profile.imageUrl?.trim() || null,
	};
}
