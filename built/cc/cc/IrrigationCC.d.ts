/// <reference types="node" />
import { CommandClasses, IZWaveEndpoint, Maybe, MessageOrCCLogEntry, SupervisionResult, ValueID } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { IrrigationCommand, IrrigationSensorPolarity, ValveId, ValveTableEntry } from "../lib/_Types";
export declare const IrrigationCCValues: Readonly<{
    valveRunStartStop: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "startStop";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "startStop";
        };
        readonly meta: {
            readonly label: `${string}: Start/Stop`;
            readonly type: "boolean";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    valveRunDuration: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "duration";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "duration";
        };
        readonly meta: {
            readonly label: `${string}: Run duration`;
            readonly min: 1;
            readonly unit: "s";
            readonly max: 65535;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    useMoistureSensor: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "useMoistureSensor";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "useMoistureSensor";
        };
        readonly meta: {
            readonly label: `${string}: Use moisture sensor`;
            readonly type: "boolean";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    useRainSensor: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "useRainSensor";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "useRainSensor";
        };
        readonly meta: {
            readonly label: `${string}: Use rain sensor`;
            readonly type: "boolean";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorLowFlow: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "errorLowFlow";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "errorLowFlow";
        };
        readonly meta: {
            readonly label: `${string}: Error - Flow below high threshold`;
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    lowFlowThreshold: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "lowFlowThreshold";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "lowFlowThreshold";
        };
        readonly meta: {
            readonly label: `${string}: Low flow threshold`;
            readonly min: 0;
            readonly unit: "l/h";
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorHighFlow: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "errorHighFlow";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "errorHighFlow";
        };
        readonly meta: {
            readonly label: `${string}: Error - Flow above high threshold`;
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    highFlowThreshold: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "highFlowThreshold";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "highFlowThreshold";
        };
        readonly meta: {
            readonly label: `${string}: High flow threshold`;
            readonly min: 0;
            readonly unit: "l/h";
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorMaximumFlow: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "errorMaximumFlow";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "errorMaximumFlow";
        };
        readonly meta: {
            readonly label: `${string}: Error - Maximum flow detected`;
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    maximumFlow: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "maximumFlow";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "maximumFlow";
        };
        readonly meta: {
            readonly label: `${string}: Maximum flow`;
            readonly min: 0;
            readonly unit: "l/h";
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorLowCurrent: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "errorLowCurrent";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "errorLowCurrent";
        };
        readonly meta: {
            readonly label: `${string}: Error - Current below low threshold`;
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorHighCurrent: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "errorHighCurrent";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "errorHighCurrent";
        };
        readonly meta: {
            readonly label: `${string}: Error - Current above high threshold`;
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorShortCircuit: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "errorShortCircuit";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "errorShortCircuit";
        };
        readonly meta: {
            readonly label: `${string}: Error - Short circuit detected`;
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    nominalCurrentLowThreshold: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "nominalCurrentLowThreshold";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "nominalCurrentLowThreshold";
        };
        readonly meta: {
            readonly label: `${string}: Nominal current - low threshold`;
            readonly min: 0;
            readonly max: 2550;
            readonly unit: "mA";
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    nominalCurrentHighThreshold: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "nominalCurrentHighThreshold";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "nominalCurrentHighThreshold";
        };
        readonly meta: {
            readonly label: `${string}: Nominal current - high threshold`;
            readonly min: 0;
            readonly max: 2550;
            readonly unit: "mA";
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    nominalCurrent: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "nominalCurrent";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "nominalCurrent";
        };
        readonly meta: {
            readonly label: `${string}: Nominal current`;
            readonly unit: "mA";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    valveConnected: ((valveId: ValveId) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: ValveId;
            readonly propertyKey: "valveConnected";
        };
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: ValveId;
            propertyKey: "valveConnected";
        };
        readonly meta: {
            readonly label: `${string}: Connected`;
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    shutoffSystem: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "shutoff";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "shutoff";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Shutoff system";
            readonly readable: false;
            readonly type: "boolean";
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    firstOpenZoneId: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "firstOpenZoneId";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "firstOpenZoneId";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "First open zone valve ID";
            readonly writeable: false;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    masterValveOpen: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "masterValveOpen";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "masterValveOpen";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Master valve is open";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorValve: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "errorValve";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "errorValve";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Error: valve reporting error";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    lowPressureThreshold: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "lowPressureThreshold";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "lowPressureThreshold";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Low pressure threshold";
            readonly unit: "kPa";
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorLowPressure: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "errorLowPressure";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "errorLowPressure";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Error: low pressure";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    highPressureThreshold: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "highPressureThreshold";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "highPressureThreshold";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "High pressure threshold";
            readonly unit: "kPa";
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorHighPressure: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "errorHighPressure";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "errorHighPressure";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Error: high pressure";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorEmergencyShutdown: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "errorEmergencyShutdown";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "errorEmergencyShutdown";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Error: emergency shutdown";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    errorNotProgrammed: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "errorNotProgrammed";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "errorNotProgrammed";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Error: device not programmed";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    shutoffDuration: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "shutoffDuration";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "shutoffDuration";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Remaining shutoff duration";
            readonly unit: "hours";
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    pressure: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "pressure";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "pressure";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Pressure";
            readonly unit: "kPa";
            readonly writeable: false;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    flow: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "flow";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "flow";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Flow";
            readonly unit: "l/h";
            readonly writeable: false;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    moistureSensorPolarity: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "moistureSensorPolarity";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "moistureSensorPolarity";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Moisture sensor polarity";
            readonly min: 0;
            readonly max: 1;
            readonly states: {
                [x: number]: string;
            };
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    moistureSensorActive: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "moistureSensorActive";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "moistureSensorActive";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Moisture sensor attached and active";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    rainSensorPolarity: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "rainSensorPolarity";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "rainSensorPolarity";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Rain sensor polarity";
            readonly min: 0;
            readonly max: 1;
            readonly states: {
                [x: number]: string;
            };
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    rainSensorActive: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "rainSensorActive";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "rainSensorActive";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Rain sensor attached and active";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    pressureSensorActive: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "pressureSensorActive";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "pressureSensorActive";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Pressure sensor active";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    flowSensorActive: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "flowSensorActive";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "flowSensorActive";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Flow sensor active";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    masterValveDelay: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "masterValveDelay";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "masterValveDelay";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Master valve delay";
            readonly description: "The delay between turning on the master valve and turning on any zone valve";
            readonly unit: "seconds";
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    systemVoltage: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "systemVoltage";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "systemVoltage";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "System voltage";
            readonly unit: "V";
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    maxValveTableSize: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "maxValveTableSize";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "maxValveTableSize";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    supportsMasterValve: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "supportsMasterValve";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "supportsMasterValve";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    numValveTables: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "numValveTables";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "numValveTables";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    numValves: {
        readonly id: {
            commandClass: CommandClasses.Irrigation;
            property: "numValves";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Irrigation;
            readonly endpoint: number;
            readonly property: "numValves";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
}>;
export declare class IrrigationCCAPI extends CCAPI {
    supportsCommand(cmd: IrrigationCommand): Maybe<boolean>;
    getSystemInfo(): Promise<Pick<IrrigationCCSystemInfoReport, "numValves" | "numValveTables" | "supportsMasterValve" | "maxValveTableSize"> | undefined>;
    getSystemStatus(): Promise<Pick<IrrigationCCSystemStatusReport, "systemVoltage" | "flowSensorActive" | "pressureSensorActive" | "rainSensorActive" | "moistureSensorActive" | "flow" | "pressure" | "shutoffDuration" | "errorNotProgrammed" | "errorEmergencyShutdown" | "errorHighPressure" | "errorLowPressure" | "errorValve" | "masterValveOpen" | "firstOpenZoneId"> | undefined>;
    getSystemConfig(): Promise<Pick<IrrigationCCSystemConfigReport, "masterValveDelay" | "rainSensorPolarity" | "moistureSensorPolarity" | "highPressureThreshold" | "lowPressureThreshold"> | undefined>;
    setSystemConfig(config: IrrigationCCSystemConfigSetOptions): Promise<SupervisionResult | undefined>;
    getValveInfo(valveId: ValveId): Promise<Pick<IrrigationCCValveInfoReport, "nominalCurrent" | "errorShortCircuit" | "errorHighCurrent" | "errorLowCurrent" | "errorMaximumFlow" | "errorHighFlow" | "errorLowFlow" | "connected"> | undefined>;
    setValveConfig(options: IrrigationCCValveConfigSetOptions): Promise<SupervisionResult | undefined>;
    getValveConfig(valveId: ValveId): Promise<Pick<IrrigationCCValveConfigReport, "nominalCurrentHighThreshold" | "nominalCurrentLowThreshold" | "maximumFlow" | "highFlowThreshold" | "lowFlowThreshold" | "useRainSensor" | "useMoistureSensor"> | undefined>;
    runValve(valveId: ValveId, duration: number): Promise<SupervisionResult | undefined>;
    shutoffValve(valveId: ValveId): Promise<SupervisionResult | undefined>;
    setValveTable(tableId: number, entries: ValveTableEntry[]): Promise<SupervisionResult | undefined>;
    getValveTable(tableId: number): Promise<ValveTableEntry[] | undefined>;
    runTables(tableIDs: number[]): Promise<SupervisionResult | undefined>;
    /**
     * Shuts off the entire system for the given duration.
     * @param duration Shutoff duration in hours. A value of 255 will shut off the entire system permanently and prevents schedules from running.
     */
    shutoffSystem(duration: number): Promise<SupervisionResult | undefined>;
    /** Shuts off the entire system permanently and prevents schedules from running */
    shutoffSystemPermanently(): Promise<SupervisionResult | undefined>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
}
export declare class IrrigationCC extends CommandClass {
    ccCommand: IrrigationCommand;
    /**
     * Returns the maximum number of valve table entries reported by the node.
     * This only works AFTER the node has been interviewed.
     */
    static getMaxValveTableSizeCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): number | undefined;
    /**
     * Returns the number of zone valves reported by the node.
     * This only works AFTER the node has been interviewed.
     */
    static getNumValvesCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): number | undefined;
    /**
     * Returns whether the node supports a master valve
     * This only works AFTER the node has been interviewed.
     */
    static supportsMasterValveCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): boolean;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    translateProperty(applHost: ZWaveApplicationHost, property: string | number, propertyKey?: string | number): string;
}
export declare class IrrigationCCSystemInfoReport extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly numValves: number;
    readonly numValveTables: number;
    readonly supportsMasterValve: boolean;
    readonly maxValveTableSize: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class IrrigationCCSystemInfoGet extends IrrigationCC {
}
export declare class IrrigationCCSystemStatusReport extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    systemVoltage: number;
    flowSensorActive: boolean;
    pressureSensorActive: boolean;
    rainSensorActive: boolean;
    moistureSensorActive: boolean;
    flow?: number;
    pressure?: number;
    shutoffDuration: number;
    errorNotProgrammed: boolean;
    errorEmergencyShutdown: boolean;
    errorHighPressure: boolean;
    errorLowPressure: boolean;
    errorValve: boolean;
    masterValveOpen: boolean;
    firstOpenZoneId?: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class IrrigationCCSystemStatusGet extends IrrigationCC {
}
export type IrrigationCCSystemConfigSetOptions = {
    masterValveDelay: number;
    highPressureThreshold: number;
    lowPressureThreshold: number;
    rainSensorPolarity?: IrrigationSensorPolarity;
    moistureSensorPolarity?: IrrigationSensorPolarity;
};
export declare class IrrigationCCSystemConfigSet extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (IrrigationCCSystemConfigSetOptions & CCCommandOptions));
    masterValveDelay: number;
    highPressureThreshold: number;
    lowPressureThreshold: number;
    rainSensorPolarity?: IrrigationSensorPolarity;
    moistureSensorPolarity?: IrrigationSensorPolarity;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class IrrigationCCSystemConfigReport extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly masterValveDelay: number;
    readonly highPressureThreshold: number;
    readonly lowPressureThreshold: number;
    readonly rainSensorPolarity?: IrrigationSensorPolarity;
    readonly moistureSensorPolarity?: IrrigationSensorPolarity;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class IrrigationCCSystemConfigGet extends IrrigationCC {
}
export declare class IrrigationCCValveInfoReport extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly valveId: ValveId;
    readonly connected: boolean;
    readonly nominalCurrent: number;
    readonly errorShortCircuit: boolean;
    readonly errorHighCurrent: boolean;
    readonly errorLowCurrent: boolean;
    readonly errorMaximumFlow?: boolean;
    readonly errorHighFlow?: boolean;
    readonly errorLowFlow?: boolean;
    persistValues(applHost: ZWaveApplicationHost): boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export interface IrrigationCCValveInfoGetOptions extends CCCommandOptions {
    valveId: ValveId;
}
export declare class IrrigationCCValveInfoGet extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | IrrigationCCValveInfoGetOptions);
    valveId: ValveId;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export type IrrigationCCValveConfigSetOptions = {
    valveId: ValveId;
    nominalCurrentHighThreshold: number;
    nominalCurrentLowThreshold: number;
    maximumFlow: number;
    highFlowThreshold: number;
    lowFlowThreshold: number;
    useRainSensor: boolean;
    useMoistureSensor: boolean;
};
export declare class IrrigationCCValveConfigSet extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (IrrigationCCValveConfigSetOptions & CCCommandOptions));
    valveId: ValveId;
    nominalCurrentHighThreshold: number;
    nominalCurrentLowThreshold: number;
    maximumFlow: number;
    highFlowThreshold: number;
    lowFlowThreshold: number;
    useRainSensor: boolean;
    useMoistureSensor: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class IrrigationCCValveConfigReport extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    valveId: ValveId;
    nominalCurrentHighThreshold: number;
    nominalCurrentLowThreshold: number;
    maximumFlow: number;
    highFlowThreshold: number;
    lowFlowThreshold: number;
    useRainSensor: boolean;
    useMoistureSensor: boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface IrrigationCCValveConfigGetOptions extends CCCommandOptions {
    valveId: ValveId;
}
export declare class IrrigationCCValveConfigGet extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | IrrigationCCValveConfigGetOptions);
    valveId: ValveId;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface IrrigationCCValveRunOptions extends CCCommandOptions {
    valveId: ValveId;
    duration: number;
}
export declare class IrrigationCCValveRun extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | IrrigationCCValveRunOptions);
    valveId: ValveId;
    duration: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface IrrigationCCValveTableSetOptions extends CCCommandOptions {
    tableId: number;
    entries: ValveTableEntry[];
}
export declare class IrrigationCCValveTableSet extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | IrrigationCCValveTableSetOptions);
    tableId: number;
    entries: ValveTableEntry[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class IrrigationCCValveTableReport extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly tableId: number;
    readonly entries: ValveTableEntry[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface IrrigationCCValveTableGetOptions extends CCCommandOptions {
    tableId: number;
}
export declare class IrrigationCCValveTableGet extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | IrrigationCCValveTableGetOptions);
    tableId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface IrrigationCCValveTableRunOptions extends CCCommandOptions {
    tableIDs: number[];
}
export declare class IrrigationCCValveTableRun extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | IrrigationCCValveTableRunOptions);
    tableIDs: number[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface IrrigationCCSystemShutoffOptions extends CCCommandOptions {
    /**
     * The duration in minutes the system must stay off.
     * 255 or `undefined` will prevent schedules from running.
     */
    duration?: number;
}
export declare class IrrigationCCSystemShutoff extends IrrigationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | IrrigationCCSystemShutoffOptions);
    duration?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=IrrigationCC.d.ts.map