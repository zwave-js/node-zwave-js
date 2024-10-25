import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type Scale,
	type SupervisionResult,
	ValueMetadata,
	type ValueMetadataNumeric,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	encodeFloatWithScale,
	getNamedScale,
	getUnknownScale,
	parseBitMask,
	parseFloatWithScale,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
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
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	type HumidityControlSetpointCapabilities,
	HumidityControlSetpointCommand,
	HumidityControlSetpointType,
	type HumidityControlSetpointValue,
} from "../lib/_Types";

export const HumidityControlSetpointCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Humidity Control Setpoint"], {
		...V.staticProperty("supportedSetpointTypes", undefined, {
			internal: true,
		}),
	}),

	...V.defineDynamicCCValues(CommandClasses["Humidity Control Setpoint"], {
		...V.dynamicPropertyAndKeyWithName(
			"setpoint",
			"setpoint",
			(setpointType: number) => setpointType,
			({ property, propertyKey }) =>
				property === "setpoint" && typeof propertyKey === "number",
			(setpointType: number) => ({
				// This is the base metadata that will be extended on the fly
				...ValueMetadata.Number,
				label: `Setpoint (${
					getEnumMemberName(
						HumidityControlSetpointType,
						setpointType,
					)
				})`,
				ccSpecific: { setpointType },
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"setpointScale",
			"setpointScale",
			(setpointType: number) => setpointType,
			({ property, propertyKey }) =>
				property === "setpointScale" && typeof propertyKey === "number",
			(setpointType: number) => ({
				...ValueMetadata.ReadOnlyUInt8,
				label: `Setpoint scale (${
					getEnumMemberName(
						HumidityControlSetpointType,
						setpointType,
					)
				})`,
			} as const),
		),
	}),
});

function getScale(scale: number): Scale {
	return getNamedScale("humidity", scale as any) ?? getUnknownScale(scale);
}
function getSetpointUnit(scale: number): string {
	return getScale(scale).unit ?? "";
}

@API(CommandClasses["Humidity Control Setpoint"])
export class HumidityControlSetpointCCAPI extends CCAPI {
	public supportsCommand(
		cmd: HumidityControlSetpointCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case HumidityControlSetpointCommand.Get:
			case HumidityControlSetpointCommand.SupportedGet:
			case HumidityControlSetpointCommand.CapabilitiesGet:
				return this.isSinglecast();
			case HumidityControlSetpointCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: HumidityControlSetpointCCAPI,
			{ property, propertyKey },
			value,
		) {
			if (property !== "setpoint") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof propertyKey !== "number") {
				throw new ZWaveError(
					`${
						CommandClasses[this.ccId]
					}: "${property}" must be further specified by a numeric property key`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}

			const scaleValueId = HumidityControlSetpointCCValues.setpointScale(
				propertyKey,
			).endpoint(this.endpoint.index);
			const preferredScale = this.tryGetValueDB()?.getValue<number>(
				scaleValueId,
			);

			const result = await this.set(
				propertyKey,
				value,
				preferredScale ?? 0,
			);

			// Verify the change after a delay, unless the command was supervised and successful
			if (this.isSinglecast() && !supervisedCommandSucceeded(result)) {
				this.schedulePoll({ property, propertyKey }, value);
			}

			return result;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: HumidityControlSetpointCCAPI,
			{ property, propertyKey },
		) {
			switch (property) {
				case "setpoint":
					if (typeof propertyKey !== "number") {
						throw new ZWaveError(
							`${
								CommandClasses[this.ccId]
							}: "${property}" must be further specified by a numeric property key`,
							ZWaveErrorCodes.Argument_Invalid,
						);
					}

					return (await this.get(propertyKey))?.value;
				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	@validateArgs()
	public async get(
		setpointType: HumidityControlSetpointType,
	): Promise<MaybeNotKnown<HumidityControlSetpointValue>> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.Get,
		);

		const cc = new HumidityControlSetpointCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			setpointType,
		});
		const response = await this.host.sendCommand<
			HumidityControlSetpointCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (!response) return;
		return response.type === HumidityControlSetpointType["N/A"]
			// not supported
			? undefined
			// supported
			: {
				value: response.value,
				scale: response.scale,
			};
	}

	@validateArgs()
	public async set(
		setpointType: HumidityControlSetpointType,
		value: number,
		scale: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.Set,
		);

		const cc = new HumidityControlSetpointCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			setpointType,
			value,
			scale,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getCapabilities(
		setpointType: HumidityControlSetpointType,
	): Promise<MaybeNotKnown<HumidityControlSetpointCapabilities>> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.CapabilitiesGet,
		);

		const cc = new HumidityControlSetpointCCCapabilitiesGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			setpointType,
		});
		const response = await this.host.sendCommand<
			HumidityControlSetpointCCCapabilitiesReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"minValue",
				"maxValue",
				"minValueScale",
				"maxValueScale",
			]);
		}
	}

	public async getSupportedSetpointTypes(): Promise<
		MaybeNotKnown<readonly HumidityControlSetpointType[]>
	> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.SupportedGet,
		);

		const cc = new HumidityControlSetpointCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			HumidityControlSetpointCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedSetpointTypes;
	}

	@validateArgs()
	public async getSupportedScales(
		setpointType: HumidityControlSetpointType,
	): Promise<MaybeNotKnown<readonly Scale[]>> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.SupportedGet,
		);

		const cc = new HumidityControlSetpointCCScaleSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			setpointType,
		});
		const response = await this.host.sendCommand<
			HumidityControlSetpointCCScaleSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return response.supportedScales.map((scale) => getScale(scale));
		}
	}
}

