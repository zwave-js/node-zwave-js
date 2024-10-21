import {
	CommandClasses,
	type EndpointId,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	ValueMetadata,
	type WithAddress,
	encodeBitMask,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { getEnumMemberName, isEnumMember } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	type PollValueImplementation,
	throwUnsupportedProperty,
} from "../lib/API";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
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
import { BinarySensorCommand, BinarySensorType } from "../lib/_Types";

export const BinarySensorCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Binary Sensor"], {
		...V.staticProperty("supportedSensorTypes", undefined, {
			internal: true,
		}),
	}),

	...V.defineDynamicCCValues(CommandClasses["Binary Sensor"], {
		...V.dynamicPropertyWithName(
			"state",
			/* property */ (sensorType: BinarySensorType) =>
				getEnumMemberName(BinarySensorType, sensorType),
			({ property }) =>
				typeof property === "string" && property in BinarySensorType,
			/* meta */ (sensorType: BinarySensorType) => ({
				...ValueMetadata.ReadOnlyBoolean,
				label: `Sensor state (${
					getEnumMemberName(
						BinarySensorType,
						sensorType,
					)
				})`,
				ccSpecific: { sensorType },
			} as const),
		),
	}),
});

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Binary Sensor"])
export class BinarySensorCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: BinarySensorCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case BinarySensorCommand.Get:
			case BinarySensorCommand.Report:
				return true; // This is mandatory
			case BinarySensorCommand.SupportedGet:
			case BinarySensorCommand.SupportedReport:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: BinarySensorCCAPI, { property }) {
			if (typeof property === "string") {
				const sensorType = (BinarySensorType as any)[property] as
					| BinarySensorType
					| undefined;
				if (sensorType) return this.get(sensorType);
			}
			throwUnsupportedProperty(this.ccId, property);
		};
	}

	/**
	 * Retrieves the current value from this sensor
	 * @param sensorType The (optional) sensor type to retrieve the value for
	 */
	@validateArgs({ strictEnums: true })
	public async get(
		sensorType?: BinarySensorType,
	): Promise<MaybeNotKnown<boolean>> {
		this.assertSupportsCommand(
			BinarySensorCommand,
			BinarySensorCommand.Get,
		);

		const cc = new BinarySensorCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			sensorType,
		});
		const response = await this.host.sendCommand<BinarySensorCCReport>(
			cc,
			this.commandOptions,
		);
		// We don't want to repeat the sensor type
		return response?.value;
	}

	@validateArgs()
	public async sendReport(
		value: boolean,
		sensorType?: BinarySensorType,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			BinarySensorCommand,
			BinarySensorCommand.Report,
		);

		const cc = new BinarySensorCCReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			value,
			type: sensorType,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async getSupportedSensorTypes(): Promise<
		readonly BinarySensorType[] | undefined
	> {
		this.assertSupportsCommand(
			BinarySensorCommand,
			BinarySensorCommand.SupportedGet,
		);

		const cc = new BinarySensorCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			BinarySensorCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		// We don't want to repeat the sensor type
		return response?.supportedSensorTypes;
	}

	@validateArgs()
	public async reportSupportedSensorTypes(
		supported: BinarySensorType[],
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			BinarySensorCommand,
			BinarySensorCommand.SupportedReport,
		);

		const cc = new BinarySensorCCSupportedReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			supportedSensorTypes: supported,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Binary Sensor"])
@implementedVersion(2)
@ccValues(BinarySensorCCValues)
export class BinarySensorCC extends CommandClass {
	declare ccCommand: BinarySensorCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Binary Sensor"],
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
		if (api.version >= 2) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying supported sensor types...",
				direction: "outbound",
			});
			const supportedSensorTypes = await api.getSupportedSensorTypes();
			if (supportedSensorTypes) {
				const logMessage = `received supported sensor types: ${
					supportedSensorTypes
						.map((type) =>
							getEnumMemberName(BinarySensorType, type)
						)
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
		}

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
			CommandClasses["Binary Sensor"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query (all of) the sensor's current value(s)
		if (api.version === 1) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying current value...",
				direction: "outbound",
			});
			const currentValue = await api.get();
			if (currentValue != undefined) {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `received current value: ${currentValue}`,
					direction: "inbound",
				});
			}
		} else {
			const supportedSensorTypes: readonly BinarySensorType[] =
				this.getValue(
					ctx,
					BinarySensorCCValues.supportedSensorTypes,
				) ?? [];

			for (const type of supportedSensorTypes) {
				// Some devices report invalid sensor types, but the CC API checks
				// for valid values and throws otherwise.
				if (!isEnumMember(BinarySensorType, type)) continue;

				const sensorName = getEnumMemberName(BinarySensorType, type);
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying current value for ${sensorName}...`,
					direction: "outbound",
				});
				const currentValue = await api.get(type);
				if (currentValue != undefined) {
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							`received current value for ${sensorName}: ${currentValue}`,
						direction: "inbound",
					});
				}
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
	): MaybeNotKnown<BinarySensorType[]> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				BinarySensorCCValues.supportedSensorTypes.endpoint(
					endpoint.index,
				),
			);
	}

	public setMappedBasicValue(
		ctx: GetValueDB,
		value: number,
	): boolean {
		this.setValue(
			ctx,
			BinarySensorCCValues.state(BinarySensorType.Any),
			value > 0,
		);
		return true;
	}
}

