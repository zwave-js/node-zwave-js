import { lookupIndicator, lookupProperty } from "../config/Indicators";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { ValueID } from "../node/ValueDB";
import { validatePayload } from "../util/misc";
import { num2hex } from "../util/strings";
import { ValueMetadata } from "../values/Metadata";
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
	CommandClassOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

function getSupportedIndicatorIDsValueID(
	endpoint: number | undefined,
): ValueID {
	return {
		commandClass: CommandClasses.Indicator,
		endpoint,
		property: "supportedIndicatorIds",
	};
}

function getSupportedPropertyIDsValueID(
	endpoint: number | undefined,
	indicatorId: number,
): ValueID {
	return {
		commandClass: CommandClasses.Indicator,
		endpoint,
		property: "supportedPropertyIDs",
		propertyKey: indicatorId,
	};
}

function getIndicatorValueValueID(
	endpoint: number | undefined,
	indicatorId: number,
	propertyId: number,
): ValueID {
	if (indicatorId === 0) {
		// V1
		return {
			commandClass: CommandClasses.Indicator,
			endpoint,
			property: "value",
		};
	} else {
		// V2+
		return {
			commandClass: CommandClasses.Indicator,
			endpoint,
			property: indicatorId,
			propertyKey: propertyId,
		};
	}
}

/**
 * Looks up the configured metadata for the given indicator and property
 */
