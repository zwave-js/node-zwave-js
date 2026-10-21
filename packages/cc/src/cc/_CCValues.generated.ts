/// This file is auto-generated. All manual changes will be lost!

import {
	CommandClasses,
	type ValueID,
	ValueMetadata,
	type GetValueDB,
	type EndpointId,
	enumValuesToMetadataStates,
	MAX_NODES,
	ZWaveLibraryTypes,
} from "@zwave-js/core";
import { getEnumMemberName, num2hex } from "@zwave-js/shared";

import {
	irrigationValveIdToMetadataPrefix,
	meterTypesToPropertyKey,
	multilevelSwitchTypeToActions,
	multilevelSwitchTypeProperties,
	windowCoveringParameterToMetadataStates,
	windowCoveringParameterToLevelChangeLabel,
} from "../lib/CCValueUtils.js";
import { type CCValueOptions } from "../lib/Values.js";
import {
	AlarmSensorType,
	BarrierState,
	SubsystemType,
	SubsystemState,
	BatteryChargingStatus,
	BatteryReplacementStatus,
	BinarySensorType,
	ScheduleOverrideType,
	Weekday,
	ColorComponent,
	DoorLockMode,
	DoorLockOperationType,
	EnergyProductionParameter,
	HumidityControlMode,
	HumidityControlOperatingState,
	HumidityControlSetpointType,
	IrrigationSensorPolarity,
	type ValveId,
	DeviceIdType,
	RateType,
	SwitchType,
	LocalProtectionState,
	RFProtectionState,
	type ScheduleEntryLockScheduleKind,
	ThermostatFanMode,
	ThermostatFanState,
	ThermostatMode,
	ThermostatOperatingState,
	ThermostatSetpointType,
	type UserCredentialType,
	type UserCredentialKeyLockerEntryType,
	WindowCoveringParameter,
} from "../lib/_Types.js";

