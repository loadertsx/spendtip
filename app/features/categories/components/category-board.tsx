import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { type ExpenseSummary, formatMinor } from "../category-metrics";
import { normalizeCategoryName } from "../category-name";
import { categorySuggestions } from "../category-options";
import { type CategoryItem, optimisticCategories } from "../category-state";
import {
	type CategoryDraft,
	categoryMutationSchema,
	emptyDraft,
} from "../category-validation";
import type { action } from "../routes/categories";
import { type CategoryFetcher, CategoryForm } from "./category-form";
import { CategoryMark } from "./category-mark";

type Editor =
	| { mode: "closed" }
	| { mode: "create"; initial: CategoryDraft }
	| { mode: "edit"; id: string; initial: CategoryDraft };

export function CategoriesBoard({
	categories,
	unclassified,
	monthTotal,
	monthLabel,
}: {
	categories: CategoryItem[];
	unclassified: ExpenseSummary;
	monthTotal: ExpenseSummary;
	monthLabel: string;
}) {
	const fetcher = useFetcher<typeof action>();
	const [editor, setEditor] = useState<Editor>({ mode: "closed" });
	const [lastArchived, setLastArchived] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [message, setMessage] = useState("");
	const handled = useRef<CategoryFetcher["data"]>(undefined);
	const pending = fetcher.state !== "idle";
	const parsed =
		pending && fetcher.formData
			? categoryMutationSchema.safeParse(Object.fromEntries(fetcher.formData))
			: undefined;
	// A failed action must stop being optimistic even if the fetcher is still loading.
	const mutation =
		parsed?.success && (fetcher.state === "submitting" || fetcher.data?.ok)
			? parsed.data
			: undefined;
	const createdId =
		fetcher.state === "loading" &&
		fetcher.data?.ok &&
		fetcher.data.intent === "create"
			? fetcher.data.category.id
			: undefined;
	const displayed = optimisticCategories(categories, mutation, createdId);
	const active = displayed.filter((category) => !category.archived);
	const archived = displayed.filter((category) => category.archived);
	const activeNames = new Set(
		active.map((category) => normalizeCategoryName(category.name)),
	);
	const failure =
		!pending && fetcher.data?.ok === false ? fetcher.data : undefined;
	const creating = editor.mode === "create";
	const actionsDisabled = pending || editor.mode !== "closed";

	useEffect(
		function handleCompletedMutation() {
			if (
				fetcher.state !== "idle" ||
				!fetcher.data ||
				handled.current === fetcher.data
			)
				return;
			handled.current = fetcher.data;
			if (!fetcher.data.ok) return;
			const { intent, category } = fetcher.data;
			if (intent === "create" || intent === "update")
				setEditor({ mode: "closed" });
			setLastArchived(
				intent === "archive" ? { id: category.id, name: category.name } : null,
			);
			setMessage(
				intent === "archive"
					? `${category.name} archived. Past expenses keep it; new ones won't be sorted here.`
					: intent === "restore"
						? `${category.name} restored.`
						: `${category.name} saved.`,
			);
		},
		[fetcher.state, fetcher.data],
	);

	function openEditor(next: Editor) {
		if (pending) return;
		fetcher.reset();
		setMessage("");
		setEditor(next);
	}
	function beginMutation() {
		setMessage("");
		setLastArchived(null);
	}
	function isPendingCategory(category: CategoryItem) {
		return mutation?.intent === "create"
			? category.id === (createdId ?? "pending-category")
			: mutation?.id === category.id;
	}

	return (
		<>
			<header className="mt-10 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-4xl font-black tracking-tight sm:text-5xl">
						Categories
					</h1>
					<p className="mt-2 text-muted">
						Your way of tracking where the money goes.
					</p>
				</div>
				{active.length > 0 && !creating ? (
					<button
						type="button"
						disabled={actionsDisabled}
						onClick={() => openEditor({ mode: "create", initial: emptyDraft })}
						className="btn-primary disabled:opacity-50"
					>
						<span aria-hidden="true">+</span> New category
					</button>
				) : null}
			</header>
			<div role="status" aria-live="polite" className="mt-6 empty:hidden">
				{pending ? (
					<p className="text-sm font-semibold text-muted">
						{mutation?.intent === "archive"
							? "Archiving…"
							: mutation?.intent === "restore"
								? "Restoring…"
								: "Saving…"}
					</p>
				) : message ? (
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-paper">
						<span>{message}</span>
						{lastArchived && editor.mode === "closed" ? (
							<fetcher.Form
								method="post"
								action="/categories"
								onSubmit={beginMutation}
							>
								<input type="hidden" name="intent" value="restore" />
								<input type="hidden" name="id" value={lastArchived.id} />
								<button
									type="submit"
									className="min-h-11 font-bold underline underline-offset-2"
								>
									Undo
								</button>
							</fetcher.Form>
						) : null}
					</div>
				) : null}
			</div>
			{failure && editor.mode === "closed" ? (
				<p
					role="alert"
					className="mt-4 rounded-xl border-2 border-negative p-4 text-sm font-semibold text-negative"
				>
					{failure.formError ??
						failure.fieldErrors.name ??
						"We couldn't save your category. Please try again."}
				</p>
			) : null}
			{creating ? (
				<section aria-label="New category" className="card mt-6">
					<CategoryForm
						key="create"
						initial={editor.initial}
						operation={{ intent: "create" }}
						fetcher={fetcher}
						onCancel={() => openEditor({ mode: "closed" })}
					/>
				</section>
			) : null}
			{active.length === 0 && !creating ? (
				<EmptyState
					disabled={actionsDisabled}
					onPick={(initial) => openEditor({ mode: "create", initial })}
				/>
			) : null}

			<section aria-labelledby="month-heading" className="mt-10">
				<div className="flex flex-wrap items-baseline justify-between gap-4">
					<div>
						<h2 id="month-heading" className="label">
							{monthLabel} so far
						</h2>
						<p className="mt-1 text-xs text-muted">
							UTC · Includes archived and unclassified expenses
						</p>
					</div>
					<Metrics summary={monthTotal} />
				</div>
				{active.length > 0 ? (
					<ul
						aria-label="Active categories"
						className="card mt-3 divide-y divide-rule"
					>
						{active.map((category) =>
							editor.mode === "edit" && editor.id === category.id ? (
								<li key={category.id} aria-label={`Edit ${category.name}`}>
									<CategoryForm
										initial={editor.initial}
										operation={{ intent: "update", id: category.id }}
										fetcher={fetcher}
										onCancel={() => openEditor({ mode: "closed" })}
									/>
								</li>
							) : (
								<CategoryRow
									key={category.id}
									category={category}
									pending={isPendingCategory(category)}
								>
									<details className="relative shrink-0">
										<summary className="grid size-11 cursor-pointer list-none place-items-center rounded-full text-lg font-black text-muted hover:bg-paper hover:text-ink [&::-webkit-details-marker]:hidden">
											<span aria-hidden="true">⋯</span>
											<span className="sr-only">
												Actions for {category.name}
											</span>
										</summary>
										<div className="card absolute right-0 z-10 mt-1 w-36 p-1">
											<button
												type="button"
												disabled={actionsDisabled}
												onClick={() =>
													openEditor({
														mode: "edit",
														id: category.id,
														initial: {
															name: category.name,
															description: category.description,
															emoji: category.emoji,
														},
													})
												}
												className="block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-paper disabled:opacity-50"
											>
												Edit
											</button>
											<MutationButton
												fetcher={fetcher}
												intent="archive"
												id={category.id}
												disabled={actionsDisabled}
												onSubmit={beginMutation}
											/>
										</div>
									</details>
								</CategoryRow>
							),
						)}
					</ul>
				) : null}
			</section>

			{unclassified.expenseCount > 0 ? (
				<section
					aria-label="Unclassified expenses"
					className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl border-2 border-dashed border-rule px-5 py-4"
				>
					<span
						aria-hidden="true"
						className="grid size-11 shrink-0 place-items-center rounded-xl bg-highlight text-lg font-black text-ink"
					>
						?
					</span>
					<div className="min-w-0 flex-1">
						<p className="font-bold">Unclassified</p>
						<p className="mt-0.5 text-sm text-muted">
							These expenses don't fit any category yet.{" "}
							<button
								type="button"
								disabled={actionsDisabled}
								onClick={() =>
									openEditor({ mode: "create", initial: emptyDraft })
								}
								className="font-bold text-accent underline-offset-2 hover:underline disabled:opacity-50"
							>
								Create one?
							</button>
						</p>
					</div>
					<Metrics summary={unclassified} />
				</section>
			) : null}

			{archived.length > 0 ? (
				<details
					className="group mt-12"
					open={
						mutation?.intent === "archive" || mutation?.intent === "restore"
							? true
							: undefined
					}
				>
					<summary className="label flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
						<span
							aria-hidden="true"
							className="transition-transform motion-reduce:transition-none group-open:rotate-90"
						>
							▸
						</span>
						Archived ({archived.length})
					</summary>
					<ul className="mt-3 divide-y divide-rule rounded-2xl border border-rule">
						{archived.map((category) => (
							<CategoryRow
								key={category.id}
								category={category}
								pending={isPendingCategory(category)}
							>
								{activeNames.has(normalizeCategoryName(category.name)) ? (
									<span className="text-sm text-muted">Name in use</span>
								) : (
									<MutationButton
										fetcher={fetcher}
										intent="restore"
										id={category.id}
										disabled={actionsDisabled}
										onSubmit={beginMutation}
									/>
								)}
							</CategoryRow>
						))}
					</ul>
				</details>
			) : null}
		</>
	);
}

