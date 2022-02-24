import {
	CommandClasses,
	encodeFloatWithScale,
	enumValuesToMetadataStates,
	Maybe,
	parseFloatWithScale,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
import { padStart } from "alcalzone-shared/strings";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

// All the supported commands
export enum IrrigationCommand {
	SystemInfoGet = 0x01,
	SystemInfoReport = 0x02,
	SystemStatusGet = 0x03,
	SystemStatusReport = 0x04,
	SystemConfigSet = 0x05,
	SystemConfigGet = 0x06,
	SystemConfigReport = 0x07,
	ValveInfoGet = 0x08,
	ValveInfoReport = 0x09,
	ValveConfigSet = 0x0a,
	ValveConfigGet = 0x0b,
	ValveConfigReport = 0x0c,
	ValveRun = 0x0d,
	ValveTableSet = 0x0e,
	ValveTableGet = 0x0f,
	ValveTableReport = 0x10,
	ValveTableRun = 0x11,
	SystemShutoff = 0x12,
}

// @publicAPI
export enum IrrigationSensorPolarity {
	Low = 0,
	High = 1,
}

// @publicAPI
export enum ValveType {
	ZoneValve = 0,
	MasterValve = 1,
}

// @publicAPI
export type ValveId =
	| {
			masterValve: true;
			valveId?: undefined;
	  }
	| {
			masterValve: false;
			valveId: number;
	  };

function testResponseForIrrigationCommandWithValveId(
	sent: {
		masterValve: boolean;
		valveId?: number;
	},
	received: {
		masterValve: boolean;
		valveId?: number;
	},
) {
	if (received.masterValve !== sent.masterValve) {
		return false;
	} else if (received.masterValve) {
		// implies both are master valve
		return true;
	} else {
		return received.valveId === sent.valveId;
	}
}

function valveIdToProperty(valveId: ValveId): string {
	if (valveId.masterValve) return "masterValve";
	return `valve${padStart(valveId.valveId.toString(), 3, "0")}`;
}

function valveIdToMetadataPrefix(valveId: ValveId): string {
	if (valveId.masterValve) return "Master valve";
	return `Valve ${padStart(valveId.valveId.toString(), 3, "0")}`;
}

// @publicAPI
export interface ValveTableEntry {
	valveId: number;
	duration: number;
}

export function getMaxValveTableSizeValueId(endpointIndex?: number): ValueID {
	return {
		commandClass: CommandClasses.Irrigation,
		endpoint: endpointIndex,
		property: "maxValveTableSize",
	};
}

export function getValveConnectedValueId(
	valveId: ValveId,
	endpointIndex?: number,
): ValueID {
	return {
		commandClass: CommandClasses.Irrigation,
		endpoint: endpointIndex,
		property: valveIdToProperty(valveId),
		propertyKey: "connected",
	};
}

export function getValveConnectedValueMetadata(
	valveId: ValveId,
): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyBoolean,
		label: `${valveIdToMetadataPrefix(valveId)}: Connected`,
	};
}

export function getValveNominalCurrentValueId(
	valveId: ValveId,
	endpointIndex?: number,
): ValueID {
	return {
		commandClass: CommandClasses.Irrigation,
		endpoint: endpointIndex,
		property: valveIdToProperty(valveId),
		propertyKey: "nominalCurrent",
	};
}

export function getValveNominalCurrentValueMetadata(
	valveId: ValveId,
): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyBoolean,
		label: `${valveIdToMetadataPrefix(valveId)}: Nominal current`,
		unit: "mA",
	};
}

export function getValveErrorShortCircuitValueId(
	valveId: ValveId,
	endpointIndex?: number,
): ValueID {
	return {
		commandClass: CommandClasses.Irrigation,
		endpoint: endpointIndex,
		property: valveIdToProperty(valveId),
		propertyKey: "errorShortCircuit",
	};
}

export function getValveErrorShortCircuitValueMetadata(
	valveId: ValveId,
): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyBoolean,
		label: `${valveIdToMetadataPrefix(
			valveId,
		)}: Error - Short circuit detected`,
	};
}

