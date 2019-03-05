/// <reference types="jest-extended" />

import { CommandClasses } from "../commandclass/CommandClass";
import { ValueDB } from "./ValueDB";

describe("lib/node/ValueDB => ", () => {
	let valueDB: ValueDB;
	const onValueUpdated = jest.fn();

	beforeEach(() => {
		valueDB = new ValueDB();
		valueDB.on("value updated", onValueUpdated);
	});

	afterEach(() => {
		valueDB.removeAllListeners();
		onValueUpdated.mockClear();
	});

	it("setValue() should emit the value updated event", () => {
		valueDB.setValue(
			CommandClasses["Alarm Sensor"],
			undefined,
			"foo", "bar",
		);

		expect(onValueUpdated).toBeCalled();
	});

	it("The callback to the value updated event should contain the CC", () => {
		valueDB.setValue(
			CommandClasses["Alarm Sensor"],
			undefined,
			"foo", "bar",
		);

		const cbArg = onValueUpdated.mock.calls[0][0];
		expect(cbArg).toBeObject();
		expect(cbArg.commandClass).toBe(CommandClasses["Alarm Sensor"]);
	});

	it("The callback to the value updated event should contain the endpoint", () => {
		valueDB.setValue(
			CommandClasses["Alarm Sensor"],
			undefined,
			"foo", "bar",
		);

		valueDB.setValue(
			CommandClasses["Alarm Sensor"],
			4,
			"foo", "bar",
		);

		expect(onValueUpdated).toBeCalledTimes(2);

		let cbArg = onValueUpdated.mock.calls[0][0];
		expect(cbArg.endpoint).toBeUndefined();

		cbArg = onValueUpdated.mock.calls[1][0];
		expect(cbArg.endpoint).toBe(4);
	});

	it("The callback to the value updated event should contain the property name", () => {
		valueDB.setValue(
			CommandClasses["Alarm Sensor"],
			undefined,
			"foo", "bar",
		);

		const cbArg = onValueUpdated.mock.calls[0][0];
		expect(cbArg.propertyName).toBe("foo");
	});

	it("The callback to the value updated event should contain the previous and new value", () => {
		valueDB.setValue(
			CommandClasses["Alarm Sensor"],
			undefined,
			"foo", "bar",
		);

		let cbArg = onValueUpdated.mock.calls[0][0];
		expect(cbArg.prevValue).toBeUndefined();
		expect(cbArg.newValue).toBe("bar");

		valueDB.setValue(
			CommandClasses["Alarm Sensor"],
			undefined,
			"foo", "baz",
		);

		cbArg = onValueUpdated.mock.calls[1][0];
		expect(cbArg.prevValue).toBe("bar");
		expect(cbArg.newValue).toBe("baz");
	});

	it("getValue() should return the value stored for the same combination of CC, endpoint and propertyName", () => {
		const tests = [
			{cc: CommandClasses.Basic, endpoint: undefined, propertyName: "foo", value: "1"},
			{cc: CommandClasses.Basic, endpoint: 2, propertyName: "foo", value: "2"},
			{cc: CommandClasses.Basic, endpoint: undefined, propertyName: "FOO", value: "3"},
			{cc: CommandClasses.Basic, endpoint: 2, propertyName: "FOO", value: "4"},
		];

		for (const {cc, endpoint, propertyName, value} of tests) {
			valueDB.setValue(cc, endpoint, propertyName, value);
		}
		for (const {cc, endpoint, propertyName, value} of tests) {
			expect(valueDB.getValue(cc, endpoint, propertyName)).toBe(value);
		}
	});

});
