import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { ValueID } from "../node/ValueDB";
import { getEnumMemberName, validatePayload } from "../util/misc";
import { CCAPI } from "./API";
import { getGroupCountValueId } from "./AssociationCC";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	CommandClassOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	parseCCId,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum AssociationGroupInfoCommand {
	NameGet = 0x01,
	NameReport = 0x02,
	InfoGet = 0x03,
	InfoReport = 0x04,
	CommandListGet = 0x05,
	CommandListReport = 0x06,
}

// TODO: Check if this should be in a config file instead
export enum AssociationGroupInfoProfile {
	"General: N/A" = 0x00_00,
	"General: Lifeline" = 0x00_01,

	"Control: Key 01" = 0x20_01,
	"Control: Key 02",
	"Control: Key 03",
	"Control: Key 04",
	"Control: Key 05",
	"Control: Key 06",
	"Control: Key 07",
	"Control: Key 08",
	"Control: Key 09",
	"Control: Key 10",
	"Control: Key 11",
	"Control: Key 12",
	"Control: Key 13",
	"Control: Key 14",
	"Control: Key 15",
	"Control: Key 16",
	"Control: Key 17",
	"Control: Key 18",
	"Control: Key 19",
	"Control: Key 20",
	"Control: Key 21",
	"Control: Key 22",
	"Control: Key 23",
	"Control: Key 24",
	"Control: Key 25",
	"Control: Key 26",
	"Control: Key 27",
	"Control: Key 28",
	"Control: Key 29",
	"Control: Key 30",
	"Control: Key 31",
	"Control: Key 32",

	"Sensor: Air temperature" = 0x31_01,
	"Sensor: General purpose",
	"Sensor: Illuminance",
	"Sensor: Power",
	"Sensor: Humidity",
	"Sensor: Velocity",
	"Sensor: Direction",
	"Sensor: Atmospheric pressure",
	"Sensor: Barometric pressure",
	"Sensor: Solar radiation",
	"Sensor: Dew point",
	"Sensor: Rain rate",
	"Sensor: Tide level",
	"Sensor: Weight",
	"Sensor: Voltage",
	"Sensor: Current",
	"Sensor: Carbon dioxide (CO2) level",
	"Sensor: Air flow",
	"Sensor: Tank capacity",
	"Sensor: Distance",
	"Sensor: Angle position",
	"Sensor: Rotation",
	"Sensor: Water temperature",
	"Sensor: Soil temperature",
	"Sensor: Seismic Intensity",
	"Sensor: Seismic magnitude",
	"Sensor: Ultraviolet",
	"Sensor: Electrical resistivity",
	"Sensor: Electrical conductivity",
	"Sensor: Loudness",
	"Sensor: Moisture",
	"Sensor: Frequency",
	"Sensor: Time",
	"Sensor: Target temperature",
	"Sensor: Particulate Matter 2.5",
	"Sensor: Formaldehyde (CH2O) level",
	"Sensor: Radon concentration",
	"Sensor: Methane (CH4) density",
	"Sensor: Volatile Organic Compound level",
	"Sensor: Carbon monoxide (CO) level",
	"Sensor: Soil humidity",
	"Sensor: Soil reactivity",
	"Sensor: Soil salinity",
	"Sensor: Heart rate",
	"Sensor: Blood pressure",
	"Sensor: Muscle mass",
	"Sensor: Fat mass",
	"Sensor: Bone mass",
	"Sensor: Total body water (TBW)",
	"Sensor: Basis metabolic rate (BMR)",
	"Sensor: Body Mass Index (BMI)",
	"Sensor: Acceleration X-axis",
	"Sensor: Acceleration Y-axis",
	"Sensor: Acceleration Z-axis",
	"Sensor: Smoke density",
	"Sensor: Water flow",
	"Sensor: Water pressure",
	"Sensor: RF signal strength",
	"Sensor: Particulate Matter 10",
	"Sensor: Respiratory rate",
	"Sensor: Relative Modulation level",
	"Sensor: Boiler water temperature",
	"Sensor: Domestic Hot Water (DHW) temperature",
	"Sensor: Outside temperature",
	"Sensor: Exhaust temperature",
	"Sensor: Water Chlorine level",
	"Sensor: Water acidity",
	"Sensor: Water Oxidation reduction potential",
	"Sensor: Heart Rate LF/HF ratio",
	"Sensor: Motion Direction",
	"Sensor: Applied force on the sensor",
	"Sensor: Return Air temperature",
	"Sensor: Supply Air temperature",
	"Sensor: Condenser Coil temperature",
	"Sensor: Evaporator Coil temperature",
	"Sensor: Liquid Line temperature",
	"Sensor: Discharge Line temperature",
	"Sensor: Suction Pressure",
	"Sensor: Discharge Pressure",
	"Sensor: Defrost temperature",