export function getValveErrorHighCurrentValueId(
	valveId: ValveId,
	endpointIndex?: number,
): ValueID {
	return {
		commandClass: CommandClasses.Irrigation,
		endpoint: endpointIndex,
		property: valveIdToProperty(valveId),
		propertyKey: "errorHighCurrent",
	};
}

export function getValveErrorHighCurrentValueMetadata(
	valveId: ValveId,
): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyBoolean,
		label: `${valveIdToMetadataPrefix(
			valveId,
		)}: Error - Current above high threshold`,
	};
}

export function getValveErrorLowCurrentValueId(
	valveId: ValveId,
	endpointIndex?: number,
): ValueID {
	return {
		commandClass: CommandClasses.Irrigation,
		endpoint: endpointIndex,
		property: valveIdToProperty(valveId),
		propertyKey: "errorLowCurrent",
	};
}

export function getValveErrorLowCurrentValueMetadata(
	valveId: ValveId,
): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyBoolean,
		label: `${valveIdToMetadataPrefix(
			valveId,
		)}: Error - Current below low threshold`,
	};
}

export function getValveErrorMaximumFlowValueId(
	valveId: ValveId,
	endpointIndex?: number,
): ValueID {
	return {
		commandClass: CommandClasses.Irrigation,
		endpoint: endpointIndex,
		property: valveIdToProperty(valveId),
		propertyKey: "errorMaximumFlow",
	};
}

export function getValveErrorMaximumFlowValueMetadata(
	valveId: ValveId,
): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyBoolean,
		label: `${valveIdToMetadataPrefix(
			valveId,
		)}: Error - Maximum flow detected`,
	};
}

export function getValveErrorHighFlowValueId(
	valveId: ValveId,
	endpointIndex?: number,
): ValueID {
	return {
		commandClass: CommandClasses.Irrigation,
		endpoint: endpointIndex,
		property: valveIdToProperty(valveId),
		propertyKey: "errorHighFlow",
	};
}

export function getValveErrorHighFlowValueMetadata(
	valveId: ValveId,
): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyBoolean,
		label: `${valveIdToMetadataPrefix(
			valveId,
		)}: Error - Flow above high threshold`,
	};
}

export function getValveErrorLowFlowValueId(
	valveId: ValveId,
	endpointIndex?: number,
): ValueID {
	return {
		commandClass: CommandClasses.Irrigation,
		endpoint: endpointIndex,
		property: valveIdToProperty(valveId),
		propertyKey: "errorLowFlow",
	};
}

export function getValveErrorLowFlowValueMetadata(
	valveId: ValveId,
): ValueMetadata {
	return {
		...ValueMetadata.ReadOnlyBoolean,
		label: `${valveIdToMetadataPrefix(
			valveId,
		)}: Error - Flow below high threshold`,
	};
}

// export function getNumValvesValueId(endpointIndex?: number): ValueID {
// 	return {
// 		commandClass: CommandClasses.Irrigation,
// 		endpoint: endpointIndex,
// 		property: "numValves",
// 	};
// }

// export function getNumValveTablesValueId(endpointIndex?: number): ValueID {
// 	return {
// 		commandClass: CommandClasses.Irrigation,
// 		endpoint: endpointIndex,
// 		property: "numValveTables",
// 	};
// }

// export function getSupportsMasterValveValueId(endpointIndex?: number): ValueID {
// 	return {
// 		commandClass: CommandClasses.Irrigation,
// 		endpoint: endpointIndex,
// 		property: "supportsMasterValve",
// 	};
// }

