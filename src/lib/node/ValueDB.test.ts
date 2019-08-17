import { CommandClasses } from "../commandclass/CommandClasses";
import { ValueMetadata } from "../values/Metadata";
import { ValueDB, ValueID } from "./ValueDB";

describe("lib/node/ValueDB => ", () => {
	let valueDB: ValueDB;
	const onValueAdded = jest.fn();
	const onValueUpdated = jest.fn();
	const onValueRemoved = jest.fn();
	const onMetadataUpdated = jest.fn();

	function createValueDB(): void {
		valueDB = new ValueDB()
			.on("value added", onValueAdded)
			.on("value updated", onValueUpdated)
			.on("value removed", onValueRemoved)
			.on("metadata updated", onMetadataUpdated);
	}

	beforeAll(() => createValueDB());

	describe("setValue() (first add)", () => {
		let cbArg: any;
		beforeAll(() => {
			valueDB.setValue(
				{
					commandClass: CommandClasses["Alarm Sensor"],
					endpoint: 4,
					propertyName: "foo",
				},
				"bar",
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
			const valueId = {
				commandClass: CommandClasses["Wake Up"],
				endpoint: 0,
				propertyName: "prop",
			};
			valueDB.setValue(valueId, "foo");
			valueDB.setValue(valueId, "bar");
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

	describe("values with a property key", () => {
		const cc = CommandClasses["Wake Up"];

		beforeAll(() => {
			valueDB.setValue(
				{
					commandClass: cc,
					endpoint: 0,
					propertyName: "prop",
					propertyKey: "foo",
				},
				1,
			);
			valueDB.setValue(
				{
					commandClass: cc,
					endpoint: 0,
					propertyName: "prop",
					propertyKey: "bar",
				},
				2,
			);
		});

		afterAll(() => {
			onValueAdded.mockClear();
			onValueUpdated.mockClear();
			onValueRemoved.mockClear();
		});

		it("getValue()/setValue() should treat different property keys as distinct values", () => {
			expect(
				valueDB.getValue({
					commandClass: cc,
					endpoint: 0,
					propertyName: "prop",
					propertyKey: "foo",
				}),
			).toBe(1);
			expect(
				valueDB.getValue({
					commandClass: cc,
					endpoint: 0,
					propertyName: "prop",
					propertyKey: "bar",
				}),
			).toBe(2);
		});

		it("the value added callback should have been called for each added value", () => {
			expect(onValueAdded).toBeCalled();
			const getArg = (call: number) => onValueAdded.mock.calls[call][0];
			expect(getArg(0).propertyKey).toBe("foo");
			expect(getArg(1).propertyKey).toBe("bar");
		});

		it("after clearing the value DB, the values should all be removed", () => {
			valueDB.clear();
			expect(
				valueDB.getValue({
					commandClass: cc,
					endpoint: 0,
					propertyName: "prop",
					propertyKey: "foo",
				}),
			).toBeUndefined();
			expect(
				valueDB.getValue({
					commandClass: cc,
					endpoint: 0,
					propertyName: "prop",
					propertyKey: "bar",
				}),
			).toBeUndefined();
		});
	});

	describe("removeValue()", () => {
		let cbArg: any;
		beforeAll(() => {
			valueDB.setValue(
				{
					commandClass: CommandClasses["Alarm Sensor"],
					endpoint: 1,
					propertyName: "bar",
				},
				"foo",
			);
			valueDB.removeValue({
				commandClass: CommandClasses["Alarm Sensor"],
				endpoint: 1,
				propertyName: "bar",
			});
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
				"test",
				"value",
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
		const valueId1 = {
			commandClass: CommandClasses["Alarm Sensor"],
			endpoint: 1,
			propertyName: "bar",
		};
		const valueId2 = {
			commandClass: CommandClasses.Battery,
			endpoint: 2,
			propertyName: "prop",
		};
		beforeAll(() => {
			createValueDB();
			valueDB.setValue(valueId1, "foo");
			valueDB.setValue(valueId2, "bar");
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
			actual = valueDB.getValue(valueId1);
			expect(actual).toBeUndefined();

			actual = valueDB.setValue(valueId2, "bar");
			expect(actual).toBeUndefined();
		});
	});

	describe("getValue() / getValues()", () => {
		beforeEach(() => createValueDB());

		it("getValue() should return the value stored for the same combination of CC, endpoint and propertyName", () => {
			const tests = [
				{
					commandClass: CommandClasses.Basic,
					endpoint: 0,
					propertyName: "foo",
					value: "1",
				},
				{
					commandClass: CommandClasses.Basic,
					endpoint: 2,
					propertyName: "foo",
					value: "2",
				},
				{
					commandClass: CommandClasses.Basic,
					endpoint: 0,
					propertyName: "FOO",
					value: "3",
				},
				{
					commandClass: CommandClasses.Basic,
					endpoint: 2,
					propertyName: "FOO",
					value: "4",
				},
			];

			for (const { value, ...valueId } of tests) {
				valueDB.setValue(valueId, value);
			}
			for (const { value, ...valueId } of tests) {
				expect(valueDB.getValue(valueId)).toBe(value);
			}
		});

		it("getValues() should return all values stored for the given CC", () => {
			const values = [
				{
					commandClass: CommandClasses.Basic,
					endpoint: 0,
					propertyName: "foo",
					value: "1",
				},
				{
					commandClass: CommandClasses.Basic,
					endpoint: 2,
					propertyName: "foo",
					value: "2",
				},
				{
					commandClass: CommandClasses.Basic,
					endpoint: 0,
					propertyName: "FOO",
					value: "3",
				},
				{
					commandClass: CommandClasses.Battery,
					endpoint: 2,
					propertyName: "FOO",
					value: "4",
				},
			];
			const requestedCC = CommandClasses.Basic;
			const expected = values.filter(t => t.commandClass === requestedCC);

			for (const { value, ...valueId } of values) {
				valueDB.setValue(valueId, value);
			}

			const actual = valueDB.getValues(requestedCC);
			expect(actual).toHaveLength(expected.length);
			expect(actual).toContainAllValues(expected);
		});
	});

	describe("hasValue()", () => {
		beforeEach(() => createValueDB());

		it("should return false if no value is stored for the same combination of CC, endpoint and propertyName", () => {
			const tests = [
				{
					commandClass: CommandClasses.Basic,
					endpoint: 0,
					propertyName: "foo",
					value: "1",
				},
				{
					commandClass: CommandClasses.Basic,
					endpoint: 2,
					propertyName: "foo",
					value: "2",
				},
				{
					commandClass: CommandClasses.Basic,
					endpoint: 0,
					propertyName: "FOO",
					value: "3",
				},
				{
					commandClass: CommandClasses.Basic,
					endpoint: 2,
					propertyName: "FOO",
					value: "4",
				},
			];

			for (const { value, ...valueId } of tests) {
				expect(valueDB.hasValue(valueId)).toBeFalse();
				valueDB.setValue(valueId, value);
				expect(valueDB.hasValue(valueId)).toBeTrue();
			}
		});
	});

	describe("Metadata", () => {
		beforeEach(() => createValueDB());

		it("is assigned to a specific combination of endpoint, property name (and property key)", () => {
			const valueId: ValueID = {
				commandClass: 1,
				endpoint: 2,
				propertyName: "3",
			};
			valueDB.setMetadata(valueId, ValueMetadata.Any);
			expect(valueDB.hasMetadata(valueId)).toBeTrue();
			expect(
				valueDB.hasMetadata({ ...valueId, propertyKey: 4 }),
			).toBeFalse();
			expect(valueDB.getMetadata(valueId)).toBe(ValueMetadata.Any);
			expect(
				valueDB.getMetadata({ ...valueId, propertyKey: 4 }),
			).toBeUndefined();
		});

		it("is cleared together with the values", () => {
			const valueId: ValueID = {
				commandClass: 1,
				endpoint: 2,
				propertyName: "3",
			};
			valueDB.setMetadata(valueId, ValueMetadata.Any);
			valueDB.clear();
			expect(valueDB.hasMetadata(valueId)).toBeFalse();
		});

		describe("getAllMetadata()", () => {
			it("returns all metadata for a given CC", () => {
				expect(valueDB.getAllMetadata(1)).toHaveLength(0);

				valueDB.setMetadata(
					{
						commandClass: 1,
						endpoint: 2,
						propertyName: "3",
					},
					ValueMetadata.Any,
				);
				expect(valueDB.getAllMetadata(1)).toHaveLength(1);

				valueDB.setMetadata(
					{
						commandClass: 5,
						endpoint: 2,
						propertyName: "3",
					},
					ValueMetadata.Any,
				);
				expect(valueDB.getAllMetadata(1)).toHaveLength(1);
				expect(valueDB.getAllMetadata(5)).toHaveLength(1);

				valueDB.setMetadata(
					{
						commandClass: 5,
						endpoint: 2,
						propertyName: "5",
					},
					ValueMetadata.Any,
				);
				expect(valueDB.getAllMetadata(1)).toHaveLength(1);
				expect(valueDB.getAllMetadata(5)).toHaveLength(2);
			});
		});

		describe("updating dynamic metadata", () => {
			let cbArg: any;
			beforeAll(() => {
				valueDB.setMetadata(
					{
						commandClass: 1,
						endpoint: 2,
						propertyName: "3",
					},
					ValueMetadata.Any,
				);
			});

			afterAll(() => {
				onMetadataUpdated.mockClear();
			});

			it(`should emit the "metadata updated" event`, () => {
				expect(onMetadataUpdated).toBeCalled();
				cbArg = onMetadataUpdated.mock.calls[0][0];
			});

			it("The callback arg should contain the CC", () => {
				expect(cbArg).toBeObject();
				expect(cbArg.commandClass).toBe(1);
			});

			it("The callback arg should contain the endpoint", () => {
				expect(cbArg.endpoint).toBe(2);
			});

			it("The callback arg should contain the property name", () => {
				expect(cbArg.propertyName).toBe("3");
			});

			it("The callback arg should contain the new metadata", () => {
				expect(cbArg.metadata).toBe(ValueMetadata.Any);
			});
		});
	});
});
