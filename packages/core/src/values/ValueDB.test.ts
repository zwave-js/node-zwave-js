import { pick } from "@zwave-js/shared";
import test from "ava";
import sinon from "sinon";
import { CommandClasses } from "../capabilities/CommandClasses";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { assertZWaveErrorAva } from "../test/assertZWaveError";
import { ValueMetadata } from "../values/Metadata";
import { dbKeyToValueIdFast, ValueDB } from "./ValueDB";
import type { ValueID } from "./_Types";

function setup(): {
	valueDB: ValueDB;
	onValueAdded: sinon.SinonSpy;
	onValueUpdated: sinon.SinonSpy;
	onValueRemoved: sinon.SinonSpy;
	onMetadataUpdated: sinon.SinonSpy;
} {
	const onValueAdded = sinon.spy();
	const onValueUpdated = sinon.spy();
	const onValueRemoved = sinon.spy();
	const onMetadataUpdated = sinon.spy();
	const valueDB = new ValueDB(2, new Map() as any, new Map() as any)
		.on("value added", onValueAdded)
		.on("value updated", onValueUpdated)
		.on("value removed", onValueRemoved)
		.on("metadata updated", onMetadataUpdated);

	return {
		valueDB,
		onValueAdded,
		onValueUpdated,
		onValueRemoved,
		onMetadataUpdated,
	};
}

test("setValue() -> first add", (t) => {
	const { valueDB, onValueAdded } = setup();

	valueDB.setValue(
		{
			commandClass: CommandClasses["Alarm Sensor"],
			endpoint: 4,
			property: "foo",
		},
		"bar",
	);

	// should emit the value added event
	sinon.assert.called(onValueAdded);
	const cbArg = onValueAdded.getCall(0).args[0];

	// The callback arg should contain the CC
	t.is(typeof cbArg, "object");
	t.is(cbArg.commandClass, CommandClasses["Alarm Sensor"]);

	// The callback arg should contain the endpoint
	t.is(cbArg.endpoint, 4);

	// The callback arg should contain the property name
	t.is(cbArg.property, "foo");

	// The callback arg should contain the new value
	t.is(cbArg.newValue, "bar");
});

test("setValue() -> consecutive adds", (t) => {
	const { valueDB, onValueAdded, onValueUpdated } = setup();

	const valueId = {
		commandClass: CommandClasses["Wake Up"],
		endpoint: 0,
		property: "prop",
	};
	valueDB.setValue(valueId, "foo");
	valueDB.setValue(valueId, "bar");

	// should emit the value updated event
	sinon.assert.called(onValueUpdated);
	const cbArg = onValueAdded.getCall(0).args[0];

	// The callback arg should contain the CC
	t.is(typeof cbArg, "object");
	t.is(cbArg.commandClass, CommandClasses["Wake Up"]);

	// The callback arg should contain the endpoint
	t.is(cbArg.endpoint, 0);

	// The callback arg should contain the property name
	t.is(cbArg.property, "prop");

	// The callback arg should contain the previous value
	t.is(cbArg.prevValue, "foo");

	// The callback arg should contain the new value
	t.is(cbArg.newValue, "bar");
});

test("setValue()/removeValue() -> with the noEvent parameter set to true", (t) => {
	const { valueDB, onValueAdded, onValueUpdated, onValueRemoved } = setup();

	valueDB.setValue(
		{
			commandClass: CommandClasses["Alarm Sensor"],
			endpoint: 4,
			property: "foo",
		},
		"bar",
		{ noEvent: true },
	);
	valueDB.setValue(
		{
			commandClass: CommandClasses["Alarm Sensor"],
			endpoint: 4,
			property: "foo",
		},
		"baz",
		{ noEvent: true },
	);
	valueDB.removeValue(
		{
			commandClass: CommandClasses["Alarm Sensor"],
			endpoint: 4,
			property: "foo",
		},
		{ noEvent: true },
	);

	// should not emit any events
	sinon.assert.notCalled(onValueAdded);
	sinon.assert.notCalled(onValueUpdated);
	sinon.assert.notCalled(onValueRemoved);
});