@API(CommandClasses.Irrigation)
export class IrrigationCCAPI extends CCAPI {
	public supportsCommand(cmd: IrrigationCommand): Maybe<boolean> {
		switch (cmd) {
			case IrrigationCommand.SystemInfoGet:
			case IrrigationCommand.SystemStatusGet:
			case IrrigationCommand.SystemConfigSet:
			case IrrigationCommand.SystemConfigGet:
			case IrrigationCommand.ValveInfoGet:
			case IrrigationCommand.ValveConfigSet:
			case IrrigationCommand.ValveConfigGet:
			case IrrigationCommand.ValveRun:
			case IrrigationCommand.ValveTableSet:
			case IrrigationCommand.ValveTableGet:
			case IrrigationCommand.ValveTableRun:
			case IrrigationCommand.SystemShutoff:
				// These are all mandatory in V1
				return true;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSystemInfo() {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.SystemInfoGet,
		);

		const cc = new IrrigationCCSystemInfoGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<IrrigationCCSystemInfoReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"numValves",
				"numValveTables",
				"supportsMasterValve",
				"maxValveTableSize",
			]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSystemStatus() {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.SystemStatusGet,
		);

		const cc = new IrrigationCCSystemStatusGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<IrrigationCCSystemStatusReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"systemVoltage",
				"flowSensorActive",
				"pressureSensorActive",
				"rainSensorActive",
				"moistureSensorActive",
				"flow",
				"pressure",
				"shutoffDuration",
				"errorNotProgrammed",
				"errorEmergencyShutdown",
				"errorHighPressure",
				"errorLowPressure",
				"errorValve",
				"masterValveOpen",
				"firstOpenZoneId",
			]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSystemConfig() {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.SystemConfigGet,
		);

		const cc = new IrrigationCCSystemConfigGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<IrrigationCCSystemConfigReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"masterValveDelay",
				"highPressureThreshold",
				"lowPressureThreshold",
				"rainSensorPolarity",
				"moistureSensorPolarity",
			]);
		}
	}

	public async setSystemConfig(
		config: IrrigationCCSystemConfigSetOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.SystemConfigSet,
		);

		const cc = new IrrigationCCSystemConfigSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...config,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getValveInfo(valveId: ValveId) {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveInfoGet,
		);

		const cc = new IrrigationCCValveInfoGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...valveId,
		});
		const response =
			await this.driver.sendCommand<IrrigationCCValveInfoReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"connected",
				"nominalCurrent",
				"errorShortCircuit",
				"errorHighCurrent",
				"errorLowCurrent",
				"errorMaximumFlow",
				"errorHighFlow",
				"errorLowFlow",
			]);
		}
	}

	public async setValveConfig(
		options: IrrigationCCValveConfigSetOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveConfigSet,
		);

		const cc = new IrrigationCCValveConfigSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getValveConfig(valveId: ValveId) {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveConfigGet,
		);

		const cc = new IrrigationCCValveConfigGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...valveId,
		});
		const response =
			await this.driver.sendCommand<IrrigationCCValveConfigReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"nominalCurrentHighThreshold",
				"nominalCurrentLowThreshold",
				"maximumFlow",
				"highFlowThreshold",
				"lowFlowThreshold",
				"useRainSensor",
				"useMoistureSensor",
			]);
		}
	}

	public async runValve(valveId: ValveId, duration: number): Promise<void> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveRun,
		);

		const cc = new IrrigationCCValveRun(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...valveId,
			duration,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public shutoffValve(valveId: ValveId): Promise<void> {
		return this.runValve(valveId, 0);
	}

	public async setValveTable(
		tableId: number,
		entries: ValveTableEntry[],
	): Promise<void> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveTableSet,
		);

		const cc = new IrrigationCCValveTableSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			tableId,
			entries,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getValveTable(
		tableId: number,
	): Promise<ValveTableEntry[] | undefined> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveTableGet,
		);

		const cc = new IrrigationCCValveTableGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			tableId,
		});
		const response =
			await this.driver.sendCommand<IrrigationCCValveTableReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return response?.entries;
		}
	}

	public async runTables(tableIDs: number[]): Promise<void> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveTableRun,
		);

		const cc = new IrrigationCCValveTableRun(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			tableIDs,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Shuts off the entire system for the given duration.
	 * @param duration Shutoff duration in hours. A value of 255 will shut off the entire system permanently and prevents schedules from running.
	 */
	public async shutoffSystem(duration: number): Promise<void> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.SystemShutoff,
		);

		const cc = new IrrigationCCSystemShutoff(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			duration,
		});

		await this.driver.sendCommand(cc, this.commandOptions);
	}

	/** Shuts off the entire system permanently and prevents schedules from running */
	public shutoffSystemPermanently(): Promise<void> {
		return this.shutoffSystem(255);
	}
}

@commandClass(CommandClasses.Irrigation)
@implementedVersion(1)
export class IrrigationCC extends CommandClass {
	declare ccCommand: IrrigationCommand;

