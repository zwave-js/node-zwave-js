/* eslint-disable @typescript-eslint/no-empty-object-type */
import { Mixin } from "@zwave-js/shared";
import EventEmitter from "node:events";
import { test } from "vitest";
import { StatisticsHost } from "./Statistics.js";

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

interface Test extends TestStatisticsHost {}

@Mixin([TestStatisticsHost])
class Test extends EventEmitter {}

test("the statistics property is available and has the correct defaults", (t) => {
	const test = new Test();
	t.expect(test.statistics).toStrictEqual({
		one: 1,
		two: 2,
	});
});
