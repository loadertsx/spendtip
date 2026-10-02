import { ClerkProvider } from "@clerk/react-router";
import {
	data,
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";
import { AuthControls } from "~/features/auth/auth-controls";
import {
	clerkAuthMiddleware,
	loadClerkAuth,
} from "~/features/auth/clerk.server";
import { getSpendtipUser } from "~/features/auth/session.server";
import { themeScript } from "~/features/theme/theme-toggle";

import type { Route } from "./+types/root";
import "./app.css";

export const middleware: Route.MiddlewareFunction[] = [clerkAuthMiddleware];

export async function loader(args: Route.LoaderArgs) {
	await getSpendtipUser(args);
	return data(await loadClerkAuth(args), { headers: headers() });
}

export function headers() {
	return { "Cache-Control": "private, no-store" };
}

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		// themeScript sets data-theme before hydration, which React would flag.
		<html lang="en" suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, first-party script */}
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App({ loaderData }: Route.ComponentProps) {
	return (
		<ClerkProvider loaderData={loaderData} appearance={clerkAppearance}>
			<header>
				<AuthControls />
			</header>
			<Outlet />
		</ClerkProvider>
	);
}

// Theme tokens come from app.css, so Clerk follows light/dark automatically.
const clerkAppearance = {
	variables: {
		colorPrimary: "var(--color-ink)",
		colorPrimaryForeground: "var(--color-paper)",
		colorForeground: "var(--color-ink)",
		colorMutedForeground: "var(--color-muted)",
		colorBackground: "var(--color-surface)",
		colorInput: "var(--color-surface)",
		colorInputForeground: "var(--color-ink)",
		colorBorder: "var(--color-rule)",
		colorRing: "var(--color-accent)",
		colorDanger: "var(--color-negative)",
		colorSuccess: "var(--color-positive)",
		fontFamily: "var(--font-sans)",
		borderRadius: "0.75rem",
	},
	// Clerk's own styles outrank Tailwind's layered utilities, so use style objects.
	elements: {
		cardBox: {
			border: "1px solid var(--color-rule)",
			borderRadius: "1rem",
			boxShadow: "0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.04)",
		},
		card: { boxShadow: "none" },
		formButtonPrimary: {
			borderRadius: "9999px",
			fontWeight: 700,
			boxShadow: "none",
			backgroundImage: "none",
		},
		socialButtonsBlockButton: {
			borderRadius: "9999px",
			border: "2px solid var(--color-rule) !important",
			boxShadow: "none",
		},
		formFieldInput: {
			border: "2px solid var(--color-rule) !important",
			boxShadow: "none",
		},
	},
};

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Well, that's not right.";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "We couldn't find that page." : message;
		details =
			error.status === 404
				? "It may have moved, or the link might be off by a character or two."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="mx-auto max-w-2xl px-4 py-20 text-center">
			<h1 className="text-4xl font-black tracking-tight text-balance">
				{message}
			</h1>
			<p className="mt-4 text-lg text-muted">{details}</p>
			<a href="/" className="btn-primary mt-8">
				Take me home
			</a>
			{stack && (
				<pre className="card mt-10 w-full overflow-x-auto p-4 text-left font-mono text-xs">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