	/**
	 * Returns the maximum number of valve table entries reported by the node.
	 * This only works AFTER the node has been interviewed.
	 */
	protected getMaxValveTableSizeCached(): number {
		return (
			this.getValueDB().getValue(
				getMaxValveTableSizeValueId(this.endpointIndex),
			) || 0
		);
	}

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Irrigation.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "Querying irrigation system info...",
			direction: "outbound",
		});

		const systemInfo = await api.getSystemInfo();
		if (!systemInfo) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Time out while querying irrigation system info, skipping interview...",
				level: "warn",
			});
			return;
		}
		const logMessage = `received irrigation system info:
supports master valve: ${systemInfo.supportsMasterValve}
no. of valves:         ${systemInfo.numValves}
no. of valve tables:   ${systemInfo.numValveTables}
max. valve table size: ${systemInfo.maxValveTableSize}`;
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: logMessage,
			direction: "inbound",
		});

		// Query current values
		await this.refreshValues();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		// TODO:
	}
}

@CCCommand(IrrigationCommand.SystemInfoReport)
export class IrrigationCCSystemInfoReport extends IrrigationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 4);
		this.supportsMasterValve = !!(this.payload[0] & 0x01);
		this.numValves = this.payload[1];
		this.numValveTables = this.payload[2];
		this.maxValveTableSize = this.payload[3] & 0b1111;

		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly numValves: number;

	@ccValue({ internal: true })
	public readonly numValveTables: number;

	@ccValue({ internal: true })
	public readonly supportsMasterValve: boolean;

	@ccValue({ internal: true })
	public readonly maxValveTableSize: number;
}

@CCCommand(IrrigationCommand.SystemInfoGet)
@expectedCCResponse(IrrigationCCSystemInfoReport)
export class IrrigationCCSystemInfoGet extends IrrigationCC {}

@CCCommand(IrrigationCommand.SystemStatusReport)
export class IrrigationCCSystemStatusReport extends IrrigationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this.systemVoltage = this.payload[0];
		this.flowSensorActive = !!(this.payload[1] & 0x01);
		this.pressureSensorActive = !!(this.payload[1] & 0x02);
		this.rainSensorActive = !!(this.payload[1] & 0x04);
		this.moistureSensorActive = !!(this.payload[1] & 0x08);

		let offset: number;
		if (!this.flowSensorActive) {
			validatePayload(this.payload[2] === 1);
			offset = 4;
		} else {
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(2),
			);
			validatePayload(scale === 0);
			this.flow = value;
			offset = bytesRead + 2;
		}
		if (!this.pressureSensorActive) {
			validatePayload(this.payload[offset] === 1);
			offset += 2;
		} else {
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(2),
			);
			validatePayload(scale === 0);
			this.pressure = value;
			offset += bytesRead;
		}

		validatePayload(this.payload.length >= offset + 4);
		this.shutoffDuration = this.payload[offset];
		this.errorNotProgrammed = !!(this.payload[offset + 1] & 0x01);
		this.errorEmergencyShutdown = !!(this.payload[offset + 1] & 0x02);
		this.errorHighPressure = !!(this.payload[offset + 1] & 0x04);
		this.errorLowPressure = !!(this.payload[offset + 1] & 0x08);
		this.errorValve = !!(this.payload[offset + 1] & 0x10);
		this.masterValveOpen = !!(this.payload[offset + 2] & 0x01);
		if (this.payload[offset + 3]) {
			this.firstOpenZoneId = this.payload[offset + 3];
		}

		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "System voltage",
		unit: "V",
	})
	public systemVoltage: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Flow sensor active",
	})
	public flowSensorActive: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Pressure sensor active",
	})
	public pressureSensorActive: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Rain sensor attached and active",
	})
	public rainSensorActive: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Moisture sensor attached and active",
	})
	public moistureSensorActive: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyNumber,
		label: "Flow",
		unit: "l/h",
	})
	public flow?: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyNumber,
		label: "Pressure",
		unit: "kPa",
	})
	public pressure?: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Remaining shutoff duration",
		unit: "hours",
	})
	public shutoffDuration: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: device not programmed",
	})
	public errorNotProgrammed: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: emergency shutdown",
	})
	public errorEmergencyShutdown: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: high pressure",
	})
	public errorHighPressure: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: low pressure",
	})
	public errorLowPressure: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: valve reporting error",
	})
	public errorValve: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Master valve is open",
	})
	public masterValveOpen: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyNumber,
		label: "First open zone valve ID",
	})
	public firstOpenZoneId?: number;
}

