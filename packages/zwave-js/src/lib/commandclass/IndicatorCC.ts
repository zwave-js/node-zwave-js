import type { ConfigManager } from "@zwave-js/config";
import type {
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CommandClasses,
	Maybe,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
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

/**
 * @publicAPI
 */
export type IndicatorMetadata = ValueMetadata & {
	ccSpecific: {
		indicatorId: number;
		propertyId?: number; // only present on V2+ indicators
	};
};

export function getSupportedIndicatorIDsValueID(
	endpoint: number | undefined,
): ValueID {
	return {
		commandClass: CommandClasses.Indicator,
		endpoint,
		property: "supportedIndicatorIds",
	};
}

export function getSupportedPropertyIDsValueID(
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

export function getIndicatorValueValueID(
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
	configManager: ConfigManager,
	indicatorId: number,
	propertyId: number,
): ValueMetadata {
	const label = configManager.lookupIndicator(indicatorId);
	const prop = configManager.lookupProperty(propertyId);
	if (!label && !prop) {
		return {
			...ValueMetadata.UInt8,
			ccSpecific: {
				indicatorId,
				propertyId,
			},
		};
	} else if (!prop) {
		return {
			...ValueMetadata.UInt8,
			label,
			ccSpecific: {
				indicatorId,
				propertyId,
			},
		};
	} else {
		if (prop.type === "boolean") {
			return {
				...ValueMetadata.Boolean,
				label: `${label} - ${prop.label}`,
				description: prop.description,
				readable: !prop.readonly,
				ccSpecific: {
					indicatorId,
					propertyId,
				},
			};
		} else {
			// UInt8
			return {
				...ValueMetadata.UInt8,
				label: `${label} - ${prop.label}`,
				description: prop.description,
				min: prop.min,
				max: prop.max,
				readable: !prop.readonly,
				ccSpecific: {
					indicatorId,
					propertyId,
				},
			};
		}
	}
}

function getIndicatorName(
	configManager: ConfigManager,
	indicatorId: number | undefined,
): string {
	let indicatorName = "0 (default)";
	if (indicatorId) {
		indicatorName = `${num2hex(indicatorId)} (${
			configManager.lookupIndicator(indicatorId) ?? `Unknown`
		})`;
	}
	return indicatorName;
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
				return this.isSinglecast();
			case IndicatorCommand.Set:
				return true; // This is mandatory
			case IndicatorCommand.SupportedGet:
				return this.version >= 2 && this.isSinglecast();
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
		} else if (
			typeof property === "number" &&
			typeof propertyKey === "number"
		) {
			const indicatorId = property;
			const propertyId = propertyKey;
			const expectedType = getIndicatorMetadata(
				this.driver.configManager,
				indicatorId,
				propertyId,
			).type as "number" | "boolean";

			// V2+ value
			if (typeof value !== expectedType) {
				throwWrongValueType(
					this.ccId,
					property,
					expectedType,
					typeof value,
				);
			}
			await this.set([
				{
					indicatorId: property,
					propertyId: propertyKey,
					value: value as any,
				},
			]);
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		if (property === "value") return this.get();
		if (typeof property === "number") {
			return this.get(property);
		}

		throwUnsupportedProperty(this.ccId, property);
	};

	public async get(
		indicatorId?: number,
	): Promise<number | IndicatorObject[] | undefined> {
		this.assertSupportsCommand(IndicatorCommand, IndicatorCommand.Get);

		const cc = new IndicatorCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			indicatorId,
		});
		const response = await this.driver.sendCommand<IndicatorCCReport>(
			cc,
			this.commandOptions,
		);
		if (!response) return;
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
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getSupported(
		indicatorId: number,
	): Promise<
		| {
				indicatorId?: number;
				supportedProperties: readonly number[];
				nextIndicatorId: number;
		  }
		| undefined
	> {
		this.assertSupportsCommand(
			IndicatorCommand,
			IndicatorCommand.SupportedGet,
		);

		const cc = new IndicatorCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			indicatorId,
		});
		const response = await this.driver.sendCommand<IndicatorCCSupportedReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return {
				// Include the actual indicator ID if 0x00 was requested
				...(indicatorId === 0x00
					? { indicatorId: response.indicatorId }
					: undefined),
				supportedProperties: response.supportedProperties,
				nextIndicatorId: response.nextIndicatorId,
			};
		}
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

	public constructor(driver: Driver, options: CommandClassOptions) {
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

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Indicator.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		if (this.version > 1) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "scanning supported indicator IDs...",
				direction: "outbound",
			});
			// Query ID 0 to get the first supported ID
			let curId = 0x00;
			const supportedIndicatorIds: number[] = [];
			do {
				const supportedResponse = await api.getSupported(curId);
				if (!supportedResponse) {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"Time out while scanning supported indicator IDs, skipping interview...",
						level: "warn",
					});
					return;
				}

				supportedIndicatorIds.push(
					supportedResponse.indicatorId ?? curId,
				);
				curId = supportedResponse.nextIndicatorId;
			} while (curId !== 0x00);

			// The IDs are not stored by the report CCs so store them here once we have all of them
			this.getValueDB().setValue(
				getSupportedIndicatorIDsValueID(this.endpointIndex),
				supportedIndicatorIds,
			);
			const logMessage = `supported indicator IDs: ${supportedIndicatorIds.join(
				", ",
			)}`;
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		// Query current values
		await this.refreshValues();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Indicator.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		if (this.version === 1) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "requesting current indicator value...",
				direction: "outbound",
			});
			await api.get();
		} else {
			const supportedIndicatorIds: number[] =
				this.getValueDB().getValue(
					getSupportedIndicatorIDsValueID(this.endpointIndex),
				) ?? [];
			for (const indicatorId of supportedIndicatorIds) {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `requesting current indicator value (id = ${num2hex(
						indicatorId,
					)})...`,
					direction: "outbound",
				});
				await api.get(indicatorId);
			}
		}
	}

	public translatePropertyKey(
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (property === "value") {
			// CC version 1 only has a single value that doesn't need to be translated
			return undefined;
		} else if (
			typeof property === "number" &&
			typeof propertyKey === "number"
		) {
			// The indicator property is our property key
			const prop = this.driver.configManager.lookupProperty(propertyKey);
			if (prop) return prop.label;
		}
		return super.translatePropertyKey(property, propertyKey);
	}

	public translateProperty(
		property: string | number,
		propertyKey?: string | number,
	): string {
		if (typeof property === "number" && typeof propertyKey === "number") {
			// The indicator corresponds to our property
			const label = this.driver.configManager.lookupIndicator(property);
			if (label) return label;
		}
		return super.translateProperty(property, propertyKey);
	}

	protected supportsV2Indicators(): boolean {
		// First test if there are any indicator ids defined
		const supportedIndicatorIds = this.getValueDB().getValue<number[]>(
			getSupportedIndicatorIDsValueID(this.endpointIndex),
		);
		if (!supportedIndicatorIds?.length) return false;
		// Then test if there are any property ids defined
		return supportedIndicatorIds.some(
			(indicatorId) =>
				!!this.getValueDB().getValue<number[]>(
					getSupportedPropertyIDsValueID(
						this.endpointIndex,
						indicatorId,
					),
				)?.length,
		);
	}
}

