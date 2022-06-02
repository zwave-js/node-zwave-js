import type { CommandClass } from "@zwave-js/cc";
import {
	BasicCCSet,
	isMultiEncapsulatingCommandClass,
	MultiCommandCC,
} from "@zwave-js/cc";
import { createTestingHost } from "@zwave-js/host";

const host = createTestingHost();

describe("lib/commandclass/MultiCommandCC", () => {
	describe("MultiCommandCC()", () => {
		it("is a multi-encapsulating CommandClass", () => {
			let cc: CommandClass = new BasicCCSet(host, {
				nodeId: 1,
				targetValue: 50,
			});
			cc = MultiCommandCC.encapsulate(host, [cc]);
			expect(isMultiEncapsulatingCommandClass(cc)).toBeTrue();
		});
	});
});
