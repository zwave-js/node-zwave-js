import { CommandClasses, ValueMetadata } from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import { V } from "./Values";
import { AlarmSensorType } from "./_Types";

describe("Value ID definitions", () => {
	it("defineDynamicCCValues, dynamic property and meta", () => {
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
		expect(actual1a.id).toEqual({
			commandClass: CommandClasses.Basic,
			property: "bar",
			propertyKey: "bar",
		});
		expect(actual1a.meta).toMatchObject({
			readable: false,
		});
		const actual1b = dfn.prop1("readable");
		expect(actual1b.id).toEqual({
			commandClass: CommandClasses.Basic,
			property: "readable",
			propertyKey: "readable",
		});
		expect(actual1b.meta).toMatchObject({
			readable: true,
		});
		expect(dfn.prop1.options).toMatchObject({
			internal: true,
			secret: false,
		});

		const actual2a = dfn.prop2("bar");
		expect(actual2a.id).toEqual({
			commandClass: CommandClasses.Basic,
			property: "bar2",
			propertyKey: "bar2",
		});
		expect(actual2a.meta).toMatchObject({
			writeable: true,
		});
		const actual2b = dfn.prop2("not-writeable");
		expect(actual2b.id).toEqual({
			commandClass: CommandClasses.Basic,
			property: "not-writeable2",
			propertyKey: "not-writeable2",
		});
		expect(actual2b.meta).toMatchObject({
			writeable: false,
		});
		expect(dfn.prop2.options).toMatchObject({
			internal: false,
			secret: true,
		});

		expect(
			dfn.prop1.is({
				commandClass: CommandClasses.Basic,
				property: "the same",
				propertyKey: "the same",
			}),
		).toBeTrue();

		expect(
			dfn.prop1.is({
				commandClass: CommandClasses.Basic,
				property: "the same",
				propertyKey: "not the same",
			}),
		).toBeFalse();
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

	it("(fake) Alarm Sensor CC, dynamic metadata", () => {
		const actual = AlarmSensorCCValues.state(1).meta;
		expect(actual).toEqual({
			type: "boolean",
			readable: true,
			writeable: false,
			label: "Smoke state",
			description: "Whether the alarm is active",
			ccSpecific: { sensorType: 1 },
		});
	});
});
