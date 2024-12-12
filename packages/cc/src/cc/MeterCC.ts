import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import { type GetDeviceConfig } from "@zwave-js/config";
import {
	type FloatParameters,
	type GetNode,
	type GetSupportedCCVersion,
	type GetValueDB,
	type MaybeUnknown,
	type WithAddress,
	encodeBitMask,
	encodeFloatWithScale,
	getFloatParameters,
	getMeter,
	getMeterName,
	getMeterScale,
	getUnknownMeterScale,
	timespan,
} from "@zwave-js/core";
import {
	CommandClasses,
	type ControlsCC,
	type EndpointId,
	type GetEndpoint,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type NodeId,
	type SinglecastCC,
	type SupervisionResult,
	type SupportsCC,
	UNKNOWN_STATE,
	ValueMetadata,
	parseBitMask,
	parseFloatWithScale,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import {
	type AllOrNone,
	getEnumMemberName,
	num2hex,
	pick,
} from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	type PollValueImplementation,
	SET_VALUE,
	SET_VALUE_HOOKS,
	type SetValueImplementation,
	type SetValueImplementationHooksFactory,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
	getEffectiveCCVersion,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	getCommandClass,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import { MeterCommand, type MeterReading, RateType } from "../lib/_Types.js";

export const MeterCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Meter, {
		...V.staticProperty("type", undefined, { internal: true }),
		...V.staticProperty("supportsReset", undefined, { internal: true }),
		...V.staticProperty("supportedScales", undefined, { internal: true }),
		...V.staticProperty("supportedRateTypes", undefined, {
			internal: true,
		}),

		...V.staticPropertyWithName(
			"resetAll",
			"reset",
			{
				...ValueMetadata.WriteOnlyBoolean,
				label: `Reset accumulated values`,
				states: {
					true: "Reset",
				},
			} as const,
		),
	}),

	...V.defineDynamicCCValues(CommandClasses.Meter, {
		...V.dynamicPropertyAndKeyWithName(
			"resetSingle",
			"reset",
			toPropertyKey,
			({ property, propertyKey }) =>
				property === "reset" && typeof propertyKey === "number",
			(meterType: number, rateType: RateType, scale: number) => ({
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
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"value",
			"value",
			toPropertyKey,
			({ property, propertyKey }) =>
				property === "value" && typeof propertyKey === "number",
			(meterType: number, rateType: RateType, scale: number) => ({
				...ValueMetadata.ReadOnlyNumber,
				// Label and unit can only be determined with a config manager
				ccSpecific: {
					meterType,
					rateType,
					scale,
				},
			} as const),
		),
	}),
});

function toPropertyKey(
	meterType: number,
	rateType: RateType,
	scale: number,
): number {
	return (meterType << 16) | (scale << 8) | rateType;
}

function splitPropertyKey(key: number): {
	meterType: number;
	rateType: RateType;
	scale: number;
} {
	return {
		rateType: key & 0xff,
		scale: (key >>> 8) & 0xff,
		meterType: key >>> 16,
	};
}

function getValueLabel(
	meterType: number,
	scale: number,
	rateType: RateType,
	suffix?: string,
): string {
	let ret = getMeterName(meterType);
	const scaleLabel =
		(getMeterScale(meterType, scale) ?? getUnknownMeterScale(scale)).label;
	switch (rateType) {
		case RateType.Consumed:
			ret += ` Consumption [${scaleLabel}]`;
			break;
		case RateType.Produced:
			ret += ` Production [${scaleLabel}]`;
			break;
		default:
			ret += ` [${scaleLabel}]`;
	}
	if (suffix) {
		ret += ` (${suffix})`;
	}
	return ret;
}

function parseMeterValueAndInfo(data: Uint8Array, offset: number): {
	type: number;
	rateType: RateType;
	scale1: number;
	value: number;
	bytesRead: number;
} {
	validatePayload(data.length >= offset + 1);

	const type = data[offset] & 0b0_00_11111;
	const rateType = (data[offset] & 0b0_11_00000) >>> 5;
	const scale1Bit2 = (data[offset] & 0b1_00_00000) >>> 7;

	const {
		scale: scale1Bits10,
		value,
		bytesRead,
	} = parseFloatWithScale(data.subarray(offset + 1));

	return {
		type,
		rateType,
		// The scale is composed of two fields
		scale1: (scale1Bit2 << 2) | scale1Bits10,
		value,
		// We've read one byte more than the float contains
		bytesRead: bytesRead + 1,
	};
}