@CCCommand(IrrigationCommand.SystemStatusGet)
@expectedCCResponse(IrrigationCCSystemStatusReport)
export class IrrigationCCSystemStatusGet extends IrrigationCC {}

// @publicAPI
export type IrrigationCCSystemConfigSetOptions = {
	masterValveDelay: number;
	highPressureThreshold: number;
	lowPressureThreshold: number;
	rainSensorPolarity?: IrrigationSensorPolarity;
	moistureSensorPolarity?: IrrigationSensorPolarity;
};

@CCCommand(IrrigationCommand.SystemConfigSet)
export class IrrigationCCSystemConfigSet extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (IrrigationCCSystemConfigSetOptions & CCCommandOptions),
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.masterValveDelay = options.masterValveDelay;
			this.highPressureThreshold = options.highPressureThreshold;
			this.lowPressureThreshold = options.lowPressureThreshold;
			this.rainSensorPolarity = options.rainSensorPolarity;
			this.moistureSensorPolarity = options.moistureSensorPolarity;
		}
	}

	public masterValveDelay: number;
	public highPressureThreshold: number;
	public lowPressureThreshold: number;
	public rainSensorPolarity?: IrrigationSensorPolarity;
	public moistureSensorPolarity?: IrrigationSensorPolarity;

	public serialize(): Buffer {
		let polarity = 0;
		if (this.rainSensorPolarity != undefined) polarity |= 0b1;
		if (this.moistureSensorPolarity != undefined) polarity |= 0b10;
		if (
			this.rainSensorPolarity == undefined &&
			this.moistureSensorPolarity == undefined
		) {
			// Valid bit
			polarity |= 0b1000_0000;
		}
		this.payload = Buffer.concat([
			Buffer.from([this.masterValveDelay]),
			encodeFloatWithScale(this.highPressureThreshold, 0 /* kPa */),
			encodeFloatWithScale(this.lowPressureThreshold, 0 /* kPa */),
			Buffer.from([polarity]),
		]);
		return super.serialize();
	}
}

@CCCommand(IrrigationCommand.SystemConfigReport)
export class IrrigationCCSystemConfigReport extends IrrigationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this.masterValveDelay = this.payload[0];
		let offset = 1;
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(offset),
			);
			validatePayload(scale === 0 /* kPa */);
			this.highPressureThreshold = value;
			offset += bytesRead;
		}
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(offset),
			);
			validatePayload(scale === 0 /* kPa */);
			this.lowPressureThreshold = value;
			offset += bytesRead;
		}
		validatePayload(this.payload.length >= offset + 1);
		const polarity = this.payload[offset];
		if (!!(polarity & 0b1000_0000)) {
			// The valid bit is set
			this.rainSensorPolarity = polarity & 0b1;
			this.moistureSensorPolarity = polarity & 0b10;
		}
		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		label: "Master valve delay",
		description:
			"The delay between turning on the master valve and turning on any zone valve",
		unit: "seconds",
	})
	public readonly masterValveDelay: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Number,
		label: "High pressure threshold",
		unit: "kPa",
	})
	public readonly highPressureThreshold: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Number,
		label: "Low pressure threshold",
		unit: "kPa",
	})
	public readonly lowPressureThreshold: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Number,
		label: "Rain sensor polarity",
		min: 0,
		max: 1,
		states: enumValuesToMetadataStates(IrrigationSensorPolarity),
	})
	public readonly rainSensorPolarity?: IrrigationSensorPolarity;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Number,
		label: "Moisture sensor polarity",
		min: 0,
		max: 1,
		states: enumValuesToMetadataStates(IrrigationSensorPolarity),
	})
	public readonly moistureSensorPolarity?: IrrigationSensorPolarity;
}

@CCCommand(IrrigationCommand.SystemConfigGet)
@expectedCCResponse(IrrigationCCSystemConfigReport)
export class IrrigationCCSystemConfigGet extends IrrigationCC {}

