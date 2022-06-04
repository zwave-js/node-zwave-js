import { createTestingHost } from "@zwave-js/host";
import { BasicCCSet } from "./BasicCC";
import type { CommandClass } from "./CommandClass";
import { isMultiEncapsulatingCommandClass } from "./EncapsulatingCommandClass";
import { MultiCommandCC } from "./MultiCommandCC";

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
