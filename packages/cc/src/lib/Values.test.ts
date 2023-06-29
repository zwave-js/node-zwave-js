import { CommandClasses, ValueMetadata } from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import test from "ava";
import { V } from "./Values";
import { AlarmSensorType } from "./_Types";

test("defineDynamicCCValues, dynamic property and meta", (t) => {
	const dfn = V.defineDynamicCCValues(CommandClasses.Basic, {
		...V.dynamicPropertyAndKeyWithName(
			"prop1",
			(valueType: string) => valueType,
			(valueType: string) => valueType,
			({ property, propertyKey }: any) =>
				typeof property === "string" && property === propertyKey,
			(valueType: string) =>
				({
					...ValueMetadata.Any,
					readable: valueType === "readable",
				} as const),
			{ internal: true },
		),
		...V.dynamicPropertyAndKeyWithName(
			"prop2",
			(valueType: string) => valueType + "2",
			(valueType: string) => valueType + "2",
			({ property, propertyKey }: any) =>
				typeof property === "string" &&
				property.endsWith("2") &&
				property === propertyKey,
			(valueType: string) => ({
				...ValueMetadata.Any,
				writeable: valueType !== "not-writeable",
			}),
			{ secret: true },
		),
	});

	const actual1a = dfn.prop1("bar");
	t.deepEqual(actual1a.id, {
		commandClass: CommandClasses.Basic,
		property: "bar",
		propertyKey: "bar",
	});
	t.like(actual1a.meta, {
		readable: false,
	});
	const actual1b = dfn.prop1("readable");
	t.deepEqual(actual1b.id, {
		commandClass: CommandClasses.Basic,
		property: "readable",
		propertyKey: "readable",
	});
	t.like(actual1b.meta, {
		readable: true,
	});
	t.like(dfn.prop1.options, {
		internal: true,
		secret: false,
	});

	const actual2a = dfn.prop2("bar");
	t.deepEqual(actual2a.id, {
		commandClass: CommandClasses.Basic,
		property: "bar2",
		propertyKey: "bar2",
	});
	t.like(actual2a.meta, {
		writeable: true,
	});
	const actual2b = dfn.prop2("not-writeable");
	t.deepEqual(actual2b.id, {
		commandClass: CommandClasses.Basic,
		property: "not-writeable2",
		propertyKey: "not-writeable2",
	});
	t.like(actual2b.meta, {
		writeable: false,
	});
	t.like(dfn.prop2.options, {
		internal: false,
		secret: true,
	});

	t.true(
		dfn.prop1.is({
			commandClass: CommandClasses.Basic,
			property: "the same",
			propertyKey: "the same",
		}),
	);

	t.false(
		dfn.prop1.is({
			commandClass: CommandClasses.Basic,
			property: "the same",
			propertyKey: "not the same",
		}),
	);
});

// This is a copy of the Basic CC value definitions, for resiliency
const BasicCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Basic, {
		...V.staticProperty("currentValue"),
		...V.staticProperty("targetValue"),
		// TODO: This should really not be a static CC value:
		...V.staticPropertyWithName("compatEvent", "event"),
	}),
});

test("Basic CC, current value, no endpoint", (t) => {
	const actual = BasicCCValues.currentValue.id;
	t.deepEqual(actual, {
		commandClass: CommandClasses.Basic,
		property: "currentValue",
	});
});

test("Basic CC, current value, endpoint 2", (t) => {
	const actual = BasicCCValues.currentValue.endpoint(2);
	t.deepEqual(actual, {
		commandClass: CommandClasses.Basic,
		endpoint: 2,
		property: "currentValue",
	});
});

test("Basic CC, compat event, endpoint 2", (t) => {
	const actual = BasicCCValues.compatEvent.endpoint(2);
	t.deepEqual(actual, {
		commandClass: CommandClasses.Basic,
		endpoint: 2,
		property: "event",
	});
});

const AlarmSensorCCValues = Object.freeze({
	...V.defineDynamicCCValues(CommandClasses["Alarm Sensor"], {
		...V.dynamicPropertyAndKeyWithName(
			"state",
			"state",
			(sensorType: number) => sensorType,
			({ property, propertyKey }) =>
				property === "state" && typeof propertyKey === "number",
			(sensorType: AlarmSensorType) => {
				const alarmName = getEnumMemberName(
					AlarmSensorType,
					sensorType,
				);
				return {
					...ValueMetadata.ReadOnlyBoolean,
					label: `${alarmName} state`,
					description: "Whether the alarm is active",
					ccSpecific: { sensorType },
				} as const;
			},
		),
		...V.dynamicPropertyWithName(
			"type",
			(sensorType: number) => sensorType,
			({ property, propertyKey }) =>
				typeof property === "number" && propertyKey == undefined,
		),
		// TODO: others
	}),
});

test("(fake) Alarm Sensor CC, state (type 1), no endpoint", (t) => {
	const actual = AlarmSensorCCValues.state(1).id;
	t.deepEqual(actual, {
		commandClass: CommandClasses["Alarm Sensor"],
		property: "state",
		propertyKey: 1,
	});
});

test("(fake) Alarm Sensor CC, state (type 1), endpoint 5", (t) => {
	const actual = AlarmSensorCCValues.state(1).endpoint(5);
	t.deepEqual(actual, {
		commandClass: CommandClasses["Alarm Sensor"],
		endpoint: 5,
		property: "state",
		propertyKey: 1,
	});
});

test("(fake) Alarm Sensor CC, type (4), endpoint 5", (t) => {
	const actual = AlarmSensorCCValues.type(4).endpoint(5);
	t.deepEqual(actual, {
		commandClass: CommandClasses["Alarm Sensor"],
		endpoint: 5,
		property: 4,
	});
});

test("(fake) Alarm Sensor CC, dynamic metadata", (t) => {
	const actual = AlarmSensorCCValues.state(1).meta;
	t.deepEqual(actual, {
		type: "boolean",
		readable: true,
		writeable: false,
		label: "Smoke state",
		description: "Whether the alarm is active",
		ccSpecific: { sensorType: 1 },
	});
});
