import { enumValuesToMetadataStates } from "./Metadata";

enum TestEnum {
	"Easy" = 0x00,
	"This is complicated" = 0x02,
	"2 lets have some numbers" = 0x08,
	"8 and one more" = 0x09,
}

describe("lib/util/Metadata", () => {
	describe("enumValuesToMetadataStates()", () => {
		it("should translate the whole enum by default", () => {
			const actual = enumValuesToMetadataStates(TestEnum);
			const expected = {
				0: "Easy",
				2: "This is complicated",
				8: "2 lets have some numbers",
				9: "8 and one more",
			};
			expect(actual).toEqual(expected);
		});

		it("should correctly translate a subset if requested", () => {
			const actual = enumValuesToMetadataStates(TestEnum, [0, 9]);
			const expected = {
				0: "Easy",
				9: "8 and one more",
			};
			expect(actual).toEqual(expected);
		});
	});
});