export interface IndicatorObject {
	indicatorId: number;
	propertyId: number;
	value: number | boolean;
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
		driver: Driver,
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
						`Node ${
							this.nodeId as number
						} only supports IndicatorCC V1 which requires a single value to be set`,
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
				.map(
					(o) =>
						[
							o.indicatorId,
							o.propertyId,
							typeof o.value === "number"
								? o.value
								: o.value
								? 0xff
								: 0x00,
						] as const,
				)
				.reduce((acc, cur) => acc.concat(...cur), [] as number[]);
			this.payload = Buffer.concat([
				Buffer.from([0, objCount]),
				Buffer.from(valuesFlat),
			]);
		}
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.indicator0Value != undefined) {
			message["indicator 0 value"] = this.indicator0Value;
		}
		if (this.values != undefined) {
			message.values = `${this.values
				.map(
					(v) => `
· indicatorId: ${v.indicatorId}
  propertyId:  ${v.propertyId}
  value:       ${v.value}`,
				)
				.join("")}`;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(IndicatorCommand.Report)
export class IndicatorCCReport extends IndicatorCC {
	// @noCCValues This CC stores its values diffently

	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);

		const valueDB = this.getValueDB();

		const objCount =
			this.payload.length >= 2 ? this.payload[1] & 0b11111 : 0;
		if (objCount === 0) {
			this.value = this.payload[0];

			if (!this.supportsV2Indicators()) {
				// Publish the value
				const valueId = getIndicatorValueValueID(
					this.endpointIndex,
					0,
					1,
				);
				valueDB.setMetadata(valueId, {
					...ValueMetadata.UInt8,
					label: "Indicator value",
					ccSpecific: {
						indicatorId: 0,
					},
				});
				valueDB.setValue(valueId, this.value);
			} else {
				if (this.isSinglecast()) {
					// Don't!
					this.driver.controllerLog.logNode(this.nodeId, {
						message: `ignoring V1 indicator report because the node supports V2 indicators`,
						direction: "none",
						endpoint: this.endpointIndex,
					});
				}
			}
		} else {
			validatePayload(this.payload.length >= 2 + 3 * objCount);
			this.values = [];
			for (let i = 0; i < objCount; i++) {
				const offset = 2 + 3 * i;
				const value: IndicatorObject = {
					indicatorId: this.payload[offset],
					propertyId: this.payload[offset + 1],
					value: this.payload[offset + 2],
				};

				this.setIndicatorValue(value);
			}

			// TODO: Think if we want this:

			// // If not all Property IDs are included in the command for the actual Indicator ID,
			// // a controlling node MUST assume non-specified Property IDs values to be 0x00.
			// const indicatorId = this.values[0].indicatorId;
			// const supportedIndicatorProperties =
			// 	valueDB.getValue<number[]>(
			// 		getSupportedPropertyIDsValueID(
			// 			this.endpointIndex,
			// 			indicatorId,
			// 		),
			// 	) ?? [];
			// // Find out which ones are missing
			// const missingIndicatorProperties = supportedIndicatorProperties.filter(
			// 	prop =>
			// 		!this.values!.find(({ propertyId }) => prop === propertyId),
			// );
			// // And assume they are 0 (false)
			// for (const missing of missingIndicatorProperties) {
			// 	this.setIndicatorValue({
			// 		indicatorId,
			// 		propertyId: missing,
			// 		value: 0,
			// 	});
			// }
		}
	}

	public readonly value: number | undefined;
	public readonly values: IndicatorObject[] | undefined;

	private setIndicatorValue(value: IndicatorObject): void {
		const valueDB = this.getValueDB();

		const metadata = getIndicatorMetadata(
			this.driver.configManager,
			value.indicatorId,
			value.propertyId,
		);
		// Some values need to be converted
		if (metadata.type === "boolean") {
			value.value = !!value.value;
		}
		this.values!.push(value);

		// Publish the value
		const valueId = getIndicatorValueValueID(
			this.endpointIndex,
			value.indicatorId,
			value.propertyId,
		);
		valueDB.setMetadata(valueId, metadata);
		valueDB.setValue(valueId, value.value);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.value != undefined) {
			message["indicator 0 value"] = this.value;
		}
		if (this.values != undefined) {
			message.values = `${this.values
				.map(
					(v) => `
· indicatorId: ${v.indicatorId}
  propertyId:  ${v.propertyId}
  value:       ${v.value}`,
				)
				.join("")}`;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

interface IndicatorCCGetOptions extends CCCommandOptions {
	indicatorId?: number;
}

@CCCommand(IndicatorCommand.Get)
@expectedCCResponse(IndicatorCCReport)
export class IndicatorCCGet extends IndicatorCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				indicator: getIndicatorName(
					this.driver.configManager,
					this.indicatorId,
				),
			},
		};
	}
}