	"Notification: Smoke Alarm" = 0x71_01,
	"Notification: CO Alarm",
	"Notification: CO2 Alarm",
	"Notification: Heat Alarm",
	"Notification: Water Alarm",
	"Notification: Access Control",
	"Notification: Home Security",
	"Notification: Power Management",
	"Notification: System",
	"Notification: Emergency Alarm",
	"Notification: Clock",
	"Notification: Appliance",
	"Notification: Home Health",
	"Notification: Siren",
	"Notification: Water Valve",
	"Notification: Weather Alarm",
	"Notification: Irrigation",
	"Notification: Gas alarm",
	"Notification: Pest Control",
	"Notification: Light sensor",
	"Notification: Water Quality Monitoring",
	"Notification: Home monitoring",

	"Meter: Electric" = 0x32_01,
	"Meter: Gas",
	"Meter: Water",
	"Meter: Heating",
	"Meter: Cooling",

	"Irrigation: Channel 01" = 0x6b_01,
	"Irrigation: Channel 02",
	"Irrigation: Channel 03",
	"Irrigation: Channel 04",
	"Irrigation: Channel 05",
	"Irrigation: Channel 06",
	"Irrigation: Channel 07",
	"Irrigation: Channel 08",
	"Irrigation: Channel 09",
	"Irrigation: Channel 10",
	"Irrigation: Channel 11",
	"Irrigation: Channel 12",
	"Irrigation: Channel 13",
	"Irrigation: Channel 14",
	"Irrigation: Channel 15",
	"Irrigation: Channel 16",
	"Irrigation: Channel 17",
	"Irrigation: Channel 18",
	"Irrigation: Channel 19",
	"Irrigation: Channel 20",
	"Irrigation: Channel 21",
	"Irrigation: Channel 22",
	"Irrigation: Channel 23",
	"Irrigation: Channel 24",
	"Irrigation: Channel 25",
	"Irrigation: Channel 26",
	"Irrigation: Channel 27",
	"Irrigation: Channel 28",
	"Irrigation: Channel 29",
	"Irrigation: Channel 30",
	"Irrigation: Channel 31",
	"Irrigation: Channel 32",
}

/** Returns the ValueID used to store the name of an association group */
function getGroupNameValueID(groupId: number): ValueID {
	return {
		commandClass: CommandClasses.Association,
		propertyName: "name",
		propertyKey: groupId,
	};
}

/** Returns the ValueID used to store info for an association group */
function getGroupInfoValueID(groupId: number): ValueID {
	return {
		commandClass: CommandClasses.Association,
		propertyName: "info",
		propertyKey: groupId,
	};
}

