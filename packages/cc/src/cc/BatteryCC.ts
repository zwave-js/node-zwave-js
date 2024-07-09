import { timespan } from "@zwave-js/core";
import type {
	MessageOrCCLogEntry,
	MessageRecord,
	SinglecastCC,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	type MaybeNotKnown,
	MessagePriority,
	ValueMetadata,
	enumValuesToMetadataStates,
	parseFloatWithScale,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { type AllOrNone, getEnumMemberName, pick } from "@zwave-js/shared/safe";
import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	type PollValueImplementation,
	throwUnsupportedProperty,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	BatteryChargingStatus,
	BatteryCommand,
	BatteryReplacementStatus,
} from "../lib/_Types";
import { NotificationCCValues } from "./NotificationCC";

export const BatteryCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Battery, {
		...V.staticProperty(
			"level",
			{
				...ValueMetadata.ReadOnlyUInt8,
				max: 100,
				unit: "%",
				label: "Battery level",
			} as const,
		),

		...V.staticProperty(
			"isLow",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Low battery level",
			} as const,
		),

		...V.staticProperty(
			"maximumCapacity",
			{
				...ValueMetadata.ReadOnlyUInt8,
				max: 100,
				unit: "%",
				label: "Maximum capacity",
			} as const,
			{
				minVersion: 2,
			} as const,
		),

		...V.staticProperty(
			"temperature",
			{
				...ValueMetadata.ReadOnlyInt8,
				label: "Temperature",
			} as const,
			{
				minVersion: 2,
			} as const,
		),

		...V.staticProperty(
			"chargingStatus",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Charging status",
				states: enumValuesToMetadataStates(BatteryChargingStatus),
			} as const,
			{
				minVersion: 2,
			} as const,
		),

		...V.staticProperty(
			"rechargeable",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Rechargeable",
			} as const,
			{
				minVersion: 2,
			} as const,
		),

		...V.staticProperty(
			"backup",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Used as backup",
			} as const,
			{
				minVersion: 2,
			} as const,
		),

		...V.staticProperty(
			"overheating",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Overheating",
			} as const,
			{
				minVersion: 2,
			} as const,
		),

		...V.staticProperty(
			"lowFluid",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Fluid is low",
			} as const,
			{
				minVersion: 2,
			} as const,
		),

		...V.staticProperty(
			"rechargeOrReplace",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Recharge or replace",
				states: enumValuesToMetadataStates(BatteryReplacementStatus),
			} as const,
			{
				minVersion: 2,
			} as const,
		),

		...V.staticProperty(
			"disconnected",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Battery is disconnected",
			} as const,
			{
				minVersion: 2,
			} as const,
		),

		...V.staticProperty(
			"lowTemperatureStatus",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Battery temperature is low",
			} as const,
			{
				minVersion: 3,
			} as const,
		),
	}),
});

// @noSetValueAPI This CC is read-only

@API(CommandClasses.Battery)
export class BatteryCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: BatteryCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case BatteryCommand.Get:
				return true; // This is mandatory
			case BatteryCommand.HealthGet:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: BatteryCCAPI, { property }) {
			switch (property) {
				case "level":
				case "isLow":
				case "chargingStatus":
				case "rechargeable":
				case "backup":
				case "overheating":
				case "lowFluid":
				case "rechargeOrReplace":
				case "lowTemperatureStatus":
				case "disconnected":
					return (await this.get())?.[property];

				case "maximumCapacity":
				case "temperature":
					return (await this.getHealth())?.[property];

				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(BatteryCommand, BatteryCommand.Get);

		const cc = new BatteryCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<BatteryCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"level",
				"isLow",
				"chargingStatus",
				"rechargeable",
				"backup",
				"overheating",
				"lowFluid",
				"rechargeOrReplace",
				"lowTemperatureStatus",
				"disconnected",
			]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getHealth() {
		this.assertSupportsCommand(BatteryCommand, BatteryCommand.HealthGet);

		const cc = new BatteryCCHealthGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<BatteryCCHealthReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["maximumCapacity", "temperature"]);
		}
	}
}

