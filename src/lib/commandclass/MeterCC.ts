import { lookupMeter, lookupMeterScale, MeterScale } from "../config/Meters";
import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import type { ValueID } from "../node/ValueDB";
import { getEnumMemberName, validatePayload } from "../util/misc";
import { num2hex } from "../util/strings";
import { ValueMetadata } from "../values/Metadata";
import {
	getMinIntegerSize,
	Maybe,
	parseBitMask,
	parseFloatWithScale,
	unknownNumber,
} from "../values/Primitive";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CCResponsePredicate,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	getCommandClass,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum MeterCommand {
	Get = 0x01,
	Report = 0x02,
	SupportedGet = 0x03,
	SupportedReport = 0x04,
	Reset = 0x05,
}

/**
 * @publicAPI
 */
export enum RateType {
	Unspecified = 0x00,
	Consumed = 0x01,
	Produced = 0x02,
}

function toPropertyKey(
	meterType: number,
	rateType: RateType,
	scale: number,
): number {
	return (meterType << 16) | (scale << 8) | rateType;
}

function splitPropertyKey(
	key: number,
): { meterType: number; rateType: RateType; scale: number } {
	return {
		rateType: key & 0xff,
		scale: (key >>> 8) & 0xff,
		meterType: key >>> 16,
	};
}

function getMeterTypeName(type: number): string {
	return lookupMeter(type)?.name ?? `UNKNOWN (${num2hex(type)})`;
}

export function getTypeValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Meter,
		endpoint,
		property: "type",
	};
}

export function getSupportsResetValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Meter,
		endpoint,
		property: "supportsReset",
	};
}

export function getSupportedScalesValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Meter,
		endpoint,
		property: "supportedScales",
	};
}

