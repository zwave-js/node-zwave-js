import type { ConfigManager } from "@zwave-js/config";
import type {
	MessageOrCCLogEntry,
	MessageRecord,
	SupervisionResult,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	Maybe,
	MessagePriority,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { num2hex } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { IndicatorCommand } from "../lib/_Types";

function isManufacturerDefinedIndicator(indicatorId: number): boolean {
	return indicatorId >= 0x80 && indicatorId <= 0x9f;
}

export const IndicatorCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Indicator, {
		...V.staticProperty("supportedIndicatorIds", undefined, {
			internal: true,
		}),

		...V.staticPropertyWithName("valueV1", "value", {
			...ValueMetadata.UInt8,
			label: "Indicator value",
			ccSpecific: {
				indicatorId: 0,
			},
		} as const),
	}),

	...V.defineDynamicCCValues(CommandClasses.Indicator, {
		...V.dynamicPropertyAndKeyWithName(
			"supportedPropertyIDs",
			"supportedPropertyIDs",
			(indicatorId: number) => indicatorId,
			({ property, propertyKey }) =>
				property === "supportedPropertyIDs" &&
				typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),

		...V.dynamicPropertyAndKeyWithName(
			"valueV2",
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			(indicatorId: number, propertyId: number) => indicatorId,
			(indicatorId: number, propertyId: number) => propertyId,
			({ property, propertyKey }) =>
				typeof property === "number" && typeof propertyKey === "number",
			// The metadata is highly dependent on the indicator and property
			// so this is just a baseline
			(indicatorId: number, propertyId: number) => ({
				...ValueMetadata.Any,
				ccSpecific: {
					indicatorId,
					propertyId,
				},
			}),
			{ minVersion: 2 } as const,
		),

		...V.dynamicPropertyWithName(
			"indicatorDescription",
			(indicatorId: number) => indicatorId,
			({ property }) => typeof property === "number",
			undefined,
			{ internal: true, minVersion: 4 } as const,
		),
	}),
});

/**
 * Looks up the configured metadata for the given indicator and property
 */
