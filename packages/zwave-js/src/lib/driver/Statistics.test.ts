import { Mixin } from "@zwave-js/shared";
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

describe("lib/driver/Statistics", () => {
	it("the statistics property is available and has the correct defaults", () => {
		const test = new Test();
		expect(test.statistics).toEqual({
			one: 1,
			two: 2,
		});
	});
});
