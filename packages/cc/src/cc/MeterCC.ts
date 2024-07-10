import {
	type FloatParameters,
	type IZWaveEndpoint,
	type MaybeUnknown,
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
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SinglecastCC,
	type SupervisionResult,
	UNKNOWN_STATE,
	ValueMetadata,
	parseBitMask,
	parseFloatWithScale,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
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
	getCommandClass,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { MeterCommand, type MeterReading, RateType } from "../lib/_Types";

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

function parseMeterValueAndInfo(data: Buffer, offset: number): {
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
): { data: Buffer; floatParams: FloatParameters; scale2: number | undefined } {
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
		data: Buffer.concat([Buffer.from([typeByte]), valueBytes]),
		floatParams: pick(floatParams, ["precision", "size"]),
		scale2,
	};
}

function parseScale(
	scale1: number,
	data: Buffer,
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
				scale === 0x00 // kWh
				|| scale === 0x01 // kVAh
				|| scale === 0x03 // Pulse count
				|| scale === 0x08 // kVarh
			);
		case 0x02: // Gas
			return (
				scale === 0x00 // m³
				|| scale === 0x01 // ft³
				|| scale === 0x03 // Pulse count
			);
		case 0x03: // Water
			return (
				scale === 0x00 // m³
				|| scale === 0x01 // ft³
				|| scale === 0x02 // US gallons
				|| scale === 0x03 // Pulse count
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

		const cc = new MeterCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		const response = await this.applHost.sendCommand<MeterCCReport>(
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

		const cc = new MeterCCReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
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

		const cc = new MeterCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new MeterCCSupportedReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async reset(
		options?: MeterCCResetOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(MeterCommand, MeterCommand.Reset);

		const cc = new MeterCCReset(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
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

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Meter,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		if (this.version >= 2) {
			applHost.controllerLog.logNode(node.id, {
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
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Querying meter support timed out, skipping interview...",
					level: "warn",
				});
				return;
			}
		}

		// Query current meter values
		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Meter,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		if (this.version === 1) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying default meter value...`,
				direction: "outbound",
			});
			await api.get();
		} else {
			const type: number = this.getValue(applHost, MeterCCValues.type)
				?? 0;

			const supportedScales: readonly number[] =
				this.getValue(applHost, MeterCCValues.supportedScales) ?? [];

			const supportedRateTypes: readonly RateType[] =
				this.getValue(applHost, MeterCCValues.supportedRateTypes) ?? [];

			const rateTypes = supportedRateTypes.length
				? supportedRateTypes
				: [undefined];
			for (const rateType of rateTypes) {
				for (const scale of supportedScales) {
					applHost.controllerLog.logNode(node.id, {
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
		applHost: ZWaveApplicationHost,
	): boolean {
		// Poll the device when all of the supported values were last updated longer than 6 hours ago.
		// This may lead to some values not being updated, but the user may have disabled some unnecessary
		// reports to reduce traffic.
		const valueDB = applHost.tryGetValueDB(this.nodeId);
		if (!valueDB) return true;

		const values = this.getDefinedValueIDs(applHost).filter((v) =>
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
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<number> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(MeterCCValues.type.endpoint(endpoint.index));
	}

	/**
	 * Returns which scales are supported by this meter.
	 * This only works AFTER the interview process
	 */
	public static getSupportedScalesCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<number[]> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(MeterCCValues.supportedScales.endpoint(endpoint.index));
	}

	/**
	 * Returns whether reset is supported by this meter.
	 * This only works AFTER the interview process
	 */
	public static supportsResetCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<boolean> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(MeterCCValues.supportsReset.endpoint(endpoint.index));
	}

	/**
	 * Returns which rate types are supported by this meter.
	 * This only works AFTER the interview process
	 */
	public static getSupportedRateTypesCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<RateType[]> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				MeterCCValues.supportedRateTypes.endpoint(endpoint.index),
			);
	}

	public translatePropertyKey(
		applHost: ZWaveApplicationHost,
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
		return super.translatePropertyKey(applHost, property, propertyKey);
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (MeterCCReportOptions & CCCommandOptions),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			const { type, rateType, scale1, value, bytesRead } =
				parseMeterValueAndInfo(this.payload, 0);
			this.type = type;
			this.rateType = rateType;
			this.value = value;
			let offset = bytesRead;
			const floatSize = bytesRead - 2;

			if (this.payload.length >= offset + 2) {
				this.deltaTime = this.payload.readUInt16BE(offset);
				offset += 2;
				if (this.deltaTime === 0xffff) {
					this.deltaTime = UNKNOWN_STATE;
				}

				if (
					// Previous value is included only if delta time is not 0
					this.deltaTime !== 0
					&& this.payload.length >= offset + floatSize
				) {
					const { value: prevValue } = parseFloatWithScale(
						// This float is split in the payload
						Buffer.concat([
							Buffer.from([this.payload[1]]),
							this.payload.subarray(offset),
						]),
					);
					offset += floatSize;
					this.previousValue = prevValue;
				}
			} else {
				// 0 means that no previous value is included
				this.deltaTime = 0;
			}
			this.scale = parseScale(scale1, this.payload, offset);
		} else {
			this.type = options.type;
			this.scale = options.scale;
			this.value = options.value;
			this.previousValue = options.previousValue;
			this.rateType = options.rateType ?? RateType.Unspecified;
			this.deltaTime = options.deltaTime ?? UNKNOWN_STATE;
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		const meter = getMeter(this.type);
		const scale = getMeterScale(this.type, this.scale)
			?? getUnknownMeterScale(this.scale);

		// Filter out unknown meter types and scales, unless the strict validation is disabled
		const measurementValidation = !this.host.getDeviceConfig?.(
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
			if (this.version >= 2) {
				const expectedType = this.getValue<number>(
					applHost,
					MeterCCValues.type,
				);
				if (expectedType != undefined) {
					validatePayload.withReason(
						"Unexpected meter type or corrupted data",
					)(this.type === expectedType);
				}

				const supportedScales = this.getValue<number[]>(
					applHost,
					MeterCCValues.supportedScales,
				);
				if (supportedScales?.length) {
					validatePayload.withReason(
						`Unsupported meter scale ${scale.label} or corrupted data`,
					)(supportedScales.includes(this.scale));
				}

				const supportedRateTypes = this.getValue<RateType[]>(
					applHost,
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
		this.setMetadata(applHost, valueValue, {
			...valueValue.meta,
			label: getValueLabel(this.type, this.scale, this.rateType),
			unit: scale.label,
			ccSpecific: {
				meterType: this.type,
				scale: this.scale,
				rateType: this.rateType,
			},
		});
		this.setValue(applHost, valueValue, this.value);

		return true;
	}

	public type: number;
	public scale: number;
	public value: number;
	public previousValue: MaybeNotKnown<number>;
	public rateType: RateType;
	public deltaTime: MaybeUnknown<number>;

	public serialize(): Buffer {
		const { data: typeAndValue, floatParams, scale2 } =
			encodeMeterValueAndInfo(
				this.type,
				this.rateType,
				this.scale,
				this.value,
			);

		const deltaTime = this.deltaTime ?? 0xffff;
		const deltaTimeBytes = Buffer.allocUnsafe(2);
		deltaTimeBytes.writeUInt16BE(deltaTime, 0);

		this.payload = Buffer.concat([
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

			this.payload = Buffer.concat([
				this.payload,
				prevValueBytes,
			]);
		}

		if (scale2 != undefined) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([scale2]),
			]);
		}

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (MeterCCGetOptions & CCCommandOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			if (this.payload.length >= 1) {
				this.rateType = (this.payload[0] & 0b11_000_000) >>> 6;
				this.scale = (this.payload[0] & 0b00_111_000) >>> 3;
				if (this.scale === 7) {
					validatePayload(this.payload.length >= 2);
					this.scale += this.payload[1];
				}
			}
		} else {
			this.rateType = options.rateType;
			this.scale = options.scale;
		}
	}

	public rateType: RateType | undefined;
	public scale: number | undefined;

	public serialize(): Buffer {
		let scale1: number;
		let scale2: number | undefined;
		let bufferLength = 0;

		if (this.scale == undefined) {
			scale1 = 0;
		} else if (this.version >= 4 && this.scale >= 7) {
			scale1 = 7;
			scale2 = this.scale >>> 3;
			bufferLength = 2;
		} else if (this.version >= 3) {
			scale1 = this.scale & 0b111;
			bufferLength = 1;
		} else if (this.version >= 2) {
			scale1 = this.scale & 0b11;
			bufferLength = 1;
		} else {
			scale1 = 0;
		}

		let rateTypeFlags = 0;
		if (this.version >= 4 && this.rateType != undefined) {
			rateTypeFlags = this.rateType & 0b11;
			bufferLength = Math.max(bufferLength, 1);
		}

		this.payload = Buffer.alloc(bufferLength, 0);
		this.payload[0] = (rateTypeFlags << 6) | (scale1 << 3);
		if (scale2) this.payload[1] = scale2;

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.rateType != undefined) {
			message["rate type"] = getEnumMemberName(RateType, this.rateType);
		}
		if (this.scale != undefined) {
			if (host) {
				// Try to lookup the meter type to translate the scale
				const type = this.getValue<number>(host, MeterCCValues.type);
				if (type != undefined) {
					message.scale = (getMeterScale(type, this.scale)
						?? getUnknownMeterScale(this.scale)).label;
				}
			} else {
				message.scale = this.scale;
			}
		}
		return {
			...super.toLogEntry(host),
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
export class MeterCCSupportedReport extends MeterCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (MeterCCSupportedReportOptions & CCCommandOptions),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.type = this.payload[0] & 0b0_00_11111;
			this.supportsReset = !!(this.payload[0] & 0b1_00_00000);
			const hasMoreScales = !!(this.payload[1] & 0b1_0000000);
			if (hasMoreScales) {
				// The bitmask is spread out
				validatePayload(this.payload.length >= 3);
				const extraBytes = this.payload[2];
				validatePayload(this.payload.length >= 3 + extraBytes);
				// The bitmask is the original payload byte plus all following bytes
				// Since the first byte only has 7 bits, we need to reduce all following bits by 1
				this.supportedScales = parseBitMask(
					Buffer.concat([
						Buffer.from([this.payload[1] & 0b0_1111111]),
						this.payload.subarray(3, 3 + extraBytes),
					]),
					0,
				).map((scale) => (scale >= 8 ? scale - 1 : scale));
			} else {
				// only 7 bits in the bitmask. Bit 7 is 0, so no need to mask it out
				this.supportedScales = parseBitMask(
					Buffer.from([this.payload[1]]),
					0,
				);
			}
			// This is only present in V4+
			this.supportedRateTypes = parseBitMask(
				Buffer.from([(this.payload[0] & 0b0_11_00000) >>> 5]),
				1,
			);
		} else {
			this.type = options.type;
			this.supportsReset = options.supportsReset;
			this.supportedScales = options.supportedScales;
			this.supportedRateTypes = options.supportedRateTypes;
		}
	}

	@ccValue(MeterCCValues.type)
	public readonly type: number;

	@ccValue(MeterCCValues.supportsReset)
	public readonly supportsReset: boolean;

	@ccValue(MeterCCValues.supportedScales)
	public readonly supportedScales: readonly number[];

	@ccValue(MeterCCValues.supportedRateTypes)
	public readonly supportedRateTypes: readonly RateType[];

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		if (!this.supportsReset) return true;

		// Create reset values
		if (this.version < 6) {
			this.ensureMetadata(applHost, MeterCCValues.resetAll);
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
					this.ensureMetadata(applHost, resetSingleValue, {
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

	public serialize(): Buffer {
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

		this.payload = Buffer.from([
			typeByte,
			scalesByte1,
		]);
		if (supportedScales.length > 1) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([supportedScales.length - 1]),
				Buffer.from(supportedScales.subarray(1)),
			]);
		}

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (MeterCCResetOptions & CCCommandOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			if (this.payload.length > 0) {
				const {
					type,
					rateType,
					scale1,
					value,
					bytesRead: scale2Offset,
				} = parseMeterValueAndInfo(this.payload, 0);
				this.type = type;
				this.rateType = rateType;
				this.targetValue = value;
				this.scale = parseScale(scale1, this.payload, scale2Offset);
			}
		} else {
			this.type = options.type;
			this.scale = options.scale;
			this.rateType = options.rateType;
			this.targetValue = options.targetValue;
		}
	}

	public type: number | undefined;
	public scale: number | undefined;
	public rateType: RateType | undefined;
	public targetValue: number | undefined;

	public serialize(): Buffer {
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
				this.payload = Buffer.concat([
					this.payload,
					Buffer.from([scale2]),
				]);
			}
		}
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
			message,
		};
	}
}
