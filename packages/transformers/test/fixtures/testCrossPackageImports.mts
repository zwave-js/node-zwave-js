/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Duration } from "@zwave-js/core";
import type { AllOrNone } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";

type Bar = AllOrNone<{
	p1: number;
	p2: string;
}>;

class Test {
	@validateArgs()
	foo(arg1: Duration): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	bar(arg1: Bar): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo(new Duration(1, "seconds"));
test.bar({});
test.bar({ p1: 1, p2: "foo" });