export function getSupportedRateTypesValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Meter,
		endpoint,
		property: "supportedRateTypes",
	};
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses.Meter)
export class MeterCCAPI extends CCAPI {
	public supportsCommand(cmd: MeterCommand): Maybe<boolean> {
		switch (cmd) {
			case MeterCommand.Get:
				return true; // This is mandatory
			case MeterCommand.SupportedGet:
				return this.version >= 2;
			case MeterCommand.Reset: {
				const node = this.endpoint.getNodeUnsafe()!;
				const ret = node.getValue<boolean>({
					commandClass: getCommandClass(this),
					endpoint: this.endpoint.index,
					property: "supportsReset",
				});
				return ret === true;
			}
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get(options?: MeterCCGetOptions) {
		this.assertSupportsCommand(MeterCommand, MeterCommand.Get);

		const cc = new MeterCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		const response = (await this.driver.sendCommand<MeterCCReport>(cc))!;
		return {
			type: response.type,
			scale: response.scale,
			value: response.value,
			previousValue: response.previousValue,
			rateType: response.rateType,
			deltaTime: response.deltaTime,
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupported() {
		this.assertSupportsCommand(MeterCommand, MeterCommand.SupportedGet);

		const cc = new MeterCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<MeterCCSupportedReport>(
			cc,
		))!;
		return {
			type: response.type,
			supportsReset: response.supportsReset,
			supportedScales: response.supportedScales,
			supportedRateTypes: response.supportedRateTypes,
		};
	}

	public async reset(options: MeterCCResetOptions): Promise<void> {
		this.assertSupportsCommand(MeterCommand, MeterCommand.Reset);

		const cc = new MeterCCReset(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.driver.sendCommand(cc);
	}
}

@commandClass(CommandClasses.Meter)
@implementedVersion(6)
export class MeterCC extends CommandClass {
	declare ccCommand: MeterCommand;

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Meter;

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		if (this.version >= 2) {
			let type: number;
			let supportsReset: boolean;
			let supportedScales: readonly number[];
			let supportedRateTypes: readonly RateType[];

			const storedType = node.getValue<number>(
				getTypeValueId(this.endpointIndex),
			);

			if (complete || storedType == undefined) {
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "querying meter support...",
					direction: "outbound",
				});

				({
					type,
					supportsReset,
					supportedScales,
					supportedRateTypes,
				} = await api.getSupported());
				const logMessage = `received meter support:
type:                 ${getMeterTypeName(type)}
supported scales:     ${supportedScales
					.map((s) => lookupMeterScale(type, s).label)
					.map((label) => `\n· ${label}`)
					.join("")}
supported rate types: ${supportedRateTypes
					.map((rt) => getEnumMemberName(RateType, rt))
					.map((label) => `\n· ${label}`)
					.join("")}
supports reset:       ${supportsReset}`;
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				type = storedType;
				// supportsReset =
				// 	node.getValue(
				// 		getSupportsResetValueId(this.endpointIndex),
				// 	) ?? false;
				supportedScales =
					node.getValue(
						getSupportedScalesValueId(this.endpointIndex),
					) ?? [];
				supportedRateTypes =
					node.getValue(
						getSupportedRateTypesValueId(this.endpointIndex),
					) ?? [];
			}

			const rateTypes = supportedRateTypes.length
				? supportedRateTypes
				: [undefined];
			for (const rateType of rateTypes) {
				for (const scale of supportedScales) {
					log.controller.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying meter value (type = ${getMeterTypeName(
							type,
						)}, scale = ${lookupMeterScale(type, scale).label}${
							rateType != undefined
								? `, rate type = ${getEnumMemberName(
										RateType,
										rateType,
								  )}`
								: ""
						})...`,
						direction: "outbound",
					});
					await api.get({
						scale,
						rateType,
					});
				}
			}
		} else {
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying default meter value...`,
				direction: "outbound",
			});
			await api.get();
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public translatePropertyKey(
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (
			(property === "value" ||
				property === "previousValue" ||
				property === "deltaTime") &&
			typeof propertyKey === "number"
		) {
			const { meterType, rateType, scale } = splitPropertyKey(
				propertyKey,
			);
			let ret: string;
			if (meterType !== 0) {
				ret = lookupMeterScale(meterType, scale).label;
			} else {
				ret = "default";
			}
			if (rateType !== RateType.Unspecified) {
				ret += "_" + getEnumMemberName(RateType, rateType);
			}
			return ret;
		}
		return super.translatePropertyKey(property, propertyKey);
	}
}

@CCCommand(MeterCommand.Report)
export class MeterCCReport extends MeterCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this._type = this.payload[0] & 0b0_00_11111;
		this._rateType = (this.payload[0] & 0b0_11_00000) >>> 5;
		const scale1Bit2 = (this.payload[0] & 0b1_00_00000) >>> 7;

		const { scale: scale1Bits10, value, bytesRead } = parseFloatWithScale(
			this.payload.slice(1),
		);
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
		const scale = scale1 === 7 ? scale1 + scale2 : scale1;
		this._scale = lookupMeterScale(this._type, scale);

		this.persistValues();
	}

	public persistValues(): boolean {
		const valueIdBase: Omit<ValueID, "property"> = {
			commandClass: this.ccId,
			endpoint: this.endpointIndex,
			propertyKey: toPropertyKey(
				this._type,
				this._rateType,
				this._scale.key,
			),
		};
		const valueDB = this.getValueDB();

		const valueValueId = { ...valueIdBase, property: "value" };
		const previousValueValueID = {
			...valueIdBase,
			property: "previousValue",
		};
		const deltaTimeValueId = { ...valueIdBase, property: "deltaTime" };

		// Always create metadata if it does not exist
		if (!valueDB.hasMetadata(valueValueId)) {
			valueDB.setMetadata(valueValueId, {
				...ValueMetadata.ReadOnlyNumber,
				label: `Value (${getMeterTypeName(this._type)}${
					this._rateType
						? `, ${getEnumMemberName(RateType, this._rateType)}`
						: ""
				})`,
				unit: this._scale.label,
			});
		}
		if (this.version >= 2 && !valueDB.hasMetadata(previousValueValueID)) {
			valueDB.setMetadata(previousValueValueID, {
				...ValueMetadata.ReadOnlyNumber,
				label: `Previous value (${getMeterTypeName(this._type)}${
					this._rateType
						? `, ${getEnumMemberName(RateType, this._rateType)}`
						: ""
				})`,
				unit: this._scale.label,
			});
		}
		if (this.version >= 2 && !valueDB.hasMetadata(deltaTimeValueId)) {
			valueDB.setMetadata(
				{ ...valueIdBase, property: "deltaTime" },
				{
					...ValueMetadata.ReadOnlyNumber,
					label: `Time since the previous reading`,
					unit: "s",
				},
			);
		}
		valueDB.setValue(valueValueId, this._value);
		if (this._previousValue != undefined) {
			valueDB.setValue(previousValueValueID, this._previousValue);
		}
		if (this._deltaTime != "unknown") {
			valueDB.setValue(
				{ ...valueIdBase, property: "deltaTime" },
				this._deltaTime,
			);
		}
		return true;
	}

	private _type: number;
	public get type(): number {
		return this._type;
	}

	private _scale: MeterScale;
	public get scale(): MeterScale {
		return this._scale;
	}

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
}

const testResponseForMeterGet: CCResponsePredicate = (
	sent: MeterCCGet,
	received,
	isPositiveTransmitReport,
) => {
	// We expect a Meter Report that matches the requested scale and rate type
	// (if they were requested)
	return received instanceof MeterCCReport &&
		(sent.scale == undefined || sent.scale === received.scale.key) &&
		(sent.rateType == undefined || sent.rateType == received.rateType)
		? "final"
		: isPositiveTransmitReport
		? "confirmation"
		: "unexpected";
};

interface MeterCCGetOptions {
	scale?: number;
	rateType?: RateType;
}

@CCCommand(MeterCommand.Get)
@expectedCCResponse(testResponseForMeterGet)
export class MeterCCGet extends MeterCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (MeterCCGetOptions & CCCommandOptions),
	) {
		super(driver, options);
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
}

@CCCommand(MeterCommand.SupportedReport)
export class MeterCCSupportedReport extends MeterCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
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

		this.persistValues();
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
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (MeterCCResetOptions & CCCommandOptions),
	) {
		super(driver, options);
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
}