@API(CommandClasses["Association Group Information"])
export class AssociationGroupInfoCCAPI extends CCAPI {
	public async getGroupName(groupId: number): Promise<string> {
		const cc = new AssociationGroupInfoCCNameGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
		});
		const response = (await this.driver.sendCommand<
			AssociationGroupInfoCCNameReport
		>(cc))!;
		return response.name;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getGroupInfo(groupId: number, refreshCache: boolean = false) {
		const cc = new AssociationGroupInfoCCInfoGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			refreshCache,
		});
		const response = (await this.driver.sendCommand<
			AssociationGroupInfoCCInfoReport
		>(cc))!;
		// SDS13782: If List Mode is set to 0, the Group Count field MUST be set to 1.
		const { groupId: _, ...info } = response.groups[0];
		return {
			hasDynamicInfo: response.hasDynamicInfo,
			...info,
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getCommands(
		groupId: number,
		allowCache: boolean = true,
	): Promise<AssociationGroupInfoCCCommandListReport["commands"]> {
		const cc = new AssociationGroupInfoCCCommandListGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			allowCache,
		});
		const response = (await this.driver.sendCommand<
			AssociationGroupInfoCCCommandListReport
		>(cc))!;
		return response.commands;
	}
}

export interface AssociationGroupInfoCC {
	ccCommand: AssociationGroupInfoCommand;
}

@commandClass(CommandClasses["Association Group Information"])
@implementedVersion(3)
export class AssociationGroupInfoCC extends CommandClass {
	public constructor(driver: IDriver, options: CommandClassOptions) {
		super(driver, options);
		this.registerValue(getGroupNameValueID(0).propertyName as any, true);
		this.registerValue(getGroupInfoValueID(0).propertyName as any, true);
	}

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// AssociationCC must be interviewed after Z-Wave+ if that is supported
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses.Association,
			// TODO: ^ OR v
			CommandClasses["Multi Channel Association"],
		];
	}

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const api = node.commandClasses["Association Group Information"];

		log.controller.logNode(node.id, {
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		const associationGroupCount =
			this.getValueDB().getValue<number>(getGroupCountValueId()) || 0;

		for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
			if (complete) {
				// First get the group's name
				log.controller.logNode(node.id, {
					message: `Association group #${groupId}: Querying name...`,
					direction: "outbound",
				});
				const name = await api.getGroupName(groupId);
				const logMessage = `Association group #${groupId} has name "${name}"`;
				log.controller.logNode(node.id, {
					message: logMessage,
					direction: "inbound",
				});
			}

			// Even if this is a partial interview, we need to refresh information
			// for nodes with dynamic associations
			let hasDynamicInfo: boolean | undefined;
			if (!complete) {
				hasDynamicInfo = this.getValueDB().getValue({
					commandClass: this.ccId,
					propertyName: "hasDynamicInfo",
				});
			}

			if (complete || hasDynamicInfo) {
				// Then its information
				log.controller.logNode(node.id, {
					message: `Association group #${groupId}: Querying info...`,
					direction: "outbound",
				});
				const info = await api.getGroupInfo(groupId, !!hasDynamicInfo);
				const logMessage = `Received info for association group #${groupId}:
info is dynamic: ${info.hasDynamicInfo}
profile:         ${getEnumMemberName(
					AssociationGroupInfoProfile,
					info.profile,
				)}`;
				log.controller.logNode(node.id, {
					message: logMessage,
					direction: "inbound",
				});
			}

			if (complete) {
				log.controller.logNode(node.id, {
					message: `Association group #${groupId}: Querying command list...`,
					direction: "outbound",
				});
				await api.getCommands(groupId);
				// Not sure how to log this
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(AssociationGroupInfoCommand.NameReport)
export class AssociationGroupInfoCCNameReport extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this.groupId = this.payload[0];
		const nameLength = this.payload[1];
		validatePayload(this.payload.length >= 2 + nameLength);
		this.name = this.payload.slice(2, 2 + nameLength).toString("utf8");

		const valueId = getGroupNameValueID(this.groupId);
		this.getValueDB().setValue(valueId, this.name);
	}

	public readonly groupId: number;
	public readonly name: string;
}

interface AssociationGroupInfoCCNameGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(AssociationGroupInfoCommand.NameGet)
@expectedCCResponse(AssociationGroupInfoCCNameReport)
export class AssociationGroupInfoCCNameGet extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCNameGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.groupId = options.groupId;
		}
	}

	public groupId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.groupId]);
		return super.serialize();
	}
}

export interface AssociationGroupInfo {
	groupId: number;
	mode: number;
	profile: number;
	eventCode: number;
}

