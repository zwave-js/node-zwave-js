import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import { Maybe, parseBitMask } from "../values/Primitive";
import {
	CCAPI,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum IndicatorCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
}

const MAX_INDICATOR_OBJECTS = 31;

@API(CommandClasses.Indicator)
export class IndicatorCCAPI extends CCAPI {
	public supportsCommand(cmd: IndicatorCommand): Maybe<boolean> {
		switch (cmd) {
			case IndicatorCommand.Get:
			case IndicatorCommand.Set:
				return true; // This is mandatory
			case IndicatorCommand.SupportedGet:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		// TODO: support addressing other indicators
		if (property !== "value") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}
		await this.set(value);

		// Refresh the current value
		await this.get();
	};

	public async get(
		indicatorId?: number,
	): Promise<number | IndicatorObject[]> {
		this.assertSupportsCommand(IndicatorCommand, IndicatorCommand.Get);

		const cc = new IndicatorCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			indicatorId,
		});
		const response = (await this.driver.sendCommand<IndicatorCCReport>(
			cc,
		))!;
		if (response.values) return response.values;
		return response.value!;
	}

	public async set(value: number | IndicatorObject[]): Promise<void> {
		this.assertSupportsCommand(IndicatorCommand, IndicatorCommand.Set);

		const cc = new IndicatorCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...(typeof value === "number" ? { value } : { values: value }),
		});
		await this.driver.sendCommand(cc);
	}
}

@commandClass(CommandClasses.Indicator)
@implementedVersion(3)
export class IndicatorCC extends CommandClass {
	declare ccCommand: IndicatorCommand;
}

export interface IndicatorObject {
	indicatorId: number;
	propertyId: number;
	value: number;
}

type IndicatorCCSetOptions =
	| {
			value: number;
	  }
	| {
			values: IndicatorObject[];
	  };

@CCCommand(IndicatorCommand.Set)
export class IndicatorCCSet extends IndicatorCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| (IndicatorCCSetOptions & CCCommandOptions),
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (this.version === 1) {
				if (!("value" in options)) {
					throw new ZWaveError(
						`Node ${this.nodeId} only supports IndicatorCC V1 which requires a single value to be set`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				this.indicator0Value = options.value;
			} else {
				if ("value" in options) {
					this.indicator0Value = options.value;
				} else {
					if (options.values.length > MAX_INDICATOR_OBJECTS) {
						throw new ZWaveError(
							`Only ${MAX_INDICATOR_OBJECTS} indicator values can be set at a time!`,
							ZWaveErrorCodes.Argument_Invalid,
						);
					}
					this.values = options.values;
				}
			}
		}
	}

	public indicator0Value: number | undefined;
	public values: IndicatorObject[] | undefined;

	public serialize(): Buffer {
		if (this.indicator0Value != undefined) {
			this.payload = Buffer.from([this.indicator0Value]);
		} else {
			const values = this.values!;
			const objCount = values.length & MAX_INDICATOR_OBJECTS;
			const valuesFlat = values
				.slice(0, objCount + 1)
				.map(o => [o.indicatorId, o.propertyId, o.value] as const)
				.reduce((acc, cur) => acc.concat(...cur), [] as number[]);
			this.payload = Buffer.concat([
				Buffer.from([0, objCount]),
				Buffer.from(valuesFlat),
			]);
		}
		return super.serialize();
	}
}

@CCCommand(IndicatorCommand.Report)
export class IndicatorCCReport extends IndicatorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);

		// TODO: publish metadata and values

		const objCount =
			this.payload.length >= 2 ? this.payload[1] & 0b11111 : 0;
		if (objCount === 0) {
			this.value = this.payload[0];
		} else {
			validatePayload(this.payload.length >= 2 + 3 * objCount);
			this.values = [];
			for (let i = 0; i < objCount; i++) {
				const offset = 2 + 3 * i;
				this.values.push({
					indicatorId: this.payload[offset],
					propertyId: this.payload[offset + 1],
					value: this.payload[offset + 2],
				});
			}
		}
	}

	public readonly value: number | undefined;
	public readonly values: IndicatorObject[] | undefined;
}

interface IndicatorCCGetOptions extends CCCommandOptions {
	indicatorId?: number;
}

@CCCommand(IndicatorCommand.Get)
@expectedCCResponse(IndicatorCCReport)
export class IndicatorCCGet extends IndicatorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | IndicatorCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.indicatorId = options.indicatorId;
		}
	}

	public indicatorId: number | undefined;

	public serialize(): Buffer {
		if (this.indicatorId != undefined) {
			this.payload = Buffer.from([this.indicatorId]);
		}
		return super.serialize();
	}
}

@CCCommand(IndicatorCommand.SupportedReport)
export class IndicatorCCSupportedReport extends IndicatorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 3);
		this.indicatorId = this.payload[0];
		this.nextIndicatorId = this.payload[1];
		const bitMaskLength = this.payload[2] & 0b11111;
		if (bitMaskLength === 0) {
			this.supportedProperties = [];
		} else {
			validatePayload(this.payload.length >= 3 + bitMaskLength);
			// The bit mask starts at 0, but bit 0 is not used
			this.supportedProperties = parseBitMask(
				this.payload.slice(3, 3 + bitMaskLength),
				0,
			).filter(v => v !== 0);
		}
	}

	public readonly indicatorId: number;
	public readonly nextIndicatorId: number;
	public readonly supportedProperties: number[];
}

interface IndicatorCCSupportedGetOptions extends CCCommandOptions {
	indicatorId: number;
}

@CCCommand(IndicatorCommand.SupportedGet)
@expectedCCResponse(IndicatorCCReport)
export class IndicatorCCSupportedGet extends IndicatorCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| IndicatorCCSupportedGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.indicatorId = options.indicatorId;
		}
	}

	public indicatorId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.indicatorId]);
		return super.serialize();
	}
}
