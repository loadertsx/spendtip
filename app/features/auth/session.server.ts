import { getAuth } from "@clerk/react-router/server";
import { createContext, type LoaderFunctionArgs, redirect } from "react-router";
import { createUserIfAbsent, findUserByClerkId } from "../users/queries.server";
import type { User } from "../users/schema";
import { loadClerkProfile } from "./clerk.server";
import { toUserProfile } from "./profile";

const spendtipUserContext = createContext<Promise<User | null> | null>(null);

async function resolveSpendtipUser(
	args: LoaderFunctionArgs,
): Promise<User | null> {
	const auth = await getAuth(args, { acceptsToken: "session_token" });
	if (!auth.userId) return null;

	const existing = await findUserByClerkId(auth.userId);
	if (existing) return existing;

	const profile = await loadClerkProfile(args, auth.userId);
	return createUserIfAbsent(toUserProfile(profile));
}

/** Returns the verified identity's Spendtip user, provisioning it on first access.
 * Parallel callers share the same resolution, including failures, only within this request.
 */
export function getSpendtipUser(
	args: LoaderFunctionArgs,
): Promise<User | null> {
	const cached = args.context.get(spendtipUserContext);
	if (cached) return cached;

	const resolution = resolveSpendtipUser(args);
	args.context.set(spendtipUserContext, resolution);
	return resolution;
}

/** Requires a verified session and Spendtip user in a loader/action.
 * Callers must additionally enforce permissions and resource ownership.
 */
export async function requireSpendtipUser(
	args: LoaderFunctionArgs,
): Promise<User> {
	const user = await getSpendtipUser(args);
	if (!user) {
		throw redirect("/sign-in", {
			headers: { "Cache-Control": "private, no-store" },
		});
	}
	return user;
}
