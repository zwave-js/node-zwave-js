import { formatDate, getDSTInfo } from "./date";

describe("formatDate()", () => {
	it("should work correctly", () => {
		expect(formatDate(new Date(2021, 5, 15), "YYYY-MM-DD")).toEqual(
			"2021-06-15",
		);
	});
});

describe("getDSTInfo()", () => {
	if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Europe/Berlin") {
		it("should work correctly", () => {
			let dstInfo = getDSTInfo(new Date("2021-05-15T01:00:00.000Z"));
			expect(dstInfo).toEqual({
				dstOffset: 120,
				endDate: new Date("2021-10-31T01:00:00.000Z"),
				standardOffset: 60,
				startDate: new Date("2021-03-28T01:00:00.000Z"),
			});

			dstInfo = getDSTInfo(new Date("2020-11-12T01:00:00.000Z"));
			expect(dstInfo).toEqual({
				dstOffset: 120,
				endDate: new Date("2020-10-25T01:00:00.000Z"),
				standardOffset: 60,
				startDate: new Date("2021-03-28T01:00:00.000Z"),
			});
		});
	}
});
