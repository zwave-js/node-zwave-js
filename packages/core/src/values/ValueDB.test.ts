import { pick } from "@zwave-js/shared/safe";
import test from "ava";
import sinon from "sinon";
import { CommandClasses } from "../capabilities/CommandClasses";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { assertZWaveError } from "../test/assertZWaveError";
import type { ValueID } from "./_Types";
import { ValueMetadata } from "./Metadata";
import { dbKeyToValueIdFast, ValueDB } from "./ValueDB";

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

	t.pass();
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
	t.is(
		valueDB.getValue({
			commandClass: cc,
			endpoint: 0,
			property: "prop",
			propertyKey: "foo",
		}),
		1,
	);
	t.is(
		valueDB.getValue({
			commandClass: cc,
			endpoint: 0,
			property: "prop",
			propertyKey: "bar",
		}),
		2,
	);

	// the value added callback should have been called for each added value", () => {
	sinon.assert.calledTwice(onValueAdded);
	t.is(onValueAdded.getCall(0).args[0].propertyKey, "foo");
	t.is(onValueAdded.getCall(1).args[0].propertyKey, "bar");

	// after clearing the value DB, the values should all be removed", () => {
	valueDB.clear();
	t.is(
		valueDB.getValue({
			commandClass: cc,
			endpoint: 0,
			property: "prop",
			propertyKey: "foo",
		}),
		undefined,
	);
	t.is(
		valueDB.getValue({
			commandClass: cc,
			endpoint: 0,
			property: "prop",
			propertyKey: "bar",
		}),
		undefined,
	);
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
	t.is(typeof cbArg, "object");
	t.is(cbArg.commandClass, CommandClasses["Alarm Sensor"]);

	// The callback arg should contain the endpoint
	t.is(cbArg.endpoint, 1);

	// The callback arg should contain the property name
	t.is(cbArg.property, "bar");

	// The callback arg should contain the previous value
	t.is(cbArg.prevValue, "foo");

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
	t.false(retValNotFound);

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
	t.true(retValFound);

	// After removing a value, getValue should return undefined
	const actual = valueDB.getValue({
		commandClass: CommandClasses["Alarm Sensor"],
		endpoint: 1,
		property: "bar",
	});
	t.is(actual, undefined);
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
	t.is(typeof cbArgs[0], "object");
	t.is(cbArgs[0].prevValue, "foo");
	t.is(typeof cbArgs[1], "object");
	t.is(cbArgs[1].prevValue, "bar");

	// After clearing, getValue should return undefined
	let actual: unknown;
	actual = valueDB.getValue(valueId1);
	t.is(actual, undefined);

	actual = valueDB.setValue(valueId2, "bar");
	t.is(actual, undefined);
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
		t.is(valueDB.getValue(valueId), value);
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
	t.is(actual.length, expected.length);
	t.deepEqual(actual, expected);
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
	t.is(actual.length, expected.length);
	t.deepEqual(actual, expected);
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
		t.false(valueDB.hasValue(valueId));
		valueDB.setValue(valueId, value);
		t.true(valueDB.hasValue(valueId));
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
	t.deepEqual(
		valueDB.findValues((id) => id.endpoint === 2),
		values.filter((v) => v.endpoint === 2),
	);
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
	t.deepEqual(
		valueDB.findValues((id) => id.endpoint === 2),
		[expected],
	);
});

test("Metadata is assigned to a specific combination of endpoint, property name (and property key)", (t) => {
	const { valueDB } = setup();
	const valueId: ValueID = {
		commandClass: 1,
		endpoint: 2,
		property: "3",
	};
	valueDB.setMetadata(valueId, ValueMetadata.Any);
	t.true(valueDB.hasMetadata(valueId));
	t.false(valueDB.hasMetadata({ ...valueId, propertyKey: 4 }));
	t.is(valueDB.getMetadata(valueId), ValueMetadata.Any);
	t.is(valueDB.getMetadata({ ...valueId, propertyKey: 4 }), undefined);
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
	t.false(valueDB.hasMetadata(valueId));
});

test("getAllMetadata() -> returns all metadata for a given CC", (t) => {
	const { valueDB } = setup();
	t.is(valueDB.getAllMetadata(1).length, 0);

	valueDB.setMetadata(
		{
			commandClass: 1,
			endpoint: 2,
			property: "3",
		},
		ValueMetadata.Any,
	);
	t.is(valueDB.getAllMetadata(1).length, 1);

	valueDB.setMetadata(
		{
			commandClass: 5,
			endpoint: 2,
			property: "3",
		},
		ValueMetadata.Any,
	);
	t.is(valueDB.getAllMetadata(1).length, 1);
	t.is(valueDB.getAllMetadata(5).length, 1);

	valueDB.setMetadata(
		{
			commandClass: 5,
			endpoint: 2,
			property: "5",
		},
		ValueMetadata.Any,
	);
	t.is(valueDB.getAllMetadata(1).length, 1);
	t.is(valueDB.getAllMetadata(5).length, 2);
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
	t.is(actual.length, expected.length);
	t.deepEqual(actual, expected);
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
	t.is(typeof cbArg, "object");
	t.is(cbArg.commandClass, 1);

	// The callback arg should contain the endpoint
	t.is(cbArg.endpoint, 2);

	// The callback arg should contain the property
	t.is(cbArg.property, "3");

	// The callback arg should contain the new metadata
	t.is(cbArg.metadata, ValueMetadata.Any);
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

	t.deepEqual(
		valueDB.findMetadata((id) => id.endpoint === 2),
		expected,
	);
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
	t.deepEqual(
		valueDB.findMetadata((id) => id.endpoint === 2),
		[expected],
	);
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
			assertZWaveError(t, () => valueDB.getValue(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	test("invalid value IDs should cause an error to be thrown -> setValue()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(t, () => valueDB.setValue(valueId as any, 0), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	test("invalid value IDs should cause an error to be thrown -> hasValue()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(t, () => valueDB.hasValue(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	test("invalid value IDs should cause an error to be thrown -> removeValue()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(t, () => valueDB.removeValue(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	test("invalid value IDs should cause an error to be thrown -> getMetadata()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(t, () => valueDB.getMetadata(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
		}
	});

	test("invalid value IDs should cause an error to be thrown -> setMetadata()", (t) => {
		const { valueDB } = setup();

		for (const valueId of invalidValueIDs) {
			assertZWaveError(
				t,
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
			assertZWaveError(t, () => valueDB.hasMetadata(valueId as any), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
			});
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
			t.notThrows(() =>
				valueDB.setValue(valueId as any, 0, { noThrow: true }),
			);
		}
	});

	test(`invalid value IDs should be ignored by the setXYZ methods when the "noThrow" parameter is true -> setMetadata()`, (t) => {
		const { valueDB } = setup();
		for (const valueId of invalidValueIDs) {
			t.notThrows(() =>
				valueDB.setMetadata(valueId as any, {} as any, {
					noThrow: true,
				}),
			);
		}
	});
}

test("dbKeyToValueIdFast() -> should work correctly", (t) => {
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
		t.deepEqual(dbKeyToValueIdFast(JSON.stringify(test)), test);
	}
});

test.only("keys that are invalid JSON should not cause a crash", (t) => {
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

	t.deepEqual(valueDB.getAllMetadata(44), []);
	t.is(valueDB["_index"].size, 0);
});
