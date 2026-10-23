import {
	CommandClasses,
	type EndpointId,
	type GetValueDB,
	Indicator,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	type ValueID,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	getIndicatorProperty,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core";
import { Bytes, getEnumMemberName, num2hex } from "@zwave-js/shared";
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
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
	type RefreshValuesOptions,
	getEffectiveCCVersion,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import { IndicatorCommand, type IndicatorTimeout } from "../lib/_Types.js";
import type { CCEncodingContext, CCParsingContext } from "../lib/traits.js";

function isManufacturerDefinedIndicator(indicatorId: number): boolean {
	return indicatorId >= 0x80 && indicatorId <= 0x9f;
}

const timeoutStringRegex =
	/^(?:(?<hoursStr>\d+)h)?(?:(?<minutesStr>\d+)m)?(?:(?<secondsStr>\d+(?:\.\d+)?)s)?$/i;

const MAX_INDICATOR_OBJECTS = 31;

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

function groupByIndicatorId(
	values: IndicatorObject[],
): Map<number, IndicatorObject[]> {
	const ret = new Map();

	for (const value of values) {
		if (!ret.has(value.indicatorId)) {
			ret.set(value.indicatorId, []);
		}
		ret.get(value.indicatorId)!.push(value);
	}

	return ret;
}

function indicatorObjectsToTimeout(
	values: IndicatorObject[],
): IndicatorTimeout | undefined {
	const timeoutValues = values.filter((v) =>
		[0x0a, 0x06, 0x07, 0x08].includes(v.propertyId),
	);
	if (!timeoutValues.length) return undefined;

	const hours = (timeoutValues.find((v) => v.propertyId === 0x0a)?.value
		?? 0) as number;
	const minutes = (timeoutValues.find((v) => v.propertyId === 0x06)?.value
		?? 0) as number;
	const seconds =
		clamp(
			(timeoutValues.find((v) => v.propertyId === 0x07)?.value as number)
				?? 0,
			0,
			59,
		)
		+ clamp(
			(timeoutValues.find((v) => v.propertyId === 0x08)?.value as number)
				?? 0,
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

export const IndicatorCCValues = V.defineCCValues(CommandClasses.Indicator, {
	...V.staticProperty("supportedIndicatorIds", undefined, {
		internal: true,
	}),
	...V.staticPropertyWithName("valueV1", "value", {
		...ValueMetadata.UInt8,
		label: "Indicator value",
		ccSpecific: {
			indicatorId: 0,
		},
	}),
	...V.staticProperty(
		"identify",
		{
			...ValueMetadata.WriteOnlyBoolean,
			label: "Identify",
			states: {
				true: "Identify",
			},
		},
		{ minVersion: 3 },
	),
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
		// oxlint-disable-next-line no-unused-vars
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
		{ minVersion: 2 },
	),
	...V.dynamicPropertyAndKeyWithName(
		"timeout",
		(indicatorId: number) => indicatorId,
		// oxlint-disable-next-line no-unused-vars
		(indicatorId: number) => "timeout",
		({ property, propertyKey }) =>
			typeof property === "number" && propertyKey === "timeout",
		(indicatorId: number) => ({
			...ValueMetadata.String,
			label: "Timeout",
			ccSpecific: {
				indicatorId,
			},
		}),
		{ minVersion: 3 },
	),
	...V.dynamicPropertyWithName(
		"indicatorDescription",
		(indicatorId: number) => indicatorId,
		({ property }) => typeof property === "number",
		undefined,
		{ internal: true, minVersion: 4 },
	),
});

/**
 * Looks up the configured metadata for the given indicator and property
 */
function getIndicatorMetadata(
	indicatorId: Indicator,
	propertyId: number,
	overrideIndicatorLabel?: string,
): ValueMetadata {
	const label = getIndicatorLabel(
		indicatorId,
		propertyId,
		overrideIndicatorLabel,
	);
	const prop = getIndicatorProperty(propertyId);
	const baseMetadata = IndicatorCCValues.valueV2(
		indicatorId,
		propertyId,
	).meta;

	if (!prop) {
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
				label,
				description: prop.description,
				readable: !prop.readonly,
			};
		} else {
			// UInt8
			return {
				...baseMetadata,
				...ValueMetadata.UInt8,
				label,
				description: prop.description,
				min: prop.min,
				max: prop.max,
				readable: !prop.readonly,
			};
		}
	}
}

