import { env } from "cloudflare:workers";
import {
	clerkClient,
	clerkMiddleware,
	rootAuthLoader,
} from "@clerk/react-router/server";
import type { LoaderFunctionArgs, MiddlewareFunction } from "react-router";

function getClerkOptions(request: Request) {
	const secretKey = env.CLERK_SECRET_KEY;
	const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY;

	if (!secretKey || !publishableKey) {
		throw new Error("Clerk keys must be configured in the Worker bindings.");
	}

	return {
		secretKey,
		publishableKey,
		authorizedParties: [new URL(request.url).origin],
		signInUrl: "/sign-in",
		signUpUrl: "/sign-up",
		signInFallbackRedirectUrl: "/me",
		signUpFallbackRedirectUrl: "/me",
	};
}

/** Authenticates using Worker bindings rather than Node process.env. */
export const clerkAuthMiddleware: MiddlewareFunction<Response> = (args, next) =>
	clerkMiddleware(getClerkOptions(args.request))(args, next);

/** Supplies Clerk's SSR state without exposing the secret key to the browser. */
export function loadClerkAuth(args: LoaderFunctionArgs) {
	return rootAuthLoader(args, getClerkOptions(args.request));
}

/** Loads the initial identity profile using the Worker's server-only credentials. */
export function loadClerkProfile(
	args: LoaderFunctionArgs,
	clerkUserId: string,
) {
	return clerkClient(args, getClerkOptions(args.request)).users.getUser(
		clerkUserId,
	);
}
