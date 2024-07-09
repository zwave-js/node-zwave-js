import type { ConfigManager } from "@zwave-js/config";
import {
	CommandClasses,
	type IZWaveEndpoint,
	Indicator,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	getIndicatorProperty,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { num2hex } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { clamp, roundTo } from "alcalzone-shared/math";
import { isArray } from "alcalzone-shared/typeguards";
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
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
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
import { IndicatorCommand, type IndicatorTimeout } from "../lib/_Types";

function isManufacturerDefinedIndicator(indicatorId: number): boolean {
	return indicatorId >= 0x80 && indicatorId <= 0x9f;
}

const timeoutStringRegex =
	/^(?:(?<hoursStr>\d+)h)?(?:(?<minutesStr>\d+)m)?(?:(?<secondsStr>\d+(?:\.\d+)?)s)?$/i;

function parseIndicatorTimeoutString(
	text: string,
): IndicatorTimeout | undefined {
	if (!text.length) return undefined;
	// Try to parse the numeric parts from a timeout
	const match = timeoutStringRegex.exec(text);
	if (!match) return undefined;
	const { hoursStr, minutesStr, secondsStr } = match.groups!;
	if (!hoursStr && !minutesStr && !secondsStr) return undefined;

	const ret: IndicatorTimeout = {};
	if (hoursStr) {
		ret.hours = clamp(parseInt(hoursStr, 10), 0, 255);
	}
	if (minutesStr) {
		ret.minutes = clamp(parseInt(minutesStr, 10), 0, 255);
	}
	if (secondsStr) {
		ret.seconds = clamp(roundTo(parseFloat(secondsStr), 2), 0, 59.99);
	}

	return ret;
}

function indicatorObjectsToTimeout(
	values: IndicatorObject[],
): IndicatorTimeout | undefined {
	const timeoutValues = values.filter((v) =>
		[0x0a, 0x06, 0x07, 0x08].includes(v.propertyId)
	);
	if (!timeoutValues.length) return undefined;

	const hours = (timeoutValues.find((v) => v.propertyId === 0x0a)?.value
		?? 0) as number;
	const minutes = (timeoutValues.find((v) => v.propertyId === 0x06)?.value
		?? 0) as number;
	const seconds = clamp(
		(timeoutValues.find((v) => v.propertyId === 0x07)
			?.value as number) ?? 0,
		0,
		59,
	)
		+ clamp(
				(timeoutValues.find((v) => v.propertyId === 0x08)
					?.value as number) ?? 0,
				0,
				99,
			)
			/ 100;

	return {
		hours,
		minutes,
		seconds,
	};
}

export const IndicatorCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Indicator, {
		...V.staticProperty("supportedIndicatorIds", undefined, {
			internal: true,
		}),

		...V.staticPropertyWithName(
			"valueV1",
			"value",
			{
				...ValueMetadata.UInt8,
				label: "Indicator value",
				ccSpecific: {
					indicatorId: 0,
				},
			} as const,
		),

		// Convenience values for indicators that are split across multiple properties
		...V.staticProperty(
			"identify",
			{
				...ValueMetadata.WriteOnlyBoolean,
				label: "Identify",
				states: {
					true: "Identify",
				},
			} as const,
			{ minVersion: 3 } as const,
		),

		...V.staticProperty(
			"timeout",
			{
				...ValueMetadata.String,
				label: "Timeout",
			} as const,
			{ minVersion: 3 } as const,
		),
	}),

	...V.defineDynamicCCValues(CommandClasses.Indicator, {
		...V.dynamicPropertyAndKeyWithName(
			"supportedPropertyIDs",
			"supportedPropertyIDs",
			(indicatorId: number) => indicatorId,
			({ property, propertyKey }) =>
				property === "supportedPropertyIDs"
				&& typeof propertyKey === "number",
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
	indicatorId: Indicator,
	propertyId: number,
	overrideIndicatorLabel?: string,
): ValueMetadata {
	const label = overrideIndicatorLabel
		|| getIndicatorName(indicatorId);
	const prop = getIndicatorProperty(propertyId);
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
	indicatorId: number | undefined,
): string {
	if (indicatorId) {
		return `${num2hex(indicatorId)} (${
			indicatorId in Indicator ? Indicator[indicatorId] : "Unknown"
		})`;
	} else {
		return "0 (default)";
	}
}

const MAX_INDICATOR_OBJECTS = 31;

@API(CommandClasses.Indicator)
export class IndicatorCCAPI extends CCAPI {
	public supportsCommand(cmd: IndicatorCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case IndicatorCommand.Get:
			case IndicatorCommand.Report:
				return this.isSinglecast();
			case IndicatorCommand.Set:
				return true; // This is mandatory
			case IndicatorCommand.SupportedGet:
			case IndicatorCommand.SupportedReport:
				return this.version >= 2 && this.isSinglecast();
			case IndicatorCommand.DescriptionGet:
			case IndicatorCommand.DescriptionReport:
				return this.version >= 4 && this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: IndicatorCCAPI,
			{ property, propertyKey },
			value,
		) {
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
				typeof property === "number"
				&& typeof propertyKey === "number"
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
			} else if (property === "identify") {
				if (typeof value !== "boolean") {
					throwWrongValueType(
						this.ccId,
						property,
						"boolean",
						typeof value,
					);
				}
				return this.identify();
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: IndicatorCCAPI, { property }) {
			if (property === "value") return this.get();
			if (typeof property === "number") {
				return this.get(property);
			}

			throwUnsupportedProperty(this.ccId, property);
		};
	}

	@validateArgs()
	public async get(
		indicatorId?: number,
	): Promise<MaybeNotKnown<number | IndicatorObject[]>> {
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
		return response.indicator0Value!;
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
	public async sendReport(
		options: IndicatorCCReportSpecificOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			IndicatorCommand,
			IndicatorCommand.Report,
		);

		const cc = new IndicatorCCReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		await this.applHost.sendCommand(cc, this.commandOptions);
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
		const response = await this.applHost.sendCommand<
			IndicatorCCSupportedReport
		>(
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

	@validateArgs()
	public async reportSupported(
		indicatorId: number,
		supportedProperties: readonly number[],
		nextIndicatorId: number,
	): Promise<void> {
		this.assertSupportsCommand(
			IndicatorCommand,
			IndicatorCommand.SupportedReport,
		);

		const cc = new IndicatorCCSupportedReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			indicatorId,
			supportedProperties,
			nextIndicatorId,
		});

		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async reportDescription(
		indicatorId: number,
		description: string,
	): Promise<void> {
		this.assertSupportsCommand(
			IndicatorCommand,
			IndicatorCommand.DescriptionReport,
		);

		const cc = new IndicatorCCDescriptionReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			indicatorId,
			description,
		});

		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Instructs the node to identify itself. Available starting with V3 of this CC.
	 */
	public async identify(): Promise<SupervisionResult | undefined> {
		if (this.version < 3) {
			throw new ZWaveError(
				`The identify command is only supported in Indicator CC version 3 and above`,
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

	/**
	 * Set a timeout for a given indicator ID after which the indicator will be turned off.
	 * @param timeout The timeout in one of the supported forms:
	 * 	- a timeout string in the form `12h18m17.59s`. All parts (hours, minutes, seconds, hundredths) are optional, but must be specified in this order. An empty string will be treated like `undefined`.
	 * 	- an object specifying the timeout parts. An empty object will be treated like `undefined`.
	 * 	- `undefined` to disable the timeout.
	 */
	@validateArgs()
	public async setTimeout(
		indicatorId: number,
		timeout: IndicatorTimeout | string | undefined,
	): Promise<SupervisionResult | undefined> {
		this.assertPhysicalEndpoint(this.endpoint);

		if (this.version < 3) {
			throw new ZWaveError(
				`The setTimeout command is only supported in Indicator CC version 3 and above`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		if (typeof timeout === "string") {
			if (timeout === "") {
				timeout = undefined;
			} else {
				const parsed = parseIndicatorTimeoutString(timeout);
				if (!parsed) {
					throw new ZWaveError(
						`The timeout string "${timeout}" is not valid`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				timeout = parsed;
			}
		}

		const supportedPropertyIDs = IndicatorCC.getSupportedPropertyIDsCached(
			this.applHost,
			this.endpoint,
			indicatorId,
		);

		const objects: IndicatorObject[] = [];
		if (timeout) {
			const hours = timeout.hours ?? 0;
			const minutes = timeout.minutes ?? 0;
			const seconds = Math.floor(timeout.seconds ?? 0);
			const hundredths = Math.round(((timeout.seconds ?? 0) % 1) * 100);

			if (hours) {
				if (!supportedPropertyIDs?.includes(0x0a)) {
					throw new ZWaveError(
						`The indicator ${indicatorId} does not support setting the timeout in hours`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				objects.push({
					indicatorId,
					propertyId: 0x0a,
					value: hours,
				});
			}

			if (minutes) {
				if (!supportedPropertyIDs?.includes(0x06)) {
					throw new ZWaveError(
						`The indicator ${indicatorId} does not support setting the timeout in minutes`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				objects.push({
					indicatorId,
					propertyId: 0x06,
					value: minutes,
				});
			}

			if (seconds) {
				if (!supportedPropertyIDs?.includes(0x07)) {
					throw new ZWaveError(
						`The indicator ${indicatorId} does not support setting the timeout in seconds`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				objects.push({
					indicatorId,
					propertyId: 0x07,
					value: seconds,
				});
			}

			if (hundredths) {
				if (!supportedPropertyIDs?.includes(0x08)) {
					throw new ZWaveError(
						`The indicator ${indicatorId} does not support setting the timeout in 1/100 seconds`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				objects.push({
					indicatorId,
					propertyId: 0x08,
					value: hundredths,
				});
			}
		}

		if (!objects.length) {
			objects.push(
				...(supportedPropertyIDs ?? []).map((p) => ({
					indicatorId,
					propertyId: p,
					value: 0,
				})),
			);
		}

		return this.set(objects);
	}

	/**
	 * Returns the timeout after which the given indicator will be turned off.
	 */
	@validateArgs()
	public async getTimeout(
		indicatorId: number,
	): Promise<MaybeNotKnown<IndicatorTimeout>> {
		const values = await this.get(indicatorId);
		if (!isArray(values)) return;

		return indicatorObjectsToTimeout(values);
	}

	@validateArgs()
	public async getDescription(
		indicatorId: number,
	): Promise<MaybeNotKnown<string>> {
		this.assertSupportsCommand(
			IndicatorCommand,
			IndicatorCommand.DescriptionGet,
		);

		const cc = new IndicatorCCDescriptionGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			indicatorId,
		});
		const response = await this.applHost.sendCommand<
			IndicatorCCDescriptionReport
		>(
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
			const logMessage = `supported indicator IDs: ${
				supportedIndicatorIds.join(
					", ",
				)
			}`;
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});

			if (this.version >= 4) {
				const manufacturerDefinedIndicatorIds = supportedIndicatorIds
					.filter((id) => isManufacturerDefinedIndicator(id));
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
			const supportedIndicatorIds: number[] = this.getValue(
				applHost,
				IndicatorCCValues.supportedIndicatorIds,
			) ?? [];
			for (const indicatorId of supportedIndicatorIds) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `requesting current indicator value (id = ${
						num2hex(
							indicatorId,
						)
					})...`,
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
			typeof property === "number"
			&& typeof propertyKey === "number"
		) {
			// The indicator property is our property key
			const prop = getIndicatorProperty(propertyKey);
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
			if (property in Indicator) return Indicator[property];
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

	public static getSupportedPropertyIDsCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		indicatorId: number,
	): MaybeNotKnown<number[]> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				IndicatorCCValues.supportedPropertyIDs(indicatorId).endpoint(
					endpoint.index,
				),
			);
	}
}

export interface IndicatorObject {
	indicatorId: number;
	propertyId: number;
	value: number | boolean;
}

// @publicAPI
export type IndicatorCCSetOptions =
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
			validatePayload(this.payload.length >= 1);

			const objCount = this.payload.length >= 2
				? this.payload[1] & 0b11111
				: 0;
			if (objCount === 0) {
				this.indicator0Value = this.payload[0];
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
			}
		} else {
			if (this.version === 1) {
				if (!("value" in options)) {
					throw new ZWaveError(
						`Node ${this
							.nodeId as number} only supports IndicatorCC V1 which requires a single value to be set`,
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
		if (this.values != undefined) {
			// V2+
			this.payload = Buffer.alloc(2 + 3 * this.values.length, 0);
			// Byte 0 is the legacy value
			const objCount = this.values.length & MAX_INDICATOR_OBJECTS;
			this.payload[1] = objCount;
			for (let i = 0; i < objCount; i++) {
				const offset = 2 + 3 * i;
				this.payload[offset] = this.values[i].indicatorId;
				this.payload[offset + 1] = this.values[i].propertyId;
				const value = this.values[i].value;
				this.payload[offset + 2] = value === true
					? 0xff
					: value === false
					? 0x00
					: value;
			}
		} else {
			// V1
			this.payload = Buffer.from([this.indicator0Value ?? 0]);
		}
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.indicator0Value != undefined) {
			message["indicator 0 value"] = this.indicator0Value;
		}
		if (this.values != undefined) {
			message.values = `${
				this.values
					.map(
						(v) => `
· indicatorId: ${v.indicatorId}
  propertyId:  ${v.propertyId}
  value:       ${v.value}`,
					)
					.join("")
			}`;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export type IndicatorCCReportSpecificOptions =
	| {
		value: number;
	}
	| {
		values: IndicatorObject[];
	};

@CCCommand(IndicatorCommand.Report)
export class IndicatorCCReport extends IndicatorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (IndicatorCCReportSpecificOptions & CCCommandOptions),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);

			const objCount = this.payload.length >= 2
				? this.payload[1] & 0b11111
				: 0;
			if (objCount === 0) {
				this.indicator0Value = this.payload[0];
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
		} else {
			if ("value" in options) {
				this.indicator0Value = options.value;
			} else if ("values" in options) {
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

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		if (this.indicator0Value != undefined) {
			if (!this.supportsV2Indicators(applHost)) {
				// Publish the value
				const valueV1 = IndicatorCCValues.valueV1;
				this.setMetadata(applHost, valueV1);
				this.setValue(applHost, valueV1, this.indicator0Value);
			} else {
				if (this.isSinglecast()) {
					// Don't!
					applHost.controllerLog.logNode(this.nodeId, {
						message:
							`ignoring V1 indicator report because the node supports V2 indicators`,
						direction: "none",
						endpoint: this.endpointIndex,
					});
				}
			}
		} else if (this.values) {
			// Store the simple values first
			for (const value of this.values) {
				this.setIndicatorValue(applHost, value);
			}

			// Then group values into the convenience properties

			// ... timeout
			const timeout = indicatorObjectsToTimeout(this.values);
			if (timeout) {
				let timeoutString = "";
				if (timeout?.hours) timeoutString += `${timeout.hours}h`;
				if (timeout?.minutes) timeoutString += `${timeout.minutes}m`;
				if (timeout?.seconds) timeoutString += `${timeout.seconds}s`;

				this.setValue(
					applHost,
					IndicatorCCValues.timeout,
					timeoutString,
				);
			}
		}

		return true;
	}

	public readonly indicator0Value: number | undefined;
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

	public serialize(): Buffer {
		if (this.values != undefined) {
			// V2+
			this.payload = Buffer.alloc(2 + 3 * this.values.length, 0);
			// Byte 0 is the legacy value
			const objCount = this.values.length & MAX_INDICATOR_OBJECTS;
			this.payload[1] = objCount;
			for (let i = 0; i < objCount; i++) {
				const offset = 2 + 3 * i;
				this.payload[offset] = this.values[i].indicatorId;
				this.payload[offset + 1] = this.values[i].propertyId;
				const value = this.values[i].value;
				this.payload[offset + 2] = value === true
					? 0xff
					: value === false
					? 0x00
					: value;
			}
		} else {
			// V1
			this.payload = Buffer.from([this.indicator0Value ?? 0]);
		}
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.indicator0Value != undefined) {
			message["indicator 0 value"] = this.indicator0Value;
		}
		if (this.values != undefined) {
			message.values = `${
				this.values
					.map(
						(v) => `
· indicatorId: ${v.indicatorId}
  propertyId:  ${v.propertyId}
  value:       ${v.value}`,
					)
					.join("")
			}`;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface IndicatorCCGetOptions extends CCCommandOptions {
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
			if (this.payload.length > 0) {
				this.indicatorId = this.payload[0];
			}
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				indicator: getIndicatorName(this.indicatorId),
			},
		};
	}
}

// @publicAPI
export interface IndicatorCCSupportedReportOptions extends CCCommandOptions {
	indicatorId: number;
	nextIndicatorId: number;
	supportedProperties: readonly number[];
}

@CCCommand(IndicatorCommand.SupportedReport)
export class IndicatorCCSupportedReport extends IndicatorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| IndicatorCCSupportedReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
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
					this.payload.subarray(3, 3 + bitMaskLength),
					0,
				).filter((v) => v !== 0);
			}
		} else {
			this.indicatorId = options.indicatorId;
			this.nextIndicatorId = options.nextIndicatorId;
			this.supportedProperties = options.supportedProperties;
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

	public serialize(): Buffer {
		const bitmask = this.supportedProperties.length > 0
			? encodeBitMask(this.supportedProperties, undefined, 0)
			: Buffer.from([]);
		this.payload = Buffer.concat([
			Buffer.from([
				this.indicatorId,
				this.nextIndicatorId,
				bitmask.length,
			]),
			bitmask,
		]);

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				indicator: getIndicatorName(this.indicatorId),
				"supported properties": `${
					this.supportedProperties
						.map(
							(id) =>
								getIndicatorProperty(id)?.label
									?? `Unknown (${num2hex(id)})`,
						)
						.join(", ")
				}`,
				"next indicator": getIndicatorName(this.nextIndicatorId),
			},
		};
	}
}

// @publicAPI
export interface IndicatorCCSupportedGetOptions extends CCCommandOptions {
	indicatorId: number;
}

function testResponseForIndicatorSupportedGet(
	sent: IndicatorCCSupportedGet,
	received: IndicatorCCSupportedReport,
) {
	return sent.indicatorId === 0 || received.indicatorId === sent.indicatorId;
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
			validatePayload(this.payload.length >= 1);
			this.indicatorId = this.payload[0];
		} else {
			this.indicatorId = options.indicatorId;
		}
	}

	public indicatorId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.indicatorId]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				indicator: getIndicatorName(this.indicatorId),
			},
		};
	}
}

// @publicAPI
export interface IndicatorCCDescriptionReportOptions {
	indicatorId: number;
	description: string;
}

@CCCommand(IndicatorCommand.DescriptionReport)
export class IndicatorCCDescriptionReport extends IndicatorCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (IndicatorCCDescriptionReportOptions & CCCommandOptions),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.indicatorId = this.payload[0];
			const descrptionLength = this.payload[1];
			validatePayload(this.payload.length >= 2 + descrptionLength);
			this.description = this.payload
				.subarray(2, 2 + descrptionLength)
				.toString("utf8");
		} else {
			this.indicatorId = options.indicatorId;
			this.description = options.description;
		}
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

	public serialize(): Buffer {
		const description = Buffer.from(this.description, "utf8");
		this.payload = Buffer.concat([
			Buffer.from([this.indicatorId, description.length]),
			description,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"indicator ID": this.indicatorId,
				description: this.description || "(none)",
			},
		};
	}
}

// @publicAPI
export interface IndicatorCCDescriptionGetOptions extends CCCommandOptions {
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"indicator ID": this.indicatorId,
			},
		};
	}
}