function getIndicatorName(indicatorId: number | undefined): string {
	if (indicatorId) {
		return getEnumMemberName(Indicator, indicatorId);
	} else {
		return "Default";
	}
}

/** Returns a user-friendly label for an indicator */
function getIndicatorLabel(
	indicatorId: number,
	propertyId: number,
	overrideIndicatorLabel?: string,
	overridePropertyLabel?: string,
): string {
	const defaultName = overrideIndicatorLabel || getIndicatorName(indicatorId);

	// Without a defined property, we cannot suggest a better label
	const prop = getIndicatorProperty(propertyId);
	if (!prop) return defaultName;

	// For indicators that correspond to an LCD or buttons,
	// the indicator enum names are enough
	if (
		indicatorId >= Indicator["LCD backlight"]
		&& indicatorId <= Indicator["Button 12 indication"]
		&& (propertyId === 0x01 /* Multilevel */
			|| propertyId === 0x02 /* Binary */
			|| overridePropertyLabel) // custom property label
	) {
		let ret: string = (Indicator as any)[indicatorId];
		// Append the overridden property label if it exists
		if (overridePropertyLabel) {
			ret += ` - ${overridePropertyLabel}`;
		}
		return ret;
	}

	// Default to the current behavior of <indicator name> - <property label>
	return `${defaultName} - ${overridePropertyLabel || prop.label}`;
}

