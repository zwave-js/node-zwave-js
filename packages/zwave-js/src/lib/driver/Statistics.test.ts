import { Mixin } from "@zwave-js/shared";
import test from "ava";
import EventEmitter from "events";
import { StatisticsHost } from "./Statistics";

interface TestStatistics {
	one: number;
	two: number;
}

class TestStatisticsHost extends StatisticsHost<TestStatistics> {
	createEmpty(): TestStatistics {
		return {
			one: 1,
			two: 2,
		};
	}
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Test extends TestStatisticsHost {}

@Mixin([TestStatisticsHost])
class Test extends EventEmitter {}

test("the statistics property is available and has the correct defaults", (t) => {
	const test = new Test();
	t.deepEqual(test.statistics, {
		one: 1,
		two: 2,
	});
});