// @publicAPI
export interface BinarySensorCCReportOptions {
	type?: BinarySensorType;
	value: boolean;
}

@CCCommand(BinarySensorCommand.Report)
export class BinarySensorCCReport extends BinarySensorCC {
	public constructor(
		options: WithAddress<BinarySensorCCReportOptions>,
	) {
		super(options);

		this.type = options.type ?? BinarySensorType.Any;
		this.value = options.value;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): BinarySensorCCReport {
		validatePayload(raw.payload.length >= 1);
		const value = raw.payload[0] === 0xff;
		let type: BinarySensorType = BinarySensorType.Any;

		if (raw.payload.length >= 2) {
			type = raw.payload[1];
		}

		return new BinarySensorCCReport({
			nodeId: ctx.sourceNodeId,
			value,
			type,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Workaround for devices reporting with sensor type Any -> find first supported sensor type and use that
		let sensorType = this.type;
		if (sensorType === BinarySensorType.Any) {
			const supportedSensorTypes = this.getValue<BinarySensorType[]>(
				ctx,
				BinarySensorCCValues.supportedSensorTypes,
			);
			if (supportedSensorTypes?.length) {
				sensorType = supportedSensorTypes[0];
			}
		}

		const binarySensorValue = BinarySensorCCValues.state(sensorType);
		this.setMetadata(ctx, binarySensorValue, binarySensorValue.meta);
		this.setValue(ctx, binarySensorValue, this.value);

		return true;
	}

	public type: BinarySensorType;
	public value: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.value ? 0xff : 0x00, this.type]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				type: getEnumMemberName(BinarySensorType, this.type),
				value: this.value,
			},
		};
	}
}

function testResponseForBinarySensorGet(
	sent: BinarySensorCCGet,
	received: BinarySensorCCReport,
) {
	// We expect a Binary Sensor Report that matches the requested sensor type (if a type was requested)
	return (
		sent.sensorType == undefined
		|| sent.sensorType === BinarySensorType.Any
		|| received.type === sent.sensorType
		// This is technically not correct, but some devices do this anyways
		|| received.type === BinarySensorType.Any
	);
}

// @publicAPI
export interface BinarySensorCCGetOptions {
	sensorType?: BinarySensorType;
}

@CCCommand(BinarySensorCommand.Get)
@expectedCCResponse(BinarySensorCCReport, testResponseForBinarySensorGet)
export class BinarySensorCCGet extends BinarySensorCC {
	public constructor(
		options: WithAddress<BinarySensorCCGetOptions>,
	) {
		super(options);
		this.sensorType = options.sensorType;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): BinarySensorCCGet {
		let sensorType: BinarySensorType | undefined;

		if (raw.payload.length >= 1) {
			sensorType = raw.payload[0];
		}

		return new BinarySensorCCGet({
			nodeId: ctx.sourceNodeId,
			sensorType,
		});
	}

	public sensorType: BinarySensorType | undefined;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.sensorType ?? BinarySensorType.Any]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				type: getEnumMemberName(
					BinarySensorType,
					this.sensorType ?? BinarySensorType.Any,
				),
			},
		};
	}
}

// @publicAPI
export interface BinarySensorCCSupportedReportOptions {
	supportedSensorTypes: BinarySensorType[];
}

@CCCommand(BinarySensorCommand.SupportedReport)
export class BinarySensorCCSupportedReport extends BinarySensorCC {
	public constructor(
		options: WithAddress<BinarySensorCCSupportedReportOptions>,
	) {
		super(options);

		this.supportedSensorTypes = options.supportedSensorTypes;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): BinarySensorCCSupportedReport {
		validatePayload(raw.payload.length >= 1);
		// The enumeration starts at 1, but the first (reserved) bit is included
		// in the report
		const supportedSensorTypes: BinarySensorType[] = parseBitMask(
			raw.payload,
			0,
		)
			.filter(
				(t) => t !== 0,
			);

		return new BinarySensorCCSupportedReport({
			nodeId: ctx.sourceNodeId,
			supportedSensorTypes,
		});
	}

	@ccValue(BinarySensorCCValues.supportedSensorTypes)
	public supportedSensorTypes: BinarySensorType[];

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = encodeBitMask(
			this.supportedSensorTypes.filter((t) => t !== BinarySensorType.Any),
			undefined,
			0,
		);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"supported types": this.supportedSensorTypes
					.map((type) => getEnumMemberName(BinarySensorType, type))
					.join(", "),
			},
		};
	}
}

@CCCommand(BinarySensorCommand.SupportedGet)
@expectedCCResponse(BinarySensorCCSupportedReport)
export class BinarySensorCCSupportedGet extends BinarySensorCC {}