@commandClass(CommandClasses["Humidity Control Setpoint"])
@implementedVersion(2)
@ccValues(HumidityControlSetpointCCValues)
export class HumidityControlSetpointCC extends CommandClass {
	declare ccCommand: HumidityControlSetpointCommand;

	public translatePropertyKey(
		ctx: GetValueDB,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (property === "setpoint") {
			return getEnumMemberName(
				HumidityControlSetpointType,
				propertyKey as any,
			);
		} else {
			return super.translatePropertyKey(ctx, property, propertyKey);
		}
	}

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Humidity Control Setpoint"],
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

		// Query the supported setpoint types
		let setpointTypes: HumidityControlSetpointType[] = [];
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "retrieving supported setpoint types...",
			direction: "outbound",
		});
		const resp = await api.getSupportedSetpointTypes();
		if (resp) {
			setpointTypes = [...resp];
			const logMessage = "received supported setpoint types:\n"
				+ setpointTypes
					.map((type) =>
						getEnumMemberName(HumidityControlSetpointType, type)
					)
					.map((name) => `· ${name}`)
					.join("\n");

			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying supported setpoint types timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		for (const type of setpointTypes) {
			const setpointName = getEnumMemberName(
				HumidityControlSetpointType,
				type,
			);
			// Find out the capabilities of this setpoint
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`retrieving capabilities for setpoint ${setpointName}...`,
				direction: "outbound",
			});
			const setpointScaleSupported = await api.getSupportedScales(type);
			if (setpointScaleSupported) {
				const logMessage =
					`received supported scales for setpoint ${setpointName}: 
${
						setpointScaleSupported
							.map((t) => `\n· ${t.key} ${t.unit} - ${t.label}`)
							.join("")
					}`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});

				const scaleValue = HumidityControlSetpointCCValues
					.setpointScale(type);
				const states: Record<number, string> = {};
				for (const scale of setpointScaleSupported) {
					if (scale.unit) states[scale.key] = scale.unit;
				}
				this.setMetadata(ctx, scaleValue, {
					...scaleValue.meta,
					states,
				});
			}
			const setpointCaps = await api.getCapabilities(type);
			if (setpointCaps) {
				const minValueUnit = getSetpointUnit(
					setpointCaps.minValueScale,
				);
				const maxValueUnit = getSetpointUnit(
					setpointCaps.maxValueScale,
				);
				const logMessage =
					`received capabilities for setpoint ${setpointName}:
minimum value: ${setpointCaps.minValue} ${minValueUnit}
maximum value: ${setpointCaps.maxValue} ${maxValueUnit}`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}

		// Query the current value for all setpoint types
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
			CommandClasses["Humidity Control Setpoint"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const setpointTypes: HumidityControlSetpointType[] = this.getValue(
			ctx,
			HumidityControlSetpointCCValues.supportedSetpointTypes,
		) ?? [];

		// Query each setpoint's current value
		for (const type of setpointTypes) {
			const setpointName = getEnumMemberName(
				HumidityControlSetpointType,
				type,
			);
			// Every time, query the current value
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`querying current value of setpoint ${setpointName}...`,
				direction: "outbound",
			});
			const setpoint = await api.get(type);
			if (setpoint) {
				const logMessage =
					`received current value of setpoint ${setpointName}: ${setpoint.value} ${
						getScale(setpoint.scale).unit ?? ""
					}`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}
}