function encodeMeterValueAndInfo(
	type: number,
	rateType: RateType,
	scale: number,
	value: number,
): { data: Bytes; floatParams: FloatParameters; scale2: number | undefined } {
	// We need at least 2 bytes

	const scale1 = scale >= 7 ? 7 : scale & 0b111;
	const scale1Bits10 = scale1 & 0b11;
	const scale1Bit2 = scale1 >>> 2;
	const scale2 = scale >= 7 ? scale - 7 : undefined;

	const typeByte = (type & 0b0_00_11111)
		| ((rateType & 0b11) << 5)
		| (scale1Bit2 << 7);

	const floatParams = getFloatParameters(value);
	const valueBytes = encodeFloatWithScale(
		value,
		scale1Bits10,
		floatParams,
	);

	return {
		data: Bytes.concat([Bytes.from([typeByte]), valueBytes]),
		floatParams: pick(floatParams, ["precision", "size"]),
		scale2,
	};
}

function parseScale(
	scale1: number,
	data: Uint8Array,
	scale2Offset: number,
): number {
	if (scale1 === 7) {
		validatePayload(data.length >= scale2Offset + 1);
		const scale2 = data[scale2Offset];
		return scale1 + scale2;
	} else {
		return scale1;
	}
}

export function isAccumulatedValue(
	meterType: number,
	scale: number,
): boolean {
	// FIXME: We should probably move the meter definitions into code
	switch (meterType) {
		case 0x01: // Electric
			return (
				// kVarh
				// Pulse count
				scale === 0x00 // kWh
				|| scale === 0x01 // kVAh
				|| scale === 0x03
				|| scale === 0x08
			);
		case 0x02: // Gas
			return (
				// Pulse count
				// ft³
				scale === 0x00 // m³
				|| scale === 0x01
				|| scale === 0x03
			);
		case 0x03: // Water
			return (
				// Pulse count
				// US gallons
				scale === 0x00 // m³
				|| scale === 0x01 // ft³
				|| scale === 0x02
				|| scale === 0x03
			);
		case 0x04: // Heating
			return scale === 0x00; // kWh
		case 0x05: // Cooling
			return scale === 0x00; // kWh
	}
	return false;
}

