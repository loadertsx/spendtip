import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { combineSummaries, formatMinor, utcMonth } from "../category-metrics";

describe("category metrics", () => {
	it("uses UTC even near a local month boundary, including year rollover", () => {
		const period = utcMonth(new Date("2026-12-31T23:30:00-03:00"));
		assert.equal(period.start.toISOString(), "2027-01-01T00:00:00.000Z");
		assert.equal(period.end.toISOString(), "2027-02-01T00:00:00.000Z");
		assert.equal(period.label, "January 2027");
	});
	it("formats two-, zero- and three-decimal currencies without conversions", () => {
		assert.match(
			formatMinor({ currency: "USD", amountMinor: 1050 }),
			/USD\s+10\.50/,
		);
		assert.match(
			formatMinor({ currency: "JPY", amountMinor: 1050 }),
			/JPY\s+1,050/,
		);
		assert.match(
			formatMinor({ currency: "KWD", amountMinor: 1050 }),
			/KWD\s+1\.050/,
		);
	});
	it("preserves minor units even at the supported integer limit", () => {
		assert.match(
			formatMinor({ currency: "USD", amountMinor: Number.MAX_SAFE_INTEGER }),
			/USD\s+90,071,992,547,409\.91/,
		);
	});
	it("combines only like currencies and rejects unsafe sums", () => {
		assert.deepEqual(
			combineSummaries([
				{ expenseCount: 1, totals: [{ currency: "USD", amountMinor: 100 }] },
				{
					expenseCount: 2,
					totals: [
						{ currency: "USD", amountMinor: 200 },
						{ currency: "ARS", amountMinor: 500 },
					],
				},
			]),
			{
				expenseCount: 3,
				totals: [
					{ currency: "ARS", amountMinor: 500 },
					{ currency: "USD", amountMinor: 300 },
				],
			},
		);
		assert.throws(
			() =>
				combineSummaries([
					{
						expenseCount: 1,
						totals: [
							{ currency: "USD", amountMinor: Number.MAX_SAFE_INTEGER + 1 },
						],
					},
				]),
			/supported amount range/,
		);
	});
});
