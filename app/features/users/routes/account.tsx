import { useState } from "react";
import { data } from "react-router";
import { requireSpendtipUser } from "~/features/auth/session.server";
import type { Route } from "./+types/account";

export function meta(_: Route.MetaArgs) {
	return [{ title: "Account · Spendtip" }];
}

export async function loader(args: Route.LoaderArgs) {
	const user = await requireSpendtipUser(args);
	return data(
		{
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				avatarUrl: user.avatarUrl,
				createdAt: user.createdAt.toISOString(),
				updatedAt: user.updatedAt.toISOString(),
			},
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}

// Fixed to UTC so server and client render the same string.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
	day: "2-digit",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	timeZone: "UTC",
});

function Timestamp({ iso }: { iso: string }) {
	return (
		<time dateTime={iso} className="tabular-nums">
			{dateFormat.format(new Date(iso))} UTC
		</time>
	);
}

function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			className="shrink-0 rounded-full border-2 border-rule px-3 py-0.5 text-xs font-bold hover:border-ink"
			onClick={async () => {
				await navigator.clipboard.writeText(value);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
		>
			{copied ? "Copied" : "Copy"}
		</button>
	);
}

export default function Component({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData;
	const rows: [string, React.ReactNode][] = [
		["Name", user.name ?? <span className="text-muted">Not provided</span>],
		["Email", user.email ?? <span className="text-muted">Not provided</span>],
		[
			"User ID",
			<span key="id" className="flex items-center justify-between gap-4">
				<span className="truncate font-mono text-[13px]">{user.id}</span>
				<CopyButton value={user.id} />
			</span>,
		],
		["Created", <Timestamp key="c" iso={user.createdAt} />],
		["Updated", <Timestamp key="u" iso={user.updatedAt} />],
	];

	return (
		<main className="mx-auto max-w-xl px-4 pt-10 pb-24">
			<div className="flex flex-col items-center text-center">
				{user.avatarUrl ? (
					<img
						src={user.avatarUrl}
						alt=""
						className="size-24 rounded-full object-cover ring-4 ring-surface shadow-md"
					/>
				) : (
					<span className="flex size-24 items-center justify-center rounded-full bg-cat-purple text-4xl font-black text-white">
						{(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
					</span>
				)}
				<h1 className="mt-5 text-4xl font-black tracking-tight">
					{user.name ?? "Your account"}
				</h1>
				{user.email ? <p className="mt-1 text-muted">{user.email}</p> : null}
			</div>

			<dl className="card mt-10 divide-y divide-rule">
				{rows.map(([term, value]) => (
					<div
						key={term}
						className="grid grid-cols-1 gap-1 px-6 py-4 sm:grid-cols-[8rem_1fr] sm:gap-4"
					>
						<dt className="text-sm font-bold text-muted">{term}</dt>
						<dd className="min-w-0">{value}</dd>
					</div>
				))}
			</dl>
		</main>
	);
}
