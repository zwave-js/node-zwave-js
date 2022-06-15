import {
	ConfigManager,
	getDefaultMeterScale,
	MeterScale,
} from "@zwave-js/config";
import type { MessageOrCCLogEntry, MessageRecord } from "@zwave-js/core/safe";
import {
	CommandClasses,
	getMinIntegerSize,
	Maybe,
	MessagePriority,
	parseBitMask,
	parseFloatWithScale,
	unknownNumber,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName, num2hex, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PhysicalCCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
import {
	ccValue,
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	getCommandClass,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { MeterCommand, RateType } from "../lib/_Types";

export const MeterCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Meter, {
		...V.staticProperty("type", undefined, { internal: true }),
		...V.staticProperty("supportsReset", undefined, { internal: true }),
		...V.staticProperty("supportedScales", undefined, { internal: true }),
		...V.staticProperty("supportedRateTypes", undefined, {
			internal: true,
		}),

		...V.staticPropertyWithName("resetAll", "reset", {
			...ValueMetadata.WriteOnlyBoolean,
			label: `Reset accumulated values`,
		} as const),
	}),

	...V.defineDynamicCCValues(CommandClasses.Meter, {
		...V.dynamicPropertyAndKeyWithName(
			"resetSingle",
			"reset",
			(meterType: number) => meterType,
			(meterType: number) =>
				({
					...ValueMetadata.WriteOnlyBoolean,
					// This is only a placeholder label. A config manager is needed to
					// determine the actual label.
					label: `Reset (${num2hex(meterType)})`,
					ccSpecific: { meterType },
				} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"value",
			"value",
			toPropertyKey,
			(meterType: number, rateType: RateType, scale: number) =>
				({
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

function getMeterTypeName(configManager: ConfigManager, type: number): string {
	return (
		configManager.lookupMeter(type)?.name ?? `UNKNOWN (${num2hex(type)})`
	);
}

function getValueLabel(
	configManager: ConfigManager,
	meterType: number,
	scale: MeterScale,
	rateType: RateType,
	suffix?: string,
): string {
	let ret = getMeterTypeName(configManager, meterType);
	switch (rateType) {
		case RateType.Consumed:
			ret += ` Consumption [${scale.label}]`;
			break;
		case RateType.Produced:
			ret += ` Production [${scale.label}]`;
			break;
		default:
			ret += ` [${scale.label}]`;
	}
	if (suffix) {
		ret += ` (${suffix})`;
	}
	return ret;
}

@API(CommandClasses.Meter)
export class MeterCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: MeterCommand): Maybe<boolean> {
		switch (cmd) {
			case MeterCommand.Get:
				return true; // This is mandatory
			case MeterCommand.SupportedGet:
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

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
		propertyKey,
	}): Promise<unknown> => {
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

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(options?: MeterCCGetOptions) {
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
				scale: this.applHost.configManager.lookupMeterScale(
					response.type,
					response.scale,
				),
				...pick(response, [
					"value",
					"previousValue",
					"rateType",
					"deltaTime",
				]),
			};
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getAll() {
		const valueDB = this.tryGetValueDB();

		if (this.version >= 2) {
			const supportedScales =
				valueDB?.getValue<number[]>(
					MeterCCValues.supportedScales.endpoint(this.endpoint.index),
				) ?? [];
			const supportedRateTypes =
				valueDB?.getValue<RateType[]>(
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
		const response =
			await this.applHost.sendCommand<MeterCCSupportedReport>(
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
	public async reset(options?: MeterCCResetOptions): Promise<void> {
		this.assertSupportsCommand(MeterCommand, MeterCommand.Reset);

		const cc = new MeterCCReset(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
	): Promise<void> => {
		if (property !== "reset") {
			throwUnsupportedProperty(this.ccId, property);
		} else if (
			propertyKey != undefined &&
			typeof propertyKey !== "number"
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

		const resetOptions: MeterCCResetOptions =
			propertyKey != undefined
				? {
						type: propertyKey,
						targetValue: 0,
				  }
				: {};
		await this.reset(resetOptions);

		// Refresh values
		await this.getAll();
	};
}

@commandClass(CommandClasses.Meter)
@implementedVersion(6)
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
type:                 ${getMeterTypeName(applHost.configManager, suppResp.type)}
supported scales:     ${suppResp.supportedScales
					.map(
						(s) =>
							applHost.configManager.lookupMeterScale(
								suppResp.type,
								s,
							).label,
					)
					.map((label) => `\n· ${label}`)
					.join("")}
supported rate types: ${suppResp.supportedRateTypes
					.map((rt) => getEnumMemberName(RateType, rt))
					.map((label) => `\n· ${label}`)
					.join("")}
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
			const type: number =
				this.getValue(applHost, MeterCCValues.type) ?? 0;

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
						message: `querying meter value (type = ${getMeterTypeName(
							applHost.configManager,
							type,
						)}, scale = ${
							applHost.configManager.lookupMeterScale(type, scale)
								.label
						}${
							rateType != undefined
								? `, rate type = ${getEnumMemberName(
										RateType,
										rateType,
								  )}`
								: ""
						})...`,
						direction: "outbound",
					});
					await api.get({ scale, rateType });
				}
			}
		}
	}

	public translatePropertyKey(
		applHost: ZWaveApplicationHost,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (property === "value" && typeof propertyKey === "number") {
			const { meterType, rateType, scale } =
				splitPropertyKey(propertyKey);
			let ret: string;
			if (meterType !== 0) {
				ret = `${applHost.configManager.getMeterName(meterType)}_${
					applHost.configManager.lookupMeterScale(meterType, scale)
						.label
				}`;
			} else {
				ret = "default";
			}
			if (rateType !== RateType.Unspecified) {
				ret += "_" + getEnumMemberName(RateType, rateType);
			}
			return ret;
		} else if (property === "reset" && typeof propertyKey === "number") {
			return getMeterTypeName(applHost.configManager, propertyKey);
		}
		return super.translatePropertyKey(applHost, property, propertyKey);
	}
}

@CCCommand(MeterCommand.Report)
export class MeterCCReport extends MeterCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this._type = this.payload[0] & 0b0_00_11111;

		this._rateType = (this.payload[0] & 0b0_11_00000) >>> 5;
		const scale1Bit2 = (this.payload[0] & 0b1_00_00000) >>> 7;

		const {
			scale: scale1Bits10,
			value,
			bytesRead,
		} = parseFloatWithScale(this.payload.slice(1));
		let offset = 2 + (bytesRead - 1);
		// The scale is composed of two fields (see SDS13781)
		const scale1 = (scale1Bit2 << 2) | scale1Bits10;
		let scale2 = 0;
		this._value = value;

		if (this.version >= 2 && this.payload.length >= offset + 2) {
			this._deltaTime = this.payload.readUInt16BE(offset);
			offset += 2;
			if (this._deltaTime === 0xffff) {
				this._deltaTime = unknownNumber;
			}

			if (
				// 0 means that no previous value is included
				this.deltaTime !== 0 &&
				this.payload.length >= offset + (bytesRead - 1)
			) {
				const { value: prevValue } = parseFloatWithScale(
					// This float is split in the payload
					Buffer.concat([
						Buffer.from([this.payload[1]]),
						this.payload.slice(offset),
					]),
				);
				offset += bytesRead - 1;
				this._previousValue = prevValue;
			}
			if (
				this.version >= 4 &&
				scale1 === 7 &&
				this.payload.length >= offset + 1
			) {
				scale2 = this.payload[offset];
			}
		} else {
			// 0 means that no previous value is included
			this._deltaTime = 0;
		}
		this.scale = scale1 === 7 ? scale1 + scale2 : scale1;
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		const meterType = applHost.configManager.lookupMeter(this._type);
		const scale = applHost.configManager.lookupMeterScale(
			this._type,
			this.scale,
		);

		// Filter out unknown meter types and scales, unless the strict validation is disabled
		const measurementValidation = !this.host.getDeviceConfig?.(
			this.nodeId as number,
		)?.compat?.disableStrictMeasurementValidation;

		if (measurementValidation) {
			validatePayload.withReason(
				`Unknown meter type ${num2hex(this.type)} or corrupted data`,
			)(!!meterType);
			validatePayload.withReason(
				`Unknown meter scale ${num2hex(this.scale)} or corrupted data`,
			)(scale.label !== getDefaultMeterScale(this.scale).label);

			// Filter out unsupported meter types, scales and rate types if possible
			if (this.version >= 2) {
				const expectedType = this.getValue<number>(
					applHost,
					MeterCCValues.type,
				);
				if (expectedType != undefined) {
					validatePayload.withReason(
						"Unexpected meter type or corrupted data",
					)(this._type === expectedType);
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
						`Unsupported rate type ${getEnumMemberName(
							RateType,
							this._rateType,
						)} or corrupted data`,
					)(supportedRateTypes.includes(this._rateType));
				}
			}
		}

		const valueValue = MeterCCValues.value(
			this._type,
			this._rateType,
			this.scale,
		);
		this.ensureMetadata(applHost, valueValue, {
			...valueValue.meta,
			label: getValueLabel(
				applHost.configManager,
				this._type,
				scale,
				this._rateType,
			),
			unit: scale.label,
		});
		this.setValue(applHost, valueValue, this._value);

		return true;
	}

	private _type: number;
	public get type(): number {
		return this._type;
	}

	public readonly scale: number;

	private _value: number;
	public get value(): number {
		return this._value;
	}

	private _previousValue: number | undefined;
	public get previousValue(): number | undefined {
		return this._previousValue;
	}

	private _rateType: RateType;
	public get rateType(): RateType {
		return this._rateType;
	}

	private _deltaTime: Maybe<number>;
	public get deltaTime(): Maybe<number> {
		return this._deltaTime;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const meterType = applHost.configManager.lookupMeter(this._type);
		const scale = applHost.configManager.lookupMeterScale(
			this._type,
			this.scale,
		);

		const message: MessageRecord = {
			type: meterType?.name ?? `Unknown (${num2hex(this._type)})`,
			scale: scale.label,
			"rate type": getEnumMemberName(RateType, this._rateType),
			value: this.value,
		};
		if (this._deltaTime !== "unknown") {
			message["time delta"] = `${this.deltaTime} seconds`;
		}
		if (this._previousValue != undefined) {
			message["prev. value"] = this._previousValue;
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

function testResponseForMeterGet(sent: MeterCCGet, received: MeterCCReport) {
	// We expect a Meter Report that matches the requested scale and rate type
	// (if they were requested)
	return (
		(sent.scale == undefined || sent.scale === received.scale) &&
		(sent.rateType == undefined || sent.rateType == received.rateType)
	);
}

interface MeterCCGetOptions {
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
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.rateType != undefined) {
			message["rate type"] = getEnumMemberName(RateType, this.rateType);
		}
		if (this.scale != undefined) {
			// Try to lookup the meter type to translate the scale
			const type = this.getValue<number>(applHost, MeterCCValues.type);
			if (type != undefined) {
				message.scale = applHost.configManager.lookupMeterScale(
					type,
					this.scale,
				).label;
			}
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(MeterCommand.SupportedReport)
export class MeterCCSupportedReport extends MeterCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 2);
		this._type = this.payload[0] & 0b0_00_11111;
		this._supportsReset = !!(this.payload[0] & 0b1_00_00000);
		const hasMoreScales = !!(this.payload[1] & 0b1_0000000);
		if (hasMoreScales) {
			// The bitmask is spread out
			validatePayload(this.payload.length >= 3);
			const extraBytes = this.payload[2];
			validatePayload(this.payload.length >= 3 + extraBytes);
			// The bitmask is the original payload byte plus all following bytes
			// Since the first byte only has 7 bits, we need to reduce all following bits by 1
			this._supportedScales = parseBitMask(
				Buffer.concat([
					Buffer.from([this.payload[1] & 0b0_1111111]),
					this.payload.slice(3, 3 + extraBytes),
				]),
				0,
			).map((scale) => (scale >= 8 ? scale - 1 : scale));
		} else {
			// only 7 bits in the bitmask. Bit 7 is 0, so no need to mask it out
			this._supportedScales = parseBitMask(
				Buffer.from([this.payload[1]]),
				0,
			);
		}
		// This is only present in V4+
		this._supportedRateTypes = parseBitMask(
			Buffer.from([(this.payload[0] & 0b0_11_00000) >>> 5]),
			1,
		);
	}

	private _type: number;
	@ccValue({ internal: true })
	public get type(): number {
		return this._type;
	}

	private _supportsReset: boolean;
	@ccValue({ internal: true })
	public get supportsReset(): boolean {
		return this._supportsReset;
	}

	private _supportedScales: number[];
	@ccValue({ internal: true })
	public get supportedScales(): readonly number[] {
		return this._supportedScales;
	}

	private _supportedRateTypes: RateType[];
	@ccValue({ internal: true })
	public get supportedRateTypes(): readonly RateType[] {
		return this._supportedRateTypes;
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		if (!this._supportsReset) return true;

		// Create reset values
		if (this.version < 6) {
			this.ensureMetadata(applHost, MeterCCValues.resetAll);
		} else {
			const resetSingleValue = MeterCCValues.resetSingle(this.type);
			this.ensureMetadata(applHost, resetSingleValue, {
				...resetSingleValue.meta,
				label: `Reset (${getMeterTypeName(
					applHost.configManager,
					this._type,
				)})`,
			});
		}
		return true;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			type: `${
				applHost.configManager.lookupMeter(this.type)?.name ??
				`Unknown (${num2hex(this.type)})`
			}`,
			"supports reset": this._supportsReset,
			"supported scales": `${this._supportedScales
				.map(
					(scale) => `
· ${applHost.configManager.lookupMeterScale(this.type, scale).label}`,
				)
				.join("")}`,
			"supported rate types": this._supportedRateTypes
				.map((rt) => getEnumMemberName(RateType, rt))
				.join(", "),
		};
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(MeterCommand.SupportedGet)
@expectedCCResponse(MeterCCSupportedReport)
export class MeterCCSupportedGet extends MeterCC {}

type MeterCCResetOptions =
	| {
			type?: undefined;
			targetValue?: undefined;
	  }
	| {
			type: number;
			targetValue: number;
	  };

@CCCommand(MeterCommand.Reset)
export class MeterCCReset extends MeterCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (MeterCCResetOptions & CCCommandOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.type = options.type;
			this.targetValue = options.targetValue;
			// Test if this is a valid target value
			if (
				this.targetValue != undefined &&
				!getMinIntegerSize(this.targetValue, true)
			) {
				throw new ZWaveError(
					`${this.targetValue} is not a valid target value!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}
	}

	public type: number | undefined;
	public targetValue: number | undefined;

	public serialize(): Buffer {
		if (this.version >= 6 && this.targetValue != undefined && this.type) {
			const size =
				(this.targetValue &&
					getMinIntegerSize(this.targetValue, true)) ||
				0;
			if (size > 0) {
				this.payload = Buffer.allocUnsafe(1 + size);
				this.payload[0] = (size << 5) | (this.type & 0b11111);
				this.payload.writeIntBE(this.targetValue, 1, size);
			}
		}
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.type != undefined) {
			message.type = `${
				applHost.configManager.lookupMeter(this.type)?.name ??
				`Unknown (${num2hex(this.type)})`
			}`;
		}
		if (this.targetValue != undefined) {
			message["target value"] = this.targetValue;
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}