@CCCommand(IrrigationCommand.ValveInfoReport)
export class IrrigationCCValveInfoReport extends IrrigationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 4);
		this.masterValve = (this.payload[0] & 0b1) === ValveType.MasterValve;
		if (!this.masterValve) {
			this.valveId = this.payload[1];
		}

		this.connected = !!(this.payload[0] & 0b10);
		this.nominalCurrent = 10 * this.payload[2];
		this.errorShortCircuit = !!(this.payload[3] & 0b1);
		this.errorHighCurrent = !!(this.payload[3] & 0b10);
		this.errorLowCurrent = !!(this.payload[3] & 0b100);
		if (this.masterValve) {
			this.errorMaximumFlow = !!(this.payload[3] & 0b1000);
			this.errorHighFlow = !!(this.payload[3] & 0b1_0000);
			this.errorLowFlow = !!(this.payload[3] & 0b10_0000);
		}

		this.persistValues();
	}

	public readonly masterValve: boolean;
	public readonly valveId?: number;

	public readonly connected: boolean;
	public readonly nominalCurrent: number;
	public readonly errorShortCircuit: boolean;
	public readonly errorHighCurrent: boolean;
	public readonly errorLowCurrent: boolean;
	public readonly errorMaximumFlow?: boolean;
	public readonly errorHighFlow?: boolean;
	public readonly errorLowFlow?: boolean;

	public persistValues(): boolean {
		if (!super.persistValues()) return false;

		const valueDB = this.getValueDB();
		const valveId = {
			masterValve: this.masterValve,
			valveId: this.valveId,
		} as ValveId;

		// connected
		let valueId = getValveConnectedValueId(valveId, this.endpointIndex);
		if (!valueDB.hasMetadata(valueId)) {
			valueDB.setMetadata(
				valueId,
				getValveConnectedValueMetadata(valveId),
			);
		}

		// nominalCurrent
		valueId = getValveNominalCurrentValueId(valveId, this.endpointIndex);
		if (!valueDB.hasMetadata(valueId)) {
			valueDB.setMetadata(
				valueId,
				getValveNominalCurrentValueMetadata(valveId),
			);
		}

		// errorShortCircuit
		valueId = getValveErrorShortCircuitValueId(valveId, this.endpointIndex);
		if (!valueDB.hasMetadata(valueId)) {
			valueDB.setMetadata(
				valueId,
				getValveErrorShortCircuitValueMetadata(valveId),
			);
		}

		// errorHighCurrent
		valueId = getValveErrorHighCurrentValueId(valveId, this.endpointIndex);
		if (!valueDB.hasMetadata(valueId)) {
			valueDB.setMetadata(
				valueId,
				getValveErrorHighCurrentValueMetadata(valveId),
			);
		}

		// errorLowCurrent
		valueId = getValveErrorLowCurrentValueId(valveId, this.endpointIndex);
		if (!valueDB.hasMetadata(valueId)) {
			valueDB.setMetadata(
				valueId,
				getValveErrorLowCurrentValueMetadata(valveId),
			);
		}

		if (this.errorMaximumFlow != undefined) {
			valueId = getValveErrorMaximumFlowValueId(
				valveId,
				this.endpointIndex,
			);
			if (!valueDB.hasMetadata(valueId)) {
				valueDB.setMetadata(
					valueId,
					getValveErrorMaximumFlowValueMetadata(valveId),
				);
			}
		}

		if (this.errorHighFlow != undefined) {
			valueId = getValveErrorHighFlowValueId(valveId, this.endpointIndex);
			if (!valueDB.hasMetadata(valueId)) {
				valueDB.setMetadata(
					valueId,
					getValveErrorHighFlowValueMetadata(valveId),
				);
			}
		}

		if (this.errorLowFlow != undefined) {
			valueId = getValveErrorLowFlowValueId(valveId, this.endpointIndex);
			if (!valueDB.hasMetadata(valueId)) {
				valueDB.setMetadata(
					valueId,
					getValveErrorLowFlowValueMetadata(valveId),
				);
			}
		}

		return true;
	}
}

type IrrigationCCValveInfoGetOptions = ValveId & CCCommandOptions;

