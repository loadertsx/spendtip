import clsx from "clsx";
import { useEffect, useId, useRef, useState } from "react";
import type { useFetcher } from "react-router";
import { categoryEmojis } from "../category-options";
import {
	type CategoryDraft,
	descriptionMaxLength,
	nameMaxLength,
} from "../category-validation";
import type { action } from "../routes/categories";
import { CategoryMark } from "./category-mark";

export type CategoryFetcher = ReturnType<typeof useFetcher<typeof action>>;

export function CategoryForm({
	initial,
	operation,
	fetcher,
	onCancel,
}: {
	initial: CategoryDraft;
	operation: { intent: "create" } | { intent: "update"; id: string };
	fetcher: CategoryFetcher;
	onCancel: () => void;
}) {
	const id = useId();
	const formRef = useRef<HTMLFormElement>(null);
	const [draft, setDraft] = useState(initial);
	const pending = fetcher.state !== "idle";
	const failure =
		!pending && fetcher.data?.ok === false ? fetcher.data : undefined;
	const errors = failure?.fieldErrors ?? {};

	useEffect(
		function focusInvalidField() {
			if (failure)
				formRef.current
					?.querySelector<HTMLElement>('[aria-invalid="true"]')
					?.focus();
		},
		[failure],
	);

	function update(patch: Partial<CategoryDraft>) {
		setDraft((current) => ({ ...current, ...patch }));
	}

	return (
		<fetcher.Form
			method="post"
			action="/categories"
			noValidate
			ref={formRef}
			aria-busy={pending}
			className="space-y-6 p-5 sm:p-6"
		>
			<input type="hidden" name="intent" value={operation.intent} />
			{operation.intent === "update" ? (
				<input type="hidden" name="id" value={operation.id} />
			) : null}
			{failure ? (
				<p role="alert" className="text-sm font-semibold text-negative">
					{failure.formError ?? "Please check the highlighted fields."}
				</p>
			) : null}
			<fieldset disabled={pending} className="space-y-6 disabled:opacity-70">
				<legend className="sr-only">
					{operation.intent === "create" ? "New category" : "Edit category"}
				</legend>
				<div className="flex items-start gap-4">
					<CategoryMark emoji={draft.emoji} />
					<div className="min-w-0 flex-1">
						<label htmlFor={`${id}-name`} className="text-sm font-bold">
							Name
						</label>
						<input
							id={`${id}-name`}
							name="name"
							value={draft.name}
							onChange={(event) => update({ name: event.target.value })}
							maxLength={nameMaxLength}
							autoComplete="off"
							// biome-ignore lint/a11y/noAutofocus: the form opens on an explicit user action
							autoFocus
							placeholder="Coffee with friends"
							aria-invalid={errors.name ? true : undefined}
							aria-describedby={errors.name ? `${id}-name-error` : undefined}
							className={fieldClass(errors.name)}
						/>
						{errors.name ? (
							<p
								id={`${id}-name-error`}
								className="mt-1.5 text-sm font-semibold text-negative"
							>
								{errors.name}
							</p>
						) : null}
					</div>
				</div>
				<div>
					<label htmlFor={`${id}-description`} className="text-sm font-bold">
						What goes here?
					</label>
					<textarea
						id={`${id}-description`}
						name="description"
						value={draft.description}
						onChange={(event) => update({ description: event.target.value })}
						maxLength={descriptionMaxLength}
						rows={3}
						placeholder="Coffee and snacks when I go out with friends. Not coffee beans for home."
						aria-invalid={errors.description ? true : undefined}
						aria-describedby={`${id}-description-hint${errors.description ? ` ${id}-description-error` : ""}`}
						className={clsx(fieldClass(errors.description), "resize-y")}
					/>
					{errors.description ? (
						<p
							id={`${id}-description-error`}
							className="mt-1.5 text-sm font-semibold text-negative"
						>
							{errors.description}
						</p>
					) : null}
					<p
						id={`${id}-description-hint`}
						className="mt-1.5 flex justify-between gap-4 text-sm text-muted"
					>
						<span>
							Tip: mention places, keywords, or what doesn't belong. It helps us
							sort your expenses.
						</span>
						<span className="shrink-0 tabular-nums">
							{draft.description.length}/{descriptionMaxLength}
						</span>
					</p>
				</div>
				<fieldset
					aria-describedby={errors.emoji ? `${id}-emoji-error` : undefined}
				>
					<legend className="text-sm font-bold">Emoji</legend>
					<div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-12">
						{categoryEmojis.map((emoji) => (
							<label key={emoji}>
								<input
									type="radio"
									name="emoji"
									value={emoji}
									checked={draft.emoji === emoji}
									onChange={() => update({ emoji })}
									aria-label={`Emoji ${emoji}`}
									aria-invalid={errors.emoji ? true : undefined}
									className="peer sr-only"
								/>
								<span className="grid min-h-11 aspect-square place-items-center rounded-xl border-2 border-transparent bg-paper text-xl peer-checked:border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-rule">
									{emoji}
								</span>
							</label>
						))}
					</div>
					{errors.emoji ? (
						<p
							id={`${id}-emoji-error`}
							className="mt-1.5 text-sm font-semibold text-negative"
						>
							{errors.emoji}
						</p>
					) : null}
				</fieldset>
				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<button type="button" onClick={onCancel} className="btn-secondary">
						Cancel
					</button>
					<button type="submit" className="btn-primary">
						{pending
							? "Saving…"
							: operation.intent === "create"
								? "Create category"
								: "Save changes"}
					</button>
				</div>
			</fieldset>
		</fetcher.Form>
	);
}

function fieldClass(error: string | undefined) {
	return clsx(
		"mt-1.5 block w-full rounded-xl border-2 bg-surface px-3.5 py-2.5 text-base placeholder:text-muted/70",
		error ? "border-negative" : "border-rule focus:border-ink",
	);
}