export function shouldExposeIndicatorValue(
	indicatorId: number,
	propertyId: number,
): boolean {
	// Many possible indicator values are not suitable to be exposed as CC values,
	// usually because they need to be set in groups.

	// Indicator properties that should be exposed are marked as such
	const prop = getIndicatorProperty(propertyId);
	if (prop && !prop.exposeAsValue) {
		return false;
	}

	// Unless we know better, expose anyways
	return true;
}

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
		return async function (
			this: IndicatorCCAPI,
			{ property, propertyKey },
			value,
		) {
			const valueId: ValueID = {
				commandClass: this.ccId,
				endpoint: this.endpoint.index,
				property,
				propertyKey,
			};

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
			} else if (IndicatorCCValues.valueV2.is(valueId)) {
				const indicatorId = property as number;
				const propertyId = propertyKey as number;
				const expectedType = getIndicatorMetadata(
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
						indicatorId,
						propertyId,
						value: value as any,
					},
				]);
			} else if (IndicatorCCValues.timeout.is(valueId)) {
				const indicatorId = property as number;
				if (typeof value !== "string") {
					throwWrongValueType(
						this.ccId,
						property,
						"string",
						typeof value,
					);
				}
				return this.setTimeout(indicatorId, value);
			} else if (IndicatorCCValues.identify.is(valueId)) {
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
		return async function (this: IndicatorCCAPI, { property }) {
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

		const cc = new IndicatorCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			indicatorId,
		});
		const response = await this.host.sendCommand<IndicatorCCReport>(
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

		if (this.version === 1 && typeof value !== "number") {
			throw new ZWaveError(
				`Node ${
					this.endpoint.nodeId as number
				} only supports IndicatorCC V1 which requires a single value to be set`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (
			this.version >= 2
			&& isArray(value)
			&& value.length > MAX_INDICATOR_OBJECTS
		) {
			throw new ZWaveError(
				`Only ${MAX_INDICATOR_OBJECTS} indicator values can be set at a time!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const cc = new IndicatorCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...(typeof value === "number" ? { value } : { values: value }),
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async sendReport(options: IndicatorCCReportOptions): Promise<void> {
		this.assertSupportsCommand(IndicatorCommand, IndicatorCommand.Report);

		const cc = new IndicatorCCReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});

		await this.host.sendCommand(cc, this.commandOptions);
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

		const cc = new IndicatorCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			indicatorId,
		});
		const response =
			await this.host.sendCommand<IndicatorCCSupportedReport>(
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

		const cc = new IndicatorCCSupportedReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			indicatorId,
			supportedProperties,
			nextIndicatorId,
		});

		await this.host.sendCommand(cc, this.commandOptions);
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

		const cc = new IndicatorCCDescriptionReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			indicatorId,
			description,
		});

		await this.host.sendCommand(cc, this.commandOptions);
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
			this.host,
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

		const cc = new IndicatorCCDescriptionGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			indicatorId,
		});
		const response =
			await this.host.sendCommand<IndicatorCCDescriptionReport>(
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

	public async interview(ctx: InterviewContext): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Indicator,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
			tag: "interview",
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		if (api.version > 1) {
			ctx.logNode(node.id, {
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
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"Time out while scanning supported indicator IDs, skipping interview...",
						level: "warn",
					});
					return;
				}

				if (supportedResponse.supportedProperties.length > 0) {
					supportedIndicatorIds.push(
						supportedResponse.indicatorId ?? curId,
					);
				}
				curId = supportedResponse.nextIndicatorId;
			} while (curId !== 0x00);

			// The IDs are not stored by the report CCs so store them here once we have all of them
			this.setValue(
				ctx,
				IndicatorCCValues.supportedIndicatorIds,
				supportedIndicatorIds,
			);
			const logMessage = `supported indicator IDs: ${supportedIndicatorIds.join(
				", ",
			)}`;
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});

			if (api.version >= 4) {
				const manufacturerDefinedIndicatorIds =
					supportedIndicatorIds.filter((id) =>
						isManufacturerDefinedIndicator(id),
					);
				if (manufacturerDefinedIndicatorIds.length > 0) {
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							"retrieving description for manufacturer-defined indicator IDs...",
						direction: "outbound",
					});

					for (const [
						i,
						id,
					] of manufacturerDefinedIndicatorIds.entries()) {
						await api.getDescription(id);

						node.reportInterviewProgress(
							i + 1,
							manufacturerDefinedIndicatorIds.length,
						);
					}
				}
			}
		}

		// Query current values
		await this.refreshValues(ctx, {
			tag: "interview",
			onProgress: (completed, total) =>
				node.reportInterviewProgress(completed, total),
		});

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
		options?: RefreshValuesOptions,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Indicator,
			ctx,
			endpoint,
		).withOptions({
			priority: options?.priority ?? MessagePriority.NodeQuery,
			tag: options?.tag,
		});

		if (api.version === 1) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "requesting current indicator value...",
				direction: "outbound",
			});
			await api.get();
		} else {
			const supportedIndicatorIds: number[] =
				this.getValue(ctx, IndicatorCCValues.supportedIndicatorIds)
				?? [];
			for (const [i, indicatorId] of supportedIndicatorIds.entries()) {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `requesting current indicator value (id = ${num2hex(
						indicatorId,
					)})...`,
					direction: "outbound",
				});
				await api.get(indicatorId);

				options?.onProgress?.(i + 1, supportedIndicatorIds.length);
			}
		}
	}

	public translatePropertyKey(
		ctx: GetValueDB,
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
		} else if (typeof property === "number" && propertyKey === "timeout") {
			return "Timeout";
		}
		return super.translatePropertyKey(ctx, property, propertyKey);
	}

	public translateProperty(
		ctx: GetValueDB,
		property: string | number,
		propertyKey?: string | number,
	): string {
		if (typeof property === "number") {
			if (typeof propertyKey === "number" || propertyKey === "timeout") {
				// The indicator corresponds to our property
				if (property in Indicator) return Indicator[property];
			}
		}
		return super.translateProperty(ctx, property, propertyKey);
	}

	protected supportsV2Indicators(ctx: GetValueDB): boolean {
		// First test if there are any indicator ids defined
		const supportedIndicatorIds = this.getValue<number[]>(
			ctx,
			IndicatorCCValues.supportedIndicatorIds,
		);
		if (!supportedIndicatorIds?.length) return false;
		// Then test if there are any property ids defined
		return supportedIndicatorIds.some(
			(indicatorId) =>
				!!this.getValue<number[]>(
					ctx,
					IndicatorCCValues.supportedPropertyIDs(indicatorId),
				)?.length,
		);
	}

	protected getManufacturerDefinedIndicatorLabel(
		ctx: GetValueDB,
		indicatorId: number,
	): string | undefined {
		if (isManufacturerDefinedIndicator(indicatorId)) {
			return this.getValue(
				ctx,
				IndicatorCCValues.indicatorDescription(indicatorId),
			);
		}
	}

	public static getSupportedPropertyIDsCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
		indicatorId: number,
	): MaybeNotKnown<number[]> {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				IndicatorCCValues.supportedPropertyIDs(indicatorId).endpoint(
					endpoint.index,
				),
			);
	}
}

// @publicAPI
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
	public constructor(options: WithAddress<IndicatorCCSetOptions>) {
		super(options);
		if ("value" in options) {
			this.indicator0Value = options.value;
		} else {
			this.values = options.values;
		}
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): IndicatorCCSet {
		validatePayload(raw.payload.length >= 1);

		const objCount = raw.payload.length >= 2 ? raw.payload[1] & 0b11111 : 0;

		if (objCount === 0) {
			const indicator0Value = raw.payload[0];

			return new this({
				nodeId: ctx.sourceNodeId,
				value: indicator0Value,
			});
		}

		validatePayload(raw.payload.length >= 2 + 3 * objCount);

		const values: IndicatorObject[] = [];
		for (let i = 0; i < objCount; i++) {
			const offset = 2 + 3 * i;
			const value: IndicatorObject = {
				indicatorId: raw.payload[offset],
				propertyId: raw.payload[offset + 1],
				value: raw.payload[offset + 2],
			};
			values.push(value);
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			values,
		});
	}

	public indicator0Value: number | undefined;
	public values: IndicatorObject[] | undefined;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		if (this.values != undefined) {
			// V2+
			this.payload = Bytes.alloc(2 + 3 * this.values.length, 0);
			// Byte 0 is the legacy value
			const objCount = this.values.length & MAX_INDICATOR_OBJECTS;
			this.payload[1] = objCount;
			for (let i = 0; i < objCount; i++) {
				const offset = 2 + 3 * i;
				this.payload[offset] = this.values[i].indicatorId;
				this.payload[offset + 1] = this.values[i].propertyId;
				const value = this.values[i].value;
				this.payload[offset + 2] =
					value === true ? 0xff : value === false ? 0x00 : value;
			}
		} else {
			// V1
			this.payload = Bytes.from([this.indicator0Value ?? 0]);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.indicator0Value != undefined) {
			message["indicator 0 value"] = this.indicator0Value;
		}
		if (this.values != undefined) {
			message.values = this.values
				.map(
					(v) => `
· indicatorId: ${v.indicatorId}
  propertyId:  ${v.propertyId}
  value:       ${v.value}`,
				)
				.join("");
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export type IndicatorCCReportOptions =
	| {
			value: number;
	  }
	| {
			values: IndicatorObject[];
	  };

@CCCommand(IndicatorCommand.Report)
export class IndicatorCCReport extends IndicatorCC {
	public constructor(options: WithAddress<IndicatorCCReportOptions>) {
		super(options);

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

	public static from(raw: CCRaw, ctx: CCParsingContext): IndicatorCCReport {
		validatePayload(raw.payload.length >= 1);

		const objCount = raw.payload.length >= 2 ? raw.payload[1] & 0b11111 : 0;

		if (objCount === 0) {
			const indicator0Value = raw.payload[0];
			// oxlint-disable-next-line @zwave-js/no-unexpected-parse-errors -- only throws for too many indicator objects
			return new this({
				nodeId: ctx.sourceNodeId,
				value: indicator0Value,
			});
		}

		validatePayload(raw.payload.length >= 2 + 3 * objCount);

		const values: IndicatorObject[] = [];
		for (let i = 0; i < objCount; i++) {
			const offset = 2 + 3 * i;
			const value: IndicatorObject = {
				indicatorId: raw.payload[offset],
				propertyId: raw.payload[offset + 1],
				value: raw.payload[offset + 2],
			};
			values.push(value);
		}

		// oxlint-disable-next-line @zwave-js/no-unexpected-parse-errors -- the payload can contain at most 31 indicator objects
		return new this({
			nodeId: ctx.sourceNodeId,
			values,
		});

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

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Indicator objects only exist in V2+ reports, the timeout properties in V3+.
		// Ignore them if the device advertises a lower version.
		const ccVersion = getEffectiveCCVersion(ctx, this);

		if (this.indicator0Value != undefined) {
			if (!this.supportsV2Indicators(ctx)) {
				// Publish the value
				const valueV1 = IndicatorCCValues.valueV1;
				this.setMetadata(ctx, valueV1);
				this.setValue(ctx, valueV1, this.indicator0Value);
			} else {
				if (this.isSinglecast()) {
					// Don't!
					ctx.logNode(this.nodeId, {
						message: `ignoring V1 indicator report because the node supports V2 indicators`,
						direction: "none",
						endpoint: this.endpointIndex,
					});
				}
			}
		} else if (this.values && ccVersion >= 2) {
			// Store the simple values first
			for (const value of this.values) {
				this.setIndicatorValue(ctx, value);
			}

			// Then group values into the convenience properties
			const groupedValues = groupByIndicatorId(this.values);
			for (const [indicatorId, values] of groupedValues) {
				// Some devices report all properties it supports in every report,
				// even if it does not support all properties for the given indicator ID.
				// To avoid confusion, we need to filter out the unsupported properties

				const supportedPropertyIDs =
					this.getValue<number[]>(
						ctx,
						IndicatorCCValues.supportedPropertyIDs(indicatorId),
					) ?? [];
				const filteredValues = values.filter((v) =>
					supportedPropertyIDs.includes(v.propertyId),
				);

				const overrideIndicatorLabel =
					this.getManufacturerDefinedIndicatorLabel(ctx, indicatorId);

				// ... timeout
				const timeout = indicatorObjectsToTimeout(filteredValues);
				if (timeout && ccVersion >= 3) {
					let timeoutString = "";
					if (timeout?.hours) timeoutString += `${timeout.hours}h`;
					if (timeout?.minutes) {
						timeoutString += `${timeout.minutes}m`;
					}
					if (timeout?.seconds) {
						timeoutString += `${timeout.seconds}s`;
					}

					const timeoutValue = IndicatorCCValues.timeout(indicatorId);

					const metadata: ValueMetadata = {
						...timeoutValue.meta,
						label: getIndicatorLabel(
							indicatorId,
							0x06, // This is actually ignored, but pass a valid ID for clarity
							overrideIndicatorLabel,
							"Timeout",
						),
					};

					this.setMetadata(ctx, timeoutValue, metadata);
					this.setValue(ctx, timeoutValue, timeoutString);
				}
			}
		}

		return true;
	}

	public readonly indicator0Value: number | undefined;
	public readonly values: IndicatorObject[] | undefined;

	private setIndicatorValue(ctx: GetValueDB, value: IndicatorObject): void {
		// Manufacturer-defined indicators may need a custom label
		const overrideIndicatorLabel =
			this.getManufacturerDefinedIndicatorLabel(ctx, value.indicatorId);

		const metadata = getIndicatorMetadata(
			value.indicatorId,
			value.propertyId,
			overrideIndicatorLabel,
		);
		// Some values need to be converted
		if (metadata.type === "boolean") {
			value.value = !!value.value;
		}

		// Only expose the value if it should be user-facing
		if (value.indicatorId === Indicator["Node Identify"]) {
			return;
		}
		const prop = getIndicatorProperty(value.propertyId);
		if (!prop?.exposeAsValue) return;

		// And only if it is actually supported and not just reported by accident
		const supportedPropertyIDs =
			this.getValue<number[]>(
				ctx,
				IndicatorCCValues.supportedPropertyIDs(value.indicatorId),
			) ?? [];
		if (!supportedPropertyIDs.includes(value.propertyId)) return;

		// Publish the value
		const valueV2 = IndicatorCCValues.valueV2(
			value.indicatorId,
			value.propertyId,
		);
		this.setMetadata(ctx, valueV2, metadata);
		this.setValue(ctx, valueV2, value.value);
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		if (this.values != undefined) {
			// V2+
			this.payload = Bytes.alloc(2 + 3 * this.values.length, 0);
			// Byte 0 is the legacy value
			const objCount = this.values.length & MAX_INDICATOR_OBJECTS;
			this.payload[1] = objCount;
			for (let i = 0; i < objCount; i++) {
				const offset = 2 + 3 * i;
				this.payload[offset] = this.values[i].indicatorId;
				this.payload[offset + 1] = this.values[i].propertyId;
				const value = this.values[i].value;
				this.payload[offset + 2] =
					value === true ? 0xff : value === false ? 0x00 : value;
			}
		} else {
			// V1
			this.payload = Bytes.from([this.indicator0Value ?? 0]);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.indicator0Value != undefined) {
			message["indicator 0 value"] = this.indicator0Value;
		}
		if (this.values != undefined) {
			message.values = this.values
				.map(
					(v) => `
· indicatorId: ${v.indicatorId}
  propertyId:  ${v.propertyId}
  value:       ${v.value}`,
				)
				.join("");
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface IndicatorCCGetOptions {
	indicatorId?: number;
}

@CCCommand(IndicatorCommand.Get)
@expectedCCResponse(IndicatorCCReport)
export class IndicatorCCGet extends IndicatorCC {
	public constructor(options: WithAddress<IndicatorCCGetOptions>) {
		super(options);
		this.indicatorId = options.indicatorId;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): IndicatorCCGet {
		let indicatorId: number | undefined;

		if (raw.payload.length > 0) {
			indicatorId = raw.payload[0];
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			indicatorId,
		});
	}

	public indicatorId: number | undefined;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		if (this.indicatorId != undefined) {
			this.payload = Bytes.from([this.indicatorId]);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				indicator: getIndicatorName(this.indicatorId),
			},
		};
	}
}

// @publicAPI
export interface IndicatorCCSupportedReportOptions {
	indicatorId: number;
	nextIndicatorId: number;
	supportedProperties: readonly number[];
}

@CCCommand(IndicatorCommand.SupportedReport)
export class IndicatorCCSupportedReport extends IndicatorCC {
	public constructor(
		options: WithAddress<IndicatorCCSupportedReportOptions>,
	) {
		super(options);

		this.indicatorId = options.indicatorId;
		this.nextIndicatorId = options.nextIndicatorId;
		this.supportedProperties = options.supportedProperties;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): IndicatorCCSupportedReport {
		validatePayload(raw.payload.length >= 3);
		const indicatorId = raw.payload[0];
		const nextIndicatorId = raw.payload[1];
		const bitMaskLength = raw.payload[2] & 0b11111;
		let supportedProperties: readonly number[];

		if (bitMaskLength === 0) {
			supportedProperties = [];
		} else {
			validatePayload(raw.payload.length >= 3 + bitMaskLength);
			// The bit mask starts at 0, but bit 0 is not used
			supportedProperties = parseBitMask(
				raw.payload.subarray(3, 3 + bitMaskLength),
				0,
			).filter((v) => v !== 0);
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			indicatorId,
			nextIndicatorId,
			supportedProperties,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		if (this.indicatorId !== 0x00) {
			// Remember which property IDs are supported
			this.setValue(
				ctx,
				IndicatorCCValues.supportedPropertyIDs(this.indicatorId),
				this.supportedProperties,
			);
		}
		return true;
	}

	public readonly indicatorId: number;
	public readonly nextIndicatorId: number;
	public readonly supportedProperties: readonly number[];

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const bitmask =
			this.supportedProperties.length > 0
				? encodeBitMask(this.supportedProperties, undefined, 0)
				: new Bytes();
		this.payload = Bytes.concat([
			[this.indicatorId, this.nextIndicatorId, bitmask.length],
			bitmask,
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				indicator: getIndicatorName(this.indicatorId),
				"supported properties": this.supportedProperties
					.map(
						(id) =>
							getIndicatorProperty(id)?.label
							?? `Unknown (${num2hex(id)})`,
					)
					.join(", "),
				"next indicator": getIndicatorName(this.nextIndicatorId),
			},
		};
	}
}

// @publicAPI
export interface IndicatorCCSupportedGetOptions {
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
	public constructor(options: WithAddress<IndicatorCCSupportedGetOptions>) {
		super(options);
		this.indicatorId = options.indicatorId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): IndicatorCCSupportedGet {
		validatePayload(raw.payload.length >= 1);
		const indicatorId = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			indicatorId,
		});
	}

	public indicatorId: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.indicatorId]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
		options: WithAddress<IndicatorCCDescriptionReportOptions>,
	) {
		super(options);

		this.indicatorId = options.indicatorId;
		this.description = options.description;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): IndicatorCCDescriptionReport {
		validatePayload(raw.payload.length >= 2);
		const indicatorId = raw.payload[0];
		const descrptionLength = raw.payload[1];
		validatePayload(raw.payload.length >= 2 + descrptionLength);
		const description: string = raw.payload
			.subarray(2, 2 + descrptionLength)
			.toString("utf8");

		return new this({
			nodeId: ctx.sourceNodeId,
			indicatorId,
			description,
		});
	}

	public indicatorId: number;
	public description: string;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// This command only exists in V4. Ignore it if the device advertises a lower version.
		if (this.description && getEffectiveCCVersion(ctx, this) >= 4) {
			this.setValue(
				ctx,
				IndicatorCCValues.indicatorDescription(this.indicatorId),
				this.description,
			);
		}

		return true;
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const description = Bytes.from(this.description, "utf8");
		this.payload = Bytes.concat([
			[this.indicatorId, description.length],
			description,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"indicator ID": this.indicatorId,
				description: this.description || "(none)",
			},
		};
	}
}

// @publicAPI
export interface IndicatorCCDescriptionGetOptions {
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
	public constructor(options: WithAddress<IndicatorCCDescriptionGetOptions>) {
		super(options);
		this.indicatorId = options.indicatorId;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): IndicatorCCDescriptionGet {
		validatePayload(raw.payload.length >= 1);
		const indicatorId = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			indicatorId,
		});
	}

	public indicatorId: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.indicatorId]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"indicator ID": this.indicatorId,
			},
		};
	}
}
