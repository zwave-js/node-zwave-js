import {
	CommandClasses,
	type EndpointId,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCEncodingContext, CCParsingContext } from "@zwave-js/host/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { getEnumMemberName, isEnumMember, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API.js";
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
import { AlarmSensorCommand, AlarmSensorType } from "../lib/_Types.js";

export const AlarmSensorCCValues = Object.freeze({
	...V.defineDynamicCCValues(CommandClasses["Alarm Sensor"], {
		...V.dynamicPropertyAndKeyWithName(
			"state",
			"state",
			(sensorType: AlarmSensorType) => sensorType,
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
		...V.dynamicPropertyAndKeyWithName(
			"severity",
			"severity",
			(sensorType: AlarmSensorType) => sensorType,
			({ property, propertyKey }) =>
				property === "severity" && typeof propertyKey === "number",
			(sensorType: AlarmSensorType) => {
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
		),
		...V.dynamicPropertyAndKeyWithName(
			"duration",
			"duration",
			(sensorType: AlarmSensorType) => sensorType,
			({ property, propertyKey }) =>
				property === "duration" && typeof propertyKey === "number",
			(sensorType: AlarmSensorType) => {
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
		),
	}),
	...V.defineStaticCCValues(CommandClasses["Alarm Sensor"], {
		...V.staticProperty("supportedSensorTypes", undefined, {
			internal: true,
		}),
	}),
});

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Alarm Sensor"])
export class AlarmSensorCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: AlarmSensorCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case AlarmSensorCommand.Get:
			case AlarmSensorCommand.SupportedGet:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Retrieves the current value from this sensor
	 * @param sensorType The (optional) sensor type to retrieve the value for
	 */
	@validateArgs({ strictEnums: true })
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(sensorType?: AlarmSensorType) {
		this.assertSupportsCommand(AlarmSensorCommand, AlarmSensorCommand.Get);

		const cc = new AlarmSensorCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			sensorType,
		});
		const response = await this.host.sendCommand<AlarmSensorCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) return pick(response, ["state", "severity", "duration"]);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupportedSensorTypes() {
		this.assertSupportsCommand(
			AlarmSensorCommand,
			AlarmSensorCommand.SupportedGet,
		);

		const cc = new AlarmSensorCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			AlarmSensorCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) return response.supportedSensorTypes;
	}
}

@commandClass(CommandClasses["Alarm Sensor"])
@implementedVersion(1)
@ccValues(AlarmSensorCCValues)
export class AlarmSensorCC extends CommandClass {
	declare ccCommand: AlarmSensorCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;

