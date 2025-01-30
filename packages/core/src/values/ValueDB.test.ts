import { pick } from "@zwave-js/shared/safe";
import sinon from "sinon";
import { test } from "vitest";
import { CommandClasses } from "../definitions/CommandClasses.js";
import { ZWaveErrorCodes } from "../error/ZWaveError.js";
import { assertZWaveError } from "../test/assertZWaveError.js";
import { ValueMetadata } from "./Metadata.js";
import { ValueDB, dbKeyToValueIdFast, valueEquals } from "./ValueDB.js";
import type { ValueID } from "./_Types.js";

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
	t.expect(typeof cbArg).toBe("object");
	t.expect(cbArg.commandClass).toBe(CommandClasses["Alarm Sensor"]);

	// The callback arg should contain the endpoint
	t.expect(cbArg.endpoint).toBe(4);

	// The callback arg should contain the property name
	t.expect(cbArg.property).toBe("foo");

	// The callback arg should contain the new value
	t.expect(cbArg.newValue).toBe("bar");
});

test("setValue() -> consecutive adds", (t) => {
	const { valueDB, onValueUpdated } = setup();

	const valueId = {
		commandClass: CommandClasses["Wake Up"],
		endpoint: 0,
		property: "prop",
	};
	valueDB.setValue(valueId, "foo");
	valueDB.setValue(valueId, "bar");

	// should emit the value updated event
	sinon.assert.called(onValueUpdated);
	const cbArg = onValueUpdated.getCall(0).args[0];

	// The callback arg should contain the CC
	t.expect(typeof cbArg).toBe("object");
	t.expect(cbArg.commandClass).toBe(CommandClasses["Wake Up"]);

	// The callback arg should contain the endpoint
	t.expect(cbArg.endpoint).toBe(0);

	// The callback arg should contain the property name
	t.expect(cbArg.property).toBe("prop");

	// The callback arg should contain the previous value
	t.expect(cbArg.prevValue).toBe("foo");

	// The callback arg should contain the new value
	t.expect(cbArg.newValue).toBe("bar");
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

test("getValue()/setValue() -> should distinguish values by property key", (t) => {
	const { valueDB, onValueAdded } = setup();

	const cc = CommandClasses["Wake Up"];
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

	// treat different property keys as distinct values", () => {
	t.expect(
		valueDB.getValue({
			commandClass: cc,
			endpoint: 0,
			property: "prop",
			propertyKey: "foo",
		}),
	).toBe(1);
	t.expect(
		valueDB.getValue({
			commandClass: cc,
			endpoint: 0,
			property: "prop",
			propertyKey: "bar",
		}),
	).toBe(2);

	// the value added callback should have been called for each added value", () => {
	sinon.assert.calledTwice(onValueAdded);
	t.expect(onValueAdded.getCall(0).args[0].propertyKey).toBe("foo");
	t.expect(onValueAdded.getCall(1).args[0].propertyKey).toBe("bar");

	// after clearing the value DB, the values should all be removed", () => {
	valueDB.clear();
	t.expect(
		valueDB.getValue({
			commandClass: cc,
			endpoint: 0,
			property: "prop",
			propertyKey: "foo",
		}),
	).toBeUndefined();
	t.expect(
		valueDB.getValue({
			commandClass: cc,
			endpoint: 0,
			property: "prop",
			propertyKey: "bar",
		}),
	).toBeUndefined();
});

test("removeValue()", (t) => {
	const { valueDB, onValueRemoved } = setup();

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

	// should emit the value removed event
	sinon.assert.called(onValueRemoved);
	const cbArg = onValueRemoved.getCall(0).args[0];

	// The callback arg should contain the CC
	t.expect(typeof cbArg).toBe("object");
	t.expect(cbArg.commandClass).toBe(CommandClasses["Alarm Sensor"]);

	// The callback arg should contain the endpoint
	t.expect(cbArg.endpoint).toBe(1);

	// The callback arg should contain the property name
	t.expect(cbArg.property).toBe("bar");

	// The callback arg should contain the previous value
	t.expect(cbArg.prevValue).toBe("foo");

	// If the value was not in the DB, the value removed event should not be emitted
	onValueRemoved.resetHistory();
	valueDB.removeValue({
		commandClass: CommandClasses["Basic Tariff Information"],
		endpoint: 9,
		property: "test",
	});
	sinon.assert.notCalled(onValueRemoved);

	// should return true if a value was removed, false otherwise
	const retValNotFound = valueDB.removeValue({
		commandClass: CommandClasses["Basic Tariff Information"],
		endpoint: 9,
		property: "test",
	});
	t.expect(retValNotFound).toBe(false);

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
	t.expect(retValFound).toBe(true);

	// After removing a value, getValue should return undefined
	const actual = valueDB.getValue({
		commandClass: CommandClasses["Alarm Sensor"],
		endpoint: 1,
		property: "bar",
	});
	t.expect(actual).toBeUndefined();
});

test("clear()", (t) => {
	const { valueDB, onValueRemoved } = setup();

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

	valueDB.setValue(valueId1, "foo");
	valueDB.setValue(valueId2, "bar");
	valueDB.clear();

	// should emit the value removed event for all stored values
	sinon.assert.callCount(onValueRemoved, 2);
	const cbArgs = onValueRemoved.getCalls().map((c) => c.args[0]);

	// The callback should contain the removed values
	t.expect(typeof cbArgs[0]).toBe("object");
	t.expect(cbArgs[0].prevValue).toBe("foo");
	t.expect(typeof cbArgs[1]).toBe("object");
	t.expect(cbArgs[1].prevValue).toBe("bar");

	// After clearing, getValue should return undefined
	let actual: unknown;
	actual = valueDB.getValue(valueId1);
	t.expect(actual).toBeUndefined();

	actual = valueDB.setValue(valueId2, "bar");
	t.expect(actual).toBeUndefined();
});

test("getValue() should return the value stored for the same combination of CC, endpoint and property", (t) => {
	const { valueDB } = setup();
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
		t.expect(valueDB.getValue(valueId)).toBe(value);
	}
});

test("getValues() should return all values stored for the given CC", (t) => {
	const { valueDB } = setup();

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
	t.expect(actual.length).toBe(expected.length);
	t.expect(actual).toStrictEqual(expected);
});

test("getValues() should ignore values from another node", (t) => {
	const { valueDB } = setup();
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
	t.expect(actual.length).toBe(expected.length);
	t.expect(actual).toStrictEqual(expected);
});

test("hasValue() -> should return false if no value is stored for the same combination of CC, endpoint and property", (t) => {
	const { valueDB } = setup();
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
		t.expect(valueDB.hasValue(valueId)).toBe(false);
		valueDB.setValue(valueId, value);
		t.expect(valueDB.hasValue(valueId)).toBe(true);
	}
});