function MutationButton({
	fetcher,
	intent,
	id,
	disabled,
	onSubmit,
}: {
	fetcher: CategoryFetcher;
	intent: "archive" | "restore";
	id: string;
	disabled: boolean;
	onSubmit: () => void;
}) {
	return (
		<fetcher.Form method="post" action="/categories" onSubmit={onSubmit}>
			<input type="hidden" name="intent" value={intent} />
			<input type="hidden" name="id" value={id} />
			<button
				type="submit"
				disabled={disabled}
				className={
					intent === "archive"
						? "block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-negative hover:bg-paper disabled:opacity-50"
						: "btn-secondary min-h-11 px-4 py-1.5 text-sm disabled:opacity-50"
				}
			>
				{intent === "archive" ? "Archive" : "Restore"}
			</button>
		</fetcher.Form>
	);
}

function CategoryRow({
	category,
	pending,
	children,
}: {
	category: CategoryItem;
	pending: boolean;
	children: React.ReactNode;
}) {
	return (
		<li
			aria-busy={pending}
			className={`flex flex-wrap items-center gap-4 px-5 py-4 ${pending ? "opacity-60" : ""}`}
		>
			<CategoryMark emoji={category.emoji} />
			<div className="min-w-0 flex-1">
				<p className="truncate font-bold">{category.name}</p>
				<p className="mt-0.5 line-clamp-2 text-sm text-muted">
					{category.description}
				</p>
			</div>
			<Metrics summary={category.summary} />
			{children}
		</li>
	);
}