@commandClass(CommandClasses.Battery)
@implementedVersion(3)
@ccValues(BatteryCCValues)
export class BatteryCC extends CommandClass {
	declare ccCommand: BatteryCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Query the Battery status
		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Battery,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying battery status...",
			direction: "outbound",
		});

		const batteryStatus = await api.get();
		if (batteryStatus) {
			let logMessage = `received response for battery information:
level:                           ${batteryStatus.level}${
				batteryStatus.isLow ? " (low)" : ""
			}`;
			if (this.version >= 2) {
				logMessage += `
status:                          ${
					BatteryChargingStatus[batteryStatus.chargingStatus!]
				}
rechargeable:                    ${batteryStatus.rechargeable}
is backup:                       ${batteryStatus.backup}
is overheating:                  ${batteryStatus.overheating}
fluid is low:                    ${batteryStatus.lowFluid}
needs to be replaced or charged: ${
					BatteryReplacementStatus[batteryStatus.rechargeOrReplace!]
				}
is low temperature               ${batteryStatus.lowTemperatureStatus}
is disconnected:                 ${batteryStatus.disconnected}`;
			}
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		if (this.version >= 2) {
			// always query the health
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying battery health...",
				direction: "outbound",
			});

			const batteryHealth = await api.getHealth();
			if (batteryHealth) {
				const logMessage = `received response for battery health:
max. capacity: ${batteryHealth.maximumCapacity} %
temperature:   ${batteryHealth.temperature} °C`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}

	public shouldRefreshValues(
		this: SinglecastCC<this>,
		applHost: ZWaveApplicationHost,
	): boolean {
		// Check when the battery state was last updated
		const valueDB = applHost.tryGetValueDB(this.nodeId);
		if (!valueDB) return true;

		const lastUpdated = valueDB.getTimestamp(
			BatteryCCValues.level.endpoint(this.endpointIndex),
		);
		return (
			lastUpdated == undefined
			// The specs say once per month, but that's a bit too unfrequent IMO
			// Also the maximum that setInterval supports is ~24.85 days
			|| Date.now() - lastUpdated > timespan.days(7)
		);
	}
}

// @publicAPI
export type BatteryCCReportOptions =
	& CCCommandOptions
	& (
		| {
			isLow?: false;
			level: number;
		}
		| {
			isLow: true;
			level?: undefined;
		}
	)
	& AllOrNone<{
		// V2+
		chargingStatus: BatteryChargingStatus;
		rechargeable: boolean;
		backup: boolean;
		overheating: boolean;
		lowFluid: boolean;
		rechargeOrReplace: BatteryReplacementStatus;
		disconnected: boolean;
	}>
	& AllOrNone<{
		// V3+
		lowTemperatureStatus: boolean;
	}>;