function getIndicatorMetadata(
	configManager: ConfigManager,
	indicatorId: number,
	propertyId: number,
	overrideIndicatorLabel?: string,
): ValueMetadata {
	const label =
		overrideIndicatorLabel || configManager.lookupIndicator(indicatorId);
	const prop = configManager.lookupProperty(propertyId);
	const baseMetadata = IndicatorCCValues.valueV2(
		indicatorId,
		propertyId,
	).meta;
	if (!label && !prop) {
		return {
			...baseMetadata,
			...ValueMetadata.UInt8,
		};
	} else if (!prop) {
		return {
			...baseMetadata,
			...ValueMetadata.UInt8,
			label,
		};
	} else {
		if (prop.type === "boolean") {
			return {
				...baseMetadata,
				...ValueMetadata.Boolean,
				label: `${label} - ${prop.label}`,
				description: prop.description,
				readable: !prop.readonly,
			};
		} else {
			// UInt8
			return {
				...baseMetadata,
				...ValueMetadata.UInt8,
				label: `${label} - ${prop.label}`,
				description: prop.description,
				min: prop.min,
				max: prop.max,
				readable: !prop.readonly,
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
			case IndicatorCommand.DescriptionGet:
				return this.version >= 4 && this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
	) => {
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
			return this.set(value);
		} else if (
			typeof property === "number" &&
			typeof propertyKey === "number"
		) {
			const indicatorId = property;
			const propertyId = propertyKey;
			const expectedType = getIndicatorMetadata(
				this.applHost.configManager,
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
			return this.set([
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

	@validateArgs()
	public async get(
		indicatorId?: number,
	): Promise<number | IndicatorObject[] | undefined> {
		this.assertSupportsCommand(IndicatorCommand, IndicatorCommand.Get);

		const cc = new IndicatorCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			indicatorId,
		});
		const response = await this.applHost.sendCommand<IndicatorCCReport>(
			cc,
			this.commandOptions,
		);
		if (!response) return;
		if (response.values) return response.values;
		return response.value!;
	}

	@validateArgs()
	public async set(
		value: number | IndicatorObject[],
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(IndicatorCommand, IndicatorCommand.Set);

		const cc = new IndicatorCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...(typeof value === "number" ? { value } : { values: value }),
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getSupported(indicatorId: number): Promise<
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

		const cc = new IndicatorCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			indicatorId,
		});
		const response =
			await this.applHost.sendCommand<IndicatorCCSupportedReport>(
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
	public async identify(): Promise<SupervisionResult | undefined> {
		if (this.version < 3) {
			throw new ZWaveError(
				`The identify command is only supported in Version 3 and above`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
		return this.set([
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

	@validateArgs()
	public async getDescription(
		indicatorId: number,
	): Promise<string | undefined> {
		this.assertSupportsCommand(
			IndicatorCommand,
			IndicatorCommand.DescriptionGet,
		);

		const cc = new IndicatorCCDescriptionGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			indicatorId,
		});
		const response =
			await this.applHost.sendCommand<IndicatorCCDescriptionReport>(
				cc,
				this.commandOptions,
			);
		return response?.description;
	}
}

@commandClass(CommandClasses.Indicator)
@implementedVersion(4)
@ccValues(IndicatorCCValues)
export class IndicatorCC extends CommandClass {
	declare ccCommand: IndicatorCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Indicator,
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

		if (this.version > 1) {
			applHost.controllerLog.logNode(node.id, {
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
					applHost.controllerLog.logNode(node.id, {
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
			this.setValue(
				applHost,
				IndicatorCCValues.supportedIndicatorIds,
				supportedIndicatorIds,
			);
			const logMessage = `supported indicator IDs: ${supportedIndicatorIds.join(
				", ",
			)}`;
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});

			if (this.version >= 4) {
				const manufacturerDefinedIndicatorIds =
					supportedIndicatorIds.filter((id) =>
						isManufacturerDefinedIndicator(id),
					);
				if (manufacturerDefinedIndicatorIds.length > 0) {
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"retrieving description for manufacturer-defined indicator IDs...",
						direction: "outbound",
					});

					for (const id of manufacturerDefinedIndicatorIds) {
						await api.getDescription(id);
					}
				}
			}
		}

		// Query current values
		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Indicator,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		if (this.version === 1) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "requesting current indicator value...",
				direction: "outbound",
			});
			await api.get();
		} else {
			const supportedIndicatorIds: number[] =
				this.getValue(
					applHost,
					IndicatorCCValues.supportedIndicatorIds,
				) ?? [];
			for (const indicatorId of supportedIndicatorIds) {
				applHost.controllerLog.logNode(node.id, {
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
		applHost: ZWaveApplicationHost,
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
			const prop = applHost.configManager.lookupProperty(propertyKey);
			if (prop) return prop.label;
		}
		return super.translatePropertyKey(applHost, property, propertyKey);
	}

	public translateProperty(
		applHost: ZWaveApplicationHost,
		property: string | number,
		propertyKey?: string | number,
	): string {
		if (typeof property === "number" && typeof propertyKey === "number") {
			// The indicator corresponds to our property
			const label = applHost.configManager.lookupIndicator(property);
			if (label) return label;
		}
		return super.translateProperty(applHost, property, propertyKey);
	}

	protected supportsV2Indicators(applHost: ZWaveApplicationHost): boolean {
		// First test if there are any indicator ids defined
		const supportedIndicatorIds = this.getValue<number[]>(
			applHost,
			IndicatorCCValues.supportedIndicatorIds,
		);
		if (!supportedIndicatorIds?.length) return false;
		// Then test if there are any property ids defined
		return supportedIndicatorIds.some(
			(indicatorId) =>
				!!this.getValue<number[]>(
					applHost,
					IndicatorCCValues.supportedPropertyIDs(indicatorId),
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
@useSupervision()
export class IndicatorCCSet extends IndicatorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (IndicatorCCSetOptions & CCCommandOptions),
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(IndicatorCommand.Report)
export class IndicatorCCReport extends IndicatorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);

		const objCount =
			this.payload.length >= 2 ? this.payload[1] & 0b11111 : 0;
		if (objCount === 0) {
			this.value = this.payload[0];
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
				this.values.push(value);
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

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		if (this.value != undefined) {
			if (!this.supportsV2Indicators(applHost)) {
				// Publish the value
				const valueV1 = IndicatorCCValues.valueV1;
				this.setMetadata(applHost, valueV1);
				this.setValue(applHost, valueV1, this.value);
			} else {
				if (this.isSinglecast()) {
					// Don't!
					applHost.controllerLog.logNode(this.nodeId, {
						message: `ignoring V1 indicator report because the node supports V2 indicators`,
						direction: "none",
						endpoint: this.endpointIndex,
					});
				}
			}
		} else if (this.values) {
			for (const value of this.values) {
				this.setIndicatorValue(applHost, value);
			}
		}

		return true;
	}

	public readonly value: number | undefined;
	public readonly values: IndicatorObject[] | undefined;

	private setIndicatorValue(
		applHost: ZWaveApplicationHost,
		value: IndicatorObject,
	): void {
		// Manufacturer-defined indicators may need a custom label
		const overrideIndicatorLabel = isManufacturerDefinedIndicator(
			value.indicatorId,
		)
			? this.getValue<string>(
					applHost,
					IndicatorCCValues.indicatorDescription(value.indicatorId),
			  )
			: undefined;

		const metadata = getIndicatorMetadata(
			applHost.configManager,
			value.indicatorId,
			value.propertyId,
			overrideIndicatorLabel,
		);
		// Some values need to be converted
		if (metadata.type === "boolean") {
			value.value = !!value.value;
		}

		// Publish the value
		const valueV2 = IndicatorCCValues.valueV2(
			value.indicatorId,
			value.propertyId,
		);
		this.setMetadata(applHost, valueV2, metadata);
		this.setValue(applHost, valueV2, value.value);
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | IndicatorCCGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				indicator: getIndicatorName(
					applHost.configManager,
					this.indicatorId,
				),
			},
		};
	}
}

@CCCommand(IndicatorCommand.SupportedReport)
export class IndicatorCCSupportedReport extends IndicatorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

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
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		if (this.indicatorId !== 0x00) {
			// Remember which property IDs are supported
			this.setValue(
				applHost,
				IndicatorCCValues.supportedPropertyIDs(this.indicatorId),
				this.supportedProperties,
			);
		}
		return true;
	}

	public readonly indicatorId: number;
	public readonly nextIndicatorId: number;
	public readonly supportedProperties: readonly number[];

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				indicator: getIndicatorName(
					applHost.configManager,
					this.indicatorId,
				),
				"supported properties": `${this.supportedProperties
					.map(
						(id) =>
							applHost.configManager.lookupProperty(id)?.label ??
							`Unknown (${num2hex(id)})`,
					)
					.join(", ")}`,
				"next indicator": getIndicatorName(
					applHost.configManager,
					this.nextIndicatorId,
				),
			},
		};
	}
}

interface IndicatorCCSupportedGetOptions extends CCCommandOptions {
	indicatorId: number;
}

function testResponseForIndicatorSupportedGet(
	sent: IndicatorCCSupportedGet,
	received: IndicatorCCSupportedReport,
) {
	return received.indicatorId === sent.indicatorId;
}

@CCCommand(IndicatorCommand.SupportedGet)
@expectedCCResponse(
	IndicatorCCSupportedReport,
	testResponseForIndicatorSupportedGet,
)
export class IndicatorCCSupportedGet extends IndicatorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| IndicatorCCSupportedGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				indicator: getIndicatorName(
					applHost.configManager,
					this.indicatorId,
				),
			},
		};
	}
}