function Metrics({ summary }: { summary: ExpenseSummary }) {
	return (
		<div className="shrink-0 text-right tabular-nums">
			{summary.totals.length > 0 ? (
				summary.totals.map((total) => (
					<p key={total.currency} className="font-extrabold">
						{formatMinor(total)}
					</p>
				))
			) : (
				<p className="text-sm text-muted">No expenses</p>
			)}
			{summary.expenseCount > 0 ? (
				<p className="text-xs text-muted">
					{summary.expenseCount}{" "}
					{summary.expenseCount === 1 ? "expense" : "expenses"}
				</p>
			) : null}
		</div>
	);
}

function EmptyState({
	disabled,
	onPick,
}: {
	disabled: boolean;
	onPick: (draft: CategoryDraft) => void;
}) {
	return (
		<section className="mt-10 rounded-2xl border-2 border-dashed border-rule px-6 py-10 text-center">
			<h2 className="text-2xl font-black text-balance">
				Track it <span className="marker">your way</span>.
			</h2>
			<p className="mx-auto mt-2 max-w-md text-muted text-balance">
				Categories tell you where your money goes. You decide which ones make
				sense. Start from an idea, or make your own.
			</p>
			<ul className="mt-8 flex flex-wrap justify-center gap-2">
				{categorySuggestions.map((suggestion) => (
					<li key={suggestion.name}>
						<button
							type="button"
							disabled={disabled}
							onClick={() => onPick(suggestion)}
							className="flex min-h-11 items-center gap-2 rounded-full border-2 border-rule bg-surface py-1.5 pr-4 pl-1.5 font-bold transition-colors hover:border-ink disabled:opacity-50"
						>
							<CategoryMark emoji={suggestion.emoji} size="sm" />
							{suggestion.name}
						</button>
					</li>
				))}
			</ul>
			<button
				type="button"
				disabled={disabled}
				onClick={() => onPick(emptyDraft)}
				className="btn-primary mt-8 disabled:opacity-50"
			>
				<span aria-hidden="true">+</span> Start from scratch
			</button>
		</section>
	);
}