		// Skip the interview in favor of Notification CC if possible
		if (endpoint.supportsCC(CommandClasses.Notification)) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`${this.constructor.name}: skipping interview because Notification CC is supported...`,
				direction: "none",
			});
			this.setInterviewComplete(ctx, true);
			return;
		}

		const api = CCAPI.create(
			CommandClasses["Alarm Sensor"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Find out which sensor types this sensor supports
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying supported sensor types...",
			direction: "outbound",
		});
		const supportedSensorTypes = await api.getSupportedSensorTypes();
		if (supportedSensorTypes) {
			const logMessage = `received supported sensor types: ${
				supportedSensorTypes
					.map((type) => getEnumMemberName(AlarmSensorType, type))
					.map((name) => `\n· ${name}`)
					.join("")
			}`;
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported sensor types timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// Query (all of) the sensor's current value(s)
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
			CommandClasses["Alarm Sensor"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const supportedSensorTypes: readonly AlarmSensorType[] =
			this.getValue(ctx, AlarmSensorCCValues.supportedSensorTypes)
				?? [];

		// Always query (all of) the sensor's current value(s)
		for (const type of supportedSensorTypes) {
			// Some devices report invalid sensor types, but the CC API checks
			// for valid values and throws otherwise.
			if (!isEnumMember(AlarmSensorType, type)) continue;

			const sensorName = getEnumMemberName(AlarmSensorType, type);

			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying current value for ${sensorName}...`,
				direction: "outbound",
			});
			const currentValue = await api.get(type);
			if (currentValue) {
				let message = `received current value for ${sensorName}: 
state:    ${currentValue.state}`;
				if (currentValue.severity != undefined) {
					message += `
severity: ${currentValue.severity}`;
				}
				if (currentValue.duration != undefined) {
					message += `
duration: ${currentValue.duration}`;
				}
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message,
					direction: "inbound",
				});
			}
		}
	}

	/**
	 * Returns which sensor types are supported.
	 * This only works AFTER the interview process
	 */
	public static getSupportedSensorTypesCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): MaybeNotKnown<AlarmSensorType[]> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				AlarmSensorCCValues.supportedSensorTypes.endpoint(
					endpoint.index,
				),
			);
	}

	protected createMetadataForSensorType(
		ctx: GetValueDB,
		sensorType: AlarmSensorType,
	): void {
		const stateValue = AlarmSensorCCValues.state(sensorType);
		const severityValue = AlarmSensorCCValues.severity(sensorType);
		const durationValue = AlarmSensorCCValues.duration(sensorType);

		// Always create metadata if it does not exist
		this.ensureMetadata(ctx, stateValue);
		this.ensureMetadata(ctx, severityValue);
		this.ensureMetadata(ctx, durationValue);
	}
}

// @publicAPI
export interface AlarmSensorCCReportOptions {
	sensorType: AlarmSensorType;
	state: boolean;
	severity?: number;
	duration?: number;
}

@CCCommand(AlarmSensorCommand.Report)
export class AlarmSensorCCReport extends AlarmSensorCC {
	public constructor(
		options: WithAddress<AlarmSensorCCReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.sensorType = options.sensorType;
		this.state = options.state;
		this.severity = options.severity;
		this.duration = options.duration;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): AlarmSensorCCReport {
		validatePayload(raw.payload.length >= 5, raw.payload[1] !== 0xff);
		const sourceNodeId = raw.payload[0];

		const sensorType: AlarmSensorType = raw.payload[1];
		// Any positive value gets interpreted as alarm
		const state: boolean = raw.payload[2] > 0;
		// Severity only ranges from 1 to 100
		let severity: number | undefined;
		if (raw.payload[2] > 0 && raw.payload[2] <= 0x64) {
			severity = raw.payload[2];
		}

		// ignore zero durations
		const duration = raw.payload.readUInt16BE(3) || undefined;

		return new this({
			// Alarm Sensor reports may be forwarded by a different node, in this case
			// (and only then!) the payload contains the original node ID
			nodeId: sourceNodeId || ctx.sourceNodeId,
			sensorType,
			state,
			severity,
			duration,
		});
	}

	public readonly sensorType: AlarmSensorType;
	public readonly state: boolean;
	public readonly severity: number | undefined;
	public readonly duration: number | undefined;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"sensor type": getEnumMemberName(AlarmSensorType, this.sensorType),
			"alarm state": this.state,
		};
		if (this.severity != undefined) {
			message.severity = this.severity;
		}
		if (this.duration != undefined) {
			message.duration = `${this.duration} seconds`;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;
		// Create metadata if it does not exist
		this.createMetadataForSensorType(ctx, this.sensorType);

		const stateValue = AlarmSensorCCValues.state(this.sensorType);
		const severityValue = AlarmSensorCCValues.severity(this.sensorType);
		const durationValue = AlarmSensorCCValues.duration(this.sensorType);

		this.setValue(ctx, stateValue, this.state);
		this.setValue(ctx, severityValue, this.severity);
		this.setValue(ctx, durationValue, this.duration);

		return true;
	}
}

function testResponseForAlarmSensorGet(
	sent: AlarmSensorCCGet,
	received: AlarmSensorCCReport,
) {
	// We expect a Alarm Sensor Report that matches the requested sensor type (if a type was requested)
	return (
		sent.sensorType === AlarmSensorType.Any
		|| received.sensorType === sent.sensorType
	);
}

// @publicAPI
export interface AlarmSensorCCGetOptions {
	sensorType?: AlarmSensorType;
}

@CCCommand(AlarmSensorCommand.Get)
@expectedCCResponse(AlarmSensorCCReport, testResponseForAlarmSensorGet)
export class AlarmSensorCCGet extends AlarmSensorCC {
	public constructor(
		options: WithAddress<AlarmSensorCCGetOptions>,
	) {
		super(options);
		this.sensorType = options.sensorType ?? AlarmSensorType.Any;
	}

	public static from(_raw: CCRaw, _ctx: CCParsingContext): AlarmSensorCCGet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new AlarmSensorCCGet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public sensorType: AlarmSensorType;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.sensorType]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"sensor type": getEnumMemberName(
					AlarmSensorType,
					this.sensorType,
				),
			},
		};
	}
}

// @publicAPI
export interface AlarmSensorCCSupportedReportOptions {
	supportedSensorTypes: AlarmSensorType[];
}

@CCCommand(AlarmSensorCommand.SupportedReport)
@ccValueProperty(
	"supportedSensorTypes",
	AlarmSensorCCValues.supportedSensorTypes,
)
export class AlarmSensorCCSupportedReport extends AlarmSensorCC {
	public constructor(
		options: WithAddress<AlarmSensorCCSupportedReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.supportedSensorTypes = options.supportedSensorTypes;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): AlarmSensorCCSupportedReport {
		validatePayload(raw.payload.length >= 1);
		const bitMaskLength = raw.payload[0];
		validatePayload(raw.payload.length >= 1 + bitMaskLength);
		const supportedSensorTypes: AlarmSensorType[] = parseBitMask(
			raw.payload.subarray(1, 1 + bitMaskLength),
			AlarmSensorType["General Purpose"],
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			supportedSensorTypes,
		});
	}

	public supportedSensorTypes: AlarmSensorType[];

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;
		// Create metadata for each sensor type
		for (const type of this.supportedSensorTypes) {
			this.createMetadataForSensorType(ctx, type);
		}
		return true;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"supported sensor types": this.supportedSensorTypes
					.map((t) => getEnumMemberName(AlarmSensorType, t))
					.join(", "),
			},
		};
	}
}

@CCCommand(AlarmSensorCommand.SupportedGet)
@expectedCCResponse(AlarmSensorCCSupportedReport)
export class AlarmSensorCCSupportedGet extends AlarmSensorCC {}