export const AlarmSensorCCValues = Object.freeze({
	state: Object.assign(
		(sensorType: AlarmSensorType) => {
			const property = "state";
			const propertyKey = sensorType;

			return {
				id: {
					commandClass: CommandClasses["Alarm Sensor"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Alarm Sensor"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
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
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Alarm Sensor"]
					&& (({ property, propertyKey }) =>
						property === "state"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	severity: Object.assign(
		(sensorType: AlarmSensorType) => {
			const property = "severity";
			const propertyKey = sensorType;

			return {
				id: {
					commandClass: CommandClasses["Alarm Sensor"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Alarm Sensor"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					const alarmName = getEnumMemberName(
						AlarmSensorType,
						sensorType,
					);
					return {
						...ValueMetadata.ReadOnlyNumber,
						min: 1,
						max: 100,
						unit: "%",
						label: `${alarmName} severity`,
						ccSpecific: { sensorType },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Alarm Sensor"]
					&& (({ property, propertyKey }) =>
						property === "severity"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	duration: Object.assign(
		(sensorType: AlarmSensorType) => {
			const property = "duration";
			const propertyKey = sensorType;

			return {
				id: {
					commandClass: CommandClasses["Alarm Sensor"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Alarm Sensor"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					const alarmName = getEnumMemberName(
						AlarmSensorType,
						sensorType,
					);
					return {
						...ValueMetadata.ReadOnlyNumber,
						unit: "s",
						label: `${alarmName} duration`,
						description: "For how long the alarm should be active",
						ccSpecific: { sensorType },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Alarm Sensor"]
					&& (({ property, propertyKey }) =>
						property === "duration"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	supportedSensorTypes: {
		id: {
			commandClass: CommandClasses["Alarm Sensor"],
			property: "supportedSensorTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Alarm Sensor"],
				endpoint,
				property: "supportedSensorTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Alarm Sensor"]
				&& valueId.property === "supportedSensorTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const AssociationCCValues = Object.freeze({
	hasLifeline: {
		id: {
			commandClass: CommandClasses.Association,
			property: "hasLifeline",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Association,
				endpoint,
				property: "hasLifeline",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Association
				&& valueId.property === "hasLifeline"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	groupCount: {
		id: {
			commandClass: CommandClasses.Association,
			property: "groupCount",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Association,
				endpoint,
				property: "groupCount",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Association
				&& valueId.property === "groupCount"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	maxNodes: Object.assign(
		(groupId: number) => {
			const property = "maxNodes";
			const propertyKey = groupId;

			return {
				id: {
					commandClass: CommandClasses.Association,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Association,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Association
					&& (({ property, propertyKey }) =>
						property === "maxNodes"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	nodeIds: Object.assign(
		(groupId: number) => {
			const property = "nodeIds";
			const propertyKey = groupId;

			return {
				id: {
					commandClass: CommandClasses.Association,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Association,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Association
					&& (({ property, propertyKey }) =>
						property === "nodeIds"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const AssociationGroupInfoCCValues = Object.freeze({
	hasDynamicInfo: {
		id: {
			commandClass: CommandClasses["Association Group Information"],
			property: "hasDynamicInfo",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Association Group Information"],
				endpoint,
				property: "hasDynamicInfo",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Association Group Information"]
				&& valueId.property === "hasDynamicInfo"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	groupName: Object.assign(
		(groupId: number) => {
			const property = "name";
			const propertyKey = groupId;

			return {
				id: {
					commandClass:
						CommandClasses["Association Group Information"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Association Group Information"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Association Group Information"]
					&& (({ property, propertyKey }) =>
						property === "name" && typeof propertyKey === "number")(
						valueId,
					)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	groupInfo: Object.assign(
		(groupId: number) => {
			const property = "info";
			const propertyKey = groupId;

			return {
				id: {
					commandClass:
						CommandClasses["Association Group Information"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Association Group Information"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Association Group Information"]
					&& (({ property, propertyKey }) =>
						property === "info" && typeof propertyKey === "number")(
						valueId,
					)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	commands: Object.assign(
		(groupId: number) => {
			const property = "issuedCommands";
			const propertyKey = groupId;

			return {
				id: {
					commandClass:
						CommandClasses["Association Group Information"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Association Group Information"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Association Group Information"]
					&& (({ property, propertyKey }) =>
						property === "issuedCommands"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const BarrierOperatorCCValues = Object.freeze({
	supportedSubsystemTypes: {
		id: {
			commandClass: CommandClasses["Barrier Operator"],
			property: "supportedSubsystemTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Barrier Operator"],
				endpoint,
				property: "supportedSubsystemTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Barrier Operator"]
				&& valueId.property === "supportedSubsystemTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	position: {
		id: {
			commandClass: CommandClasses["Barrier Operator"],
			property: "position",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Barrier Operator"],
				endpoint,
				property: "position",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Barrier Operator"]
				&& valueId.property === "position"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Barrier Position",
				unit: "%",
				max: 100,
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	targetState: {
		id: {
			commandClass: CommandClasses["Barrier Operator"],
			property: "targetState",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Barrier Operator"],
				endpoint,
				property: "targetState",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Barrier Operator"]
				&& valueId.property === "targetState"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				label: "Target Barrier State",
				states: enumValuesToMetadataStates(BarrierState, [
					BarrierState.Open,
					BarrierState.Closed,
				]),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	currentState: {
		id: {
			commandClass: CommandClasses["Barrier Operator"],
			property: "currentState",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Barrier Operator"],
				endpoint,
				property: "currentState",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Barrier Operator"]
				&& valueId.property === "currentState"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Current Barrier State",
				states: enumValuesToMetadataStates(BarrierState),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	signalingState: Object.assign(
		(subsystemType: SubsystemType) => {
			const property = "signalingState";
			const propertyKey = subsystemType;

			return {
				id: {
					commandClass: CommandClasses["Barrier Operator"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Barrier Operator"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.UInt8,
						label: `Signaling State (${getEnumMemberName(
							SubsystemType,
							subsystemType,
						)})`,
						states: enumValuesToMetadataStates(SubsystemState),
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Barrier Operator"]
					&& (({ property, propertyKey }) =>
						property === "signalingState"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const BasicCCValues = Object.freeze({
	currentValue: {
		id: {
			commandClass: CommandClasses.Basic,
			property: "currentValue",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Basic,
				endpoint,
				property: "currentValue",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Basic
				&& valueId.property === "currentValue"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyLevel,
				label: "Current value",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	targetValue: {
		id: {
			commandClass: CommandClasses.Basic,
			property: "targetValue",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Basic,
				endpoint,
				property: "targetValue",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Basic
				&& valueId.property === "targetValue"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				label: "Target value",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	duration: {
		id: {
			commandClass: CommandClasses.Basic,
			property: "duration",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Basic,
				endpoint,
				property: "duration",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Basic
				&& valueId.property === "duration"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyDuration,
				label: "Remaining duration",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	restorePrevious: {
		id: {
			commandClass: CommandClasses.Basic,
			property: "restorePrevious",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Basic,
				endpoint,
				property: "restorePrevious",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Basic
				&& valueId.property === "restorePrevious"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.WriteOnlyBoolean,
				label: "Restore previous value",
				states: {
					true: "Restore",
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	compatEvent: {
		id: {
			commandClass: CommandClasses.Basic,
			property: "event",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Basic,
				endpoint,
				property: "event",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Basic
				&& valueId.property === "event"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Event value",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: false,
			supportsEndpoints: true,
			autoCreate: false,
		} as const satisfies CCValueOptions,
	},
});

export const BasicWindowCoveringCCValues = Object.freeze({
	levelChangeUp: {
		id: {
			commandClass: CommandClasses["Basic Window Covering"],
			property: "levelChangeUp",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Basic Window Covering"],
				endpoint,
				property: "levelChangeUp",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Basic Window Covering"]
				&& valueId.property === "levelChangeUp"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.WriteOnlyBoolean,
				label: "Open",
				states: {
					true: "Start",
					false: "Stop",
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	levelChangeDown: {
		id: {
			commandClass: CommandClasses["Basic Window Covering"],
			property: "levelChangeDown",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Basic Window Covering"],
				endpoint,
				property: "levelChangeDown",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Basic Window Covering"]
				&& valueId.property === "levelChangeDown"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.WriteOnlyBoolean,
				label: "Close",
				states: {
					true: "Start",
					false: "Stop",
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const BatteryCCValues = Object.freeze({
	level: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "level",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "level",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "level"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				max: 100,
				unit: "%",
				label: "Battery level",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	maximumCapacity: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "maximumCapacity",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "maximumCapacity",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "maximumCapacity"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				max: 100,
				unit: "%",
				label: "Maximum capacity",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	temperature: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "temperature",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "temperature",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "temperature"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyInt8,
				label: "Temperature",
				// For now, only °C is specified as a valid unit
				// If this ever changes, update the unit in persistValues on the fly
				unit: "°C",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	chargingStatus: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "chargingStatus",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "chargingStatus",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "chargingStatus"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Charging status",
				states: enumValuesToMetadataStates(BatteryChargingStatus),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	rechargeable: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "rechargeable",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "rechargeable",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "rechargeable"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Rechargeable",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	backup: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "backup",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "backup",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "backup"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Used as backup",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	overheating: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "overheating",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "overheating",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "overheating"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Overheating",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	lowFluid: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "lowFluid",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "lowFluid",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "lowFluid"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Fluid is low",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	rechargeOrReplace: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "rechargeOrReplace",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "rechargeOrReplace",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "rechargeOrReplace"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Recharge or replace",
				states: enumValuesToMetadataStates(BatteryReplacementStatus),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	disconnected: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "disconnected",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "disconnected",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "disconnected"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Battery is disconnected",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	lowTemperatureStatus: {
		id: {
			commandClass: CommandClasses.Battery,
			property: "lowTemperatureStatus",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Battery,
				endpoint,
				property: "lowTemperatureStatus",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Battery
				&& valueId.property === "lowTemperatureStatus"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Battery temperature is low",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const BinarySensorCCValues = Object.freeze({
	supportedSensorTypes: {
		id: {
			commandClass: CommandClasses["Binary Sensor"],
			property: "supportedSensorTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Binary Sensor"],
				endpoint,
				property: "supportedSensorTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Binary Sensor"]
				&& valueId.property === "supportedSensorTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	state: Object.assign(
		(sensorType: BinarySensorType) => {
			const property = getEnumMemberName(BinarySensorType, sensorType);

			return {
				id: {
					commandClass: CommandClasses["Binary Sensor"],
					property,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Binary Sensor"],
						endpoint,
						property: property,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyBoolean,
						label: `Sensor state (${getEnumMemberName(
							BinarySensorType,
							sensorType,
						)})`,
						ccSpecific: { sensorType },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Binary Sensor"]
					&& (({ property }) =>
						typeof property === "string"
						&& property in BinarySensorType)(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const BinarySwitchCCValues = Object.freeze({
	currentValue: {
		id: {
			commandClass: CommandClasses["Binary Switch"],
			property: "currentValue",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Binary Switch"],
				endpoint,
				property: "currentValue",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Binary Switch"]
				&& valueId.property === "currentValue"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Current value",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	targetValue: {
		id: {
			commandClass: CommandClasses["Binary Switch"],
			property: "targetValue",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Binary Switch"],
				endpoint,
				property: "targetValue",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Binary Switch"]
				&& valueId.property === "targetValue"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Boolean,
				label: "Target value",
				valueChangeOptions: ["transitionDuration"],
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	duration: {
		id: {
			commandClass: CommandClasses["Binary Switch"],
			property: "duration",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Binary Switch"],
				endpoint,
				property: "duration",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Binary Switch"]
				&& valueId.property === "duration"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyDuration,
				label: "Remaining duration",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const CentralSceneCCValues = Object.freeze({
	sceneCount: {
		id: {
			commandClass: CommandClasses["Central Scene"],
			property: "sceneCount",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Central Scene"],
				endpoint,
				property: "sceneCount",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Central Scene"]
				&& valueId.property === "sceneCount"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsSlowRefresh: {
		id: {
			commandClass: CommandClasses["Central Scene"],
			property: "supportsSlowRefresh",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Central Scene"],
				endpoint,
				property: "supportsSlowRefresh",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Central Scene"]
				&& valueId.property === "supportsSlowRefresh"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedKeyAttributes: {
		id: {
			commandClass: CommandClasses["Central Scene"],
			property: "supportedKeyAttributes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Central Scene"],
				endpoint,
				property: "supportedKeyAttributes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Central Scene"]
				&& valueId.property === "supportedKeyAttributes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	slowRefresh: {
		id: {
			commandClass: CommandClasses["Central Scene"],
			property: "slowRefresh",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Central Scene"],
				endpoint,
				property: "slowRefresh",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Central Scene"]
				&& valueId.property === "slowRefresh"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Boolean,
				label: "Send held down notifications at a slow rate",
				description:
					"When this is true, KeyHeldDown notifications are sent every 55s. When this is false, the notifications are sent every 200ms.",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	scene: Object.assign(
		(sceneNumber: number) => {
			const property = "scene";
			const propertyKey = sceneNumber.toString().padStart(3, "0");

			return {
				id: {
					commandClass: CommandClasses["Central Scene"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Central Scene"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyUInt8,
						label: `Scene ${sceneNumber.toString().padStart(3, "0")}`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Central Scene"]
					&& (({ property, propertyKey }) =>
						property === "scene"
						&& typeof propertyKey === "string"
						&& /^\d{3}$/.test(propertyKey))(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: false,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const ClimateControlScheduleCCValues = Object.freeze({
	overrideType: {
		id: {
			commandClass: CommandClasses["Climate Control Schedule"],
			property: "overrideType",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Climate Control Schedule"],
				endpoint,
				property: "overrideType",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Climate Control Schedule"]
				&& valueId.property === "overrideType"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Number,
				label: "Override type",
				states: enumValuesToMetadataStates(ScheduleOverrideType),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	overrideState: {
		id: {
			commandClass: CommandClasses["Climate Control Schedule"],
			property: "overrideState",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Climate Control Schedule"],
				endpoint,
				property: "overrideState",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Climate Control Schedule"]
				&& valueId.property === "overrideState"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Number,
				label: "Override state",
				min: -12.8,
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	schedule: Object.assign(
		(weekday: Weekday) => {
			const property = "schedule";
			const propertyKey = weekday;

			return {
				id: {
					commandClass: CommandClasses["Climate Control Schedule"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Climate Control Schedule"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Any,
						label: `Schedule (${getEnumMemberName(Weekday, weekday)})`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Climate Control Schedule"]
					&& (({ property, propertyKey }) =>
						property === "switchPoints"
						&& typeof propertyKey === "number"
						&& propertyKey >= Weekday.Monday
						&& propertyKey <= Weekday.Sunday)(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const ColorSwitchCCValues = Object.freeze({
	supportedColorComponents: {
		id: {
			commandClass: CommandClasses["Color Switch"],
			property: "supportedColorComponents",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Color Switch"],
				endpoint,
				property: "supportedColorComponents",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Color Switch"]
				&& valueId.property === "supportedColorComponents"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsHexColor: {
		id: {
			commandClass: CommandClasses["Color Switch"],
			property: "supportsHexColor",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Color Switch"],
				endpoint,
				property: "supportsHexColor",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Color Switch"]
				&& valueId.property === "supportsHexColor"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	currentColor: {
		id: {
			commandClass: CommandClasses["Color Switch"],
			property: "currentColor",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Color Switch"],
				endpoint,
				property: "currentColor",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Color Switch"]
				&& valueId.property === "currentColor"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnly,
				label: `Current color`,
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	targetColor: {
		id: {
			commandClass: CommandClasses["Color Switch"],
			property: "targetColor",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Color Switch"],
				endpoint,
				property: "targetColor",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Color Switch"]
				&& valueId.property === "targetColor"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Any,
				label: `Target color`,
				valueChangeOptions: ["transitionDuration"],
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	duration: {
		id: {
			commandClass: CommandClasses["Color Switch"],
			property: "duration",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Color Switch"],
				endpoint,
				property: "duration",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Color Switch"]
				&& valueId.property === "duration"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyDuration,
				label: "Remaining duration",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	hexColor: {
		id: {
			commandClass: CommandClasses["Color Switch"],
			property: "hexColor",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Color Switch"],
				endpoint,
				property: "hexColor",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Color Switch"]
				&& valueId.property === "hexColor"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Color,
				minLength: 6,
				maxLength: 7, // to allow #rrggbb
				label: `RGB Color`,
				valueChangeOptions: ["transitionDuration"],
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	currentColorChannel: Object.assign(
		(component: ColorComponent) => {
			const property = "currentColor";
			const propertyKey = component;

			return {
				id: {
					commandClass: CommandClasses["Color Switch"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Color Switch"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					const colorName = getEnumMemberName(
						ColorComponent,
						component,
					);
					return {
						...ValueMetadata.ReadOnlyUInt8,
						label: `Current value (${colorName})`,
						description: `The current value of the ${colorName} channel.`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Color Switch"]
					&& (({ property, propertyKey }) =>
						property === "currentColor"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	targetColorChannel: Object.assign(
		(component: ColorComponent) => {
			const property = "targetColor";
			const propertyKey = component;

			return {
				id: {
					commandClass: CommandClasses["Color Switch"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Color Switch"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					const colorName = getEnumMemberName(
						ColorComponent,
						component,
					);
					return {
						...ValueMetadata.UInt8,
						label: `Target value (${colorName})`,
						description: `The target value of the ${colorName} channel.`,
						valueChangeOptions: ["transitionDuration"],
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Color Switch"]
					&& (({ property, propertyKey }) =>
						property === "targetColor"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const ConfigurationCCValues = Object.freeze({
	isParamInformationFromConfig: {
		id: {
			commandClass: CommandClasses.Configuration,
			property: "isParamInformationFromConfig",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Configuration,
				endpoint: 0, // no endpoint support!
				property: "isParamInformationFromConfig",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Configuration
				&& valueId.property === "isParamInformationFromConfig"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	paramInformation: Object.assign(
		(parameter: number, bitMask?: number) => {
			const property = parameter;
			const propertyKey = bitMask;

			return {
				id: {
					commandClass: CommandClasses.Configuration,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Configuration,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Configuration
					&& (({ property, propertyKey }) =>
						typeof property === "number"
						&& (typeof propertyKey === "number"
							|| propertyKey == undefined))(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const DoorLockCCValues = Object.freeze({
	targetMode: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "targetMode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "targetMode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "targetMode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				label: "Target lock mode",
				states: enumValuesToMetadataStates(DoorLockMode),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	currentMode: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "currentMode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "currentMode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "currentMode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Current lock mode",
				states: enumValuesToMetadataStates(DoorLockMode),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	duration: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "duration",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "duration",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "duration"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyDuration,
				label: "Remaining duration until target lock mode",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedOutsideHandles: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "supportedOutsideHandles",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "supportedOutsideHandles",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "supportedOutsideHandles"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 4,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	outsideHandlesCanOpenDoorConfiguration: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "outsideHandlesCanOpenDoorConfiguration",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "outsideHandlesCanOpenDoorConfiguration",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "outsideHandlesCanOpenDoorConfiguration"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Any,
				label: "Which outside handles can open the door (configuration)",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	outsideHandlesCanOpenDoor: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "outsideHandlesCanOpenDoor",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "outsideHandlesCanOpenDoor",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "outsideHandlesCanOpenDoor"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnly,
				label: "Which outside handles can open the door (actual status)",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedInsideHandles: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "supportedInsideHandles",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "supportedInsideHandles",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "supportedInsideHandles"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 4,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	insideHandlesCanOpenDoorConfiguration: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "insideHandlesCanOpenDoorConfiguration",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "insideHandlesCanOpenDoorConfiguration",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "insideHandlesCanOpenDoorConfiguration"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Any,
				label: "Which inside handles can open the door (configuration)",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	insideHandlesCanOpenDoor: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "insideHandlesCanOpenDoor",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "insideHandlesCanOpenDoor",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "insideHandlesCanOpenDoor"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnly,
				label: "Which inside handles can open the door (actual status)",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	operationType: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "operationType",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "operationType",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "operationType"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				label: "Lock operation type",
				states: enumValuesToMetadataStates(DoorLockOperationType),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	lockTimeoutConfiguration: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "lockTimeoutConfiguration",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "lockTimeoutConfiguration",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "lockTimeoutConfiguration"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt16,
				label: "Duration of timed mode in seconds",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	lockTimeout: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "lockTimeout",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "lockTimeout",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "lockTimeout"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt16,
				label: "Seconds until lock mode times out",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	autoRelockSupported: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "autoRelockSupported",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "autoRelockSupported",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "autoRelockSupported"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 4,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	autoRelockTime: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "autoRelockTime",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "autoRelockTime",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "autoRelockTime"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt16,
				label: "Duration in seconds until lock returns to secure state",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 4,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: shouldAutoCreateAutoRelockConfigValue,
		} as const satisfies CCValueOptions,
	},
	holdAndReleaseSupported: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "holdAndReleaseSupported",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "holdAndReleaseSupported",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "holdAndReleaseSupported"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 4,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	holdAndReleaseTime: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "holdAndReleaseTime",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "holdAndReleaseTime",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "holdAndReleaseTime"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt16,
				label: "Duration in seconds the latch stays retracted",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 4,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: shouldAutoCreateHoldAndReleaseConfigValue,
		} as const satisfies CCValueOptions,
	},
	twistAssistSupported: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "twistAssistSupported",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "twistAssistSupported",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "twistAssistSupported"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 4,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	twistAssist: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "twistAssist",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "twistAssist",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "twistAssist"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Boolean,
				label: "Twist Assist enabled",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 4,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: shouldAutoCreateTwistAssistConfigValue,
		} as const satisfies CCValueOptions,
	},
	blockToBlockSupported: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "blockToBlockSupported",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "blockToBlockSupported",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "blockToBlockSupported"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 4,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	blockToBlock: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "blockToBlock",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "blockToBlock",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "blockToBlock"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Boolean,
				label: "Block-to-block functionality enabled",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 4,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: shouldAutoCreateBlockToBlockConfigValue,
		} as const satisfies CCValueOptions,
	},
	latchSupported: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "latchSupported",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "latchSupported",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "latchSupported"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	latchStatus: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "latchStatus",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "latchStatus",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "latchStatus"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnly,
				label: "Current status of the latch",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: shouldAutoCreateLatchStatusValue,
		} as const satisfies CCValueOptions,
	},
	boltSupported: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "boltSupported",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "boltSupported",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "boltSupported"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	boltStatus: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "boltStatus",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "boltStatus",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "boltStatus"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnly,
				label: "Current status of the bolt",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: shouldAutoCreateBoltStatusValue,
		} as const satisfies CCValueOptions,
	},
	doorSupported: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "doorSupported",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "doorSupported",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "doorSupported"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	doorStatus: {
		id: {
			commandClass: CommandClasses["Door Lock"],
			property: "doorStatus",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock"],
				endpoint,
				property: "doorStatus",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock"]
				&& valueId.property === "doorStatus"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnly,
				label: "Current status of the door",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: shouldAutoCreateDoorStatusValue,
		} as const satisfies CCValueOptions,
	},
});

function shouldAutoCreateAutoRelockConfigValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.autoRelockSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateHoldAndReleaseConfigValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.holdAndReleaseSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateTwistAssistConfigValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.twistAssistSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateBlockToBlockConfigValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.blockToBlockSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateLatchStatusValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.latchSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateBoltStatusValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.boltSupported.endpoint(endpoint.index),
	);
}

function shouldAutoCreateDoorStatusValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	return !!valueDB.getValue(
		DoorLockCCValues.doorSupported.endpoint(endpoint.index),
	);
}

export const DoorLockLoggingCCValues = Object.freeze({
	recordsCount: {
		id: {
			commandClass: CommandClasses["Door Lock Logging"],
			property: "recordsCount",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Door Lock Logging"],
				endpoint,
				property: "recordsCount",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Door Lock Logging"]
				&& valueId.property === "recordsCount"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const EnergyProductionCCValues = Object.freeze({
	value: Object.assign(
		(parameter: EnergyProductionParameter) => {
			const property = "value";
			const propertyKey = parameter;

			return {
				id: {
					commandClass: CommandClasses["Energy Production"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Energy Production"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyNumber,
						label: getEnumMemberName(
							EnergyProductionParameter,
							parameter,
						),
						// unit and ccSpecific are set dynamically
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Energy Production"]
					&& (({ property, propertyKey }) =>
						property === "value"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const EntryControlCCValues = Object.freeze({
	keyCacheSize: {
		id: {
			commandClass: CommandClasses["Entry Control"],
			property: "keyCacheSize",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Entry Control"],
				endpoint,
				property: "keyCacheSize",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Entry Control"]
				&& valueId.property === "keyCacheSize"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				label: "Key cache size",
				description:
					"Number of character that must be stored before sending",
				min: 1,
				max: 32,
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	keyCacheTimeout: {
		id: {
			commandClass: CommandClasses["Entry Control"],
			property: "keyCacheTimeout",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Entry Control"],
				endpoint,
				property: "keyCacheTimeout",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Entry Control"]
				&& valueId.property === "keyCacheTimeout"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				label: "Key cache timeout",
				unit: "seconds",
				description:
					"How long the key cache must wait for additional characters",
				min: 1,
				max: 10,
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedDataTypes: {
		id: {
			commandClass: CommandClasses["Entry Control"],
			property: "supportedDataTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Entry Control"],
				endpoint,
				property: "supportedDataTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Entry Control"]
				&& valueId.property === "supportedDataTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedEventTypes: {
		id: {
			commandClass: CommandClasses["Entry Control"],
			property: "supportedEventTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Entry Control"],
				endpoint,
				property: "supportedEventTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Entry Control"]
				&& valueId.property === "supportedEventTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedKeys: {
		id: {
			commandClass: CommandClasses["Entry Control"],
			property: "supportedKeys",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Entry Control"],
				endpoint,
				property: "supportedKeys",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Entry Control"]
				&& valueId.property === "supportedKeys"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const FirmwareUpdateMetaDataCCValues = Object.freeze({
	supportsActivation: {
		id: {
			commandClass: CommandClasses["Firmware Update Meta Data"],
			property: "supportsActivation",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Firmware Update Meta Data"],
				endpoint,
				property: "supportsActivation",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Firmware Update Meta Data"]
				&& valueId.property === "supportsActivation"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	firmwareUpgradable: {
		id: {
			commandClass: CommandClasses["Firmware Update Meta Data"],
			property: "firmwareUpgradable",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Firmware Update Meta Data"],
				endpoint,
				property: "firmwareUpgradable",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Firmware Update Meta Data"]
				&& valueId.property === "firmwareUpgradable"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	additionalFirmwareIDs: {
		id: {
			commandClass: CommandClasses["Firmware Update Meta Data"],
			property: "additionalFirmwareIDs",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Firmware Update Meta Data"],
				endpoint,
				property: "additionalFirmwareIDs",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Firmware Update Meta Data"]
				&& valueId.property === "additionalFirmwareIDs"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	continuesToFunction: {
		id: {
			commandClass: CommandClasses["Firmware Update Meta Data"],
			property: "continuesToFunction",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Firmware Update Meta Data"],
				endpoint,
				property: "continuesToFunction",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Firmware Update Meta Data"]
				&& valueId.property === "continuesToFunction"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsResuming: {
		id: {
			commandClass: CommandClasses["Firmware Update Meta Data"],
			property: "supportsResuming",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Firmware Update Meta Data"],
				endpoint,
				property: "supportsResuming",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Firmware Update Meta Data"]
				&& valueId.property === "supportsResuming"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsNonSecureTransfer: {
		id: {
			commandClass: CommandClasses["Firmware Update Meta Data"],
			property: "supportsNonSecureTransfer",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Firmware Update Meta Data"],
				endpoint,
				property: "supportsNonSecureTransfer",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Firmware Update Meta Data"]
				&& valueId.property === "supportsNonSecureTransfer"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const HumidityControlModeCCValues = Object.freeze({
	mode: {
		id: {
			commandClass: CommandClasses["Humidity Control Mode"],
			property: "mode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Humidity Control Mode"],
				endpoint,
				property: "mode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Humidity Control Mode"]
				&& valueId.property === "mode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				states: enumValuesToMetadataStates(HumidityControlMode),
				label: "Humidity control mode",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedModes: {
		id: {
			commandClass: CommandClasses["Humidity Control Mode"],
			property: "supportedModes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Humidity Control Mode"],
				endpoint,
				property: "supportedModes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Humidity Control Mode"]
				&& valueId.property === "supportedModes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const HumidityControlOperatingStateCCValues = Object.freeze({
	state: {
		id: {
			commandClass: CommandClasses["Humidity Control Operating State"],
			property: "state",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass:
					CommandClasses["Humidity Control Operating State"],
				endpoint,
				property: "state",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Humidity Control Operating State"]
				&& valueId.property === "state"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				states: enumValuesToMetadataStates(
					HumidityControlOperatingState,
				),
				label: "Humidity control operating state",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const HumidityControlSetpointCCValues = Object.freeze({
	supportedSetpointTypes: {
		id: {
			commandClass: CommandClasses["Humidity Control Setpoint"],
			property: "supportedSetpointTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Humidity Control Setpoint"],
				endpoint,
				property: "supportedSetpointTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Humidity Control Setpoint"]
				&& valueId.property === "supportedSetpointTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	setpoint: Object.assign(
		(setpointType: number) => {
			const property = "setpoint";
			const propertyKey = setpointType;

			return {
				id: {
					commandClass: CommandClasses["Humidity Control Setpoint"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Humidity Control Setpoint"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						// This is the base metadata that will be extended on the fly
						...ValueMetadata.Number,
						label: `Setpoint (${getEnumMemberName(
							HumidityControlSetpointType,
							setpointType,
						)})`,
						ccSpecific: { setpointType },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Humidity Control Setpoint"]
					&& (({ property, propertyKey }) =>
						property === "setpoint"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	setpointScale: Object.assign(
		(setpointType: number) => {
			const property = "setpointScale";
			const propertyKey = setpointType;

			return {
				id: {
					commandClass: CommandClasses["Humidity Control Setpoint"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Humidity Control Setpoint"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyUInt8,
						label: `Setpoint scale (${getEnumMemberName(
							HumidityControlSetpointType,
							setpointType,
						)})`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Humidity Control Setpoint"]
					&& (({ property, propertyKey }) =>
						property === "setpointScale"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const IndicatorCCValues = Object.freeze({
	supportedIndicatorIds: {
		id: {
			commandClass: CommandClasses.Indicator,
			property: "supportedIndicatorIds",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Indicator,
				endpoint,
				property: "supportedIndicatorIds",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Indicator
				&& valueId.property === "supportedIndicatorIds"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	valueV1: {
		id: {
			commandClass: CommandClasses.Indicator,
			property: "value",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Indicator,
				endpoint,
				property: "value",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Indicator
				&& valueId.property === "value"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				label: "Indicator value",
				ccSpecific: {
					indicatorId: 0,
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	identify: {
		id: {
			commandClass: CommandClasses.Indicator,
			property: "identify",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Indicator,
				endpoint,
				property: "identify",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Indicator
				&& valueId.property === "identify"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.WriteOnlyBoolean,
				label: "Identify",
				states: {
					true: "Identify",
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedPropertyIDs: Object.assign(
		(indicatorId: number) => {
			const property = "supportedPropertyIDs";
			const propertyKey = indicatorId;

			return {
				id: {
					commandClass: CommandClasses.Indicator,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Indicator,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Indicator
					&& (({ property, propertyKey }) =>
						property === "supportedPropertyIDs"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	valueV2: Object.assign(
		(indicatorId: number, propertyId: number) => {
			const property = indicatorId;
			const propertyKey = propertyId;

			return {
				id: {
					commandClass: CommandClasses.Indicator,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Indicator,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Any,
						ccSpecific: {
							indicatorId,
							propertyId,
						},
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Indicator
					&& (({ property, propertyKey }) =>
						typeof property === "number"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 2,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	timeout: Object.assign(
		(indicatorId: number) => {
			const property = indicatorId;
			const propertyKey = "timeout";

			return {
				id: {
					commandClass: CommandClasses.Indicator,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Indicator,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.String,
						label: "Timeout",
						ccSpecific: {
							indicatorId,
						},
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Indicator
					&& (({ property, propertyKey }) =>
						typeof property === "number"
						&& propertyKey === "timeout")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 3,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	indicatorDescription: Object.assign(
		(indicatorId: number) => {
			const property = indicatorId;

			return {
				id: {
					commandClass: CommandClasses.Indicator,
					property,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Indicator,
						endpoint,
						property: property,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Indicator
					&& (({ property }) => typeof property === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 4,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const IrrigationCCValues = Object.freeze({
	numValves: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "numValves",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "numValves",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "numValves"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	numValveTables: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "numValveTables",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "numValveTables",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "numValveTables"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsMasterValve: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "supportsMasterValve",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "supportsMasterValve",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "supportsMasterValve"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	maxValveTableSize: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "maxValveTableSize",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "maxValveTableSize",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "maxValveTableSize"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	systemVoltage: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "systemVoltage",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "systemVoltage",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "systemVoltage"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "System voltage",
				unit: "V",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	masterValveDelay: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "masterValveDelay",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "masterValveDelay",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "masterValveDelay"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				label: "Master valve delay",
				description:
					"The delay between turning on the master valve and turning on any zone valve",
				unit: "seconds",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	flowSensorActive: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "flowSensorActive",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "flowSensorActive",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "flowSensorActive"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Flow sensor active",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	pressureSensorActive: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "pressureSensorActive",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "pressureSensorActive",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "pressureSensorActive"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Pressure sensor active",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	rainSensorActive: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "rainSensorActive",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "rainSensorActive",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "rainSensorActive"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Rain sensor attached and active",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	rainSensorPolarity: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "rainSensorPolarity",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "rainSensorPolarity",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "rainSensorPolarity"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Number,
				label: "Rain sensor polarity",
				min: 0,
				max: 1,
				states: enumValuesToMetadataStates(IrrigationSensorPolarity),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	moistureSensorActive: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "moistureSensorActive",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "moistureSensorActive",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "moistureSensorActive"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Moisture sensor attached and active",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	moistureSensorPolarity: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "moistureSensorPolarity",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "moistureSensorPolarity",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "moistureSensorPolarity"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Number,
				label: "Moisture sensor polarity",
				min: 0,
				max: 1,
				states: enumValuesToMetadataStates(IrrigationSensorPolarity),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	flow: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "flow",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "flow",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "flow"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyNumber,
				label: "Flow",
				unit: "l/h",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	pressure: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "pressure",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "pressure",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "pressure"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyNumber,
				label: "Pressure",
				unit: "kPa",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	shutoffDuration: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "shutoffDuration",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "shutoffDuration",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "shutoffDuration"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Remaining shutoff duration",
				unit: "hours",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	errorNotProgrammed: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "errorNotProgrammed",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "errorNotProgrammed",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "errorNotProgrammed"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Error: device not programmed",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	errorEmergencyShutdown: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "errorEmergencyShutdown",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "errorEmergencyShutdown",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "errorEmergencyShutdown"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Error: emergency shutdown",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	errorHighPressure: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "errorHighPressure",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "errorHighPressure",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "errorHighPressure"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Error: high pressure",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	highPressureThreshold: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "highPressureThreshold",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "highPressureThreshold",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "highPressureThreshold"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Number,
				label: "High pressure threshold",
				unit: "kPa",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	errorLowPressure: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "errorLowPressure",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "errorLowPressure",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "errorLowPressure"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Error: low pressure",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	lowPressureThreshold: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "lowPressureThreshold",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "lowPressureThreshold",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "lowPressureThreshold"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Number,
				label: "Low pressure threshold",
				unit: "kPa",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	errorValve: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "errorValve",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "errorValve",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "errorValve"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Error: valve reporting error",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	masterValveOpen: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "masterValveOpen",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "masterValveOpen",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "masterValveOpen"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBoolean,
				label: "Master valve is open",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	firstOpenZoneId: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "firstOpenZoneId",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "firstOpenZoneId",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "firstOpenZoneId"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyNumber,
				label: "First open zone valve ID",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	shutoffSystem: {
		id: {
			commandClass: CommandClasses.Irrigation,
			property: "shutoff",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Irrigation,
				endpoint,
				property: "shutoff",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Irrigation
				&& valueId.property === "shutoff"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.WriteOnlyBoolean,
				label: `Shutoff system`,
				states: {
					true: "Shutoff",
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	valveConnected: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "valveConnected";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyBoolean,
						label: `${irrigationValveIdToMetadataPrefix(valveId)}: Connected`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "valveConnected")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	nominalCurrent: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "nominalCurrent";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyNumber,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Nominal current`,
						unit: "mA",
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "nominalCurrent")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	nominalCurrentHighThreshold: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "nominalCurrentHighThreshold";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Number,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Nominal current - high threshold`,
						min: 0,
						max: 2550,
						unit: "mA",
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "nominalCurrentHighThreshold")(
						valueId,
					)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	nominalCurrentLowThreshold: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "nominalCurrentLowThreshold";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Number,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Nominal current - low threshold`,
						min: 0,
						max: 2550,
						unit: "mA",
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "nominalCurrentLowThreshold")(
						valueId,
					)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	errorShortCircuit: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "errorShortCircuit";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyBoolean,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Error - Short circuit detected`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "errorShortCircuit")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	errorHighCurrent: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "errorHighCurrent";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyBoolean,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Error - Current above high threshold`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "errorHighCurrent")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	errorLowCurrent: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "errorLowCurrent";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyBoolean,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Error - Current below low threshold`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "errorLowCurrent")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	maximumFlow: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "maximumFlow";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Number,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Maximum flow`,
						min: 0,
						unit: "l/h",
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "maximumFlow")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	errorMaximumFlow: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "errorMaximumFlow";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyBoolean,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Error - Maximum flow detected`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "errorMaximumFlow")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	highFlowThreshold: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "highFlowThreshold";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Number,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: High flow threshold`,
						min: 0,
						unit: "l/h",
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "highFlowThreshold")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	errorHighFlow: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "errorHighFlow";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyBoolean,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Error - Flow above high threshold`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "errorHighFlow")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	lowFlowThreshold: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "lowFlowThreshold";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Number,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Low flow threshold`,
						min: 0,
						unit: "l/h",
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "lowFlowThreshold")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	errorLowFlow: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "errorLowFlow";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyBoolean,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Error - Flow below low threshold`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "errorLowFlow")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	useRainSensor: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "useRainSensor";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Boolean,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Use rain sensor`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "useRainSensor")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	useMoistureSensor: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "useMoistureSensor";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Boolean,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Use moisture sensor`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "useMoistureSensor")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	valveRunDuration: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "duration";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.UInt16,
						label: `${irrigationValveIdToMetadataPrefix(
							valveId,
						)}: Run duration`,
						min: 1,
						unit: "s",
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "duration")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	valveRunStartStop: Object.assign(
		(valveId: ValveId) => {
			const property = valveId;
			const propertyKey = "startStop";

			return {
				id: {
					commandClass: CommandClasses.Irrigation,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Irrigation,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Boolean,
						label: `${irrigationValveIdToMetadataPrefix(valveId)}: Start/Stop`,
						states: {
							true: "Start",
							false: "Stop",
						},
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Irrigation
					&& (({ property, propertyKey }) =>
						(typeof property === "number" || property === "master")
						&& propertyKey === "startStop")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const LanguageCCValues = Object.freeze({
	language: {
		id: {
			commandClass: CommandClasses.Language,
			property: "language",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Language,
				endpoint,
				property: "language",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Language
				&& valueId.property === "language"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Language code",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	country: {
		id: {
			commandClass: CommandClasses.Language,
			property: "country",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Language,
				endpoint,
				property: "country",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Language
				&& valueId.property === "country"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Country code",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const LockCCValues = Object.freeze({
	locked: {
		id: {
			commandClass: CommandClasses.Lock,
			property: "locked",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Lock,
				endpoint,
				property: "locked",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Lock
				&& valueId.property === "locked"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Boolean,
				label: "Locked",
				description: "Whether the lock is locked",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const ManufacturerSpecificCCValues = Object.freeze({
	manufacturerId: {
		id: {
			commandClass: CommandClasses["Manufacturer Specific"],
			property: "manufacturerId",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Manufacturer Specific"],
				endpoint: 0, // no endpoint support!
				property: "manufacturerId",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Manufacturer Specific"]
				&& valueId.property === "manufacturerId"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt16,
				label: "Manufacturer ID",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	productType: {
		id: {
			commandClass: CommandClasses["Manufacturer Specific"],
			property: "productType",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Manufacturer Specific"],
				endpoint: 0, // no endpoint support!
				property: "productType",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Manufacturer Specific"]
				&& valueId.property === "productType"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt16,
				label: "Product type",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	productId: {
		id: {
			commandClass: CommandClasses["Manufacturer Specific"],
			property: "productId",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Manufacturer Specific"],
				endpoint: 0, // no endpoint support!
				property: "productId",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Manufacturer Specific"]
				&& valueId.property === "productId"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt16,
				label: "Product ID",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	deviceId: Object.assign(
		(type: DeviceIdType) => {
			const property = "deviceId";
			const propertyKey = getEnumMemberName(DeviceIdType, type);

			return {
				id: {
					commandClass: CommandClasses["Manufacturer Specific"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Manufacturer Specific"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyString,
						label: `Device ID (${getEnumMemberName(DeviceIdType, type)})`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Manufacturer Specific"]
					&& (({ property, propertyKey }) =>
						property === "deviceId"
						&& typeof propertyKey === "string"
						&& propertyKey in DeviceIdType)(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 2,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const MeterCCValues = Object.freeze({
	type: {
		id: {
			commandClass: CommandClasses.Meter,
			property: "type",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Meter,
				endpoint,
				property: "type",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Meter
				&& valueId.property === "type"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsReset: {
		id: {
			commandClass: CommandClasses.Meter,
			property: "supportsReset",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Meter,
				endpoint,
				property: "supportsReset",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Meter
				&& valueId.property === "supportsReset"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedScales: {
		id: {
			commandClass: CommandClasses.Meter,
			property: "supportedScales",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Meter,
				endpoint,
				property: "supportedScales",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Meter
				&& valueId.property === "supportedScales"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedRateTypes: {
		id: {
			commandClass: CommandClasses.Meter,
			property: "supportedRateTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Meter,
				endpoint,
				property: "supportedRateTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Meter
				&& valueId.property === "supportedRateTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	resetAll: {
		id: {
			commandClass: CommandClasses.Meter,
			property: "reset",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Meter,
				endpoint,
				property: "reset",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Meter
				&& valueId.property === "reset"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.WriteOnlyBoolean,
				label: `Reset accumulated values`,
				states: {
					true: "Reset",
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	resetSingle: Object.assign(
		(meterType: number, rateType: RateType, scale: number) => {
			const property = "reset";
			const propertyKey = meterTypesToPropertyKey(
				meterType,
				rateType,
				scale,
			);

			return {
				id: {
					commandClass: CommandClasses.Meter,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Meter,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.WriteOnlyBoolean,
						// This is only a placeholder label. A config manager is needed to
						// determine the actual label.
						label: `Reset (${
							rateType === RateType.Consumed
								? "Consumption, "
								: rateType === RateType.Produced
									? "Production, "
									: ""
						}${num2hex(scale)})`,
						states: {
							true: "Reset",
						},
						ccSpecific: {
							meterType,
							rateType,
							scale,
						},
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Meter
					&& (({ property, propertyKey }) =>
						property === "reset"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	value: Object.assign(
		(meterType: number, rateType: RateType, scale: number) => {
			const property = "value";
			const propertyKey = meterTypesToPropertyKey(
				meterType,
				rateType,
				scale,
			);

			return {
				id: {
					commandClass: CommandClasses.Meter,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Meter,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyNumber,
						// Label and unit can only be determined with a config manager
						ccSpecific: {
							meterType,
							rateType,
							scale,
						},
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Meter
					&& (({ property, propertyKey }) =>
						property === "value"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const MultiChannelAssociationCCValues = Object.freeze({
	groupCount: {
		id: {
			commandClass: CommandClasses["Multi Channel Association"],
			property: "groupCount",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Multi Channel Association"],
				endpoint,
				property: "groupCount",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Multi Channel Association"]
				&& valueId.property === "groupCount"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	maxNodes: Object.assign(
		(groupId: number) => {
			const property = "maxNodes";
			const propertyKey = groupId;

			return {
				id: {
					commandClass: CommandClasses["Multi Channel Association"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Multi Channel Association"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Multi Channel Association"]
					&& (({ property, propertyKey }) =>
						property === "maxNodes"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	nodeIds: Object.assign(
		(groupId: number) => {
			const property = "nodeIds";
			const propertyKey = groupId;

			return {
				id: {
					commandClass: CommandClasses["Multi Channel Association"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Multi Channel Association"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Multi Channel Association"]
					&& (({ property, propertyKey }) =>
						property === "nodeIds"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	endpoints: Object.assign(
		(groupId: number) => {
			const property = "endpoints";
			const propertyKey = groupId;

			return {
				id: {
					commandClass: CommandClasses["Multi Channel Association"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Multi Channel Association"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Multi Channel Association"]
					&& (({ property, propertyKey }) =>
						property === "endpoints"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const MultiChannelCCValues = Object.freeze({
	endpointIndizes: {
		id: {
			commandClass: CommandClasses["Multi Channel"],
			property: "endpointIndizes",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Multi Channel"],
				endpoint: 0, // no endpoint support!
				property: "endpointIndizes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multi Channel"]
				&& valueId.property === "endpointIndizes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	individualEndpointCount: {
		id: {
			commandClass: CommandClasses["Multi Channel"],
			property: "individualCount",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Multi Channel"],
				endpoint: 0, // no endpoint support!
				property: "individualCount",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multi Channel"]
				&& valueId.property === "individualCount"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	aggregatedEndpointCount: {
		id: {
			commandClass: CommandClasses["Multi Channel"],
			property: "aggregatedCount",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Multi Channel"],
				endpoint: 0, // no endpoint support!
				property: "aggregatedCount",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multi Channel"]
				&& valueId.property === "aggregatedCount"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	endpointCountIsDynamic: {
		id: {
			commandClass: CommandClasses["Multi Channel"],
			property: "countIsDynamic",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Multi Channel"],
				endpoint: 0, // no endpoint support!
				property: "countIsDynamic",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multi Channel"]
				&& valueId.property === "countIsDynamic"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	endpointsHaveIdenticalCapabilities: {
		id: {
			commandClass: CommandClasses["Multi Channel"],
			property: "identicalCapabilities",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Multi Channel"],
				endpoint: 0, // no endpoint support!
				property: "identicalCapabilities",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multi Channel"]
				&& valueId.property === "identicalCapabilities"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	endpointCCs: {
		id: {
			commandClass: CommandClasses["Multi Channel"],
			property: "commandClasses",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Multi Channel"],
				endpoint,
				property: "commandClasses",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multi Channel"]
				&& valueId.property === "commandClasses"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	endpointDeviceClass: {
		id: {
			commandClass: CommandClasses["Multi Channel"],
			property: "deviceClass",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Multi Channel"],
				endpoint,
				property: "deviceClass",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multi Channel"]
				&& valueId.property === "deviceClass"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	aggregatedEndpointMembers: Object.assign(
		(endpointIndex: number) => {
			const property = "members";
			const propertyKey = endpointIndex;

			return {
				id: {
					commandClass: CommandClasses["Multi Channel"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Multi Channel"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Multi Channel"]
					&& (({ property, propertyKey }) =>
						property === "members"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const MultilevelSensorCCValues = Object.freeze({
	supportedSensorTypes: {
		id: {
			commandClass: CommandClasses["Multilevel Sensor"],
			property: "supportedSensorTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Multilevel Sensor"],
				endpoint,
				property: "supportedSensorTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multilevel Sensor"]
				&& valueId.property === "supportedSensorTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedScales: Object.assign(
		(sensorType: number) => {
			const property = "supportedScales";
			const propertyKey = sensorType;

			return {
				id: {
					commandClass: CommandClasses["Multilevel Sensor"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Multilevel Sensor"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Multilevel Sensor"]
					&& (({ property, propertyKey }) =>
						property === "supportedScales"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	value: Object.assign(
		(sensorTypeName: string) => {
			const property = sensorTypeName;

			return {
				id: {
					commandClass: CommandClasses["Multilevel Sensor"],
					property,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Multilevel Sensor"],
						endpoint,
						property: property,
					}) as const,
				get meta() {
					return {
						// Just the base metadata, to be extended using a config manager
						...ValueMetadata.ReadOnlyNumber,
						label: sensorTypeName,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Multilevel Sensor"]
					&& (({ property, propertyKey }) =>
						typeof property === "string"
						&& property !== "supportedSensorTypes"
						&& property !== "supportedScales"
						&& propertyKey == undefined)(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const MultilevelSwitchCCValues = Object.freeze({
	currentValue: {
		id: {
			commandClass: CommandClasses["Multilevel Switch"],
			property: "currentValue",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Multilevel Switch"],
				endpoint,
				property: "currentValue",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multilevel Switch"]
				&& valueId.property === "currentValue"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyLevel,
				label: "Current value",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	targetValue: {
		id: {
			commandClass: CommandClasses["Multilevel Switch"],
			property: "targetValue",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Multilevel Switch"],
				endpoint,
				property: "targetValue",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multilevel Switch"]
				&& valueId.property === "targetValue"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Level,
				label: "Target value",
				valueChangeOptions: ["transitionDuration"],
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	duration: {
		id: {
			commandClass: CommandClasses["Multilevel Switch"],
			property: "duration",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Multilevel Switch"],
				endpoint,
				property: "duration",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multilevel Switch"]
				&& valueId.property === "duration"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyDuration,
				label: "Remaining duration",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	restorePrevious: {
		id: {
			commandClass: CommandClasses["Multilevel Switch"],
			property: "restorePrevious",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Multilevel Switch"],
				endpoint,
				property: "restorePrevious",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multilevel Switch"]
				&& valueId.property === "restorePrevious"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.WriteOnlyBoolean,
				label: "Restore previous value",
				states: {
					true: "Restore",
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	compatEvent: {
		id: {
			commandClass: CommandClasses["Multilevel Switch"],
			property: "event",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Multilevel Switch"],
				endpoint,
				property: "event",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multilevel Switch"]
				&& valueId.property === "event"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Event value",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: false,
			supportsEndpoints: true,
			autoCreate: (applHost, endpoint) =>
				!!applHost.getDeviceConfig?.(endpoint.nodeId)?.compat
					?.treatMultilevelSwitchSetAsEvent,
		} as const satisfies CCValueOptions,
	},
	switchType: {
		id: {
			commandClass: CommandClasses["Multilevel Switch"],
			property: "switchType",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Multilevel Switch"],
				endpoint,
				property: "switchType",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multilevel Switch"]
				&& valueId.property === "switchType"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	superviseStartStopLevelChange: {
		id: {
			commandClass: CommandClasses["Multilevel Switch"],
			property: "superviseStartStopLevelChange",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Multilevel Switch"],
				endpoint: 0, // no endpoint support!
				property: "superviseStartStopLevelChange",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Multilevel Switch"]
				&& valueId.property === "superviseStartStopLevelChange"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	levelChangeUp: Object.assign(
		(switchType: SwitchType) => {
			const property = (() => {
				{
					const switchTypeName = getEnumMemberName(
						SwitchType,
						switchType,
					);
					const [, up] =
						multilevelSwitchTypeToActions(switchTypeName);
					return up;
				}
			})();

			return {
				id: {
					commandClass: CommandClasses["Multilevel Switch"],
					property,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Multilevel Switch"],
						endpoint,
						property: property,
					}) as const,
				get meta() {
					const switchTypeName = getEnumMemberName(
						SwitchType,
						switchType,
					);
					const [, up] =
						multilevelSwitchTypeToActions(switchTypeName);
					return {
						...ValueMetadata.WriteOnlyBoolean,
						label: `Perform a level change (${up})`,
						valueChangeOptions: ["transitionDuration"],
						states: {
							true: "Start",
							false: "Stop",
						},
						ccSpecific: { switchType },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Multilevel Switch"]
					&& (({ property }) =>
						typeof property === "string"
						&& multilevelSwitchTypeProperties.indexOf(property) % 2
							=== 1)(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	levelChangeDown: Object.assign(
		(switchType: SwitchType) => {
			const property = (() => {
				{
					const switchTypeName = getEnumMemberName(
						SwitchType,
						switchType,
					);
					const [down] =
						multilevelSwitchTypeToActions(switchTypeName);
					return down;
				}
			})();

			return {
				id: {
					commandClass: CommandClasses["Multilevel Switch"],
					property,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Multilevel Switch"],
						endpoint,
						property: property,
					}) as const,
				get meta() {
					const switchTypeName = getEnumMemberName(
						SwitchType,
						switchType,
					);
					const [down] =
						multilevelSwitchTypeToActions(switchTypeName);
					return {
						...ValueMetadata.WriteOnlyBoolean,
						label: `Perform a level change (${down})`,
						valueChangeOptions: ["transitionDuration"],
						states: {
							true: "Start",
							false: "Stop",
						},
						ccSpecific: { switchType },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Multilevel Switch"]
					&& (({ property }) =>
						typeof property === "string"
						&& multilevelSwitchTypeProperties.indexOf(property) % 2
							=== 0)(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const NodeNamingAndLocationCCValues = Object.freeze({
	name: {
		id: {
			commandClass: CommandClasses["Node Naming and Location"],
			property: "name",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Node Naming and Location"],
				endpoint: 0, // no endpoint support!
				property: "name",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Node Naming and Location"]
				&& valueId.property === "name"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.String,
				label: "Node name",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	location: {
		id: {
			commandClass: CommandClasses["Node Naming and Location"],
			property: "location",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Node Naming and Location"],
				endpoint: 0, // no endpoint support!
				property: "location",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Node Naming and Location"]
				&& valueId.property === "location"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.String,
				label: "Node location",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const NotificationCCValues = Object.freeze({
	supportsV1Alarm: {
		id: {
			commandClass: CommandClasses.Notification,
			property: "supportsV1Alarm",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Notification,
				endpoint: 0, // no endpoint support!
				property: "supportsV1Alarm",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Notification
				&& valueId.property === "supportsV1Alarm"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedNotificationTypes: {
		id: {
			commandClass: CommandClasses.Notification,
			property: "supportedNotificationTypes",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Notification,
				endpoint: 0, // no endpoint support!
				property: "supportedNotificationTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Notification
				&& valueId.property === "supportedNotificationTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	notificationMode: {
		id: {
			commandClass: CommandClasses.Notification,
			property: "notificationMode",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Notification,
				endpoint: 0, // no endpoint support!
				property: "notificationMode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Notification
				&& valueId.property === "notificationMode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	lastRefresh: {
		id: {
			commandClass: CommandClasses.Notification,
			property: "lastRefresh",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Notification,
				endpoint,
				property: "lastRefresh",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Notification
				&& valueId.property === "lastRefresh"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	alarmType: {
		id: {
			commandClass: CommandClasses.Notification,
			property: "alarmType",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Notification,
				endpoint,
				property: "alarmType",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Notification
				&& valueId.property === "alarmType"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Alarm Type",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	alarmLevel: {
		id: {
			commandClass: CommandClasses.Notification,
			property: "alarmLevel",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Notification,
				endpoint,
				property: "alarmLevel",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Notification
				&& valueId.property === "alarmLevel"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Alarm Level",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	openingState: {
		id: {
			commandClass: CommandClasses.Notification,
			property: "Access Control",
			propertyKey: "Opening state",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Notification,
				endpoint,
				property: "Access Control",
				propertyKey: "Opening state",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Notification
				&& valueId.property === "Access Control"
				&& valueId.propertyKey == "Opening state"
			);
		},
		get meta() {
			return {
				// Must be a number for compatibility reasons
				...ValueMetadata.ReadOnlyUInt8,
				label: "Opening state",
				states: {
					[0x00]: "Closed",
					[0x01]: "Open",
				},
				ccSpecific: {
					notificationType: 0x06,
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: shouldAutoCreateSyntheticDoorSensorValue,
		} as const satisfies CCValueOptions,
	},
	deprecated_doorStateSimple: {
		id: {
			commandClass: CommandClasses.Notification,
			property: "Access Control",
			propertyKey: "Door state (simple)",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Notification,
				endpoint,
				property: "Access Control",
				propertyKey: "Door state (simple)",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Notification
				&& valueId.property === "Access Control"
				&& valueId.propertyKey == "Door state (simple)"
			);
		},
		get meta() {
			return {
				// Must be a number for compatibility reasons
				...ValueMetadata.ReadOnlyUInt8,
				label: "Door state (simple)",
				states: {
					[0x16]: "Window/door is open",
					[0x17]: "Window/door is closed",
				},
				ccSpecific: {
					notificationType: 0x06,
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: shouldAutoCreateSyntheticDoorSensorValue,
		} as const satisfies CCValueOptions,
	},
	deprecated_doorTiltState: {
		id: {
			commandClass: CommandClasses.Notification,
			property: "Access Control",
			propertyKey: "Door tilt state",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Notification,
				endpoint,
				property: "Access Control",
				propertyKey: "Door tilt state",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Notification
				&& valueId.property === "Access Control"
				&& valueId.propertyKey == "Door tilt state"
			);
		},
		get meta() {
			return {
				// Must be a number for compatibility reasons
				...ValueMetadata.ReadOnlyUInt8,
				label: "Door tilt state",
				states: {
					[0x00]: "Window/door is not tilted",
					[0x01]: "Window/door is tilted",
				},
				ccSpecific: {
					notificationType: 0x06,
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: false,
		} as const satisfies CCValueOptions,
	},
	supportedNotificationEvents: Object.assign(
		(notificationType: number) => {
			const property = "supportedNotificationEvents";
			const propertyKey = notificationType;

			return {
				id: {
					commandClass: CommandClasses.Notification,
					property,
					propertyKey,
				} as const,
				endpoint: (_endpoint?: number) =>
					({
						commandClass: CommandClasses.Notification,
						endpoint: 0, // no endpoint support!
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Notification
					&& (({ property, propertyKey }) =>
						property === "supportedNotificationEvents"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: false,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	unknownNotificationType: Object.assign(
		(notificationType: number) => {
			const property = `UNKNOWN_${num2hex(notificationType)}`;

			return {
				id: {
					commandClass: CommandClasses.Notification,
					property,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Notification,
						endpoint,
						property: property,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyUInt8,
						label: `Unknown notification (${num2hex(notificationType)})`,
						ccSpecific: { notificationType },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Notification
					&& (({ property }) =>
						typeof property === "string"
						&& property.startsWith("UNKNOWN_0x"))(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	unknownNotificationVariable: Object.assign(
		(notificationType: number, notificationName: string) => {
			const property = notificationName;
			const propertyKey = "unknown";

			return {
				id: {
					commandClass: CommandClasses.Notification,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Notification,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyUInt8,
						label: `${notificationName}: Unknown value`,
						ccSpecific: { notificationType },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Notification
					&& (({ property, propertyKey }) =>
						typeof property === "string"
						&& propertyKey === "unknown")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	notificationVariable: Object.assign(
		(notificationName: string, variableName: string) => {
			const property = notificationName;
			const propertyKey = variableName;

			return {
				id: {
					commandClass: CommandClasses.Notification,
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses.Notification,
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Notification
					&& (({ property, propertyKey }) =>
						typeof property === "string"
						&& typeof propertyKey === "string")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

function shouldAutoCreateSyntheticDoorSensorValue(
	ctx: GetValueDB,
	endpoint: EndpointId,
): boolean {
	const valueDB = ctx.tryGetValueDB(endpoint.nodeId);
	if (!valueDB) return false;
	const supportedACEvents = valueDB.getValue<readonly number[]>(
		NotificationCCValues.supportedNotificationEvents(
			// Access Control
			0x06,
		).endpoint(endpoint.index),
	);
	if (!supportedACEvents) return false;
	return (
		supportedACEvents.includes(
			// Window/door is open
			0x16,
		)
		&& supportedACEvents.includes(
			// Window/door is closed
			0x17,
		)
	);
}

export const ProtectionCCValues = Object.freeze({
	exclusiveControlNodeId: {
		id: {
			commandClass: CommandClasses.Protection,
			property: "exclusiveControlNodeId",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Protection,
				endpoint,
				property: "exclusiveControlNodeId",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Protection
				&& valueId.property === "exclusiveControlNodeId"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				min: 1,
				max: MAX_NODES,
				label: "Node ID with exclusive control",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	localProtectionState: {
		id: {
			commandClass: CommandClasses.Protection,
			property: "local",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Protection,
				endpoint,
				property: "local",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Protection
				&& valueId.property === "local"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Number,
				label: "Local protection state",
				states: enumValuesToMetadataStates(LocalProtectionState),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	rfProtectionState: {
		id: {
			commandClass: CommandClasses.Protection,
			property: "rf",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Protection,
				endpoint,
				property: "rf",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Protection
				&& valueId.property === "rf"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Number,
				label: "RF protection state",
				states: enumValuesToMetadataStates(RFProtectionState),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	timeout: {
		id: {
			commandClass: CommandClasses.Protection,
			property: "timeout",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Protection,
				endpoint,
				property: "timeout",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Protection
				&& valueId.property === "timeout"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Timeout,
				label: "RF protection timeout",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsExclusiveControl: {
		id: {
			commandClass: CommandClasses.Protection,
			property: "supportsExclusiveControl",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Protection,
				endpoint,
				property: "supportsExclusiveControl",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Protection
				&& valueId.property === "supportsExclusiveControl"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsTimeout: {
		id: {
			commandClass: CommandClasses.Protection,
			property: "supportsTimeout",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Protection,
				endpoint,
				property: "supportsTimeout",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Protection
				&& valueId.property === "supportsTimeout"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedLocalStates: {
		id: {
			commandClass: CommandClasses.Protection,
			property: "supportedLocalStates",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Protection,
				endpoint,
				property: "supportedLocalStates",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Protection
				&& valueId.property === "supportedLocalStates"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedRFStates: {
		id: {
			commandClass: CommandClasses.Protection,
			property: "supportedRFStates",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Protection,
				endpoint,
				property: "supportedRFStates",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Protection
				&& valueId.property === "supportedRFStates"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const SceneActivationCCValues = Object.freeze({
	sceneId: {
		id: {
			commandClass: CommandClasses["Scene Activation"],
			property: "sceneId",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Scene Activation"],
				endpoint,
				property: "sceneId",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Scene Activation"]
				&& valueId.property === "sceneId"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				min: 1,
				label: "Scene ID",
				valueChangeOptions: ["transitionDuration"],
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: false,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	dimmingDuration: {
		id: {
			commandClass: CommandClasses["Scene Activation"],
			property: "dimmingDuration",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Scene Activation"],
				endpoint,
				property: "dimmingDuration",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Scene Activation"]
				&& valueId.property === "dimmingDuration"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Duration,
				label: "Dimming duration",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const SceneActuatorConfigurationCCValues = Object.freeze({
	level: Object.assign(
		(sceneId: number) => {
			const property = "level";
			const propertyKey = sceneId;

			return {
				id: {
					commandClass:
						CommandClasses["Scene Actuator Configuration"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Scene Actuator Configuration"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.UInt8,
						label: `Level (${sceneId})`,
						valueChangeOptions: ["transitionDuration"],
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Scene Actuator Configuration"]
					&& (({ property, propertyKey }) =>
						property === "level"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	dimmingDuration: Object.assign(
		(sceneId: number) => {
			const property = "dimmingDuration";
			const propertyKey = sceneId;

			return {
				id: {
					commandClass:
						CommandClasses["Scene Actuator Configuration"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Scene Actuator Configuration"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Duration,
						label: `Dimming duration (${sceneId})`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Scene Actuator Configuration"]
					&& (({ property, propertyKey }) =>
						property === "dimmingDuration"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const SceneControllerConfigurationCCValues = Object.freeze({
	sceneId: Object.assign(
		(groupId: number) => {
			const property = "sceneId";
			const propertyKey = groupId;

			return {
				id: {
					commandClass:
						CommandClasses["Scene Controller Configuration"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Scene Controller Configuration"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.UInt8,
						label: `Associated Scene ID (${groupId})`,
						valueChangeOptions: ["transitionDuration"],
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Scene Controller Configuration"]
					&& (({ property, propertyKey }) =>
						property === "sceneId"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	dimmingDuration: Object.assign(
		(groupId: number) => {
			const property = "dimmingDuration";
			const propertyKey = groupId;

			return {
				id: {
					commandClass:
						CommandClasses["Scene Controller Configuration"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass:
							CommandClasses["Scene Controller Configuration"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Duration,
						label: `Dimming duration (${groupId})`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Scene Controller Configuration"]
					&& (({ property, propertyKey }) =>
						property === "dimmingDuration"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const ScheduleEntryLockCCValues = Object.freeze({
	numWeekDaySlots: {
		id: {
			commandClass: CommandClasses["Schedule Entry Lock"],
			property: "numWeekDaySlots",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Schedule Entry Lock"],
				endpoint,
				property: "numWeekDaySlots",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Schedule Entry Lock"]
				&& valueId.property === "numWeekDaySlots"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	numYearDaySlots: {
		id: {
			commandClass: CommandClasses["Schedule Entry Lock"],
			property: "numYearDaySlots",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Schedule Entry Lock"],
				endpoint,
				property: "numYearDaySlots",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Schedule Entry Lock"]
				&& valueId.property === "numYearDaySlots"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	numDailyRepeatingSlots: {
		id: {
			commandClass: CommandClasses["Schedule Entry Lock"],
			property: "numDailyRepeatingSlots",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Schedule Entry Lock"],
				endpoint,
				property: "numDailyRepeatingSlots",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Schedule Entry Lock"]
				&& valueId.property === "numDailyRepeatingSlots"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	userEnabled: Object.assign(
		(userId: number) => {
			const property = "userEnabled";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["Schedule Entry Lock"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Schedule Entry Lock"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Schedule Entry Lock"]
					&& (({ property, propertyKey }) =>
						property === "userEnabled"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	scheduleKind: Object.assign(
		(userId: number) => {
			const property = "scheduleKind";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["Schedule Entry Lock"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Schedule Entry Lock"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Schedule Entry Lock"]
					&& (({ property, propertyKey }) =>
						property === "scheduleKind"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	schedule: Object.assign(
		(
			scheduleKind: ScheduleEntryLockScheduleKind,
			userId: number,
			slotId: number,
		) => {
			const property = "schedule";
			const propertyKey = (scheduleKind << 16) | (userId << 8) | slotId;

			return {
				id: {
					commandClass: CommandClasses["Schedule Entry Lock"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Schedule Entry Lock"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Schedule Entry Lock"]
					&& (({ property, propertyKey }) =>
						property === "schedule"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const SoundSwitchCCValues = Object.freeze({
	volume: {
		id: {
			commandClass: CommandClasses["Sound Switch"],
			property: "volume",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Sound Switch"],
				endpoint,
				property: "volume",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Sound Switch"]
				&& valueId.property === "volume"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				min: 0,
				max: 100,
				unit: "%",
				label: "Volume",
				allowManualEntry: true,
				states: {
					0: "default",
				},
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	toneId: {
		id: {
			commandClass: CommandClasses["Sound Switch"],
			property: "toneId",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Sound Switch"],
				endpoint,
				property: "toneId",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Sound Switch"]
				&& valueId.property === "toneId"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				label: "Play Tone",
				valueChangeOptions: ["volume"],
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	defaultVolume: {
		id: {
			commandClass: CommandClasses["Sound Switch"],
			property: "defaultVolume",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Sound Switch"],
				endpoint,
				property: "defaultVolume",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Sound Switch"]
				&& valueId.property === "defaultVolume"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Number,
				min: 0,
				max: 100,
				unit: "%",
				label: "Default volume",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	defaultToneId: {
		id: {
			commandClass: CommandClasses["Sound Switch"],
			property: "defaultToneId",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Sound Switch"],
				endpoint,
				property: "defaultToneId",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Sound Switch"]
				&& valueId.property === "defaultToneId"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Number,
				min: 1,
				max: 254,
				label: "Default tone ID",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const SupervisionCCValues = Object.freeze({
	ccSupported: Object.assign(
		(ccId: CommandClasses) => {
			const property = "ccSupported";
			const propertyKey = ccId;

			return {
				id: {
					commandClass: CommandClasses.Supervision,
					property,
					propertyKey,
				} as const,
				endpoint: (_endpoint?: number) =>
					({
						commandClass: CommandClasses.Supervision,
						endpoint: 0, // no endpoint support!
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses.Supervision
					&& (({ property, propertyKey }) =>
						property === "commandSupported"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: false,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const ThermostatFanModeCCValues = Object.freeze({
	turnedOff: {
		id: {
			commandClass: CommandClasses["Thermostat Fan Mode"],
			property: "off",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Thermostat Fan Mode"],
				endpoint,
				property: "off",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Thermostat Fan Mode"]
				&& valueId.property === "off"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Boolean,
				label: "Thermostat fan turned off",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	fanMode: {
		id: {
			commandClass: CommandClasses["Thermostat Fan Mode"],
			property: "mode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Thermostat Fan Mode"],
				endpoint,
				property: "mode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Thermostat Fan Mode"]
				&& valueId.property === "mode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				states: enumValuesToMetadataStates(ThermostatFanMode),
				label: "Thermostat fan mode",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedFanModes: {
		id: {
			commandClass: CommandClasses["Thermostat Fan Mode"],
			property: "supportedModes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Thermostat Fan Mode"],
				endpoint,
				property: "supportedModes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Thermostat Fan Mode"]
				&& valueId.property === "supportedModes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const ThermostatFanStateCCValues = Object.freeze({
	fanState: {
		id: {
			commandClass: CommandClasses["Thermostat Fan State"],
			property: "state",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Thermostat Fan State"],
				endpoint,
				property: "state",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Thermostat Fan State"]
				&& valueId.property === "state"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				states: enumValuesToMetadataStates(ThermostatFanState),
				label: "Thermostat fan state",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const ThermostatModeCCValues = Object.freeze({
	thermostatMode: {
		id: {
			commandClass: CommandClasses["Thermostat Mode"],
			property: "mode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Thermostat Mode"],
				endpoint,
				property: "mode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Thermostat Mode"]
				&& valueId.property === "mode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt8,
				states: enumValuesToMetadataStates(ThermostatMode),
				label: "Thermostat mode",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	manufacturerData: {
		id: {
			commandClass: CommandClasses["Thermostat Mode"],
			property: "manufacturerData",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Thermostat Mode"],
				endpoint,
				property: "manufacturerData",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Thermostat Mode"]
				&& valueId.property === "manufacturerData"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyBuffer,
				label: "Manufacturer data",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedModes: {
		id: {
			commandClass: CommandClasses["Thermostat Mode"],
			property: "supportedModes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Thermostat Mode"],
				endpoint,
				property: "supportedModes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Thermostat Mode"]
				&& valueId.property === "supportedModes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const ThermostatOperatingStateCCValues = Object.freeze({
	operatingState: {
		id: {
			commandClass: CommandClasses["Thermostat Operating State"],
			property: "state",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Thermostat Operating State"],
				endpoint,
				property: "state",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass
					=== CommandClasses["Thermostat Operating State"]
				&& valueId.property === "state"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyUInt8,
				label: "Operating state",
				states: enumValuesToMetadataStates(ThermostatOperatingState),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const ThermostatSetpointCCValues = Object.freeze({
	observedFloatEncodings: {
		id: {
			commandClass: CommandClasses["Thermostat Setpoint"],
			property: "observedFloatEncodings",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Thermostat Setpoint"],
				endpoint: 0, // no endpoint support!
				property: "observedFloatEncodings",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Thermostat Setpoint"]
				&& valueId.property === "observedFloatEncodings"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedSetpointTypes: {
		id: {
			commandClass: CommandClasses["Thermostat Setpoint"],
			property: "supportedSetpointTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Thermostat Setpoint"],
				endpoint,
				property: "supportedSetpointTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Thermostat Setpoint"]
				&& valueId.property === "supportedSetpointTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	setpoint: Object.assign(
		(setpointType: ThermostatSetpointType) => {
			const property = "setpoint";
			const propertyKey = setpointType;

			return {
				id: {
					commandClass: CommandClasses["Thermostat Setpoint"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Thermostat Setpoint"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Number,
						label: `Setpoint (${getEnumMemberName(
							ThermostatSetpointType,
							setpointType,
						)})`,
						ccSpecific: { setpointType },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Thermostat Setpoint"]
					&& (({ property, propertyKey }) =>
						property === "setpoint"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	setpointScale: Object.assign(
		(setpointType: ThermostatSetpointType) => {
			const property = "setpointScale";
			const propertyKey = setpointType;

			return {
				id: {
					commandClass: CommandClasses["Thermostat Setpoint"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Thermostat Setpoint"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass
						=== CommandClasses["Thermostat Setpoint"]
					&& (({ property, propertyKey }) =>
						property === "setpointScale"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const TimeParametersCCValues = Object.freeze({
	dateAndTime: {
		id: {
			commandClass: CommandClasses["Time Parameters"],
			property: "dateAndTime",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Time Parameters"],
				endpoint,
				property: "dateAndTime",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Time Parameters"]
				&& valueId.property === "dateAndTime"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.Any,
				label: "Date and Time",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const UserCodeCCValues = Object.freeze({
	supportedUsers: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportedUsers",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportedUsers",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportedUsers"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsAdminCode: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportsAdminCode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportsAdminCode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportsAdminCode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsAdminCodeDeactivation: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportsAdminCodeDeactivation",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportsAdminCodeDeactivation",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportsAdminCodeDeactivation"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	_deprecated_supportsMasterCode: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportsMasterCode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportsMasterCode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportsMasterCode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	_deprecated_supportsMasterCodeDeactivation: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportsMasterCodeDeactivation",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportsMasterCodeDeactivation",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportsMasterCodeDeactivation"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsUserCodeChecksum: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportsUserCodeChecksum",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportsUserCodeChecksum",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportsUserCodeChecksum"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsMultipleUserCodeReport: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportsMultipleUserCodeReport",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportsMultipleUserCodeReport",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportsMultipleUserCodeReport"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsMultipleUserCodeSet: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportsMultipleUserCodeSet",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportsMultipleUserCodeSet",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportsMultipleUserCodeSet"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedUserIDStatuses: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportedUserIDStatuses",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportedUserIDStatuses",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportedUserIDStatuses"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedKeypadModes: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportedKeypadModes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportedKeypadModes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportedKeypadModes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedASCIIChars: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "supportedASCIIChars",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "supportedASCIIChars",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "supportedASCIIChars"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	userCodeChecksum: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "userCodeChecksum",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "userCodeChecksum",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "userCodeChecksum"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	keypadMode: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "keypadMode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "keypadMode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "keypadMode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyNumber,
				label: "Keypad Mode",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	adminCode: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "adminCode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "adminCode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "adminCode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.String,
				label: "Admin Code",
				minLength: 4,
				maxLength: 10,
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: true,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	_deprecated_masterCode: {
		id: {
			commandClass: CommandClasses["User Code"],
			property: "masterCode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Code"],
				endpoint,
				property: "masterCode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Code"]
				&& valueId.property === "masterCode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: false,
		} as const satisfies CCValueOptions,
	},
	userIdStatus: Object.assign(
		(userId: number) => {
			const property = "userIdStatus";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["User Code"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Code"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.Number,
						label: `User ID status (${userId})`,
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Code"]
					&& (({ property, propertyKey }) =>
						property === "userIdStatus"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	userCode: Object.assign(
		(userId: number) => {
			const property = "userCode";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["User Code"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Code"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Code"]
					&& (({ property, propertyKey }) =>
						property === "userCode"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: true,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const UserCredentialCCValues = Object.freeze({
	supportedUsers: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportedUsers",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportedUsers",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportedUsers"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedCredentialRules: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportedCredentialRules",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportedCredentialRules",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportedCredentialRules"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	maxUserNameLength: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "maxUserNameLength",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "maxUserNameLength",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "maxUserNameLength"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsUserSchedule: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportsUserSchedule",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportsUserSchedule",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportsUserSchedule"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsAllUsersChecksum: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportsAllUsersChecksum",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportsAllUsersChecksum",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportsAllUsersChecksum"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsUserChecksum: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportsUserChecksum",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportsUserChecksum",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportsUserChecksum"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedUserNameEncodings: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportedUserNameEncodings",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportedUserNameEncodings",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportedUserNameEncodings"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedUserTypes: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportedUserTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportedUserTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportedUserTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsCredentialChecksum: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportsCredentialChecksum",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportsCredentialChecksum",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportsCredentialChecksum"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsAdminCode: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportsAdminCode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportsAdminCode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportsAdminCode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsAdminCodeDeactivation: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportsAdminCodeDeactivation",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportsAdminCodeDeactivation",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportsAdminCodeDeactivation"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedCredentialTypes: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportedCredentialTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportedCredentialTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportedCredentialTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	credentialCapabilities: Object.assign(
		(credentialType: UserCredentialType) => {
			const property = "credentialCapabilities";
			const propertyKey = credentialType;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "credentialCapabilities"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	allUsersChecksum: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "allUsersChecksum",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "allUsersChecksum",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "allUsersChecksum"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportedKeyLockerEntryTypes: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "supportedKeyLockerEntryTypes",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "supportedKeyLockerEntryTypes",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "supportedKeyLockerEntryTypes"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	keyLockerCapabilities: Object.assign(
		(entryType: UserCredentialKeyLockerEntryType) => {
			const property = "keyLockerCapabilities";
			const propertyKey = entryType;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "keyLockerCapabilities"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 2,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	userType: Object.assign(
		(userId: number) => {
			const property = "userType";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "userType"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	userActive: Object.assign(
		(userId: number) => {
			const property = "userActive";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "userActive"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	credentialRule: Object.assign(
		(userId: number) => {
			const property = "credentialRule";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "credentialRule"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	expiringTimeoutMinutes: Object.assign(
		(userId: number) => {
			const property = "expiringTimeoutMinutes";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "expiringTimeoutMinutes"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	userName: Object.assign(
		(userId: number) => {
			const property = "userName";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "userName"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	userModifierType: Object.assign(
		(userId: number) => {
			const property = "userModifierType";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "userModifierType"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	userModifierNodeId: Object.assign(
		(userId: number) => {
			const property = "userModifierNodeId";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "userModifierNodeId"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	userChecksum: Object.assign(
		(userId: number) => {
			const property = "userChecksum";
			const propertyKey = userId;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "userChecksum"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	credentialOwner: Object.assign(
		(type: UserCredentialType, slot: number) => {
			const property = "credentialOwner";
			const propertyKey = (type << 16) | slot;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "credentialOwner"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	credentialModifierType: Object.assign(
		(type: UserCredentialType, slot: number) => {
			const property = "credentialModifierType";
			const propertyKey = (type << 16) | slot;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "credentialModifierType"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	credentialModifierNodeId: Object.assign(
		(type: UserCredentialType, slot: number) => {
			const property = "credentialModifierNodeId";
			const propertyKey = (type << 16) | slot;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "credentialModifierNodeId"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	credential: Object.assign(
		(type: UserCredentialType, slot: number) => {
			const property = "credential";
			const propertyKey = (type << 16) | slot;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "credential"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 1,
				secret: true,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	adminPinCode: {
		id: {
			commandClass: CommandClasses["User Credential"],
			property: "adminPinCode",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["User Credential"],
				endpoint,
				property: "adminPinCode",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["User Credential"]
				&& valueId.property === "adminPinCode"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: true,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	keyLockerEntry: Object.assign(
		(type: UserCredentialKeyLockerEntryType, slot: number) => {
			const property = "keyLockerEntry";
			const propertyKey = (type << 16) | slot;

			return {
				id: {
					commandClass: CommandClasses["User Credential"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["User Credential"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return ValueMetadata.Any;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["User Credential"]
					&& (({ property, propertyKey }) =>
						property === "keyLockerEntry"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: true,
				minVersion: 2,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const VersionCCValues = Object.freeze({
	firmwareVersions: {
		id: {
			commandClass: CommandClasses.Version,
			property: "firmwareVersions",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "firmwareVersions",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "firmwareVersions"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnly,
				type: "string[]",
				label: "Z-Wave chip firmware versions",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	libraryType: {
		id: {
			commandClass: CommandClasses.Version,
			property: "libraryType",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "libraryType",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "libraryType"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyNumber,
				label: "Library type",
				states: enumValuesToMetadataStates(ZWaveLibraryTypes),
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	protocolVersion: {
		id: {
			commandClass: CommandClasses.Version,
			property: "protocolVersion",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "protocolVersion",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "protocolVersion"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Z-Wave protocol version",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	hardwareVersion: {
		id: {
			commandClass: CommandClasses.Version,
			property: "hardwareVersion",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "hardwareVersion",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "hardwareVersion"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyNumber,
				label: "Z-Wave chip hardware version",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 2,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	supportsZWaveSoftwareGet: {
		id: {
			commandClass: CommandClasses.Version,
			property: "supportsZWaveSoftwareGet",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses.Version,
				endpoint,
				property: "supportsZWaveSoftwareGet",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "supportsZWaveSoftwareGet"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	sdkVersion: {
		id: {
			commandClass: CommandClasses.Version,
			property: "sdkVersion",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "sdkVersion",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "sdkVersion"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "SDK version",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	applicationFrameworkAPIVersion: {
		id: {
			commandClass: CommandClasses.Version,
			property: "applicationFrameworkAPIVersion",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "applicationFrameworkAPIVersion",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "applicationFrameworkAPIVersion"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Z-Wave application framework API version",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	applicationFrameworkBuildNumber: {
		id: {
			commandClass: CommandClasses.Version,
			property: "applicationFrameworkBuildNumber",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "applicationFrameworkBuildNumber",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "applicationFrameworkBuildNumber"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Z-Wave application framework API build number",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	serialAPIVersion: {
		id: {
			commandClass: CommandClasses.Version,
			property: "hostInterfaceVersion",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "hostInterfaceVersion",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "hostInterfaceVersion"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Serial API version",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	serialAPIBuildNumber: {
		id: {
			commandClass: CommandClasses.Version,
			property: "hostInterfaceBuildNumber",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "hostInterfaceBuildNumber",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "hostInterfaceBuildNumber"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Serial API build number",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	zWaveProtocolVersion: {
		id: {
			commandClass: CommandClasses.Version,
			property: "zWaveProtocolVersion",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "zWaveProtocolVersion",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "zWaveProtocolVersion"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Z-Wave protocol version",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	zWaveProtocolBuildNumber: {
		id: {
			commandClass: CommandClasses.Version,
			property: "zWaveProtocolBuildNumber",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "zWaveProtocolBuildNumber",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "zWaveProtocolBuildNumber"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Z-Wave protocol build number",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	applicationVersion: {
		id: {
			commandClass: CommandClasses.Version,
			property: "applicationVersion",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "applicationVersion",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "applicationVersion"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Application version",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	applicationBuildNumber: {
		id: {
			commandClass: CommandClasses.Version,
			property: "applicationBuildNumber",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses.Version,
				endpoint: 0, // no endpoint support!
				property: "applicationBuildNumber",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses.Version
				&& valueId.property === "applicationBuildNumber"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnlyString,
				label: "Application build number",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const WakeUpCCValues = Object.freeze({
	controllerNodeId: {
		id: {
			commandClass: CommandClasses["Wake Up"],
			property: "controllerNodeId",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Wake Up"],
				endpoint: 0, // no endpoint support!
				property: "controllerNodeId",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Wake Up"]
				&& valueId.property === "controllerNodeId"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.ReadOnly,
				label: "Node ID of the controller",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	wakeUpInterval: {
		id: {
			commandClass: CommandClasses["Wake Up"],
			property: "wakeUpInterval",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Wake Up"],
				endpoint: 0, // no endpoint support!
				property: "wakeUpInterval",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Wake Up"]
				&& valueId.property === "wakeUpInterval"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return {
				...ValueMetadata.UInt24,
				label: "Wake Up interval",
			} as const;
		},
		options: {
			internal: false,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	wakeUpOnDemandSupported: {
		id: {
			commandClass: CommandClasses["Wake Up"],
			property: "wakeUpOnDemandSupported",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Wake Up"],
				endpoint: 0, // no endpoint support!
				property: "wakeUpOnDemandSupported",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Wake Up"]
				&& valueId.property === "wakeUpOnDemandSupported"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 3,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const WindowCoveringCCValues = Object.freeze({
	supportedParameters: {
		id: {
			commandClass: CommandClasses["Window Covering"],
			property: "supportedParameters",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Window Covering"],
				endpoint,
				property: "supportedParameters",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Window Covering"]
				&& valueId.property === "supportedParameters"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	currentValue: Object.assign(
		(parameter: WindowCoveringParameter) => {
			const property = "currentValue";
			const propertyKey = parameter;

			return {
				id: {
					commandClass: CommandClasses["Window Covering"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Window Covering"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyLevel,
						label: `Current value - ${getEnumMemberName(
							WindowCoveringParameter,
							parameter,
						)}`,
						states: windowCoveringParameterToMetadataStates(
							parameter,
						),
						ccSpecific: { parameter },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Window Covering"]
					&& (({ property, propertyKey }) =>
						property === "currentValue"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	targetValue: Object.assign(
		(parameter: WindowCoveringParameter) => {
			const property = "targetValue";
			const propertyKey = parameter;

			return {
				id: {
					commandClass: CommandClasses["Window Covering"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Window Covering"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					// Only odd-numbered parameters have position support and are writable
					const writeable = parameter % 2 === 1;
					return {
						...ValueMetadata.Level,
						label: `Target value - ${getEnumMemberName(
							WindowCoveringParameter,
							parameter,
						)}`,
						// Only odd-numbered parameters have position support and are writable
						writeable: parameter % 2 === 1,
						states: windowCoveringParameterToMetadataStates(
							parameter,
						),
						allowManualEntry: writeable,
						ccSpecific: { parameter },
						valueChangeOptions: ["transitionDuration"],
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Window Covering"]
					&& (({ property, propertyKey }) =>
						property === "targetValue"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	duration: Object.assign(
		(parameter: WindowCoveringParameter) => {
			const property = "duration";
			const propertyKey = parameter;

			return {
				id: {
					commandClass: CommandClasses["Window Covering"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Window Covering"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.ReadOnlyDuration,
						label: `Remaining duration - ${getEnumMemberName(
							WindowCoveringParameter,
							parameter,
						)}`,
						ccSpecific: {
							parameter,
						},
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Window Covering"]
					&& (({ property, propertyKey }) =>
						property === "duration"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	levelChangeUp: Object.assign(
		(parameter: WindowCoveringParameter) => {
			const property = "levelChangeUp";
			const propertyKey = parameter;

			return {
				id: {
					commandClass: CommandClasses["Window Covering"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Window Covering"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.WriteOnlyBoolean,
						label: `${windowCoveringParameterToLevelChangeLabel(
							parameter,
							"up",
						)} - ${getEnumMemberName(
							WindowCoveringParameter,
							parameter,
						)}`,
						valueChangeOptions: ["transitionDuration"],
						states: {
							true: "Start",
							false: "Stop",
						},
						ccSpecific: { parameter },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Window Covering"]
					&& (({ property, propertyKey }) =>
						property === "levelChangeUp"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
	levelChangeDown: Object.assign(
		(parameter: WindowCoveringParameter) => {
			const property = "levelChangeDown";
			const propertyKey = parameter;

			return {
				id: {
					commandClass: CommandClasses["Window Covering"],
					property,
					propertyKey,
				} as const,
				endpoint: (endpoint: number = 0) =>
					({
						commandClass: CommandClasses["Window Covering"],
						endpoint,
						property: property,
						propertyKey: propertyKey,
					}) as const,
				get meta() {
					return {
						...ValueMetadata.WriteOnlyBoolean,
						label: `${windowCoveringParameterToLevelChangeLabel(
							parameter,
							"down",
						)} - ${getEnumMemberName(
							WindowCoveringParameter,
							parameter,
						)}`,
						valueChangeOptions: ["transitionDuration"],
						states: {
							true: "Start",
							false: "Stop",
						},
						ccSpecific: { parameter },
					} as const;
				},
			};
		},
		{
			is: (valueId: ValueID): boolean => {
				return (
					valueId.commandClass === CommandClasses["Window Covering"]
					&& (({ property, propertyKey }) =>
						property === "levelChangeDown"
						&& typeof propertyKey === "number")(valueId)
				);
			},
			options: {
				internal: false,
				minVersion: 1,
				secret: false,
				stateful: true,
				supportsEndpoints: true,
				autoCreate: true,
			} as const satisfies CCValueOptions,
		},
	),
});

export const ZWavePlusCCValues = Object.freeze({
	zwavePlusVersion: {
		id: {
			commandClass: CommandClasses["Z-Wave Plus Info"],
			property: "zwavePlusVersion",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Z-Wave Plus Info"],
				endpoint: 0, // no endpoint support!
				property: "zwavePlusVersion",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Z-Wave Plus Info"]
				&& valueId.property === "zwavePlusVersion"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	nodeType: {
		id: {
			commandClass: CommandClasses["Z-Wave Plus Info"],
			property: "nodeType",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Z-Wave Plus Info"],
				endpoint: 0, // no endpoint support!
				property: "nodeType",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Z-Wave Plus Info"]
				&& valueId.property === "nodeType"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	roleType: {
		id: {
			commandClass: CommandClasses["Z-Wave Plus Info"],
			property: "roleType",
		} as const,
		endpoint: (_endpoint?: number) =>
			({
				commandClass: CommandClasses["Z-Wave Plus Info"],
				endpoint: 0, // no endpoint support!
				property: "roleType",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Z-Wave Plus Info"]
				&& valueId.property === "roleType"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: false,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	userIcon: {
		id: {
			commandClass: CommandClasses["Z-Wave Plus Info"],
			property: "userIcon",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Z-Wave Plus Info"],
				endpoint,
				property: "userIcon",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Z-Wave Plus Info"]
				&& valueId.property === "userIcon"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
	installerIcon: {
		id: {
			commandClass: CommandClasses["Z-Wave Plus Info"],
			property: "installerIcon",
		} as const,
		endpoint: (endpoint: number = 0) =>
			({
				commandClass: CommandClasses["Z-Wave Plus Info"],
				endpoint,
				property: "installerIcon",
			}) as const,
		is: (valueId: ValueID): boolean => {
			return (
				valueId.commandClass === CommandClasses["Z-Wave Plus Info"]
				&& valueId.property === "installerIcon"
				&& valueId.propertyKey == undefined
			);
		},
		get meta() {
			return ValueMetadata.Any;
		},
		options: {
			internal: true,
			minVersion: 1,
			secret: false,
			stateful: true,
			supportsEndpoints: true,
			autoCreate: true,
		} as const satisfies CCValueOptions,
	},
});

export const CCValues = {
	[CommandClasses["Alarm Sensor"]]: AlarmSensorCCValues,
	[CommandClasses.Association]: AssociationCCValues,
	[CommandClasses["Association Group Information"]]:
		AssociationGroupInfoCCValues,
	[CommandClasses["Barrier Operator"]]: BarrierOperatorCCValues,
	[CommandClasses.Basic]: BasicCCValues,
	[CommandClasses["Basic Window Covering"]]: BasicWindowCoveringCCValues,
	[CommandClasses.Battery]: BatteryCCValues,
	[CommandClasses["Binary Sensor"]]: BinarySensorCCValues,
	[CommandClasses["Binary Switch"]]: BinarySwitchCCValues,
	[CommandClasses["Central Scene"]]: CentralSceneCCValues,
	[CommandClasses["Climate Control Schedule"]]:
		ClimateControlScheduleCCValues,
	[CommandClasses["Color Switch"]]: ColorSwitchCCValues,
	[CommandClasses.Configuration]: ConfigurationCCValues,
	[CommandClasses["Door Lock"]]: DoorLockCCValues,
	[CommandClasses["Door Lock Logging"]]: DoorLockLoggingCCValues,
	[CommandClasses["Energy Production"]]: EnergyProductionCCValues,
	[CommandClasses["Entry Control"]]: EntryControlCCValues,
	[CommandClasses["Firmware Update Meta Data"]]:
		FirmwareUpdateMetaDataCCValues,
	[CommandClasses["Humidity Control Mode"]]: HumidityControlModeCCValues,
	[CommandClasses["Humidity Control Operating State"]]:
		HumidityControlOperatingStateCCValues,
	[CommandClasses["Humidity Control Setpoint"]]:
		HumidityControlSetpointCCValues,
	[CommandClasses.Indicator]: IndicatorCCValues,
	[CommandClasses.Irrigation]: IrrigationCCValues,
	[CommandClasses.Language]: LanguageCCValues,
	[CommandClasses.Lock]: LockCCValues,
	[CommandClasses["Manufacturer Specific"]]: ManufacturerSpecificCCValues,
	[CommandClasses.Meter]: MeterCCValues,
	[CommandClasses["Multi Channel Association"]]:
		MultiChannelAssociationCCValues,
	[CommandClasses["Multi Channel"]]: MultiChannelCCValues,
	[CommandClasses["Multilevel Sensor"]]: MultilevelSensorCCValues,
	[CommandClasses["Multilevel Switch"]]: MultilevelSwitchCCValues,
	[CommandClasses["Node Naming and Location"]]: NodeNamingAndLocationCCValues,
	[CommandClasses.Notification]: NotificationCCValues,
	[CommandClasses.Protection]: ProtectionCCValues,
	[CommandClasses["Scene Activation"]]: SceneActivationCCValues,
	[CommandClasses["Scene Actuator Configuration"]]:
		SceneActuatorConfigurationCCValues,
	[CommandClasses["Scene Controller Configuration"]]:
		SceneControllerConfigurationCCValues,
	[CommandClasses["Schedule Entry Lock"]]: ScheduleEntryLockCCValues,
	[CommandClasses["Sound Switch"]]: SoundSwitchCCValues,
	[CommandClasses.Supervision]: SupervisionCCValues,
	[CommandClasses["Thermostat Fan Mode"]]: ThermostatFanModeCCValues,
	[CommandClasses["Thermostat Fan State"]]: ThermostatFanStateCCValues,
	[CommandClasses["Thermostat Mode"]]: ThermostatModeCCValues,
	[CommandClasses["Thermostat Operating State"]]:
		ThermostatOperatingStateCCValues,
	[CommandClasses["Thermostat Setpoint"]]: ThermostatSetpointCCValues,
	[CommandClasses["Time Parameters"]]: TimeParametersCCValues,
	[CommandClasses["User Code"]]: UserCodeCCValues,
	[CommandClasses["User Credential"]]: UserCredentialCCValues,
	[CommandClasses.Version]: VersionCCValues,
	[CommandClasses["Wake Up"]]: WakeUpCCValues,
	[CommandClasses["Window Covering"]]: WindowCoveringCCValues,
	[CommandClasses["Z-Wave Plus Info"]]: ZWavePlusCCValues,
};