@API(CommandClasses.Meter)
export class MeterCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: MeterCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case MeterCommand.Get:
			case MeterCommand.Report:
				return true; // This is mandatory
			case MeterCommand.SupportedGet:
			case MeterCommand.SupportedReport:
				return this.version >= 2;
			case MeterCommand.Reset: {
				const ret = this.tryGetValueDB()?.getValue<boolean>({
					commandClass: getCommandClass(this),
					endpoint: this.endpoint.index,
					property: "supportsReset",
				});
				return ret === true;
			}
		}
		return super.supportsCommand(cmd);
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: MeterCCAPI, { property, propertyKey }) {
			switch (property) {
				case "value":
				case "previousValue":
				case "deltaTime": {
					if (propertyKey == undefined) {
						throwMissingPropertyKey(this.ccId, property);
					} else if (typeof propertyKey !== "number") {
						throwUnsupportedPropertyKey(
							this.ccId,
							property,
							propertyKey,
						);
					}

					const { rateType, scale } = splitPropertyKey(propertyKey);
					return (
						await this.get({
							rateType,
							scale,
						})
					)?.[property];
				}
				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	@validateArgs()
	public async get(
		options?: MeterCCGetOptions,
	): Promise<MeterReading | undefined> {
		this.assertSupportsCommand(MeterCommand, MeterCommand.Get);

		const cc = new MeterCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		const response = await this.host.sendCommand<MeterCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return {
				type: response.type,
				scale: getMeterScale(response.type, response.scale)
					?? getUnknownMeterScale(response.scale),
				...pick(response, [
					"value",
					"previousValue",
					"rateType",
					"deltaTime",
				]),
			};
		}
	}

	@validateArgs()
	public async sendReport(
		options: MeterCCReportOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(MeterCommand, MeterCommand.Report);

		const cc = new MeterCCReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getAll(
		accumulatedOnly: boolean = false,
	): Promise<MeterReading[]> {
		const valueDB = this.tryGetValueDB();

		if (this.version >= 2) {
			const meterType = valueDB?.getValue<number>(
				MeterCCValues.type.endpoint(this.endpoint.index),
			);
			const supportedScales = valueDB?.getValue<number[]>(
				MeterCCValues.supportedScales.endpoint(this.endpoint.index),
			) ?? [];
			const supportedRateTypes = valueDB?.getValue<RateType[]>(
				MeterCCValues.supportedRateTypes.endpoint(
					this.endpoint.index,
				),
			) ?? [];

			const rateTypes = supportedRateTypes.length
				? supportedRateTypes
				: [undefined];

			const ret = [];
			for (const rateType of rateTypes) {
				for (const scale of supportedScales) {
					// Skip non-accumulated values if requested
					if (
						accumulatedOnly
						&& meterType != undefined
						&& !isAccumulatedValue(meterType, scale)
					) {
						continue;
					}

					const response = await this.get({
						scale,
						rateType,
					});
					if (response) ret.push(response);
				}
			}
			return ret;
		} else {
			const response = await this.get();
			return response ? [response] : [];
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupported() {
		this.assertSupportsCommand(MeterCommand, MeterCommand.SupportedGet);

		const cc = new MeterCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			MeterCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"type",
				"supportsReset",
				"supportedScales",
				"supportedRateTypes",
			]);
		}
	}

	@validateArgs()
	public async sendSupportedReport(
		options: MeterCCSupportedReportOptions,
	): Promise<void> {
		this.assertSupportsCommand(MeterCommand, MeterCommand.SupportedReport);

		const cc = new MeterCCSupportedReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async reset(
		options?: MeterCCResetOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(MeterCommand, MeterCommand.Reset);

		const cc = new MeterCCReset({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: MeterCCAPI,
			{ property, propertyKey },
			value,
		) {
			if (property !== "reset") {
				throwUnsupportedProperty(this.ccId, property);
			} else if (
				propertyKey != undefined
				&& typeof propertyKey !== "number"
			) {
				throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
			} else if (value !== true) {
				throwWrongValueType(
					this.ccId,
					property,
					"true",
					value === false ? "false" : typeof value,
				);
			}

			if (typeof propertyKey === "number") {
				const { meterType, scale, rateType } = splitPropertyKey(
					propertyKey,
				);
				return this.reset({
					type: meterType,
					scale,
					rateType,
					targetValue: 0,
				});
			} else {
				return this.reset();
			}

			return undefined;
		};
	}

	protected [SET_VALUE_HOOKS]: SetValueImplementationHooksFactory = (
		{ property, propertyKey },
		_value,
		_options,
	) => {
		if (property !== "reset") return;

		if (typeof propertyKey === "number") {
			// Reset single
			const { meterType, rateType, scale } = splitPropertyKey(
				propertyKey,
			);
			const readingValueId = MeterCCValues.value(
				meterType,
				rateType,
				scale,
			).endpoint(this.endpoint.index);

			return {
				optimisticallyUpdateRelatedValues: (
					supervisedAndSuccessful,
				) => {
					if (!supervisedAndSuccessful) return;

					// After resetting a single reading with supervision, store zero
					// in the corresponding value
					const valueDB = this.tryGetValueDB();
					if (!valueDB) return;

					if (isAccumulatedValue(meterType, scale)) {
						valueDB.setValue({
							commandClass: this.ccId,
							endpoint: this.endpoint.index,
							property,
							propertyKey,
						}, 0);
					}
				},

				verifyChanges: () => {
					this.schedulePoll(
						readingValueId,
						0,
						{ transition: "fast" },
					);
				},
			};
		} else {
			// Reset all
			const valueDB = this.tryGetValueDB();
			if (!valueDB) return;

			const accumulatedValues = valueDB.findValues((vid) =>
				vid.commandClass === this.ccId
				&& vid.endpoint === this.endpoint.index
				&& MeterCCValues.value.is(vid)
			).filter(({ propertyKey }) => {
				if (typeof propertyKey !== "number") return false;
				const { meterType, scale } = splitPropertyKey(propertyKey);
				return isAccumulatedValue(meterType, scale);
			});

			return {
				optimisticallyUpdateRelatedValues: (
					supervisedAndSuccessful,
				) => {
					if (!supervisedAndSuccessful) return;

					// After setting the reset all value with supervision,
					// reset all accumulated values, since we know they are now zero.
					for (const value of accumulatedValues) {
						valueDB.setValue(value, 0);
					}
				},

				verifyChanges: () => {
					// Poll all accumulated values, unless they were updated by the device
					for (const valueID of accumulatedValues) {
						this.schedulePoll(
							valueID,
							0,
							{ transition: "fast" },
						);
					}
				},
			};
		}
	};
}

@commandClass(CommandClasses.Meter)
@implementedVersion(6)
@ccValues(MeterCCValues)
export class MeterCC extends CommandClass {
	declare ccCommand: MeterCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Meter,
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

		if (api.version >= 2) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying meter support...",
				direction: "outbound",
			});

			const suppResp = await api.getSupported();
			if (suppResp) {
				const logMessage = `received meter support:
type:                 ${getMeterName(suppResp.type)}
supported scales:     ${
					suppResp.supportedScales
						.map(
							(s) =>
								(getMeterScale(suppResp.type, s)
									?? getUnknownMeterScale(s)).label,
						)
						.map((label) => `\n· ${label}`)
						.join("")
				}
supported rate types: ${
					suppResp.supportedRateTypes
						.map((rt) => getEnumMemberName(RateType, rt))
						.map((label) => `\n· ${label}`)
						.join("")
				}
supports reset:       ${suppResp.supportsReset}`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Querying meter support timed out, skipping interview...",
					level: "warn",
				});
				return;
			}
		}

		// Query current meter values
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
			CommandClasses.Meter,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		if (api.version === 1) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying default meter value...`,
				direction: "outbound",
			});
			await api.get();
		} else {
			const type: number = this.getValue(ctx, MeterCCValues.type)
				?? 0;

			const supportedScales: readonly number[] =
				this.getValue(ctx, MeterCCValues.supportedScales) ?? [];

			const supportedRateTypes: readonly RateType[] =
				this.getValue(ctx, MeterCCValues.supportedRateTypes) ?? [];

			const rateTypes = supportedRateTypes.length
				? supportedRateTypes
				: [undefined];
			for (const rateType of rateTypes) {
				for (const scale of supportedScales) {
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying meter value (type = ${
							getMeterName(type)
						}, scale = ${
							(getMeterScale(type, scale)
								?? getUnknownMeterScale(scale)).label
						}${
							rateType != undefined
								? `, rate type = ${
									getEnumMemberName(
										RateType,
										rateType,
									)
								}`
								: ""
						})...`,
						direction: "outbound",
					});
					await api.get({ scale, rateType });
				}
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
		// Poll the device when all of the supported values were last updated longer than 6 hours ago.
		// This may lead to some values not being updated, but the user may have disabled some unnecessary
		// reports to reduce traffic.
		const valueDB = ctx.tryGetValueDB(this.nodeId);
		if (!valueDB) return true;

		const values = this.getDefinedValueIDs(ctx).filter((v) =>
			MeterCCValues.value.is(v)
		);
		return values.every((v) => {
			const lastUpdated = valueDB.getTimestamp(v);
			return (
				lastUpdated == undefined
				|| Date.now() - lastUpdated > timespan.hours(6)
			);
		});
	}

	/**
	 * Returns which type this meter has.
	 * This only works AFTER the interview process
	 */
	public static getMeterTypeCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): MaybeNotKnown<number> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(MeterCCValues.type.endpoint(endpoint.index));
	}

	/**
	 * Returns which scales are supported by this meter.
	 * This only works AFTER the interview process
	 */
	public static getSupportedScalesCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): MaybeNotKnown<number[]> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(MeterCCValues.supportedScales.endpoint(endpoint.index));
	}

	/**
	 * Returns whether reset is supported by this meter.
	 * This only works AFTER the interview process
	 */
	public static supportsResetCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): MaybeNotKnown<boolean> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(MeterCCValues.supportsReset.endpoint(endpoint.index));
	}

	/**
	 * Returns which rate types are supported by this meter.
	 * This only works AFTER the interview process
	 */
	public static getSupportedRateTypesCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
	): MaybeNotKnown<RateType[]> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				MeterCCValues.supportedRateTypes.endpoint(endpoint.index),
			);
	}

	public translatePropertyKey(
		ctx: GetValueDB,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (property === "value" && typeof propertyKey === "number") {
			const { meterType, rateType, scale } = splitPropertyKey(
				propertyKey,
			);
			let ret: string;
			if (meterType !== 0) {
				ret = `${getMeterName(meterType)}_${
					(getMeterScale(meterType, scale)
						?? getUnknownMeterScale(scale)).label
				}`;
			} else {
				ret = "default";
			}
			if (rateType !== RateType.Unspecified) {
				ret += "_" + getEnumMemberName(RateType, rateType);
			}
			return ret;
		} else if (property === "reset" && typeof propertyKey === "number") {
			return getMeterName(propertyKey);
		}
		return super.translatePropertyKey(ctx, property, propertyKey);
	}
}