function getIndicatorMetadata(
	indicatorId: number,
	propertyId: number,
): ValueMetadata {
	const label = lookupIndicator(indicatorId);
	const prop = lookupProperty(propertyId);
	if (!label && !prop) {
		return { ...ValueMetadata.UInt8 };
	} else if (!prop) {
		return {
			...ValueMetadata.UInt8,
			label,
		};
	} else {
		return {
			...ValueMetadata.UInt8,
			label: `${label} - ${prop.label}`,
			description: prop.description,
			min: prop.min,
			max: prop.max,
			readable: !prop.readonly,
		};
	}
}

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
		{ property, propertyKey },
		value,
	): Promise<void> => {
		if (property === "value") {
			// V1 value
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			await this.set(value);
			// Refresh the current value
			await this.get();
		} else if (
			typeof property === "number" &&
			typeof propertyKey === "number"
		) {
			// V2+ value
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			await this.set([
				{ indicatorId: property, propertyId: propertyKey, value },
			]);
			// Refresh the current value
			await this.get(property);
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
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

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getSupported(indicatorId: number) {
		this.assertSupportsCommand(
			IndicatorCommand,
			IndicatorCommand.SupportedGet,
		);

		const cc = new IndicatorCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			indicatorId,
		});
		const response = (await this.driver.sendCommand<
			IndicatorCCSupportedReport
		>(cc))!;
		return {
			supportedProperties: response.supportedProperties,
			nextIndicatorId: response.nextIndicatorId,
		};
	}

	/**
	 * Instructs the node to identify itself. Available starting with V3 of this CC.
	 */
	public async identify(): Promise<void> {
		if (this.version <= 3) {
			throw new ZWaveError(
				`The identify command is only supported in Version 3 and above`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
		await this.set([
			{
				indicatorId: 0x50,
				propertyId: 0x03,
				value: 0x08,
			},
			{
				indicatorId: 0x50,
				propertyId: 0x04,
				value: 0x03,
			},
			{
				indicatorId: 0x50,
				propertyId: 0x05,
				value: 0x06,
			},
		]);
	}
}

@commandClass(CommandClasses.Indicator)
@implementedVersion(3)
export class IndicatorCC extends CommandClass {
	declare ccCommand: IndicatorCommand;

	public constructor(driver: IDriver, options: CommandClassOptions) {
		super(driver, options);
		this.registerValue(
			getSupportedIndicatorIDsValueID(undefined).property,
			true,
		);
		this.registerValue(
			getSupportedPropertyIDsValueID(undefined, 0).property,
			true,
		);
	}

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const api = this.getEndpoint()!.commandClasses.Indicator;

		log.controller.logNode(node.id, {
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		if (this.version === 1) {
			log.controller.logNode(node.id, {
				message: "requesting current indicator value...",
				direction: "outbound",
			});
			await api.get();
		} else {
			let supportedIndicatorIds: number[];
			if (complete) {
				log.controller.logNode(node.id, {
					message: "scanning supported indicator IDs...",
					direction: "outbound",
				});
				let nextId = (await api.getSupported(0x00)).nextIndicatorId;
				supportedIndicatorIds = [];
				while (nextId !== 0x00) {
					supportedIndicatorIds.push(nextId);
					const supportedResponse = await api.getSupported(nextId);
					nextId = supportedResponse.nextIndicatorId;
				}
				// The IDs are not stored by the report CCs
				this.getValueDB().setValue(
					getSupportedIndicatorIDsValueID(this.endpointIndex),
					supportedIndicatorIds,
				);
				const logMessage = `supported indicator IDs: ${supportedIndicatorIds.join(
					", ",
				)}`;
				log.controller.logNode(node.id, {
					message: logMessage,
					direction: "inbound",
				});
			} else {
				supportedIndicatorIds =
					this.getValueDB().getValue(
						getSupportedIndicatorIDsValueID(this.endpointIndex),
					) ?? [];
			}

			for (const indicatorId of supportedIndicatorIds) {
				log.controller.logNode(node.id, {
					message: `requesting current indicator value (id = ${num2hex(
						indicatorId,
					)})...`,
					direction: "outbound",
				});
				await api.get(indicatorId);
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public translatePropertyKey(
		property: string | number,
		propertyKey?: string | number,
	): string | undefined {
		if (property === "value") {
			// CC version 1 only has a single value that doesn't need to be translated
			return undefined;
		} else if (typeof property === "number") {
			// The indicator property is our property key
			const prop = lookupProperty(property);
			if (prop) return prop.label;
		}
		return super.translateProperty(property, propertyKey);
	}

	public translateProperty(
		property: string | number,
		propertyKey?: string | number,
	): string {
		if (typeof property === "number" && typeof propertyKey === "number") {
			// The indicator corresponds to our property
			const label = lookupIndicator(property);
			if (label) return label;
		}
		return super.translateProperty(property, propertyKey);
	}
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

		const valueDB = this.getValueDB();

		const objCount =
			this.payload.length >= 2 ? this.payload[1] & 0b11111 : 0;
		if (objCount === 0) {
			this.value = this.payload[0];

			// Publish the value
			const valueId = getIndicatorValueValueID(this.endpointIndex, 0, 1);
			valueDB.setMetadata(valueId, {
				...ValueMetadata.UInt8,
				label: "Indicator value",
			});
			valueDB.setValue(valueId, this.value);
		} else {
			validatePayload(this.payload.length >= 2 + 3 * objCount);
			this.values = [];
			for (let i = 0; i < objCount; i++) {
				const offset = 2 + 3 * i;
				const value = {
					indicatorId: this.payload[offset],
					propertyId: this.payload[offset + 1],
					value: this.payload[offset + 2],
				};
				this.values.push(value);
				// Publish the value
				const valueId = getIndicatorValueValueID(
					this.endpointIndex,
					value.indicatorId,
					value.propertyId,
				);
				valueDB.setMetadata(
					valueId,
					getIndicatorMetadata(value.indicatorId, value.propertyId),
				);
				valueDB.setValue(valueId, this.value);
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

		if (this.indicatorId !== 0x00) {
			// Remember which property IDs are supported
			this.getValueDB().setValue(
				getSupportedPropertyIDsValueID(
					this.endpointIndex,
					this.indicatorId,
				),
				this.supportedProperties,
			);
		}
	}

	public readonly indicatorId: number;
	public readonly nextIndicatorId: number;
	public readonly supportedProperties: readonly number[];
}

interface IndicatorCCSupportedGetOptions extends CCCommandOptions {
	indicatorId: number;
}

@CCCommand(IndicatorCommand.SupportedGet)
@expectedCCResponse(IndicatorCCSupportedReport)
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
