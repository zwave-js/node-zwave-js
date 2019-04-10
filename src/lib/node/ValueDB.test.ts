/// <reference types="jest-extended" />

import { CommandClasses } from "../commandclass/CommandClasses";
import { ValueDB } from "./ValueDB";

describe("lib/node/ValueDB => ", () => {
	let valueDB: ValueDB;
	const onValueAdded = jest.fn();
	const onValueUpdated = jest.fn();
	const onValueRemoved = jest.fn();

	function createValueDB(): void {
		valueDB = new ValueDB()
			.on("value added", onValueAdded)
			.on("value updated", onValueUpdated)
			.on("value removed", onValueRemoved)
			;
	}

	beforeAll(() => createValueDB());

	describe("setValue() (first add)", () => {
		let cbArg: any;
		beforeAll(() => {
			valueDB.setValue(
				CommandClasses["Alarm Sensor"],
				4,
				"foo", "bar",
			);
		});

		afterAll(() => {
			onValueAdded.mockClear();
			onValueUpdated.mockClear();
			onValueRemoved.mockClear();
		});

		it("should emit the value added event", () => {
			expect(onValueAdded).toBeCalled();
			cbArg = onValueAdded.mock.calls[0][0];
		});

		it("The callback arg should contain the CC", () => {
			expect(cbArg).toBeObject();
			expect(cbArg.commandClass).toBe(CommandClasses["Alarm Sensor"]);
		});

		it("The callback arg should contain the endpoint", () => {
			expect(cbArg.endpoint).toBe(4);
		});

		it("The callback arg should contain the property name", () => {
			expect(cbArg.propertyName).toBe("foo");
		});

		it("The callback arg should contain the new value", () => {
			expect(cbArg.newValue).toBe("bar");
		});
	});

	describe("setValue() (consecutive adds)", () => {
		let cbArg: any;
		beforeAll(() => {
			valueDB.setValue(
				CommandClasses["Wake Up"],
				0,
				"prop", "foo",
			);
			valueDB.setValue(
				CommandClasses["Wake Up"],
				0,
				"prop", "bar",
			);
		});

		afterAll(() => {
			onValueAdded.mockClear();
			onValueUpdated.mockClear();
			onValueRemoved.mockClear();
		});

		it("should emit the value updated event", () => {
			expect(onValueUpdated).toBeCalled();
			cbArg = onValueUpdated.mock.calls[0][0];
		});

		it("The callback arg should contain the CC", () => {
			expect(cbArg).toBeObject();
			expect(cbArg.commandClass).toBe(CommandClasses["Wake Up"]);
		});

		it("The callback arg should contain the endpoint", () => {
			expect(cbArg.endpoint).toBe(0);
		});

		it("The callback arg should contain the property name", () => {
			expect(cbArg.propertyName).toBe("prop");
		});

		it("The callback arg should contain the previous value", () => {
			expect(cbArg.prevValue).toBe("foo");
		});

		it("The callback arg should contain the new value", () => {
			expect(cbArg.newValue).toBe("bar");
		});
	});

	describe("removeValue()", () => {
		let cbArg: any;
		beforeAll(() => {
			valueDB.setValue(
				CommandClasses["Alarm Sensor"],
				1,
				"bar", "foo",
			);
			valueDB.removeValue(
				CommandClasses["Alarm Sensor"],
				1,
				"bar",
			);
		});

		afterAll(() => {
			onValueAdded.mockClear();
			onValueUpdated.mockClear();
			onValueRemoved.mockClear();
		});

		it("should emit the value removed event", () => {
			expect(onValueRemoved).toBeCalled();
			cbArg = onValueRemoved.mock.calls[0][0];
		});

		it("The callback arg should contain the CC", () => {
			expect(cbArg).toBeObject();
			expect(cbArg.commandClass).toBe(CommandClasses["Alarm Sensor"]);
		});

		it("The callback arg should contain the endpoint", () => {
			expect(cbArg.endpoint).toBe(1);
		});

		it("The callback arg should contain the property name", () => {
			expect(cbArg.propertyName).toBe("bar");
		});

		it("The callback arg should contain the previous value", () => {
			expect(cbArg.prevValue).toBe("foo");
		});

		it("If the value was not in the DB, the value removed event should not be emitted", () => {
			onValueRemoved.mockClear();
			valueDB.removeValue(
				CommandClasses["Basic Tariff Information"],
				9,
				"test",
			);
			expect(onValueRemoved).not.toBeCalled();
		});

		it("should return true if a value was removed, false otherwise", () => {
			const retValNotFound = valueDB.removeValue(
				CommandClasses["Basic Tariff Information"],
				9,
				"test",
			);
			expect(retValNotFound).toBeFalse();

			valueDB.setValue(
				CommandClasses["Basic Tariff Information"],
				0,
				"test", "value",
			);
			const retValFound = valueDB.removeValue(
				CommandClasses["Basic Tariff Information"],
				0,
				"test",
			);
			expect(retValFound).toBeTrue();
		});

		it("After removing a value, getValue should return undefined", () => {
			const actual = valueDB.getValue(
				CommandClasses["Alarm Sensor"],
				1,
				"bar",
			);
			expect(actual).toBeUndefined();
		});
	});

	describe("clear()", () => {
		let cbArgs: any[];
		beforeAll(() => {
			createValueDB();
			valueDB.setValue(
				CommandClasses["Alarm Sensor"],
				1,
				"bar", "foo",
			);
			valueDB.setValue(
				CommandClasses.Battery,
				2,
				"prop", "bar",
			);
			valueDB.clear();
		});

		afterAll(() => {
			onValueAdded.mockClear();
			onValueUpdated.mockClear();
			onValueRemoved.mockClear();
		});

		it("should emit the value removed event for all stored values", () => {
			expect(onValueRemoved).toBeCalledTimes(2);
			cbArgs = onValueRemoved.mock.calls.map(args => args[0]);
		});

		it("The callback should contain the removed values", () => {
			expect(cbArgs[0]).toBeObject();
			expect(cbArgs[0].prevValue).toBe("foo");
			expect(cbArgs[1]).toBeObject();
			expect(cbArgs[1].prevValue).toBe("bar");
		});

		it("After clearing, getValue should return undefined", () => {
			let actual: unknown;
			actual = valueDB.getValue(
				CommandClasses["Alarm Sensor"],
				1,
				"bar",
			);
			expect(actual).toBeUndefined();

			actual = valueDB.setValue(
				CommandClasses.Battery,
				2,
				"prop", "bar",
			);
			expect(actual).toBeUndefined();
		});

	});

	it("getValue() should return the value stored for the same combination of CC, endpoint and propertyName", () => {
		const tests = [
			{ cc: CommandClasses.Basic, endpoint: undefined, propertyName: "foo", value: "1" },
			{ cc: CommandClasses.Basic, endpoint: 2, propertyName: "foo", value: "2" },
			{ cc: CommandClasses.Basic, endpoint: undefined, propertyName: "FOO", value: "3" },
			{ cc: CommandClasses.Basic, endpoint: 2, propertyName: "FOO", value: "4" },
		];

		for (const { cc, endpoint, propertyName, value } of tests) {
			valueDB.setValue(cc, endpoint, propertyName, value);
		}
		for (const { cc, endpoint, propertyName, value } of tests) {
			expect(valueDB.getValue(cc, endpoint, propertyName)).toBe(value);
		}
	});

});
