import { CommandClasses } from "@zwave-js/core";
import { V } from "./Values";

describe("Value ID definitions", () => {
	it("defineDynamicCCValues, dynamic property and meta", () => {
		const dfn = V.defineDynamicCCValues(CommandClasses.Basic, {
			prop1: {
				blueprint: (valueType: string) => ({
					property: valueType,
					propertyKey: valueType,
					meta: {
						internal: valueType === "internal",
					},
				}),
			},
			prop2: {
				blueprint: (valueType: string) => ({
					property: valueType + "2",
					propertyKey: valueType + "2",
					meta: {
						secret: valueType !== "not-internal",
					},
				}),
			},
		});

		const actual1a = dfn.prop1("bar");
		expect(actual1a.id).toEqual({
			commandClass: CommandClasses.Basic,
			property: "bar",
			propertyKey: "bar",
		});
		expect(actual1a.meta).toMatchObject({
			internal: false,
		});
		const actual1b = dfn.prop1("internal");
		expect(actual1b.id).toEqual({
			commandClass: CommandClasses.Basic,
			property: "internal",
			propertyKey: "internal",
		});
		expect(actual1b.meta).toMatchObject({
			internal: true,
		});

		const actual2a = dfn.prop2("bar");
		expect(actual2a.id).toEqual({
			commandClass: CommandClasses.Basic,
			property: "bar2",
			propertyKey: "bar2",
		});
		expect(actual2a.meta).toMatchObject({
			secret: true,
		});
		const actual2b = dfn.prop2("not-internal");
		expect(actual2b.id).toEqual({
			commandClass: CommandClasses.Basic,
			property: "not-internal2",
			propertyKey: "not-internal2",
		});
		expect(actual2b.meta).toMatchObject({
			secret: false,
		});
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

	const AlarmSensorCCValues = Object.freeze({
		...V.defineDynamicCCValues(CommandClasses["Alarm Sensor"], {
			...V.dynamicPropertyAndKeyWithName(
				"state",
				"state",
				(sensorType: number) => sensorType,
			),
			...V.dynamicPropertyWithName(
				"type",
				(sensorType: number) => sensorType,
			),
			// TODO: others
		}),
	});

	it("(fake) Alarm Sensor CC, state (type 1), no endpoint", () => {
		const actual = AlarmSensorCCValues.state(1).id;
		expect(actual).toEqual({
			commandClass: CommandClasses["Alarm Sensor"],
			property: "state",
			propertyKey: 1,
		});
	});

	it("(fake) Alarm Sensor CC, state (type 1), endpoint 5", () => {
		const actual = AlarmSensorCCValues.state(1).endpoint(5);
		expect(actual).toEqual({
			commandClass: CommandClasses["Alarm Sensor"],
			endpoint: 5,
			property: "state",
			propertyKey: 1,
		});
	});

	it("(fake) Alarm Sensor CC, type (4), endpoint 5", () => {
		const actual = AlarmSensorCCValues.type(4).endpoint(5);
		expect(actual).toEqual({
			commandClass: CommandClasses["Alarm Sensor"],
			endpoint: 5,
			property: 4,
		});
	});
});