// @publicAPI
export interface HumidityControlSetpointCCSetOptions {
	setpointType: HumidityControlSetpointType;
	value: number;
	scale: number;
}

@CCCommand(HumidityControlSetpointCommand.Set)
@useSupervision()
export class HumidityControlSetpointCCSet extends HumidityControlSetpointCC {
	public constructor(
		options: WithAddress<HumidityControlSetpointCCSetOptions>,
	) {
		super(options);
		this.setpointType = options.setpointType;
		this.value = options.value;
		this.scale = options.scale;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): HumidityControlSetpointCCSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new HumidityControlSetpointCCSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public setpointType: HumidityControlSetpointType;
	public value: number;
	public scale: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.setpointType & 0b1111]),
			encodeFloatWithScale(this.value, this.scale),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const scale = getScale(this.scale);
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

// @publicAPI
export interface HumidityControlSetpointCCReportOptions {
	type: HumidityControlSetpointType;
	scale: number;
	value: number;
}

@CCCommand(HumidityControlSetpointCommand.Report)
export class HumidityControlSetpointCCReport extends HumidityControlSetpointCC {
	public constructor(
		options: WithAddress<HumidityControlSetpointCCReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.type = options.type;
		this.value = options.value;
		this.scale = options.scale;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): HumidityControlSetpointCCReport {
		validatePayload(raw.payload.length >= 1);
		const type: HumidityControlSetpointType = raw.payload[0] & 0b1111;

		// Setpoint type 0 is not defined in the spec, prevent devices from using it.
		if (type === 0) {
			// Not supported
			return new HumidityControlSetpointCCReport({
				nodeId: ctx.sourceNodeId,
				type,
				value: 0,
				scale: 0,
			});
		}

		// parseFloatWithScale does its own validation
		const { value, scale } = parseFloatWithScale(raw.payload.subarray(1));

		return new HumidityControlSetpointCCReport({
			nodeId: ctx.sourceNodeId,
			type,
			value,
			scale,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		const scale = getScale(this.scale);

		const setpointValue = HumidityControlSetpointCCValues.setpoint(
			this.type,
		);
		const existingMetadata = this.getMetadata<ValueMetadataNumeric>(
			ctx,
			setpointValue,
		);

		// Update the metadata when it is missing or the unit has changed
		if (existingMetadata?.unit !== scale.unit) {
			this.setMetadata(ctx, setpointValue, {
				...(existingMetadata ?? setpointValue.meta),
				unit: scale.unit,
			});
		}
		this.setValue(ctx, setpointValue, this.value);

		// Remember the device-preferred setpoint scale so it can be used in SET commands
		this.setValue(
			ctx,
			HumidityControlSetpointCCValues.setpointScale(this.type),
			this.scale,
		);
		return true;
	}

	public type: HumidityControlSetpointType;
	public scale: number;
	public value: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const scale = getScale(this.scale);
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.type,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

function testResponseForHumidityControlSetpointGet(
	sent: HumidityControlSetpointCCGet,
	received: HumidityControlSetpointCCReport,
) {
	// We expect a Humidity Control Setpoint Report that matches the requested setpoint type
	return received.type === sent.setpointType;
}

// @publicAPI
export interface HumidityControlSetpointCCGetOptions {
	setpointType: HumidityControlSetpointType;
}

@CCCommand(HumidityControlSetpointCommand.Get)
@expectedCCResponse(
	HumidityControlSetpointCCReport,
	testResponseForHumidityControlSetpointGet,
)
export class HumidityControlSetpointCCGet extends HumidityControlSetpointCC {
	public constructor(
		options: WithAddress<HumidityControlSetpointCCGetOptions>,
	) {
		super(options);
		this.setpointType = options.setpointType;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): HumidityControlSetpointCCGet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new HumidityControlSetpointCCGet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public setpointType: HumidityControlSetpointType;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

// @publicAPI
export interface HumidityControlSetpointCCSupportedReportOptions {
	supportedSetpointTypes: HumidityControlSetpointType[];
}

@CCCommand(HumidityControlSetpointCommand.SupportedReport)
export class HumidityControlSetpointCCSupportedReport
	extends HumidityControlSetpointCC
{
	public constructor(
		options: WithAddress<HumidityControlSetpointCCSupportedReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.supportedSetpointTypes = options.supportedSetpointTypes;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): HumidityControlSetpointCCSupportedReport {
		validatePayload(raw.payload.length >= 1);
		const supportedSetpointTypes: HumidityControlSetpointType[] =
			parseBitMask(
				raw.payload,
				HumidityControlSetpointType["N/A"],
			);

		return new HumidityControlSetpointCCSupportedReport({
			nodeId: ctx.sourceNodeId,
			supportedSetpointTypes,
		});
	}

	@ccValue(HumidityControlSetpointCCValues.supportedSetpointTypes)
	public readonly supportedSetpointTypes:
		readonly HumidityControlSetpointType[];

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"supported setpoint types": this.supportedSetpointTypes
					.map(
						(t) =>
							`\n· ${
								getEnumMemberName(
									HumidityControlSetpointType,
									t,
								)
							}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(HumidityControlSetpointCommand.SupportedGet)
@expectedCCResponse(HumidityControlSetpointCCSupportedReport)
export class HumidityControlSetpointCCSupportedGet
	extends HumidityControlSetpointCC
{}

// @publicAPI
export interface HumidityControlSetpointCCScaleSupportedReportOptions {
	supportedScales: number[];
}

@CCCommand(HumidityControlSetpointCommand.ScaleSupportedReport)
export class HumidityControlSetpointCCScaleSupportedReport
	extends HumidityControlSetpointCC
{
	public constructor(
		options: WithAddress<
			HumidityControlSetpointCCScaleSupportedReportOptions
		>,
	) {
		super(options);

		// TODO: Check implementation:
		this.supportedScales = options.supportedScales;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): HumidityControlSetpointCCScaleSupportedReport {
		validatePayload(raw.payload.length >= 1);
		const supportedScales = parseBitMask(
			Buffer.from([raw.payload[0] & 0b1111]),
			0,
		);

		return new HumidityControlSetpointCCScaleSupportedReport({
			nodeId: ctx.sourceNodeId,
			supportedScales,
		});
	}

	public readonly supportedScales: readonly number[];

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const supportedScales = this.supportedScales.map((scale) =>
			getScale(scale)
		);
		return {
			...super.toLogEntry(ctx),
			message: {
				"scale supported": supportedScales
					.map((t) => `\n· ${t.key} ${t.unit} - ${t.label}`)
					.join(""),
			},
		};
	}
}

// @publicAPI
export interface HumidityControlSetpointCCScaleSupportedGetOptions {
	setpointType: HumidityControlSetpointType;
}

@CCCommand(HumidityControlSetpointCommand.ScaleSupportedGet)
@expectedCCResponse(HumidityControlSetpointCCScaleSupportedReport)
export class HumidityControlSetpointCCScaleSupportedGet
	extends HumidityControlSetpointCC
{
	public constructor(
		options: WithAddress<HumidityControlSetpointCCScaleSupportedGetOptions>,
	) {
		super(options);
		this.setpointType = options.setpointType;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): HumidityControlSetpointCCScaleSupportedGet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new HumidityControlSetpointCCScaleSupportedGet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public setpointType: HumidityControlSetpointType;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

// @publicAPI
export interface HumidityControlSetpointCCCapabilitiesReportOptions {
	type: HumidityControlSetpointType;
	minValue: number;
	maxValue: number;
	minValueScale: number;
	maxValueScale: number;
}

@CCCommand(HumidityControlSetpointCommand.CapabilitiesReport)
export class HumidityControlSetpointCCCapabilitiesReport
	extends HumidityControlSetpointCC
{
	public constructor(
		options: WithAddress<
			HumidityControlSetpointCCCapabilitiesReportOptions
		>,
	) {
		super(options);

		this.type = options.type;
		this.minValue = options.minValue;
		this.maxValue = options.maxValue;
		this.minValueScale = options.minValueScale;
		this.maxValueScale = options.maxValueScale;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): HumidityControlSetpointCCCapabilitiesReport {
		validatePayload(raw.payload.length >= 1);
		const type: HumidityControlSetpointType = raw.payload[0] & 0b1111;

		// parseFloatWithScale does its own validation
		const {
			value: minValue,
			scale: minValueScale,
			bytesRead,
		} = parseFloatWithScale(raw.payload.subarray(1));
		const { value: maxValue, scale: maxValueScale } = parseFloatWithScale(
			raw.payload.subarray(1 + bytesRead),
		);

		return new HumidityControlSetpointCCCapabilitiesReport({
			nodeId: ctx.sourceNodeId,
			type,
			minValue,
			minValueScale,
			maxValue,
			maxValueScale,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Predefine the metadata
		const setpointValue = HumidityControlSetpointCCValues.setpoint(
			this.type,
		);
		this.setMetadata(ctx, setpointValue, {
			...setpointValue.meta,
			min: this.minValue,
			max: this.maxValue,
			unit: getSetpointUnit(this.minValueScale)
				|| getSetpointUnit(this.maxValueScale),
		});

		return true;
	}

	public type: HumidityControlSetpointType;
	public minValue: number;
	public maxValue: number;
	public minValueScale: number;
	public maxValueScale: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const minValueScale = getScale(this.minValueScale);
		const maxValueScale = getScale(this.maxValueScale);
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.type,
				),
				"min value": `${this.minValue} ${minValueScale.unit}`,
				"max value": `${this.maxValue} ${maxValueScale.unit}`,
			},
		};
	}
}

// @publicAPI
export interface HumidityControlSetpointCCCapabilitiesGetOptions {
	setpointType: HumidityControlSetpointType;
}

@CCCommand(HumidityControlSetpointCommand.CapabilitiesGet)
@expectedCCResponse(HumidityControlSetpointCCCapabilitiesReport)
export class HumidityControlSetpointCCCapabilitiesGet
	extends HumidityControlSetpointCC
{
	public constructor(
		options: WithAddress<HumidityControlSetpointCCCapabilitiesGetOptions>,
	) {
		super(options);
		this.setpointType = options.setpointType;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): HumidityControlSetpointCCCapabilitiesGet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new HumidityControlSetpointCCCapabilitiesGet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public setpointType: HumidityControlSetpointType;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
			},
		};
	}
}