test("findValues() -> should return all values whose id matches the given predicate", (t) => {
	const { valueDB } = setup();
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
	t.expect(
		valueDB.findValues((id) => id.endpoint === 2),
	).toStrictEqual(values.filter((v) => v.endpoint === 2));
});

test("findValues() -> should ignore values from another node", (t) => {
	const { valueDB } = setup();
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
	t.expect(
		valueDB.findValues((id) => id.endpoint === 2),
	).toStrictEqual([expected]);
});

test("Metadata is assigned to a specific combination of endpoint, property name (and property key)", (t) => {
	const { valueDB } = setup();
	const valueId: ValueID = {
		commandClass: 1,
		endpoint: 2,
		property: "3",
	};
	valueDB.setMetadata(valueId, ValueMetadata.Any);
	t.expect(valueDB.hasMetadata(valueId)).toBe(true);
	t.expect(valueDB.hasMetadata({ ...valueId, propertyKey: 4 })).toBe(false);
	t.expect(valueDB.getMetadata(valueId)).toBe(ValueMetadata.Any);
	t.expect(valueDB.getMetadata({ ...valueId, propertyKey: 4 }))
		.toBeUndefined();
});

test("Metadata is cleared together with the values", (t) => {
	const { valueDB } = setup();
	const valueId: ValueID = {
		commandClass: 1,
		endpoint: 2,
		property: "3",
	};
	valueDB.setMetadata(valueId, ValueMetadata.Any);
	valueDB.clear();
	t.expect(valueDB.hasMetadata(valueId)).toBe(false);
});

test("getAllMetadata() -> returns all metadata for a given CC", (t) => {
	const { valueDB } = setup();
	t.expect(valueDB.getAllMetadata(1).length).toBe(0);

	valueDB.setMetadata(
		{
			commandClass: 1,
			endpoint: 2,
			property: "3",
		},
		ValueMetadata.Any,
	);
	t.expect(valueDB.getAllMetadata(1).length).toBe(1);

	valueDB.setMetadata(
		{
			commandClass: 55,
			endpoint: 2,
			property: "3",
		},
		ValueMetadata.Any,
	);
	t.expect(valueDB.getAllMetadata(1).length).toBe(1);
	t.expect(valueDB.getAllMetadata(55).length).toBe(1);

	valueDB.setMetadata(
		{
			commandClass: 55,
			endpoint: 2,
			property: "5",
		},
		ValueMetadata.Any,
	);
	t.expect(valueDB.getAllMetadata(1).length).toBe(1);
	t.expect(valueDB.getAllMetadata(55).length).toBe(2);
});

