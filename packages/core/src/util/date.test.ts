import { test } from "vitest";
import { formatDate, getDSTInfo } from "./date.js";

test("formatDate() should work correctly", (t) => {
	t.expect(formatDate(new Date(2021, 5, 15), "YYYY-MM-DD")).toBe(
		"2021-06-15",
	);
});

if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Europe/Berlin") {
	test("getDSTInfo() should work correctly", (t) => {
		let dstInfo = getDSTInfo(new Date("2021-05-15T01:00:00.000Z"));

		t.expect(dstInfo).toStrictEqual({
			dstOffset: 120,
			endDate: new Date("2021-10-31T01:00:00.000Z"),
			standardOffset: 60,
			startDate: new Date("2021-03-28T01:00:00.000Z"),
		});

		dstInfo = getDSTInfo(new Date("2020-11-12T01:00:00.000Z"));
		t.expect(dstInfo).toStrictEqual({
			dstOffset: 120,
			endDate: new Date("2020-10-25T01:00:00.000Z"),
			standardOffset: 60,
			startDate: new Date("2021-03-28T01:00:00.000Z"),
		});
	});
}
