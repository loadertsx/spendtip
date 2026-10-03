import { Show, SignUpButton } from "@clerk/react-router";
import type { ReactNode } from "react";
import { Link } from "react-router";

export function Landing() {
	return (
		<main className="pb-24">
			<section className="mx-auto max-w-5xl px-4 pt-16 text-center sm:pt-24">
				<h1 className="mx-auto max-w-3xl text-5xl font-black tracking-tight text-balance sm:text-7xl">
					Know exactly where <span className="marker">your money</span> goes.
				</h1>
				<p className="mx-auto mt-6 max-w-xl text-lg text-muted sm:text-xl">
					Spendtip is a simple, friendly ledger for everyday spending. Write it
					down, look back, spend better. That's it.
				</p>
				<SignUpCta />
			</section>

			<div className="mx-auto mt-28 flex max-w-5xl flex-col gap-24 px-4 sm:gap-32">
				<Feature
					title={<>Jot it down before you forget.</>}
					body="What, how much, which bucket. Three taps and it's in the books — while you're still holding the receipt."
					sample={<EntrySample />}
				/>
				<Feature
					flip
					title={<>See where it all goes.</>}
					body="Every expense lands in a category, so the big leaks are obvious at a glance. No spreadsheets, no formulas."
					sample={<BreakdownSample />}
				/>
				<Feature
					title={<>A monthly note, not a nag.</>}
					body="Once a month, a short, plain-English summary. No badges, no streaks, no red alerts. Just how it went."
					sample={<NoteSample />}
				/>
			</div>

			<section className="mx-auto mt-32 max-w-2xl px-4 text-center">
				<h2 className="text-4xl font-black tracking-tight text-balance sm:text-5xl">
					That's the whole thing.
				</h2>
				<p className="mt-4 text-lg text-muted">
					No upsells hiding behind it. Give it a month and see what you learn.
				</p>
				<SignUpCta />
			</section>
		</main>
	);
}

function SignUpCta() {
	return (
		<div className="mt-10 flex flex-col items-center gap-3">
			<Show when="signed-in">
				<Link to="/me" className="btn-primary px-7 py-3.5 text-lg">
					Enter your ledger
				</Link>
			</Show>
			<Show when="signed-out">
				<SignUpButton>
					<button type="button" className="btn-primary px-7 py-3.5 text-lg">
						Start your ledger — it's free
					</button>
				</SignUpButton>
				<p className="text-sm text-muted">No credit card. Takes 30 seconds.</p>
			</Show>
		</div>
	);
}

function Feature({
	title,
	body,
	sample,
	flip = false,
}: {
	title: ReactNode;
	body: string;
	sample: ReactNode;
	flip?: boolean;
}) {
	return (
		<section className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
			<div className={flip ? "md:order-2" : ""}>
				<h2 className="text-3xl font-black tracking-tight text-balance sm:text-4xl">
					{title}
				</h2>
				<p className="mt-4 max-w-md text-lg text-muted">{body}</p>
			</div>
			{/* Purely illustrative; hidden from assistive tech. */}
			<div aria-hidden="true" className="select-none">
				{sample}
			</div>
		</section>
	);
}

function CategoryDot({ color }: { color: string }) {
	return <span className={`inline-block size-2.5 rounded-full ${color}`} />;
}

function EntrySample() {
	return (
		<div className="card mx-auto max-w-sm -rotate-1 p-5 shadow-lg">
			<p className="label">New expense</p>
			<div className="mt-3 flex items-baseline justify-between gap-4 border-b-2 border-rule pb-3">
				<span className="text-lg font-bold">Coffee with Sam</span>
				<span className="text-2xl font-black tabular-nums">$4.50</span>
			</div>
			<div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
				<span className="flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1">
					<CategoryDot color="bg-cat-orange" /> Food & drink
				</span>
				<span className="flex items-center gap-1.5 rounded-full border-2 border-rule px-3 py-1 text-muted">
					<CategoryDot color="bg-cat-blue" /> Transport
				</span>
				<span className="flex items-center gap-1.5 rounded-full border-2 border-rule px-3 py-1 text-muted">
					<CategoryDot color="bg-cat-pink" /> Fun
				</span>
			</div>
			<div className="mt-5 flex items-center justify-between">
				<span className="text-sm text-muted">Today, 8:42 AM</span>
				<span className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-paper">
					Save it
				</span>
			</div>
		</div>
	);
}

const breakdown = [
	{ name: "Food & drink", amount: "$412", pct: 38, color: "bg-cat-orange" },
	{ name: "Home", amount: "$240", pct: 22, color: "bg-cat-green" },
	{ name: "Transport", amount: "$196", pct: 18, color: "bg-cat-blue" },
	{ name: "Fun", amount: "$130", pct: 12, color: "bg-cat-pink" },
	{ name: "Everything else", amount: "$106", pct: 10, color: "bg-cat-purple" },
];

function BreakdownSample() {
	return (
		<div className="card mx-auto max-w-sm rotate-1 p-5 shadow-lg">
			<div className="flex items-baseline justify-between">
				<p className="label">September</p>
				<p className="text-xl font-black tabular-nums">$1,084</p>
			</div>
			<div className="mt-4 flex h-4 gap-0.5 overflow-hidden rounded-full">
				{breakdown.map((c) => (
					<span
						key={c.name}
						className={c.color}
						style={{ width: `${c.pct}%` }}
					/>
				))}
			</div>
			<ul className="mt-4 divide-y divide-rule text-sm">
				{breakdown.map((c) => (
					<li key={c.name} className="flex items-center gap-2 py-2">
						<CategoryDot color={c.color} />
						<span className="font-semibold">{c.name}</span>
						<span className="ml-auto text-muted tabular-nums">{c.pct}%</span>
						<span className="w-12 text-right font-bold tabular-nums">
							{c.amount}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function NoteSample() {
	return (
		<div className="mx-auto max-w-sm -rotate-1 rounded-2xl bg-highlight p-6 text-[#1b1b1f] shadow-lg">
			<p className="text-xs font-bold tracking-wide uppercase opacity-60">
				Your September, in a nutshell
			</p>
			<p className="mt-3 text-lg leading-snug font-semibold">
				You spent <strong className="font-black">$1,084</strong> this month —{" "}
				<strong className="font-black">$38 less</strong> than August. Food was
				the biggest slice again, mostly weekday lunches.
			</p>
			<p className="mt-4 text-sm font-bold opacity-60">— Spendtip</p>
		</div>
	);
}