test("getAllMetadata() -> should ignore values from another node", (t) => {
	const { valueDB } = setup();
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
	t.expect(actual.length).toBe(expected.length);
	t.expect(actual).toStrictEqual(expected);
});

test("updating dynamic metadata", (t) => {
	const { valueDB, onMetadataUpdated } = setup();

	valueDB.setMetadata(
		{
			commandClass: 1,
			endpoint: 2,
			property: "3",
		},
		ValueMetadata.Any,
	);

	// should emit the "metadata updated" event
	sinon.assert.called(onMetadataUpdated);
	const cbArg = onMetadataUpdated.getCall(0).args[0];

	// The callback arg should contain the CC
	t.expect(typeof cbArg).toBe("object");
	t.expect(cbArg.commandClass).toBe(1);

	// The callback arg should contain the endpoint
	t.expect(cbArg.endpoint).toBe(2);

	// The callback arg should contain the property
	t.expect(cbArg.property).toBe("3");

	// The callback arg should contain the new metadata
	t.expect(cbArg.metadata).toBe(ValueMetadata.Any);
});

test("findMetadata() -> should return all metadata whose id matches the given predicate", (t) => {
	const { valueDB } = setup();

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

	t.expect(
		valueDB.findMetadata((id) => id.endpoint === 2),
	).toStrictEqual(expected);
});

test("findMetadata() -> should ignore metadata from another node", (t) => {
	const { valueDB } = setup();

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
	t.expect(
		valueDB.findMetadata((id) => id.endpoint === 2),
	).toStrictEqual([expected]);
});

{
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
	test("invalid value IDs should cause an error to be thrown -> getValue()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(t.expect, () => valueDB.getValue(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	test("invalid value IDs should cause an error to be thrown -> setValue()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(
				t.expect,
				() => valueDB.setValue(valueId as any, 0),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
				},
			);
		}
	});

	test("invalid value IDs should cause an error to be thrown -> hasValue()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(t.expect, () => valueDB.hasValue(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	test("invalid value IDs should cause an error to be thrown -> removeValue()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(
				t.expect,
				() => valueDB.removeValue(valueId as any),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
				},
			);
		}
	});

	test("invalid value IDs should cause an error to be thrown -> getMetadata()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(
				t.expect,
				() => valueDB.getMetadata(valueId as any),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
				},
			);
		}
	});

	test("invalid value IDs should cause an error to be thrown -> setMetadata()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(
				t.expect,
				() => valueDB.setMetadata(valueId as any, {} as any),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
				},
			);
		}
	});

	test("invalid value IDs should cause an error to be thrown -> hasMetadata()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(
				t.expect,
				() => valueDB.hasMetadata(valueId as any),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
				},
			);
		}
	});
}

{
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

	test(`invalid value IDs should be ignored by the setXYZ methods when the "noThrow" parameter is true -> setValue()`, (t) => {
		const { valueDB } = setup();
		for (const valueId of invalidValueIDs) {
			t.expect(() =>
				valueDB.setValue(valueId as any, 0, { noThrow: true })
			).not.toThrow();
		}
	});

	test(`invalid value IDs should be ignored by the setXYZ methods when the "noThrow" parameter is true -> setMetadata()`, (t) => {
		const { valueDB } = setup();
		for (const valueId of invalidValueIDs) {
			t.expect(() =>
				valueDB.setMetadata(valueId as any, {} as any, {
					noThrow: true,
				})
			).not.toThrow();
		}
	});
}

test("dbKeyToValueIdFast() -> should work correctly", (t) => {
	const tests: ({ nodeId: number } & ValueID)[] = [
		{
			nodeId: 1,
			commandClass: 32,
			endpoint: 3,
			property: "4",
			propertyKey: "5",
		},
		{
			nodeId: 2,
			commandClass: 33,
			endpoint: 7,
			property: "44",
			propertyKey: 6,
		},
		{
			nodeId: 3,
			commandClass: 37,
			endpoint: 11,
			property: 48,
			propertyKey: "8",
		},
		{
			nodeId: 4,
			commandClass: 38,
			endpoint: 17,
			property: 48,
			propertyKey: 9,
		},
		{ nodeId: 6, commandClass: 1, endpoint: 0, property: "c" },
	];

	for (const test of tests) {
		t.expect(dbKeyToValueIdFast(JSON.stringify(test))).toStrictEqual(test);
	}
});

test("keys that are invalid JSON should not cause a crash", (t) => {
	const valueDB = new ValueDB(
		30,
		new Map([
			[
				`{"nodeId":30,"commandClass":44,"endpoint<\u0011\u0000\u0000"property":"level","propertyKey":225}`,
				1,
			],
		]) as any,
		new Map([
			[
				`{"nodeId":30,"commandClass":44,"endpoint<\u0011\u0000\u0000"property":"level","propertyKey":225}`,
				`{"type":"number","readable":true,"writeable":true,"min":0,"max":255,"label":"Level (225)","valueChangeOptions":["transitionDuration"]}`,
			],
		]) as any,
	);

	t.expect(valueDB.getAllMetadata(44)).toStrictEqual([]);
	t.expect(valueDB["_index"].size).toBe(0);
});