@CCCommand(BatteryCommand.Report)
export class BatteryCCReport extends BatteryCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | BatteryCCReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.level = this.payload[0];
			if (this.level === 0xff) {
				this.level = 0;
				this.isLow = true;
			} else {
				this.isLow = false;
			}

			if (this.payload.length >= 3) {
				// Starting with V2
				this.chargingStatus = this.payload[1] >>> 6;
				this.rechargeable = !!(this.payload[1] & 0b0010_0000);
				this.backup = !!(this.payload[1] & 0b0001_0000);
				this.overheating = !!(this.payload[1] & 0b1000);
				this.lowFluid = !!(this.payload[1] & 0b0100);
				this.rechargeOrReplace = !!(this.payload[1] & 0b10)
					? BatteryReplacementStatus.Now
					: !!(this.payload[1] & 0b1)
					? BatteryReplacementStatus.Soon
					: BatteryReplacementStatus.No;
				this.lowTemperatureStatus = !!(this.payload[2] & 0b10);
				this.disconnected = !!(this.payload[2] & 0b1);
			}
		} else {
			this.level = options.isLow ? 0 : options.level;
			this.isLow = !!options.isLow;
			this.chargingStatus = options.chargingStatus;
			this.rechargeable = options.rechargeable;
			this.backup = options.backup;
			this.overheating = options.overheating;
			this.lowFluid = options.lowFluid;
			this.rechargeOrReplace = options.rechargeOrReplace;
			this.disconnected = options.disconnected;
			this.lowTemperatureStatus = options.lowTemperatureStatus;
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Naïve heuristic for a full battery
		if (this.level >= 90) {
			// Some devices send Notification CC Reports with battery information,
			// or this information is mapped from legacy V1 alarm values.
			// We may need to idle the corresponding values when the battery is full
			const notificationCCVersion = applHost.getSupportedCCVersion(
				CommandClasses.Notification,
				this.nodeId as number,
				this.endpointIndex,
			);
			if (
				// supported
				notificationCCVersion > 0
				// but idling is not required
				&& notificationCCVersion < 8
			) {
				const batteryLevelStatusValue = NotificationCCValues
					.notificationVariable(
						"Power Management",
						"Battery level status",
					);
				// If not undefined and not idle
				if (this.getValue(applHost, batteryLevelStatusValue)) {
					this.setValue(
						applHost,
						batteryLevelStatusValue,
						0, /* idle */
					);
				}
			}
		}

		return true;
	}

	@ccValue(BatteryCCValues.level)
	public readonly level: number;

	@ccValue(BatteryCCValues.isLow)
	public readonly isLow: boolean;

	@ccValue(BatteryCCValues.chargingStatus)
	public readonly chargingStatus: BatteryChargingStatus | undefined;

	@ccValue(BatteryCCValues.rechargeable)
	public readonly rechargeable: boolean | undefined;

	@ccValue(BatteryCCValues.backup)
	public readonly backup: boolean | undefined;

	@ccValue(BatteryCCValues.overheating)
	public readonly overheating: boolean | undefined;

	@ccValue(BatteryCCValues.lowFluid)
	public readonly lowFluid: boolean | undefined;

	@ccValue(BatteryCCValues.rechargeOrReplace)
	public readonly rechargeOrReplace: BatteryReplacementStatus | undefined;

	@ccValue(BatteryCCValues.disconnected)
	public readonly disconnected: boolean | undefined;

	@ccValue(BatteryCCValues.lowTemperatureStatus)
	public readonly lowTemperatureStatus: boolean | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.isLow ? 0xff : this.level]);
		if (this.chargingStatus != undefined) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([
					(this.chargingStatus << 6)
					+ (this.rechargeable ? 0b0010_0000 : 0)
					+ (this.backup ? 0b0001_0000 : 0)
					+ (this.overheating ? 0b1000 : 0)
					+ (this.lowFluid ? 0b0100 : 0)
					+ (this.rechargeOrReplace === BatteryReplacementStatus.Now
						? 0b10
						: this.rechargeOrReplace
								=== BatteryReplacementStatus.Soon
						? 0b1
						: 0),
					(this.lowTemperatureStatus ? 0b10 : 0)
					+ (this.disconnected ? 0b1 : 0),
				]),
			]);
		}
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			level: this.level,
			"is low": this.isLow,
		};
		if (this.chargingStatus != undefined) {
			message["charging status"] = getEnumMemberName(
				BatteryChargingStatus,
				this.chargingStatus,
			);
		}
		if (this.rechargeable != undefined) {
			message.rechargeable = this.rechargeable;
		}
		if (this.backup != undefined) {
			message.backup = this.backup;
		}
		if (this.overheating != undefined) {
			message.overheating = this.overheating;
		}
		if (this.lowFluid != undefined) {
			message["low fluid"] = this.lowFluid;
		}
		if (this.rechargeOrReplace != undefined) {
			message["recharge or replace"] = getEnumMemberName(
				BatteryReplacementStatus,
				this.rechargeOrReplace,
			);
		}
		if (this.lowTemperatureStatus != undefined) {
			message.lowTemperatureStatus = this.lowTemperatureStatus;
		}
		if (this.disconnected != undefined) {
			message.disconnected = this.disconnected;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(BatteryCommand.Get)
@expectedCCResponse(BatteryCCReport)
export class BatteryCCGet extends BatteryCC {}

@CCCommand(BatteryCommand.HealthReport)
export class BatteryCCHealthReport extends BatteryCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);

		// Parse maximum capacity. 0xff means unknown
		this.maximumCapacity = this.payload[0];
		if (this.maximumCapacity === 0xff) this.maximumCapacity = undefined;

		const { value: temperature, scale } = parseFloatWithScale(
			this.payload.subarray(1),
			true, // The temperature field may be omitted
		);
		this.temperature = temperature;
		this.temperatureScale = scale;
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Update the temperature unit in the value DB
		const temperatureValue = BatteryCCValues.temperature;
		this.setMetadata(applHost, temperatureValue, {
			...temperatureValue.meta,
			unit: this.temperatureScale === 0x00 ? "°C" : undefined,
		});

		return true;
	}

	@ccValue(BatteryCCValues.maximumCapacity)
	public readonly maximumCapacity: number | undefined;

	@ccValue(BatteryCCValues.temperature)
	public readonly temperature: number | undefined;

	private readonly temperatureScale: number | undefined;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				temperature: this.temperature != undefined
					? this.temperature
					: "unknown",
				"max capacity": this.maximumCapacity != undefined
					? `${this.maximumCapacity} %`
					: "unknown",
			},
		};
	}
}

@CCCommand(BatteryCommand.HealthGet)
@expectedCCResponse(BatteryCCHealthReport)
export class BatteryCCHealthGet extends BatteryCC {}