@CCCommand(IndicatorCommand.SupportedReport)
export class IndicatorCCSupportedReport extends IndicatorCC {
	public constructor(
		driver: Driver,
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
			).filter((v) => v !== 0);
		}

		this.persistValues();
	}

	public persistValues(): boolean {
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
		return true;
	}

	public readonly indicatorId: number;
	public readonly nextIndicatorId: number;
	public readonly supportedProperties: readonly number[];

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				indicator: getIndicatorName(
					this.driver.configManager,
					this.indicatorId,
				),
				"supported properties": `${this.supportedProperties
					.map(
						(id) =>
							this.driver.configManager.lookupProperty(id)
								?.label ?? `Unknown (${num2hex(id)})`,
					)
					.join(", ")}`,
				"next indicator": getIndicatorName(
					this.driver.configManager,
					this.nextIndicatorId,
				),
			},
		};
	}
}

interface IndicatorCCSupportedGetOptions extends CCCommandOptions {
	indicatorId: number;
}

@CCCommand(IndicatorCommand.SupportedGet)
@expectedCCResponse(IndicatorCCSupportedReport)
export class IndicatorCCSupportedGet extends IndicatorCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				indicator: getIndicatorName(
					this.driver.configManager,
					this.indicatorId,
				),
			},
		};
	}
}