@CCCommand(AssociationGroupInfoCommand.InfoReport)
export class AssociationGroupInfoCCInfoReport extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.isListMode = !!(this.payload[0] & 0b1000_0000);
		this.hasDynamicInfo = !!(this.payload[0] & 0b0100_0000);

		const groupCount = this.payload[0] & 0b0011_1111;
		// each group requires 7 bytes of payload
		validatePayload(this.payload.length >= 1 + groupCount * 7);
		const _groups: AssociationGroupInfo[] = [];
		for (let i = 0; i < groupCount; i++) {
			const offset = 1 + i * groupCount;
			// Parse the payload
			const groupBytes = this.payload.slice(offset, offset + 7);
			const groupId = groupBytes[0];
			const mode = 0; //groupBytes[1];
			const profile = groupBytes.readUInt16BE(2);
			const eventCode = 0; // groupBytes.readUInt16BE(5);
			_groups.push({ groupId, mode, profile, eventCode });

			// And persist the information in the value DB
			const valueId = getGroupInfoValueID(groupId);
			this.getValueDB().setValue(valueId, {
				mode,
				profile,
				eventCode,
			});
		}
		this.groups = _groups;
	}

	public readonly isListMode: boolean;

	@ccValue({ internal: true })
	public readonly hasDynamicInfo: boolean;

	public readonly groups: readonly AssociationGroupInfo[];
}

type AssociationGroupInfoCCInfoGetOptions = CCCommandOptions & {
	refreshCache: boolean;
} & (
		| {
				listMode: boolean;
		  }
		| {
				groupId: number;
		  });

@CCCommand(AssociationGroupInfoCommand.InfoGet)
@expectedCCResponse(AssociationGroupInfoCCInfoReport)
export class AssociationGroupInfoCCInfoGet extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCInfoGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.refreshCache = options.refreshCache;
			if ("listMode" in options) this.listMode = options.listMode;
			if ("groupId" in options) this.groupId = options.groupId;
		}
	}

	public refreshCache: boolean;
	public listMode?: boolean;
	public groupId?: number;

	public serialize(): Buffer {
		const isListMode = this.listMode === true;
		const optionByte =
			(this.refreshCache ? 0b1000_0000 : 0) |
			(isListMode ? 0b0100_0000 : 0);
		this.payload = Buffer.from([
			optionByte,
			isListMode ? 0 : this.groupId!,
		]);
		return super.serialize();
	}
}

@CCCommand(AssociationGroupInfoCommand.CommandListReport)
export class AssociationGroupInfoCCCommandListReport extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this.groupId = this.payload[0];
		const listLength = this.payload[1];
		validatePayload(this.payload.length >= 2 + listLength);
		const listBytes = this.payload.slice(2, 2 + listLength);
		// Parse all CC ids and commands
		let offset = 0;
		while (offset < listLength) {
			const { ccId, bytesRead } = parseCCId(listBytes, offset);
			const command = listBytes[offset + bytesRead];
			if (!this._commands.has(ccId)) this._commands.set(ccId, []);
			this._commands.get(ccId)!.push(command);
			offset += bytesRead + 1;
		}
	}

	public readonly groupId: number;

	private _commands = new Map<CommandClasses, number[]>();
	public get commands(): ReadonlyMap<CommandClasses, readonly number[]> {
		return this._commands;
	}
}

interface AssociationGroupInfoCCCommandListGetOptions extends CCCommandOptions {
	allowCache: boolean;
	groupId: number;
}

@CCCommand(AssociationGroupInfoCommand.CommandListGet)
@expectedCCResponse(AssociationGroupInfoCCCommandListReport)
export class AssociationGroupInfoCCCommandListGet extends AssociationGroupInfoCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| AssociationGroupInfoCCCommandListGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.allowCache = options.allowCache;
			this.groupId = options.groupId;
		}
	}

	public allowCache: boolean;
	public groupId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.allowCache ? 0b1000_0000 : 0,
			this.groupId,
		]);
		return super.serialize();
	}
}