@CCCommand(IrrigationCommand.ValveInfoGet)
@expectedCCResponse(
	IrrigationCCValveInfoReport,
	testResponseForIrrigationCommandWithValveId as any,
)
export class IrrigationCCValveInfoGet extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveInfoGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.masterValve = options.masterValve;
			this.valveId = options.valveId;
		}
	}

	public masterValve: boolean;
	public valveId?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.masterValve ? 1 : 0,
			this.masterValve ? 1 : this.valveId || 1,
		]);
		return super.serialize();
	}
}

// @publicAPI
export type IrrigationCCValveConfigSetOptions = ValveId & {
	nominalCurrentHighThreshold: number;
	nominalCurrentLowThreshold: number;
	maximumFlow: number;
	highFlowThreshold: number;
	lowFlowThreshold: number;
	useRainSensor: boolean;
	useMoistureSensor: boolean;
};

@CCCommand(IrrigationCommand.ValveConfigSet)
export class IrrigationCCValveConfigSet extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (IrrigationCCValveConfigSetOptions & CCCommandOptions),
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.masterValve = options.masterValve;
			this.valveId = options.valveId;
			this.nominalCurrentHighThreshold =
				options.nominalCurrentHighThreshold;
			this.nominalCurrentLowThreshold =
				options.nominalCurrentLowThreshold;
			this.maximumFlow = options.maximumFlow;
			this.highFlowThreshold = options.highFlowThreshold;
			this.lowFlowThreshold = options.lowFlowThreshold;
			this.useRainSensor = options.useRainSensor;
			this.useMoistureSensor = options.useMoistureSensor;
		}
	}

	public masterValve: boolean;
	public valveId?: number;
	public nominalCurrentHighThreshold: number;
	public nominalCurrentLowThreshold: number;
	public maximumFlow: number;
	public highFlowThreshold: number;
	public lowFlowThreshold: number;
	public useRainSensor: boolean;
	public useMoistureSensor: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([
				this.masterValve ? 1 : 0,
				this.masterValve ? 1 : this.valveId || 1,
				Math.floor(this.nominalCurrentHighThreshold / 10),
				Math.floor(this.nominalCurrentLowThreshold / 10),
			]),
			encodeFloatWithScale(this.maximumFlow, 0 /* l/h */),
			encodeFloatWithScale(this.highFlowThreshold, 0 /* l/h */),
			encodeFloatWithScale(this.lowFlowThreshold, 0 /* l/h */),
			Buffer.from([
				(this.useRainSensor ? 0b1 : 0) |
					(this.useMoistureSensor ? 0b10 : 0),
			]),
		]);
		return super.serialize();
	}
}

@CCCommand(IrrigationCommand.ValveConfigReport)
export class IrrigationCCValveConfigReport extends IrrigationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 4);
		this.masterValve = !!(this.payload[0] & 0b1);
		if (!this.masterValve) this.valveId = this.payload[1];
		this.nominalCurrentHighThreshold = 10 * this.payload[2];
		this.nominalCurrentLowThreshold = 10 * this.payload[3];

		let offset = 4;
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(offset),
			);
			validatePayload(scale === 0 /* l/h */);
			this.maximumFlow = value;
			offset += bytesRead;
		}
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(offset),
			);
			validatePayload(scale === 0 /* l/h */);
			this.highFlowThreshold = value;
			offset += bytesRead;
		}
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(offset),
			);
			validatePayload(scale === 0 /* l/h */);
			this.lowFlowThreshold = value;
			offset += bytesRead;
		}
		validatePayload(this.payload.length >= offset + 1);
		this.useRainSensor = !!(this.payload[offset] & 0b1);
		this.useMoistureSensor = !!(this.payload[offset] & 0b10);

		this.persistValues();
	}

	public masterValve: boolean;
	public valveId?: number;
	public nominalCurrentHighThreshold: number;
	public nominalCurrentLowThreshold: number;
	public maximumFlow: number;
	public highFlowThreshold: number;
	public lowFlowThreshold: number;
	public useRainSensor: boolean;
	public useMoistureSensor: boolean;
}

type IrrigationCCValveConfigGetOptions = ValveId & CCCommandOptions;

