import { type WithAddress, timespan } from "@zwave-js/core";
import type {
	ControlsCC,
	EndpointId,
	GetEndpoint,
	MessageOrCCLogEntry,
	MessageRecord,
	NodeId,
	SinglecastCC,
	SupportsCC,
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
	CCEncodingContext,
	CCParsingContext,
	GetDeviceConfig,
	GetNode,
	GetSupportedCCVersion,
	GetValueDB,
} from "@zwave-js/host/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { type AllOrNone, getEnumMemberName, pick } from "@zwave-js/shared/safe";
import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	type PollValueImplementation,
	throwUnsupportedProperty,
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import {
	BatteryChargingStatus,
	BatteryCommand,
	BatteryReplacementStatus,
} from "../lib/_Types.js";
import { NotificationCCValues } from "./NotificationCC.js";

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

		const cc = new BatteryCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<BatteryCCReport>(
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

		const cc = new BatteryCCHealthGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<BatteryCCHealthReport>(
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

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Query the Battery status
		await this.refreshValues(ctx);

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Battery,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
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
			if (api.version >= 2) {
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
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		if (api.version >= 2) {
			// always query the health
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying battery health...",
				direction: "outbound",
			});

			const batteryHealth = await api.getHealth();
			if (batteryHealth) {
				const logMessage = `received response for battery health:
max. capacity: ${batteryHealth.maximumCapacity} %
temperature:   ${batteryHealth.temperature} °C`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}

	public shouldRefreshValues(
		this: SinglecastCC<this>,
		ctx:
			& GetValueDB
			& GetSupportedCCVersion
			& GetDeviceConfig
			& GetNode<
				NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>
			>,
	): boolean {
		// Check when the battery state was last updated
		const valueDB = ctx.tryGetValueDB(this.nodeId);
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
@ccValueProperty("level", BatteryCCValues.level)
@ccValueProperty("isLow", BatteryCCValues.isLow)
@ccValueProperty("chargingStatus", BatteryCCValues.chargingStatus)
@ccValueProperty("rechargeable", BatteryCCValues.rechargeable)
@ccValueProperty("backup", BatteryCCValues.backup)
@ccValueProperty("overheating", BatteryCCValues.overheating)
@ccValueProperty("lowFluid", BatteryCCValues.lowFluid)
@ccValueProperty("rechargeOrReplace", BatteryCCValues.rechargeOrReplace)
@ccValueProperty("disconnected", BatteryCCValues.disconnected)
@ccValueProperty("lowTemperatureStatus", BatteryCCValues.lowTemperatureStatus)
export class BatteryCCReport extends BatteryCC {
	public constructor(
		options: WithAddress<BatteryCCReportOptions>,
	) {
		super(options);

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

	public static from(raw: CCRaw, ctx: CCParsingContext): BatteryCCReport {
		let ccOptions: BatteryCCReportOptions;

		validatePayload(raw.payload.length >= 1);
		const level = raw.payload[0];

		if (level === 0xff) {
			ccOptions = {
				isLow: true,
			};
		} else {
			ccOptions = {
				isLow: false,
				level,
			};
		}

		if (raw.payload.length >= 3) {
			// Starting with V2
			const chargingStatus: BatteryChargingStatus = raw.payload[1] >>> 6;
			const rechargeable = !!(raw.payload[1] & 0b0010_0000);
			const backup = !!(raw.payload[1] & 0b0001_0000);
			const overheating = !!(raw.payload[1] & 0b1000);
			const lowFluid = !!(raw.payload[1] & 0b0100);
			const rechargeOrReplace: BatteryReplacementStatus =
				!!(raw.payload[1] & 0b10)
					? BatteryReplacementStatus.Now
					: !!(raw.payload[1] & 0b1)
					? BatteryReplacementStatus.Soon
					: BatteryReplacementStatus.No;
			const lowTemperatureStatus = !!(raw.payload[2] & 0b10);
			const disconnected = !!(raw.payload[2] & 0b1);

			ccOptions = {
				...ccOptions,
				chargingStatus,
				rechargeable,
				backup,
				overheating,
				lowFluid,
				rechargeOrReplace,
				lowTemperatureStatus,
				disconnected,
			};
		}

		return new BatteryCCReport({
			nodeId: ctx.sourceNodeId,
			...ccOptions,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Naïve heuristic for a full battery
		if (this.level >= 90) {
			// Some devices send Notification CC Reports with battery information,
			// or this information is mapped from legacy V1 alarm values.
			// We may need to idle the corresponding values when the battery is full
			const notificationCCVersion = ctx.getSupportedCCVersion(
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
				if (this.getValue(ctx, batteryLevelStatusValue)) {
					this.setValue(
						ctx,
						batteryLevelStatusValue,
						0, /* idle */
					);
				}
			}
		}

		return true;
	}

	public readonly level: number;

	public readonly isLow: boolean;

	public readonly chargingStatus: BatteryChargingStatus | undefined;

	public readonly rechargeable: boolean | undefined;

	public readonly backup: boolean | undefined;

	public readonly overheating: boolean | undefined;

	public readonly lowFluid: boolean | undefined;

	public readonly rechargeOrReplace: BatteryReplacementStatus | undefined;

	public readonly disconnected: boolean | undefined;

	public readonly lowTemperatureStatus: boolean | undefined;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.isLow ? 0xff : this.level]);
		if (this.chargingStatus != undefined) {
			this.payload = Bytes.concat([
				this.payload,
				Bytes.from([
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
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(BatteryCommand.Get)
@expectedCCResponse(BatteryCCReport)
export class BatteryCCGet extends BatteryCC {}

// @publicAPI
export interface BatteryCCHealthReportOptions {
	maximumCapacity?: number;
	temperature?: number;
	temperatureScale?: number;
}

@CCCommand(BatteryCommand.HealthReport)
@ccValueProperty("maximumCapacity", BatteryCCValues.maximumCapacity)
@ccValueProperty("temperature", BatteryCCValues.temperature)
export class BatteryCCHealthReport extends BatteryCC {
	public constructor(
		options: WithAddress<BatteryCCHealthReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.maximumCapacity = options.maximumCapacity;
		this.temperature = options.temperature;
		this.temperatureScale = options.temperatureScale;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): BatteryCCHealthReport {
		validatePayload(raw.payload.length >= 2);
		// Parse maximum capacity. 0xff means unknown
		let maximumCapacity: number | undefined = raw.payload[0];
		if (maximumCapacity === 0xff) maximumCapacity = undefined;
		const {
			value: temperature,
			scale: temperatureScale,
		} = parseFloatWithScale(
			raw.payload.subarray(1),
			true, // The temperature field may be omitted
		);

		return new BatteryCCHealthReport({
			nodeId: ctx.sourceNodeId,
			maximumCapacity,
			temperature,
			temperatureScale,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Update the temperature unit in the value DB
		const temperatureValue = BatteryCCValues.temperature;
		this.setMetadata(ctx, temperatureValue, {
			...temperatureValue.meta,
			unit: this.temperatureScale === 0x00 ? "°C" : undefined,
		});

		return true;
	}

	public readonly maximumCapacity: number | undefined;

	public readonly temperature: number | undefined;

	private readonly temperatureScale: number | undefined;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
