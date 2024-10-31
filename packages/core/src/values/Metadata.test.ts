import { test } from "vitest";
import { enumValuesToMetadataStates } from "./Metadata.js";

enum TestEnum {
	"Easy" = 0x00,
	"This is complicated" = 0x02,
	"2 lets have some numbers" = 0x08,
	"8 and one more" = 0x09,
}

test("enumValuesToMetadataStates() -> should translate the whole enum by default", (t) => {
	const actual = enumValuesToMetadataStates(TestEnum);
	const expected = {
		0: "Easy",
		2: "This is complicated",
		8: "2 lets have some numbers",
		9: "8 and one more",
	};
	t.expect(actual).toStrictEqual(expected);
});

test("enumValuesToMetadataStates() -> should correctly translate a subset if requested", (t) => {
	const actual = enumValuesToMetadataStates(TestEnum, [0, 9]);
	const expected = {
		0: "Easy",
		9: "8 and one more",
	};
	t.expect(actual).toStrictEqual(expected);
});
