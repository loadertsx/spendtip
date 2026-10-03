import { useUser } from "@clerk/react-router";
import { requireSpendtipUser } from "~/features/auth/session.server";
import type { Route } from "./+types/me";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Overview · Spendtip" },
		{ name: "description", content: "Know exactly where your money goes." },
	];
}

export async function loader(args: Route.LoaderArgs) {
	await requireSpendtipUser(args);
	return null;
}

export default function Component() {
	const { user } = useUser();
	const month = new Date().toLocaleString("en-US", { month: "long" });

	return (
		<main className="mx-auto max-w-2xl px-4 pt-10 pb-24">
			<h1 className="text-center text-4xl font-black tracking-tight sm:text-5xl">
				Hey{user?.firstName ? `, ${user.firstName}` : ""}!
			</h1>

			<section className="card mt-10 p-8 text-center">
				<p className="label">{month} so far</p>
				<p className="mt-3 text-2xl font-bold text-balance sm:text-3xl">
					You've spent <span className="marker tabular-nums">$0.00</span> across{" "}
					<span className="tabular-nums">0</span> expenses.
				</p>
				<dl className="mt-8 grid grid-cols-2 gap-3">
					<div className="rounded-xl bg-paper p-4">
						<dt className="label">Income</dt>
						<dd className="mt-1 text-xl font-extrabold text-positive tabular-nums">
							$0.00
						</dd>
					</div>
					<div className="rounded-xl bg-paper p-4">
						<dt className="label">Left over</dt>
						<dd className="mt-1 text-xl font-extrabold tabular-nums">$0.00</dd>
					</div>
				</dl>
			</section>

			<section className="mt-10">
				<h2 className="text-xl font-extrabold">Latest expenses</h2>
				<div className="mt-4 rounded-2xl border-2 border-dashed border-rule px-6 py-12 text-center">
					<p className="text-lg font-bold">Nothing here yet.</p>
					<p className="mt-1 text-muted">
						When you log your first expense, it'll show up right here.
					</p>
				</div>
			</section>
		</main>
	);
}
