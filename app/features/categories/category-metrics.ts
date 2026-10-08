export type CurrencyTotal = { currency: string; amountMinor: number };
export type ExpenseSummary = { expenseCount: number; totals: CurrencyTotal[] };
export const emptySummary: ExpenseSummary = { expenseCount: 0, totals: [] };

/** Uses a half-open UTC month so SSR, revalidation and expense queries agree on the period. */
export function utcMonth(now = new Date()) {
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const end = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
	);
	return {
		start,
		end,
		label: new Intl.DateTimeFormat("en-US", {
			month: "long",
			year: "numeric",
			timeZone: "UTC",
		}).format(start),
	};
}

/** Adds only matching currencies; refuses amounts that JavaScript cannot represent exactly. */
export function combineSummaries(summaries: ExpenseSummary[]): ExpenseSummary {
	const totals = new Map<string, number>();
	let expenseCount = 0;
	for (const summary of summaries) {
		expenseCount += summary.expenseCount;
		for (const total of summary.totals) {
			const amount = (totals.get(total.currency) ?? 0) + total.amountMinor;
			if (!Number.isSafeInteger(amount))
				throw new Error("Monthly total exceeds the supported amount range.");
			totals.set(total.currency, amount);
		}
	}
	return {
		expenseCount,
		totals: [...totals]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([currency, amountMinor]) => ({ currency, amountMinor })),
	};
}

const formatters = new Map<string, Intl.NumberFormat>();
export function formatMinor({ currency, amountMinor }: CurrencyTotal) {
	let formatter = formatters.get(currency);
	if (!formatter) {
		formatter = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			currencyDisplay: "code",
		});
		formatters.set(currency, formatter);
	}
	const decimals = formatter.resolvedOptions().maximumFractionDigits ?? 2;
	// Dividing large safe integers as Numbers can silently lose a minor unit.
	const minor = BigInt(amountMinor);
	const scale = 10n ** BigInt(decimals);
	const whole = minor / scale;
	const fraction = ((minor < 0n ? -minor : minor) % scale)
		.toString()
		.padStart(decimals, "0");
	return formatter
		.formatToParts(whole === 0n && minor < 0n ? -0 : whole)
		.map((part) => (part.type === "fraction" ? fraction : part.value))
		.join("");
}