// @publicAPI
export interface MeterCCReportOptions {
	type: number;
	scale: number;
	value: number;
	previousValue?: MaybeNotKnown<number>;
	rateType?: RateType;
	deltaTime?: MaybeUnknown<number>;
}

@CCCommand(MeterCommand.Report)
export class MeterCCReport extends MeterCC {
	public constructor(
		options: WithAddress<MeterCCReportOptions>,
	) {
		super(options);

		this.type = options.type;
		this.scale = options.scale;
		this.value = options.value;
		this.previousValue = options.previousValue;
		this.rateType = options.rateType ?? RateType.Unspecified;
		this.deltaTime = options.deltaTime ?? UNKNOWN_STATE;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): MeterCCReport {
		const { type, rateType, scale1, value, bytesRead } =
			parseMeterValueAndInfo(raw.payload, 0);
		let offset = bytesRead;
		const floatSize = bytesRead - 2;
		let deltaTime: MaybeUnknown<number>;
		let previousValue: MaybeNotKnown<number>;

		if (raw.payload.length >= offset + 2) {
			deltaTime = raw.payload.readUInt16BE(offset);
			offset += 2;
			if (deltaTime === 0xffff) {
				deltaTime = UNKNOWN_STATE;
			}

			if (
				// Previous value is included only if delta time is not 0
				deltaTime !== 0
				&& raw.payload.length >= offset + floatSize
			) {
				const { value: prevValue } = parseFloatWithScale(
					// This float is split in the payload
					Bytes.concat([
						Bytes.from([raw.payload[1]]),
						raw.payload.subarray(offset),
					]),
				);
				offset += floatSize;
				previousValue = prevValue;
			}
		} else {
			// 0 means that no previous value is included
			deltaTime = 0;
		}
		const scale = parseScale(scale1, raw.payload, offset);

		return new this({
			nodeId: ctx.sourceNodeId,
			type,
			rateType,
			value,
			deltaTime,
			previousValue,
			scale,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		const ccVersion = getEffectiveCCVersion(ctx, this);

		const meter = getMeter(this.type);
		const scale = getMeterScale(this.type, this.scale)
			?? getUnknownMeterScale(this.scale);

		// Filter out unknown meter types and scales, unless the strict validation is disabled
		const measurementValidation = !ctx.getDeviceConfig?.(
			this.nodeId as number,
		)?.compat?.disableStrictMeasurementValidation;

		if (measurementValidation) {
			validatePayload.withReason(
				`Unknown meter type ${num2hex(this.type)} or corrupted data`,
			)(!!meter);
			validatePayload.withReason(
				`Unknown meter scale ${num2hex(this.scale)} or corrupted data`,
			)(scale.label !== getUnknownMeterScale(this.scale).label);

			// Filter out unsupported meter types, scales and rate types if possible
			if (ccVersion >= 2) {
				const expectedType = this.getValue<number>(
					ctx,
					MeterCCValues.type,
				);
				if (expectedType != undefined) {
					validatePayload.withReason(
						"Unexpected meter type or corrupted data",
					)(this.type === expectedType);
				}

				const supportedScales = this.getValue<number[]>(
					ctx,
					MeterCCValues.supportedScales,
				);
				if (supportedScales?.length) {
					validatePayload.withReason(
						`Unsupported meter scale ${scale.label} or corrupted data`,
					)(supportedScales.includes(this.scale));
				}

				const supportedRateTypes = this.getValue<RateType[]>(
					ctx,
					MeterCCValues.supportedRateTypes,
				);
				if (supportedRateTypes?.length) {
					validatePayload.withReason(
						`Unsupported rate type ${
							getEnumMemberName(
								RateType,
								this.rateType,
							)
						} or corrupted data`,
					)(supportedRateTypes.includes(this.rateType));
				}
			}
		}

		const valueValue = MeterCCValues.value(
			this.type,
			this.rateType,
			this.scale,
		);
		this.setMetadata(ctx, valueValue, {
			...valueValue.meta,
			label: getValueLabel(this.type, this.scale, this.rateType),
			unit: scale.unit,
			ccSpecific: {
				meterType: this.type,
				scale: this.scale,
				rateType: this.rateType,
			},
		});
		this.setValue(ctx, valueValue, this.value);

		return true;
	}

	public type: number;
	public scale: number;
	public value: number;
	public previousValue: MaybeNotKnown<number>;
	public rateType: RateType;
	public deltaTime: MaybeUnknown<number>;

	public serialize(ctx: CCEncodingContext): Bytes {
		const { data: typeAndValue, floatParams, scale2 } =
			encodeMeterValueAndInfo(
				this.type,
				this.rateType,
				this.scale,
				this.value,
			);

		const deltaTime = this.deltaTime ?? 0xffff;
		const deltaTimeBytes = new Bytes(2);
		deltaTimeBytes.writeUInt16BE(deltaTime, 0);

		this.payload = Bytes.concat([
			typeAndValue,
			deltaTimeBytes,
		]);

		if (this.deltaTime !== 0 && this.previousValue != undefined) {
			// Encode the float, but only keep the value bytes
			const prevValueBytes = encodeFloatWithScale(
				this.previousValue,
				0, // we discard the scale anyways
				floatParams,
			).subarray(1);

			this.payload = Bytes.concat([
				this.payload,
				prevValueBytes,
			]);
		}

		if (scale2 != undefined) {
			this.payload = Bytes.concat([
				this.payload,
				Bytes.from([scale2]),
			]);
		}

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const scale = getMeterScale(this.type, this.scale)
			?? getUnknownMeterScale(this.scale);

		const message: MessageRecord = {
			"meter type": getMeterName(this.type),
			scale: scale.label,
			"rate type": getEnumMemberName(RateType, this.rateType),
			value: this.value,
		};
		if (this.deltaTime !== UNKNOWN_STATE) {
			message["time delta"] = `${this.deltaTime} seconds`;
		}
		if (this.previousValue != undefined) {
			message["prev. value"] = this.previousValue;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

function testResponseForMeterGet(sent: MeterCCGet, received: MeterCCReport) {
	// We expect a Meter Report that matches the requested scale and rate type
	// (if they were requested)
	return (
		(sent.scale == undefined || sent.scale === received.scale)
		&& (sent.rateType == undefined || sent.rateType == received.rateType)
	);
}

// @publicAPI
export interface MeterCCGetOptions {
	scale?: number;
	rateType?: RateType;
}

@CCCommand(MeterCommand.Get)
@expectedCCResponse(MeterCCReport, testResponseForMeterGet)
export class MeterCCGet extends MeterCC {
	public constructor(
		options: WithAddress<MeterCCGetOptions>,
	) {
		super(options);
		this.rateType = options.rateType;
		this.scale = options.scale;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): MeterCCGet {
		let rateType: RateType | undefined;
		let scale: number | undefined;

		if (raw.payload.length >= 1) {
			rateType = (raw.payload[0] & 0b11_000_000) >>> 6;
			scale = (raw.payload[0] & 0b00_111_000) >>> 3;
			if (scale === 7) {
				validatePayload(raw.payload.length >= 2);
				scale += raw.payload[1];
			}
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			rateType,
			scale,
		});
	}

	public rateType: RateType | undefined;
	public scale: number | undefined;

	public serialize(ctx: CCEncodingContext): Bytes {
		let scale1: number;
		let scale2: number | undefined;
		let bufferLength = 0;

		const ccVersion = getEffectiveCCVersion(ctx, this);
		if (this.scale == undefined) {
			scale1 = 0;
		} else if (ccVersion >= 4 && this.scale >= 7) {
			scale1 = 7;
			scale2 = this.scale >>> 3;
			bufferLength = 2;
		} else if (ccVersion >= 3) {
			scale1 = this.scale & 0b111;
			bufferLength = 1;
		} else if (ccVersion >= 2) {
			scale1 = this.scale & 0b11;
			bufferLength = 1;
		} else {
			scale1 = 0;
		}

		let rateTypeFlags = 0;
		if (ccVersion >= 4 && this.rateType != undefined) {
			rateTypeFlags = this.rateType & 0b11;
			bufferLength = Math.max(bufferLength, 1);
		}

		this.payload = Bytes.alloc(bufferLength, 0);
		this.payload[0] = (rateTypeFlags << 6) | (scale1 << 3);
		if (scale2) this.payload[1] = scale2;

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.rateType != undefined) {
			message["rate type"] = getEnumMemberName(RateType, this.rateType);
		}
		if (this.scale != undefined) {
			if (ctx) {
				// Try to lookup the meter type to translate the scale
				const type = this.getValue<number>(ctx, MeterCCValues.type);
				if (type != undefined) {
					message.scale = (getMeterScale(type, this.scale)
						?? getUnknownMeterScale(this.scale)).label;
				}
			} else {
				message.scale = this.scale;
			}
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface MeterCCSupportedReportOptions {
	type: number;
	supportsReset: boolean;
	supportedScales: readonly number[];
	supportedRateTypes: readonly RateType[];
}

@CCCommand(MeterCommand.SupportedReport)
@ccValueProperty("type", MeterCCValues.type)
@ccValueProperty("supportsReset", MeterCCValues.supportsReset)
@ccValueProperty("supportedScales", MeterCCValues.supportedScales)
@ccValueProperty("supportedRateTypes", MeterCCValues.supportedRateTypes)
export class MeterCCSupportedReport extends MeterCC {
	public constructor(
		options: WithAddress<MeterCCSupportedReportOptions>,
	) {
		super(options);

		this.type = options.type;
		this.supportsReset = options.supportsReset;
		this.supportedScales = options.supportedScales;
		this.supportedRateTypes = options.supportedRateTypes;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MeterCCSupportedReport {
		validatePayload(raw.payload.length >= 2);
		const type = raw.payload[0] & 0b0_00_11111;
		const supportsReset = !!(raw.payload[0] & 0b1_00_00000);
		const hasMoreScales = !!(raw.payload[1] & 0b1_0000000);

		let supportedScales: number[] | undefined;
		if (hasMoreScales) {
			// The bitmask is spread out
			validatePayload(raw.payload.length >= 3);
			const extraBytes = raw.payload[2];
			validatePayload(raw.payload.length >= 3 + extraBytes);
			// The bitmask is the original payload byte plus all following bytes
			// Since the first byte only has 7 bits, we need to reduce all following bits by 1
			supportedScales = parseBitMask(
				Bytes.concat([
					Bytes.from([raw.payload[1] & 0b0_1111111]),
					raw.payload.subarray(3, 3 + extraBytes),
				]),
				0,
			).map((scale) => (scale >= 8 ? scale - 1 : scale));
		} else {
			// only 7 bits in the bitmask. Bit 7 is 0, so no need to mask it out
			supportedScales = parseBitMask(
				Bytes.from([raw.payload[1]]),
				0,
			);
		}
		// This is only present in V4+
		const supportedRateTypes: RateType[] = parseBitMask(
			Bytes.from([(raw.payload[0] & 0b0_11_00000) >>> 5]),
			1,
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			type,
			supportsReset,
			supportedScales,
			supportedRateTypes,
		});
	}

	public readonly type: number;

	public readonly supportsReset: boolean;

	public readonly supportedScales: readonly number[];

	public readonly supportedRateTypes: readonly RateType[];

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;
		if (!this.supportsReset) return true;

		const ccVersion = getEffectiveCCVersion(ctx, this);

		// Create reset values
		if (ccVersion < 6) {
			this.ensureMetadata(ctx, MeterCCValues.resetAll);
		} else {
			for (const scale of this.supportedScales) {
				// Only accumulated values can be reset
				if (!isAccumulatedValue(this.type, scale)) continue;

				for (const rateType of this.supportedRateTypes) {
					const resetSingleValue = MeterCCValues.resetSingle(
						this.type,
						rateType,
						scale,
					);
					this.ensureMetadata(ctx, resetSingleValue, {
						...resetSingleValue.meta,
						label: `Reset ${
							getValueLabel(
								this.type,
								scale,
								rateType,
							)
						}`,
					});
				}
			}
		}
		return true;
	}

	public serialize(ctx: CCEncodingContext): Bytes {
		const typeByte = (this.type & 0b0_00_11111)
			| (this.supportedRateTypes.includes(RateType.Consumed)
				? 0b0_01_00000
				: 0)
			| (this.supportedRateTypes.includes(RateType.Produced)
				? 0b0_10_00000
				: 0)
			| (this.supportsReset ? 0b1_00_00000 : 0);
		const supportedScales = encodeBitMask(
			this.supportedScales,
			undefined,
			// The first byte only has 7 bits for the bitmask,
			// so we add a fake bit for the value -1 and later shift
			// the first byte one to the right
			-1,
		);
		const scalesByte1 = (supportedScales[0] >>> 1)
			| (supportedScales.length > 1 ? 0b1000_0000 : 0);

		this.payload = Bytes.from([
			typeByte,
			scalesByte1,
		]);
		if (supportedScales.length > 1) {
			this.payload = Bytes.concat([
				this.payload,
				Bytes.from([supportedScales.length - 1]),
				Bytes.from(supportedScales.subarray(1)),
			]);
		}

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"meter type": getMeterName(this.type),
			"supports reset": this.supportsReset,
			"supported scales": `${
				this.supportedScales
					.map(
						(scale) => `
· ${(getMeterScale(this.type, scale) ?? getUnknownMeterScale(scale)).label}`,
					)
					.join("")
			}`,
			"supported rate types": this.supportedRateTypes
				.map((rt) => getEnumMemberName(RateType, rt))
				.join(", "),
		};
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(MeterCommand.SupportedGet)
@expectedCCResponse(MeterCCSupportedReport)
export class MeterCCSupportedGet extends MeterCC {}

// @publicAPI
export type MeterCCResetOptions = AllOrNone<{
	type: number;
	scale: number;
	rateType: RateType;
	targetValue: number;
}>;

@CCCommand(MeterCommand.Reset)
@useSupervision()
export class MeterCCReset extends MeterCC {
	public constructor(
		options: WithAddress<MeterCCResetOptions>,
	) {
		super(options);
		this.type = options.type;
		this.scale = options.scale;
		this.rateType = options.rateType;
		this.targetValue = options.targetValue;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): MeterCCReset {
		if (raw.payload.length === 0) {
			return new this({
				nodeId: ctx.sourceNodeId,
			});
		}

		const {
			type,
			rateType,
			scale1,
			value: targetValue,
			bytesRead: scale2Offset,
		} = parseMeterValueAndInfo(raw.payload, 0);
		const scale = parseScale(scale1, raw.payload, scale2Offset);

		return new this({
			nodeId: ctx.sourceNodeId,
			type,
			rateType,
			targetValue,
			scale,
		});
	}

	public type: number | undefined;
	public scale: number | undefined;
	public rateType: RateType | undefined;
	public targetValue: number | undefined;

	public serialize(ctx: CCEncodingContext): Bytes {
		if (
			this.type != undefined
			&& this.scale != undefined
			&& this.rateType != undefined
			&& this.targetValue != undefined
		) {
			const { data: typeAndValue, scale2 } = encodeMeterValueAndInfo(
				this.type,
				this.rateType,
				this.scale,
				this.targetValue,
			);

			this.payload = typeAndValue;

			if (scale2 != undefined) {
				this.payload = Bytes.concat([
					this.payload,
					Bytes.from([scale2]),
				]);
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.type != undefined) {
			message.type = getMeterName(this.type);
		}
		if (this.rateType != undefined) {
			message["rate type"] = getEnumMemberName(RateType, this.rateType);
		}
		if (this.type != undefined && this.scale != undefined) {
			message.scale = (getMeterScale(this.type, this.scale)
				?? getUnknownMeterScale(this.scale)).label;
		}
		if (this.targetValue != undefined) {
			message["target value"] = this.targetValue;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}