@CCCommand(IrrigationCommand.ValveConfigGet)
@expectedCCResponse(
	IrrigationCCValveConfigReport,
	testResponseForIrrigationCommandWithValveId as any,
)
export class IrrigationCCValveConfigGet extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveConfigGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.masterValve = options.masterValve;
			this.valveId = options.valveId;
		}
	}

	public masterValve: boolean;
	public valveId?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.masterValve ? 1 : 0,
			this.masterValve ? 1 : this.valveId || 1,
		]);
		return super.serialize();
	}
}

type IrrigationCCValveRunOptions = ValveId & {
	duration: number;
};

@CCCommand(IrrigationCommand.ValveRun)
export class IrrigationCCValveRun extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (IrrigationCCValveRunOptions & CCCommandOptions),
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.masterValve = options.masterValve;
			this.valveId = options.valveId;
			this.duration = options.duration;
		}
	}

	public masterValve: boolean;
	public valveId?: number;
	public duration: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.masterValve ? 1 : 0,
			this.masterValve ? 1 : this.valveId || 1,
			0,
			0,
		]);
		this.payload.writeUInt16BE(this.duration, 2);
		return super.serialize();
	}
}

interface IrrigationCCValveTableSetOptions extends CCCommandOptions {
	tableId: number;
	entries: ValveTableEntry[];
}

@CCCommand(IrrigationCommand.ValveTableSet)
export class IrrigationCCValveTableSet extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveTableSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.tableId = options.tableId;
			this.entries = options.entries;

			const maxValveTableSize = this.getMaxValveTableSizeCached();
			if (this.entries.length > maxValveTableSize) {
				throw new ZWaveError(
					`${this.constructor.name}: The number of valve table entries must not exceed ${maxValveTableSize}.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}
	}

	public tableId: number;
	public entries: ValveTableEntry[];

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(1 + this.entries.length * 3);
		this.payload[0] = this.tableId;
		for (let i = 0; i < this.entries.length; i++) {
			const entry = this.entries[i];
			const offset = 1 + i * 3;
			this.payload[offset] = entry.valveId;
			this.payload.writeUInt16BE(entry.duration, offset + 1);
		}
		return super.serialize();
	}
}

@CCCommand(IrrigationCommand.ValveTableReport)
export class IrrigationCCValveTableReport extends IrrigationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload((this.payload.length - 1) % 3 === 0);
		this.tableId = this.payload[0];
		this.entries = [];
		for (let offset = 1; offset < this.payload.length; offset += 3) {
			this.entries.push({
				valveId: this.payload[offset],
				duration: this.payload.readUInt16BE(offset + 1),
			});
		}
		this.persistValues();
	}

	public readonly tableId: number;
	public readonly entries: ValveTableEntry[];
}

interface IrrigationCCValveTableGetOptions extends CCCommandOptions {
	tableId: number;
}

function testResponseForIrrigationValveTableGet(
	sent: IrrigationCCValveTableGet,
	received: IrrigationCCValveTableReport,
) {
	return received.tableId === sent.tableId;
}

@CCCommand(IrrigationCommand.ValveTableGet)
@expectedCCResponse(
	IrrigationCCValveTableReport,
	testResponseForIrrigationValveTableGet,
)
export class IrrigationCCValveTableGet extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveTableGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.tableId = options.tableId;
		}
	}

	public tableId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.tableId]);
		return super.serialize();
	}
}

interface IrrigationCCValveTableRunOptions extends CCCommandOptions {
	tableIDs: number[];
}

@CCCommand(IrrigationCommand.ValveTableRun)
export class IrrigationCCValveTableRun extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveTableRunOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.tableIDs = options.tableIDs;
			if (this.tableIDs.length < 1) {
				throw new ZWaveError(
					`${this.constructor.name}: At least one table ID must be specified.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}
	}

	public tableIDs: number[];

	public serialize(): Buffer {
		this.payload = Buffer.from(this.tableIDs);
		return super.serialize();
	}
}

interface IrrigationCCSystemShutoffOptions extends CCCommandOptions {
	/**
	 * The duration in minutes the system must stay off.
	 * 255 or `undefined` will prevent schedules from running.
	 */
	duration?: number;
}

@CCCommand(IrrigationCommand.SystemShutoff)
export class IrrigationCCSystemShutoff extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCSystemShutoffOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.duration = options.duration;
		}
	}

	public duration?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.duration ?? 255]);
		return super.serialize();
	}
}