@CCCommand(IndicatorCommand.DescriptionReport)
export class IndicatorCCDescriptionReport extends IndicatorCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this.indicatorId = this.payload[0];
		const descrptionLength = this.payload[1];
		validatePayload(this.payload.length >= 2 + descrptionLength);
		this.description = this.payload
			.slice(2, 2 + descrptionLength)
			.toString("utf8");
	}

	public indicatorId: number;
	public description: string;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		if (this.description) {
			this.setValue(
				applHost,
				IndicatorCCValues.indicatorDescription(this.indicatorId),
				this.description,
			);
		}

		return true;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"indicator ID": this.indicatorId,
				description: this.description || "(none)",
			},
		};
	}
}

interface IndicatorCCDescriptionGetOptions extends CCCommandOptions {
	indicatorId: number;
}

function testResponseForIndicatorDescriptionGet(
	sent: IndicatorCCDescriptionGet,
	received: IndicatorCCDescriptionReport,
) {
	return received.indicatorId === sent.indicatorId;
}

@CCCommand(IndicatorCommand.DescriptionGet)
@expectedCCResponse(
	IndicatorCCDescriptionReport,
	testResponseForIndicatorDescriptionGet,
)
export class IndicatorCCDescriptionGet extends IndicatorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| IndicatorCCDescriptionGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.indicatorId = this.payload[0];
		} else {
			this.indicatorId = options.indicatorId;
			if (!isManufacturerDefinedIndicator(this.indicatorId)) {
				throw new ZWaveError(
					"The indicator ID must be between 0x80 and 0x9f",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}
	}

	public indicatorId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.indicatorId]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"indicator ID": this.indicatorId,
			},
		};
	}
}
