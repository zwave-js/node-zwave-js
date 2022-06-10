import { CommandClasses } from "@zwave-js/core";
import { BasicCCValues } from "../cc/BasicCC";

describe("Value ID definitions", () => {
	it("Basic CC, current value, no endpoint", () => {
		const actual = BasicCCValues.currentValue.id;
		expect(actual).toEqual({
			commandClass: CommandClasses.Basic,
			property: "currentValue",
		});
	});

	it("Basic CC, current value, endpoint 2", () => {
		const actual = BasicCCValues.currentValue.endpoint(2);
		expect(actual).toEqual({
			commandClass: CommandClasses.Basic,
			endpoint: 2,
			property: "currentValue",
		});
	});

	it("Basic CC, compat event, endpoint 2", () => {
		const actual = BasicCCValues.compatEvent.endpoint(2);
		expect(actual).toEqual({
			commandClass: CommandClasses.Basic,
			endpoint: 2,
			property: "event",
		});
	});
});
