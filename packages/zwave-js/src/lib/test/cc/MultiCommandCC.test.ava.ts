import type { CommandClass } from "@zwave-js/cc";
import {
	BasicCCSet,
	isMultiEncapsulatingCommandClass,
	MultiCommandCC,
} from "@zwave-js/cc";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

test("is a multi-encapsulating CommandClass", (t) => {
	let cc: CommandClass = new BasicCCSet(host, {
		nodeId: 1,
		targetValue: 50,
	});
	cc = MultiCommandCC.encapsulate(host, [cc]);
	t.true(isMultiEncapsulatingCommandClass(cc));
});
