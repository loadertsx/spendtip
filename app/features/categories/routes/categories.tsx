import { data } from "react-router";
import { requireSpendtipUser } from "~/features/auth/session.server";
import { monthlyExpenseSummaries } from "~/features/expenses/queries.server";
import { getDb } from "~/shared/db/client.server";
import { combineSummaries, emptySummary, utcMonth } from "../category-metrics";
import {
	type CategoryFieldErrors,
	categoryDraftSchema,
	categoryMutationSchema,
	categoryValidationErrors,
} from "../category-validation";
import { CategoriesBoard } from "../components/category-board";
import { listCategories, mutateCategory } from "../queries.server";
import type { Route } from "./+types/categories";

const headers = { "Cache-Control": "private, no-store" };

type CategoryActionResult =
	| {
			ok: true;
			intent: "create" | "update" | "archive" | "restore";
			category: {
				id: string;
				name: string;
				description: string;
				emoji: string;
				archived: boolean;
			};
	  }
	| { ok: false; fieldErrors: CategoryFieldErrors; formError?: string };

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Categories · Spendtip" },
		{ name: "description", content: "Track your spending your way." },
	];
}

export async function loader(args: Route.LoaderArgs) {
	const user = await requireSpendtipUser(args);
	const db = getDb();
	const period = utcMonth();
	const [records, summaries] = await Promise.all([
		listCategories(db, user.id),
		monthlyExpenseSummaries(db, user.id, period),
	]);
	return data(
		{
			categories: records.map((category) => ({
				id: category.id,
				name: category.name,
				description: category.description,
				emoji: categoryDraftSchema.shape.emoji.parse(category.emoji),
				archived: category.archivedAt !== null,
				summary: summaries.get(category.id) ?? emptySummary,
			})),
			unclassified: summaries.get(null) ?? emptySummary,
			monthTotal: combineSummaries([...summaries.values()]),
			monthLabel: period.label,
		},
		{ headers },
	);
}

export async function action(args: Route.ActionArgs) {
	const user = await requireSpendtipUser(args);
	if (args.request.method !== "POST") {
		return data<CategoryActionResult>(
			{
				ok: false,
				fieldErrors: {},
				formError: "This request is not supported.",
			},
			{ status: 405, headers: { ...headers, Allow: "POST" } },
		);
	}
	let formData: FormData;
	try {
		formData = await args.request.formData();
	} catch {
		return data<CategoryActionResult>(
			{
				ok: false,
				fieldErrors: {},
				formError: "This request is invalid. Refresh the page and try again.",
			},
			{ status: 400, headers },
		);
	}
	const parsed = categoryMutationSchema.safeParse(Object.fromEntries(formData));
	if (!parsed.success) {
		return data<CategoryActionResult>(
			{ ok: false, ...categoryValidationErrors(parsed.error) },
			{ status: 400, headers },
		);
	}
	try {
		const result = await mutateCategory(getDb(), user.id, parsed.data);
		if (!result.ok) {
			const duplicate = result.reason === "duplicate_name";
			return data<CategoryActionResult>(
				{
					ok: false,
					fieldErrors:
						duplicate && parsed.data.intent !== "restore"
							? { name: "You already have a category with this name." }
							: {},
					formError: duplicate
						? parsed.data.intent === "restore"
							? "Rename the active category with this name before restoring this one."
							: undefined
						: "This category is no longer available. Refresh the page and try again.",
				},
				{ status: duplicate ? 409 : 404, headers },
			);
		}
		const { id, name, description, emoji, archivedAt } = result.category;
		return data<CategoryActionResult>(
			{
				ok: true,
				intent: parsed.data.intent,
				category: {
					id,
					name,
					description,
					emoji,
					archived: archivedAt !== null,
				},
			},
			{ status: parsed.data.intent === "create" ? 201 : 200, headers },
		);
	} catch (error) {
		console.error("Category mutation failed", error);
		return data<CategoryActionResult>(
			{
				ok: false,
				fieldErrors: {},
				formError: "We couldn't save your category. Please try again.",
			},
			{ status: 500, headers },
		);
	}
}

export default function Component({ loaderData }: Route.ComponentProps) {
	return (
		<main className="mx-auto max-w-2xl px-4 pt-10 pb-24">
			<CategoriesBoard {...loaderData} />
		</main>
	);
}

export function ErrorBoundary() {
	return (
		<main className="mx-auto max-w-2xl px-4 pt-20 pb-24">
			<h1 className="text-3xl font-black">Categories couldn't be loaded.</h1>
			<p role="alert" className="mt-3 text-muted">
				Please try again. Your saved categories haven't been removed.
			</p>
			<a href="/categories" className="btn-primary mt-6">
				Try again
			</a>
		</main>
	);
}