test("valueEquals() -> should return true for primitive types with equal values", (t) => {
	t.expect(valueEquals(42, 42)).toBe(true);
	t.expect(valueEquals("hello", "hello")).toBe(true);
	t.expect(valueEquals(true, true)).toBe(true);
	t.expect(valueEquals(undefined, undefined)).toBe(true);
	t.expect(valueEquals(null, null)).toBe(true);
});

test("valueEquals() -> should return false for primitive types with different values", (t) => {
	t.expect(valueEquals(42, 43)).toBe(false);
	t.expect(valueEquals("hello", "world")).toBe(false);
	t.expect(valueEquals(true, false)).toBe(false);
	t.expect(valueEquals(undefined, null)).toBe(false);
});

test("valueEquals() -> should return true for equal Uint8Array values", (t) => {
	const a = new Uint8Array([1, 2, 3]);
	const b = new Uint8Array([1, 2, 3]);
	t.expect(valueEquals(a, b)).toBe(true);
});

test("valueEquals() -> should return false for different Uint8Array values", (t) => {
	const a = new Uint8Array([1, 2, 3]);
	const b = new Uint8Array([4, 5, 6]);
	t.expect(valueEquals(a, b)).toBe(false);
});

test("valueEquals() -> should return true for equal arrays", (t) => {
	t.expect(valueEquals([1, 2, 3], [1, 2, 3])).toBe(true);
	t.expect(valueEquals(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
});

test("valueEquals() -> should return false for different arrays", (t) => {
	t.expect(valueEquals([1, 2, 3], [4, 5, 6])).toBe(false);
	t.expect(valueEquals(["a", "b", "c"], ["d", "e", "f"])).toBe(false);
	t.expect(valueEquals([1, 2, 3], [1, 2])).toBe(false);
});

test("valueEquals() -> should return true for equal objects", (t) => {
	t.expect(valueEquals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
	t.expect(valueEquals({ foo: "bar" }, { foo: "bar" })).toBe(true);
});

test("valueEquals() -> should return false for different objects", (t) => {
	t.expect(valueEquals({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
	t.expect(valueEquals({ foo: "bar" }, { foo: "baz" })).toBe(false);
	t.expect(valueEquals({ a: 1, b: 2 }, { a: 1 })).toBe(false);
});

test("valueEquals() -> should return false for functions and symbols", (t) => {
	t.expect(valueEquals(() => {}, () => {})).toBe(false);
	t.expect(valueEquals(Symbol("a"), Symbol("a"))).toBe(false);
});

test("valueEquals() -> should return true for equal nested arrays", (t) => {
	t.expect(valueEquals([1, [2, 3], [4, [5, 6]]], [1, [2, 3], [4, [5, 6]]]))
		.toBe(true);
});

test("valueEquals() -> should return false for different nested arrays", (t) => {
	t.expect(valueEquals([1, [2, 3], [4, [5, 6]]], [1, [2, 3], [4, [5, 7]]]))
		.toBe(false);
	t.expect(valueEquals([1, [2, 3]], [1, [2, 3, 4]])).toBe(false);
});

// Tests für verschachtelte Objekte
test("valueEquals() -> should return true for equal nested objects", (t) => {
	t.expect(
		valueEquals({ a: 1, b: { c: 2, d: { e: 3 } } }, {
			a: 1,
			b: { c: 2, d: { e: 3 } },
		}),
	).toBe(true);
});

test("valueEquals() -> should return false for different nested objects", (t) => {
	t.expect(
		valueEquals(
			{ a: 1, b: { c: 2, d: { e: 3 } } },
			{ a: 1, b: { c: 2, d: { e: 4 } } },
		),
	).toBe(false);
	t.expect(
		valueEquals(
			{ a: 1, b: { c: 2 } },
			{ a: 1, b: { c: 2, d: 3 } },
		),
	).toBe(false);
});

// Tests für den Vergleich von Werten unterschiedlicher Typen
test("valueEquals() -> should return false for values of different types", (t) => {
	t.expect(valueEquals(42, "42")).toBe(false);
	t.expect(valueEquals(true, 1)).toBe(false);
	t.expect(valueEquals(null, undefined)).toBe(false);
	t.expect(valueEquals({ a: 1 }, [1])).toBe(false);
	t.expect(valueEquals(new Uint8Array([1, 2, 3]), [1, 2, 3])).toBe(false);
});