describe("values with a property key", () => {
	const cc = CommandClasses["Wake Up"];

	const { valueDB, onValueAdded, onValueUpdated, onValueRemoved } = setup();

	valueDB.setValue(
		{
			commandClass: cc,
			endpoint: 0,
			property: "prop",
			propertyKey: "foo",
		},
		1,
	);
	valueDB.setValue(
		{
			commandClass: cc,
			endpoint: 0,
			property: "prop",
			propertyKey: "bar",
		},
		2,
	);

	it("getValue()/setValue() should treat different property keys as distinct values", () => {
		expect(
			valueDB.getValue({
				commandClass: cc,
				endpoint: 0,
				property: "prop",
				propertyKey: "foo",
			}),
		).toBe(1);
		expect(
			valueDB.getValue({
				commandClass: cc,
				endpoint: 0,
				property: "prop",
				propertyKey: "bar",
			}),
		).toBe(2);
	});

	it("the value added callback should have been called for each added value", () => {
		sinon.assert.called(onValueAdded);
		const getArg = (call: number) => onValueAdded.mock.calls[call][0];
		t.is(getArg(0).propertyKey, "foo");
		t.is(getArg(1).propertyKey, "bar");
	});

	it("after clearing the value DB, the values should all be removed", () => {
		valueDB.clear();
		expect(
			valueDB.getValue({
				commandClass: cc,
				endpoint: 0,
				property: "prop",
				propertyKey: "foo",
			}),
		).toBeUndefined();
		expect(
			valueDB.getValue({
				commandClass: cc,
				endpoint: 0,
				property: "prop",
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
				property: "bar",
			},
			"foo",
		);
		valueDB.removeValue({
			commandClass: CommandClasses["Alarm Sensor"],
			endpoint: 1,
			property: "bar",
		});
	});

	afterAll(() => {
		onValueAdded.mockClear();
		onValueUpdated.mockClear();
		onValueRemoved.mockClear();
	});

	it("should emit the value removed event", () => {
		sinon.assert.called(onValueRemoved);
		cbArg = onValueRemoved.mock.calls[0][0];
	});

	it("The callback arg should contain the CC", () => {
		t.is(typeof cbArg, "object");
		t.is(cbArg.commandClass, CommandClasses["Alarm Sensor"]);
	});

	it("The callback arg should contain the endpoint", () => {
		t.is(cbArg.endpoint, 1);
	});

	it("The callback arg should contain the property name", () => {
		t.is(cbArg.property, "bar");
	});

	it("The callback arg should contain the previous value", () => {
		t.is(cbArg.prevValue, "foo");
	});

	it("If the value was not in the DB, the value removed event should not be emitted", () => {
		onValueRemoved.mockClear();
		valueDB.removeValue({
			commandClass: CommandClasses["Basic Tariff Information"],
			endpoint: 9,
			property: "test",
		});
		sinon.assert.notCalled(onValueRemoved);
	});

	it("should return true if a value was removed, false otherwise", () => {
		const retValNotFound = valueDB.removeValue({
			commandClass: CommandClasses["Basic Tariff Information"],
			endpoint: 9,
			property: "test",
		});
		expect(retValNotFound).toBeFalse();

		valueDB.setValue(
			{
				commandClass: CommandClasses["Basic Tariff Information"],
				endpoint: 0,
				property: "test",
			},
			"value",
		);
		const retValFound = valueDB.removeValue({
			commandClass: CommandClasses["Basic Tariff Information"],
			endpoint: 0,
			property: "test",
		});
		expect(retValFound).toBeTrue();
	});

	it("After removing a value, getValue should return undefined", () => {
		const actual = valueDB.getValue({
			commandClass: CommandClasses["Alarm Sensor"],
			endpoint: 1,
			property: "bar",
		});
		expect(actual).toBeUndefined();
	});
});

describe("clear()", () => {
	let cbArgs: any[];
	const valueId1 = {
		commandClass: CommandClasses["Alarm Sensor"],
		endpoint: 1,
		property: "bar",
	};
	const valueId2 = {
		commandClass: CommandClasses.Battery,
		endpoint: 2,
		property: "prop",
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
		cbArgs = onValueRemoved.mock.calls.map((args) => args[0]);
	});

	it("The callback should contain the removed values", () => {
		t.is(typeof cbArgs[0], "object");
		t.is(cbArgs[0].prevValue, "foo");
		t.is(typeof cbArgs[1], "object");
		t.is(cbArgs[1].prevValue, "bar");
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

	it("getValue() should return the value stored for the same combination of CC, endpoint and property", () => {
		const tests = [
			{
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "foo",
				value: "1",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 2,
				property: "foo",
				value: "2",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "FOO",
				value: "3",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 2,
				property: "FOO",
				value: "4",
			},
		];

		for (const { value, ...valueId } of tests) {
			valueDB.setValue(valueId, value);
		}
		for (const { value, ...valueId } of tests) {
			t.is(valueDB.getValue(valueId), value);
		}
	});

	it("getValues() should return all values stored for the given CC", () => {
		const values = [
			{
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "foo",
				value: "1",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 2,
				property: "foo",
				value: "2",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "FOO",
				value: "3",
			},
			{
				commandClass: CommandClasses.Battery,
				endpoint: 2,
				property: "FOO",
				value: "4",
			},
		];
		const requestedCC = CommandClasses.Basic;
		const expected = values.filter((t) => t.commandClass === requestedCC);

		for (const { value, ...valueId } of values) {
			valueDB.setValue(valueId, value);
		}

		const actual = valueDB.getValues(requestedCC);
		expect(actual).toHaveLength(expected.length);
		expect(actual).toContainAllValues(expected);
	});

	it("getValues() should ignore values from another node", () => {
		const values = [
			{
				nodeId: 2,
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "foo",
				value: "1",
			},
			{
				nodeId: 2,
				commandClass: CommandClasses.Battery,
				endpoint: 2,
				property: "foo",
				value: "2",
			},
			{
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "FOO",
				value: "3",
			},
			{
				nodeId: 1,
				commandClass: CommandClasses.Battery,
				endpoint: 2,
				property: "FOO",
				value: "4",
			},
		];
		const requestedCC = CommandClasses.Basic;
		const expected = values
			.filter((t) => t.commandClass === requestedCC && t.nodeId === 2)
			.map(({ nodeId, ...rest }) => rest);

		for (const { value, ...valueId } of values) {
			(valueDB as any)._db.set(JSON.stringify(valueId), value);
		}

		// we're bypassing the index, so we need to fix that
		valueDB["_index"] = valueDB["buildIndex"]();

		const actual = valueDB.getValues(requestedCC);
		expect(actual).toHaveLength(expected.length);
		expect(actual).toContainAllValues(expected);
	});
});

describe("hasValue()", () => {
	beforeEach(() => createValueDB());

	it("should return false if no value is stored for the same combination of CC, endpoint and property", () => {
		const tests = [
			{
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "foo",
				value: "1",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 2,
				property: "foo",
				value: "2",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "FOO",
				value: "3",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 2,
				property: "FOO",
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

describe("findValues()", () => {
	beforeEach(() => createValueDB());

	it("should return all values whose id matches the given predicate", () => {
		const values = [
			{
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "foo",
				value: "1",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 2,
				property: "foo",
				value: "2",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "FOO",
				value: "3",
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 2,
				property: "FOO",
				value: "4",
			},
		];

		for (const { value, ...valueId } of values) {
			valueDB.setValue(valueId, value);
		}
		expect(valueDB.findValues((id) => id.endpoint === 2)).toEqual(
			values.filter((v) => v.endpoint === 2),
		);
	});

	it("should ignore values from another node", () => {
		const values = [
			{
				nodeId: 2,
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "foo",
				value: "1",
			},
			{
				nodeId: 2,
				commandClass: CommandClasses.Battery,
				endpoint: 2,
				property: "foo",
				value: "2",
			},
			{
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "FOO",
				value: "3",
			},
			{
				nodeId: 1,
				commandClass: CommandClasses.Battery,
				endpoint: 2,
				property: "FOO",
				value: "4",
			},
		];
		for (const { value, ...valueId } of values) {
			(valueDB as any)._db.set(JSON.stringify(valueId), value);
		}

		// we're bypassing the index, so we need to fix that
		valueDB["_index"] = valueDB["buildIndex"]();

		// The node has nodeID 2
		const { nodeId, ...expected } = values[1];
		expect(valueDB.findValues((id) => id.endpoint === 2)).toEqual([
			expected,
		]);
	});
});

describe("Metadata", () => {
	beforeEach(() => createValueDB());

	it("is assigned to a specific combination of endpoint, property name (and property key)", () => {
		const valueId: ValueID = {
			commandClass: 1,
			endpoint: 2,
			property: "3",
		};
		valueDB.setMetadata(valueId, ValueMetadata.Any);
		expect(valueDB.hasMetadata(valueId)).toBeTrue();
		expect(valueDB.hasMetadata({ ...valueId, propertyKey: 4 })).toBeFalse();
		t.is(valueDB.getMetadata(valueId), ValueMetadata.Any);
		expect(
			valueDB.getMetadata({ ...valueId, propertyKey: 4 }),
		).toBeUndefined();
	});

	it("is cleared together with the values", () => {
		const valueId: ValueID = {
			commandClass: 1,
			endpoint: 2,
			property: "3",
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
					property: "3",
				},
				ValueMetadata.Any,
			);
			expect(valueDB.getAllMetadata(1)).toHaveLength(1);

			valueDB.setMetadata(
				{
					commandClass: 5,
					endpoint: 2,
					property: "3",
				},
				ValueMetadata.Any,
			);
			expect(valueDB.getAllMetadata(1)).toHaveLength(1);
			expect(valueDB.getAllMetadata(5)).toHaveLength(1);

			valueDB.setMetadata(
				{
					commandClass: 5,
					endpoint: 2,
					property: "5",
				},
				ValueMetadata.Any,
			);
			expect(valueDB.getAllMetadata(1)).toHaveLength(1);
			expect(valueDB.getAllMetadata(5)).toHaveLength(2);
		});

		it("should ignore values from another node", () => {
			const metadata = [
				{
					nodeId: 2,
					commandClass: CommandClasses.Basic,
					endpoint: 0,
					property: "foo",
					meta: ValueMetadata.Any,
				},
				{
					nodeId: 2,
					commandClass: CommandClasses.Battery,
					endpoint: 2,
					property: "foo",
					meta: ValueMetadata.Any,
				},
				{
					nodeId: 1,
					commandClass: CommandClasses.Basic,
					endpoint: 0,
					property: "FOO",
					meta: ValueMetadata.Any,
				},
				{
					nodeId: 1,
					commandClass: CommandClasses.Battery,
					endpoint: 2,
					property: "FOO",
					meta: ValueMetadata.Any,
				},
			];
			const requestedCC = CommandClasses.Basic;
			const expected = metadata
				.filter((t) => t.commandClass === requestedCC && t.nodeId === 2)
				.map(({ nodeId, meta, ...rest }) => ({
					...rest,
					metadata: meta,
				}));

			for (const { meta, ...valueId } of metadata) {
				(valueDB as any)._metadata.set(JSON.stringify(valueId), meta);
			}

			// we're bypassing the index, so we need to fix that
			valueDB["_index"] = valueDB["buildIndex"]();

			const actual = valueDB.getAllMetadata(requestedCC);
			expect(actual).toHaveLength(expected.length);
			expect(actual).toContainAllValues(expected);
		});
	});

	describe("updating dynamic metadata", () => {
		let cbArg: any;
		beforeAll(() => {
			valueDB.setMetadata(
				{
					commandClass: 1,
					endpoint: 2,
					property: "3",
				},
				ValueMetadata.Any,
			);
		});

		afterAll(() => {
			onMetadataUpdated.mockClear();
		});

		it(`should emit the "metadata updated" event`, () => {
			sinon.assert.called(onMetadataUpdated);
			cbArg = onMetadataUpdated.mock.calls[0][0];
		});

		it("The callback arg should contain the CC", () => {
			t.is(typeof cbArg, "object");
			t.is(cbArg.commandClass, 1);
		});

		it("The callback arg should contain the endpoint", () => {
			t.is(cbArg.endpoint, 2);
		});

		it("The callback arg should contain the property", () => {
			t.is(cbArg.property, "3");
		});

		it("The callback arg should contain the new metadata", () => {
			t.is(cbArg.metadata, ValueMetadata.Any);
		});
	});
});

describe("findMetadata()", () => {
	beforeEach(() => createValueDB());

	it("should return all metadata whose id matches the given predicate", () => {
		const metadata = [
			{
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "foo",
				meta: ValueMetadata.Any,
			},
			{
				commandClass: CommandClasses.Battery,
				endpoint: 2,
				property: "foo",
				meta: ValueMetadata.Any,
			},
			{
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "FOO",
				meta: ValueMetadata.Any,
			},
			{
				commandClass: CommandClasses.Battery,
				endpoint: 2,
				property: "FOO",
				meta: ValueMetadata.Any,
			},
		];

		for (const { meta, ...valueId } of metadata) {
			valueDB.setMetadata(valueId, meta);
		}

		const expected = metadata
			.filter((v) => v.endpoint === 2)
			.map(({ meta, ...rest }) => ({
				...rest,
				metadata: meta,
			}));

		expect(valueDB.findMetadata((id) => id.endpoint === 2)).toEqual(
			expected,
		);
	});

	it("should ignore metadata from another node", () => {
		const metadata = [
			{
				nodeId: 2,
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "foo",
				meta: ValueMetadata.Any,
			},
			{
				nodeId: 2,
				commandClass: CommandClasses.Battery,
				endpoint: 2,
				property: "foo",
				meta: ValueMetadata.Any,
			},
			{
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				endpoint: 0,
				property: "FOO",
				meta: ValueMetadata.Any,
			},
			{
				nodeId: 1,
				commandClass: CommandClasses.Battery,
				endpoint: 2,
				property: "FOO",
				meta: ValueMetadata.Any,
			},
		];
		for (const { meta, ...valueId } of metadata) {
			(valueDB as any)._metadata.set(JSON.stringify(valueId), meta);
		}

		// we're bypassing the index, so we need to fix that
		valueDB["_index"] = valueDB["buildIndex"]();

		// The node has nodeID 2
		const expectedMeta = metadata[1];
		const expected = {
			...pick(expectedMeta, ["commandClass", "endpoint", "property"]),
			metadata: expectedMeta.meta,
		};
		expect(valueDB.findMetadata((id) => id.endpoint === 2)).toEqual([
			expected,
		]);
	});
});

describe("invalid value IDs should cause an error to be thrown", () => {
	const invalidValueIDs = [
		// missing required properties
		{ commandClass: undefined, property: "test" },
		{ commandClass: 1, property: undefined },
		// wrong type
		{ commandClass: "1", property: 5, propertyKey: 7, endpoint: 1 },
		{ commandClass: 1, property: true, propertyKey: 7, endpoint: 1 },
		{ commandClass: 1, property: 5, propertyKey: false, endpoint: 1 },
		{ commandClass: 1, property: 5, propertyKey: 7, endpoint: "5" },
	];
	it("getValue()", () => {
		for (const valueId of invalidValueIDs) {
			assertZWaveErrorAva(t, () => valueDB.getValue(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	it("setValue()", () => {
		for (const valueId of invalidValueIDs) {
			assertZWaveErrorAva(t, () => valueDB.setValue(valueId as any, 0), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	it("hasValue()", () => {
		for (const valueId of invalidValueIDs) {
			assertZWaveErrorAva(t, () => valueDB.hasValue(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	it("removeValue()", () => {
		for (const valueId of invalidValueIDs) {
			assertZWaveErrorAva(t, () => valueDB.removeValue(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	it("getMetadata()", () => {
		for (const valueId of invalidValueIDs) {
			assertZWaveErrorAva(t, () => valueDB.getMetadata(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	it("setMetadata()", () => {
		for (const valueId of invalidValueIDs) {
			assertZWaveErrorAva(
				t,
				() => valueDB.setMetadata(valueId as any, {} as any),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
				},
			);
		}
	});

	it("hasMetadata()", () => {
		for (const valueId of invalidValueIDs) {
			assertZWaveErrorAva(t, () => valueDB.hasMetadata(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});
});

describe(`invalid value IDs should be ignored by the setXYZ methods when the "noThrow" parameter is true`, () => {
	const invalidValueIDs = [
		// missing required properties
		{ commandClass: undefined, property: "test" },
		{ commandClass: 1, property: undefined },
		// wrong type
		{ commandClass: "1", property: 5, propertyKey: 7, endpoint: 1 },
		{ commandClass: 1, property: true, propertyKey: 7, endpoint: 1 },
		{ commandClass: 1, property: 5, propertyKey: false, endpoint: 1 },
		{ commandClass: 1, property: 5, propertyKey: 7, endpoint: "5" },
	];

	it("setValue()", () => {
		for (const valueId of invalidValueIDs) {
			expect(() =>
				valueDB.setValue(valueId as any, 0, { noThrow: true }),
			).not.toThrow();
		}
	});

	it("setMetadata()", () => {
		for (const valueId of invalidValueIDs) {
			expect(() =>
				valueDB.setMetadata(valueId as any, {} as any, {
					noThrow: true,
				}),
			).not.toThrow();
		}
	});
});

describe("dbKeyToValueIdFast()", () => {
	it("should work correctly", () => {
		const tests: ({ nodeId: number } & ValueID)[] = [
			{
				nodeId: 1,
				commandClass: 2,
				endpoint: 3,
				property: "4",
				propertyKey: "5",
			},
			{
				nodeId: 2,
				commandClass: 4,
				endpoint: 7,
				property: "44",
				propertyKey: 6,
			},
			{
				nodeId: 3,
				commandClass: 6,
				endpoint: 11,
				property: 48,
				propertyKey: "8",
			},
			{
				nodeId: 4,
				commandClass: 9,
				endpoint: 17,
				property: 48,
				propertyKey: 9,
			},
			{ nodeId: 6, commandClass: 13, endpoint: 0, property: "c" },
		];

		for (const test of tests) {
			expect(dbKeyToValueIdFast(JSON.stringify(test))).toEqual(test);
		}
	});
});
