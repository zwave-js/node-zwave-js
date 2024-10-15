import type { CommandClass } from "@zwave-js/cc";
import {
	BasicCCSet,
	MultiCommandCC,
	isMultiEncapsulatingCommandClass,
} from "@zwave-js/cc";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

test("is a multi-encapsulating CommandClass", (t) => {
	let cc: CommandClass = new BasicCCSet({
		nodeId: 1,
		targetValue: 50,
	});
	cc = MultiCommandCC.encapsulate([cc]);
	t.true(isMultiEncapsulatingCommandClass(cc));
});
