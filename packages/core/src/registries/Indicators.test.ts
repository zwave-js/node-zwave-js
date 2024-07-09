import test from "ava";
import { getIndicatorProperty } from "./Indicators";

test(
	"getIndicatorProperty() returns the property definition if it is defined",
	async (t) => {
		const test1 = getIndicatorProperty(0x01);
		t.is(test1.label, "Multilevel");

		t.is(getIndicatorProperty(0xff), undefined);
	},
);
