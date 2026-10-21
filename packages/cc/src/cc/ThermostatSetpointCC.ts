import {
	CommandClasses,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type Scale,
	type SupervisionResult,
	ValueMetadata,
	type ValueMetadataNumeric,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	encodeFloatWithScale,
	getNamedScale,
	getUnknownScale,
	logList,
	logText,
	parseBitMask,
	parseFloatWithScale,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core";
import { Bytes, getEnumMemberName, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";

import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	SET_VALUE_HOOKS,
	type SetValueImplementation,
	type SetValueImplementationHooksFactory,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	CommandRelation,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
	type RefreshValuesOptions,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import {
	ThermostatSetpointCommand,
	ThermostatSetpointType,
} from "../lib/_Types.js";
import type { CCEncodingContext, CCParsingContext } from "../lib/traits.js";

// This array is used to map the advertised supported types (interpretation A)
// to the actual enum values
const thermostatSetpointTypeMap = [
	0x00, 0x01, 0x02, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
];

function getScale(scale: number): Scale {
	return getNamedScale("temperature", scale as any) ?? getUnknownScale(scale);
}
function getSetpointUnit(scale: number): string {
	return getScale(scale).unit ?? "";
}

interface SetpointFloatEncoding {
	precision: number;
	scale: number;
	size: number;
}

function parseSetpointFloat(payload: Bytes) {
	const parsed = parseFloatWithScale(payload);
	const encoding: SetpointFloatEncoding = {
		precision: payload[0] >>> 5,
		scale: parsed.scale,
		size: parsed.bytesRead - 1,
	};
	return { ...parsed, encoding };
}

function findSetpointFloatEncoding(
	value: number,
	scale: number,
	encodings: readonly SetpointFloatEncoding[],
): SetpointFloatEncoding | undefined {
	const candidates = encodings.filter((encoding) => encoding.scale === scale);
	if (!candidates.length) return;

	// Reuse an observed combination with the least rounding error that fits the value
	const fitting = candidates
		.map((encoding) => {
			const factor = 10 ** encoding.precision;
			const integer = Math.round(value * factor);
			const limit = 2 ** (8 * encoding.size - 1);
			return {
				...encoding,
				integer,
				error: Math.abs(value - integer / factor),
				fits:
					Number.isFinite(integer)
					&& integer >= -limit
					&& integer < limit,
			};
		})
		.filter((candidate) => candidate.fits)
		.toSorted(
			(a, b) =>
				a.error - b.error
				|| a.precision - b.precision
				|| a.size - b.size,
		);
	const selected = fitting[0];
	if (!selected) {
		throw new ZWaveError(
			`Cannot encode setpoint ${value} with any observed float encoding for scale ${scale}`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	return {
		precision: selected.precision,
		scale: selected.scale,
		size: selected.size,
	};
}

export const ThermostatSetpointCCValues = V.defineCCValues(
	CommandClasses["Thermostat Setpoint"],
	{
		...V.staticProperty("observedFloatEncodings", undefined, {
			internal: true,
			supportsEndpoints: false,
		}),
		...V.staticProperty("supportedSetpointTypes", undefined, {
			internal: true,
		}),
		...V.dynamicPropertyAndKeyWithName(
			"setpoint",
			"setpoint",
			(setpointType: ThermostatSetpointType) => setpointType,
			({ property, propertyKey }) =>
				property === "setpoint" && typeof propertyKey === "number",
			(setpointType: ThermostatSetpointType) => ({
				...ValueMetadata.Number,
				label: `Setpoint (${getEnumMemberName(
					ThermostatSetpointType,
					setpointType,
				)})`,
				ccSpecific: { setpointType },
			}),
		),
		...V.dynamicPropertyAndKeyWithName(
			"setpointScale",
			"setpointScale",
			(setpointType: ThermostatSetpointType) => setpointType,
			({ property, propertyKey }) =>
				property === "setpointScale" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
	},
);

@API(CommandClasses["Thermostat Setpoint"])
export class ThermostatSetpointCCAPI extends CCAPI {
	private getPreferredScale(setpointType: ThermostatSetpointType): number {
		// SDS14223: The Scale field value MUST be identical to the value received in the Thermostat Setpoint Report for the
		// actual Setpoint Type during the node interview. Fall back to the first scale if none is known
		return (
			this.tryGetValueDB()?.getValue<number>(
				ThermostatSetpointCCValues.setpointScale(setpointType).endpoint(
					this.endpoint.index,
				),
			) ?? 0
		);
	}

	protected [SET_VALUE_HOOKS]: SetValueImplementationHooksFactory = ({
		property,
		propertyKey,
	}) => {
		if (property === "setpoint" && typeof propertyKey === "number") {
			return {
				normalizeValue: (value) =>
					typeof value === "number"
						? this.createSetpointSet(
								propertyKey,
								value,
								this.getPreferredScale(propertyKey),
							).value
						: value,
			};
		}
	};

	public supportsCommand(
		cmd: ThermostatSetpointCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ThermostatSetpointCommand.Get:
			case ThermostatSetpointCommand.SupportedGet:
				return this.isSinglecast();
			case ThermostatSetpointCommand.Set:
				return true; // This is mandatory
			case ThermostatSetpointCommand.CapabilitiesGet:
				return this.version >= 3 && this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function (
			this: ThermostatSetpointCCAPI,
			{ property, propertyKey },
			value,
		) {
			if (property !== "setpoint") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof propertyKey !== "number") {
				throw new ZWaveError(
					`${
						CommandClasses[this.ccId]
					}: "${property}" must be further specified by a numeric property key`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}

			const cc = this.createSetpointSet(
				propertyKey,
				value,
				this.getPreferredScale(propertyKey),
			);
			const result = await this.host.sendCommand(cc, this.commandOptions);

			// Verify the current value after a delay, unless the command was supervised and successful
			if (this.isSinglecast() && !supervisedCommandSucceeded(result)) {
				// TODO: Ideally this would be a short delay, but some thermostats like Remotec ZXT-600
				// aren't able to handle the GET this quickly.
				this.schedulePoll({ property, propertyKey }, cc.value);
			}

			return result;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function (
			this: ThermostatSetpointCCAPI,
			{ property, propertyKey },
		) {
			switch (property) {
				case "setpoint":
					if (typeof propertyKey !== "number") {
						throw new ZWaveError(
							`${
								CommandClasses[this.ccId]
							}: "${property}" must be further specified by a numeric property key`,
							ZWaveErrorCodes.Argument_Invalid,
						);
					}

					return (await this.get(propertyKey))?.value;
				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	@validateArgs()
	public async get(
		setpointType: ThermostatSetpointType,
	): Promise<{ value: number; scale: Scale } | undefined> {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.Get,
		);

		const cc = new ThermostatSetpointCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			setpointType,
		});
		const response =
			await this.host.sendCommand<ThermostatSetpointCCReport>(
				cc,
				this.commandOptions,
			);
		if (!response) return;
		if (response.type !== ThermostatSetpointType["N/A"]) {
			// This is a supported setpoint
			const scale = getScale(response.scale);
			return {
				value: response.value,
				scale,
			};
		}
	}

	/**
	 * Sets a temperature using float encodings observed anywhere on the device.
	 * Values are rounded to the closest representable value for the requested scale.
	 * Explicit `compat.overrideFloatEncoding` settings take precedence.
	 * Automatic encoding is used until the device reports an encoding for that scale.
	 * @throws When no observed encoding for the requested scale can hold the value.
	 */
	@validateArgs()
	public async set(
		setpointType: ThermostatSetpointType,
		value: number,
		scale: number,
	): Promise<SupervisionResult | undefined> {
		const cc = this.createSetpointSet(setpointType, value, scale);
		return this.host.sendCommand(cc, this.commandOptions);
	}

	private createSetpointSet(
		setpointType: ThermostatSetpointType,
		value: number,
		scale: number,
	): ThermostatSetpointCCSet {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.Set,
		);

		const cc = new ThermostatSetpointCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			setpointType,
			value,
			scale,
		});
		cc.normalizeValue(this.host);
		return cc;
	}

	@validateArgs()
	// oxlint-disable-next-line typescript/explicit-module-boundary-types
	public async getCapabilities(setpointType: ThermostatSetpointType) {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.CapabilitiesGet,
		);

		const cc = new ThermostatSetpointCCCapabilitiesGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			setpointType,
		});
		const response =
			await this.host.sendCommand<ThermostatSetpointCCCapabilitiesReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"minValue",
				"maxValue",
				"minValueScale",
				"maxValueScale",
			]);
		}
	}

	/**
	 * Requests the supported setpoint types from the node. Due to inconsistencies it is NOT recommended
	 * to use this method on nodes with CC versions 1 and 2. Instead rely on the information determined
	 * during node interview.
	 */
	public async getSupportedSetpointTypes(): Promise<
		MaybeNotKnown<readonly ThermostatSetpointType[]>
	> {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.SupportedGet,
		);

		const cc = new ThermostatSetpointCCSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response =
			await this.host.sendCommand<ThermostatSetpointCCSupportedReport>(
				cc,
				this.commandOptions,
			);
		return response?.supportedSetpointTypes;
	}
}

@commandClass(CommandClasses["Thermostat Setpoint"])
@implementedVersion(3)
@ccValues(ThermostatSetpointCCValues)
export class ThermostatSetpointCC extends CommandClass {
	declare ccCommand: ThermostatSetpointCommand;

	protected persistFloatEncodings(
		ctx: GetValueDB,
		encodings: readonly SetpointFloatEncoding[],
	): void {
		if (!encodings.length) return;
		const valueDB = this.getValueDB(ctx);
		const valueId = ThermostatSetpointCCValues.observedFloatEncodings.id;
		const observed =
			valueDB.getValue<SetpointFloatEncoding[]>(valueId) ?? [];
		const updated = [...observed];
		for (const encoding of encodings) {
			if (
				!updated.some(
					(entry) =>
						entry.precision === encoding.precision
						&& entry.scale === encoding.scale
						&& entry.size === encoding.size,
				)
			) {
				updated.push(encoding);
			}
		}
		if (updated.length !== observed.length) {
			valueDB.setValue(valueId, updated);
		}
	}

	public translatePropertyKey(
		ctx: GetValueDB,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (property === "setpoint") {
			return getEnumMemberName(
				ThermostatSetpointType,
				propertyKey as any,
			);
		} else {
			return super.translatePropertyKey(ctx, property, propertyKey);
		}
	}

	public async interview(ctx: InterviewContext): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Thermostat Setpoint"],
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

		if (api.version <= 2) {
			// It has been found that early implementations of this Command Class applied two non-interoperable
			// interpretations of the bit mask advertising the support for specific Setpoint Types in the Thermostat
			// Setpoint Supported Report Command.
			// A controlling node SHOULD determine the supported Setpoint Types of a version 1 and version 2
			// supporting node by sending one Thermostat Setpoint Get Command at a time while incrementing
			// the requested Setpoint Type.
			// If the same Setpoint Type is advertised in the returned Thermostat Setpoint Report Command, the
			// controlling node MUST conclude that the actual Setpoint Type is supported.
			// If the Setpoint Type 0x00 (type N/A) is advertised in the returned Thermostat Setpoint Report
			// Command, the controlling node MUST conclude that the actual Setpoint Type is not supported.

			// The specs require us to query the list of supported setpoint types anyways, even if the response is ignored
			await api.getSupportedSetpointTypes();

			// Now scan all endpoints. Each type we received a value for gets marked as supported
			const supportedSetpointTypes: ThermostatSetpointType[] = [];
			for (
				let type: ThermostatSetpointType =
					ThermostatSetpointType.Heating;
				type <= ThermostatSetpointType["Full Power"];
				type++
			) {
				const setpointName = getEnumMemberName(
					ThermostatSetpointType,
					type,
				);
				// Every time, query the current value
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying current value of setpoint ${setpointName}...`,
					direction: "outbound",
				});

				const setpoint = await api.get(type);
				// If the node did not respond, assume the setpoint type is not supported

				let logMessage: string;
				if (setpoint) {
					// Setpoint supported, remember the type
					supportedSetpointTypes.push(type);
					logMessage = `received current value of setpoint ${setpointName}: ${setpoint.value} ${
						setpoint.scale.unit ?? ""
					}`;
				} else {
					// We're sure about the interpretation - this should not happen
					logMessage = `setpoint ${setpointName} is not supported`;
				}
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});

				node.reportInterviewProgress(
					type - ThermostatSetpointType.Heating + 1,
					ThermostatSetpointType["Full Power"]
						- ThermostatSetpointType.Heating
						+ 1,
				);
			}

			// Remember which setpoint types are actually supported
			this.setValue(
				ctx,
				ThermostatSetpointCCValues.supportedSetpointTypes,
				supportedSetpointTypes,
			);
		} else {
			// Versions >= 3 adhere to bitmap interpretation A, so we can rely on getSupportedSetpointTypes

			// Query the supported setpoint types
			let setpointTypes: ThermostatSetpointType[] = [];
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "retrieving supported setpoint types...",
				direction: "outbound",
			});
			const resp = await api.getSupportedSetpointTypes();
			if (resp) {
				setpointTypes = [...resp];
				const logMessage = logText(
					"received supported setpoint types:",
					{
						nested: logList(
							setpointTypes.map((type) =>
								getEnumMemberName(ThermostatSetpointType, type),
							),
						),
					},
				);
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Querying supported setpoint types timed out, skipping interview...",
					level: "warn",
				});
				return;
			}

			for (const [i, type] of setpointTypes.entries()) {
				const setpointName = getEnumMemberName(
					ThermostatSetpointType,
					type,
				);
				// Find out the capabilities of this setpoint
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `retrieving capabilities for setpoint ${setpointName}...`,
					direction: "outbound",
				});
				const setpointCaps = await api.getCapabilities(type);
				if (setpointCaps) {
					const minValueUnit = getSetpointUnit(
						setpointCaps.minValueScale,
					);
					const maxValueUnit = getSetpointUnit(
						setpointCaps.maxValueScale,
					);
					const logMessage = `received capabilities for setpoint ${setpointName}:
minimum value: ${setpointCaps.minValue} ${minValueUnit}
maximum value: ${setpointCaps.maxValue} ${maxValueUnit}`;
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: logMessage,
						direction: "inbound",
					});
				}

				node.reportInterviewProgress(i + 1, setpointTypes.length);
			}

			// Query the current value for all setpoint types
			await this.refreshValues(ctx, {
				tag: "interview",
				onProgress: (completed, total) =>
					node.reportInterviewProgress(completed, total),
			});
		}

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
			CommandClasses["Thermostat Setpoint"],
			ctx,
			endpoint,
		).withOptions({
			priority: options?.priority ?? MessagePriority.NodeQuery,
			tag: options?.tag,
		});

		const setpointTypes: ThermostatSetpointType[] =
			this.getValue(
				ctx,
				ThermostatSetpointCCValues.supportedSetpointTypes,
			) ?? [];

		// Query each setpoint's current value
		for (const [i, type] of setpointTypes.entries()) {
			const setpointName = getEnumMemberName(
				ThermostatSetpointType,
				type,
			);
			// Every time, query the current value
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying current value of setpoint ${setpointName}...`,
				direction: "outbound",
			});
			const setpoint = await api.get(type);
			if (setpoint) {
				const logMessage = `received current value of setpoint ${setpointName}: ${setpoint.value} ${
					setpoint.scale.unit ?? ""
				}`;
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}

			options?.onProgress?.(i + 1, setpointTypes.length);
		}
	}
}

// @publicAPI
export interface ThermostatSetpointCCSetOptions {
	setpointType: ThermostatSetpointType;
	value: number;
	scale: number;
}

@CCCommand(ThermostatSetpointCommand.Set)
@useSupervision()
export class ThermostatSetpointCCSet extends ThermostatSetpointCC {
	private encodedValue: Bytes | undefined;

	public constructor(options: WithAddress<ThermostatSetpointCCSetOptions>) {
		super(options);
		this.setpointType = options.setpointType;
		this.value = options.value;
		this.scale = options.scale;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatSetpointCCSet {
		validatePayload(raw.payload.length >= 1);
		const setpointType: ThermostatSetpointType = raw.payload[0] & 0b1111;

		// parseFloatWithScale does its own validation
		const { value, scale } = parseFloatWithScale(raw.payload.subarray(1));

		return new this({
			nodeId: ctx.sourceNodeId,
			setpointType,
			value,
			scale,
		});
	}

	public setpointType: ThermostatSetpointType;
	public value: number;
	public scale: number;

	protected override determineRelation(other: CommandClass): CommandRelation {
		if (
			other instanceof ThermostatSetpointCCSet
			&& this.setpointType === other.setpointType
		) {
			return this.value === other.value && this.scale === other.scale
				? CommandRelation.Redundant
				: CommandRelation.Supersedes;
		}
		return CommandRelation.Unrelated;
	}

	/** Normalizes the value and fixes its encoding for this command. */
	public normalizeValue(
		ctx: Pick<CCEncodingContext, "getDeviceConfig" | "tryGetValueDB">,
	): number {
		this.getEncodedValue(ctx);
		return this.value;
	}

	private getEncodedValue(
		ctx: Pick<CCEncodingContext, "getDeviceConfig" | "tryGetValueDB">,
	): Bytes {
		// Retries and S2 singlecast followups must reuse the original float encoding
		if (!this.encodedValue) {
			// If a config file overwrites how the float should be encoded, use that information
			const override = ctx.getDeviceConfig?.(this.nodeId as number)
				?.compat?.overrideFloatEncoding;
			const observed = this.isSinglecast()
				? ctx
						.tryGetValueDB?.(this.nodeId)
						?.getValue<SetpointFloatEncoding[]>(
							ThermostatSetpointCCValues.observedFloatEncodings
								.id,
						)
				: undefined;
			const encoding =
				override
				?? findSetpointFloatEncoding(
					this.value,
					this.scale,
					observed ?? [],
				);
			const encodedValue = encodeFloatWithScale(
				this.value,
				this.scale,
				encoding,
			);
			this.value = parseFloatWithScale(encodedValue).value;
			this.encodedValue = encodedValue;
		}
		return this.encodedValue;
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const encodedValue = this.getEncodedValue(ctx);
		this.payload = Bytes.concat([
			[this.setpointType & 0b1111],
			encodedValue,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const scale = getScale(this.scale);
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.setpointType,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

// @publicAPI
export interface ThermostatSetpointCCReportOptions {
	type: ThermostatSetpointType;
	value: number;
	scale: number;
}

@CCCommand(ThermostatSetpointCommand.Report)
export class ThermostatSetpointCCReport extends ThermostatSetpointCC {
	private floatEncoding: SetpointFloatEncoding | undefined;

	public constructor(
		options: WithAddress<ThermostatSetpointCCReportOptions>,
	) {
		super(options);

		this.type = options.type;
		this.value = options.value;
		this.scale = options.scale;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatSetpointCCReport {
		validatePayload(raw.payload.length >= 1);
		const type: ThermostatSetpointType = raw.payload[0] & 0b1111;

		if (type === 0) {
			// Not supported
			return new this({
				nodeId: ctx.sourceNodeId,
				type,
				value: 0,
				scale: 0,
			});
		}

		// parseFloatWithScale does its own validation
		const { value, scale, encoding } = parseSetpointFloat(
			raw.payload.subarray(1),
		);

		const ret = new this({
			nodeId: ctx.sourceNodeId,
			type,
			value,
			scale,
		});
		ret.floatEncoding = encoding;
		return ret;
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;
		if (this.type === ThermostatSetpointType["N/A"]) return true;
		if (this.floatEncoding) {
			this.persistFloatEncodings(ctx, [this.floatEncoding]);
		}

		const scale = getScale(this.scale);

		const setpointValue = ThermostatSetpointCCValues.setpoint(this.type);
		const existingMetadata = this.getMetadata<ValueMetadataNumeric>(
			ctx,
			setpointValue,
		);

		// Update the metadata when it is missing or the unit has changed
		if (existingMetadata?.unit !== scale.unit) {
			this.setMetadata(ctx, setpointValue, {
				...(existingMetadata ?? setpointValue.meta),
				unit: scale.unit,
			});
		}
		this.setValue(ctx, setpointValue, this.value);

		// Remember the device-preferred setpoint scale so it can be used in SET commands
		this.setValue(
			ctx,
			ThermostatSetpointCCValues.setpointScale(this.type),
			scale.key,
		);
		return true;
	}

	public type: ThermostatSetpointType;
	public scale: number;
	public value: number;

	protected override determineRelation(other: CommandClass): CommandRelation {
		if (
			other instanceof ThermostatSetpointCCReport
			&& this.type === other.type
		) {
			return this.value === other.value && this.scale === other.scale
				? CommandRelation.Redundant
				: CommandRelation.Supersedes;
		}
		return CommandRelation.Unrelated;
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			[this.type & 0b1111],
			encodeFloatWithScale(this.value, this.scale),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const scale = getScale(this.scale);
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.type,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

function testResponseForThermostatSetpointGet(
	sent: ThermostatSetpointCCGet,
	received: ThermostatSetpointCCReport,
) {
	// We expect a Thermostat Setpoint Report that matches the requested setpoint type
	return received.type === sent.setpointType;
}

// @publicAPI
export interface ThermostatSetpointCCGetOptions {
	setpointType: ThermostatSetpointType;
}

@CCCommand(ThermostatSetpointCommand.Get)
@expectedCCResponse(
	ThermostatSetpointCCReport,
	testResponseForThermostatSetpointGet,
)
export class ThermostatSetpointCCGet extends ThermostatSetpointCC {
	public constructor(options: WithAddress<ThermostatSetpointCCGetOptions>) {
		super(options);
		this.setpointType = options.setpointType;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatSetpointCCGet {
		validatePayload(raw.payload.length >= 1);
		const setpointType: ThermostatSetpointType = raw.payload[0] & 0b1111;

		return new this({
			nodeId: ctx.sourceNodeId,
			setpointType,
		});
	}

	public setpointType: ThermostatSetpointType;

	protected override determineRelation(other: CommandClass): CommandRelation {
		if (
			other instanceof ThermostatSetpointCCGet
			&& this.setpointType === other.setpointType
		) {
			return CommandRelation.Redundant;
		}
		return CommandRelation.Unrelated;
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.setpointType & 0b1111]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

// @publicAPI
export interface ThermostatSetpointCCCapabilitiesReportOptions {
	type: ThermostatSetpointType;
	minValue: number;
	minValueScale: number;
	maxValue: number;
	maxValueScale: number;
}

@CCCommand(ThermostatSetpointCommand.CapabilitiesReport)
export class ThermostatSetpointCCCapabilitiesReport extends ThermostatSetpointCC {
	private floatEncodings: SetpointFloatEncoding[] = [];

	public constructor(
		options: WithAddress<ThermostatSetpointCCCapabilitiesReportOptions>,
	) {
		super(options);

		this.type = options.type;
		this.minValue = options.minValue;
		this.minValueScale = options.minValueScale;
		this.maxValue = options.maxValue;
		this.maxValueScale = options.maxValueScale;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatSetpointCCCapabilitiesReport {
		validatePayload(raw.payload.length >= 1);
		const type: ThermostatSetpointType = raw.payload[0];
		if (type === ThermostatSetpointType["N/A"]) {
			return new this({
				nodeId: ctx.sourceNodeId,
				type,
				minValue: 0,
				minValueScale: 0,
				maxValue: 0,
				maxValueScale: 0,
			});
		}
		// parseFloatWithScale does its own validation
		const {
			value: minValue,
			scale: minValueScale,
			bytesRead,
			encoding: minEncoding,
		} = parseSetpointFloat(raw.payload.subarray(1));
		const {
			value: maxValue,
			scale: maxValueScale,
			encoding: maxEncoding,
		} = parseSetpointFloat(raw.payload.subarray(1 + bytesRead));

		const ret = new this({
			nodeId: ctx.sourceNodeId,
			type,
			minValue,
			minValueScale,
			maxValue,
			maxValueScale,
		});
		ret.floatEncodings = [minEncoding, maxEncoding];
		return ret;
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;
		if (this.type === ThermostatSetpointType["N/A"]) return true;
		this.persistFloatEncodings(ctx, this.floatEncodings);

		// Predefine the metadata
		const setpointValue = ThermostatSetpointCCValues.setpoint(this.type);
		this.setMetadata(ctx, setpointValue, {
			...setpointValue.meta,
			min: this.minValue,
			max: this.maxValue,
			unit:
				getSetpointUnit(this.minValueScale)
				|| getSetpointUnit(this.maxValueScale),
		});

		return true;
	}

	public type: ThermostatSetpointType;
	public minValue: number;
	public maxValue: number;
	public minValueScale: number;
	public maxValueScale: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const min = encodeFloatWithScale(this.minValue, this.minValueScale);
		const max = encodeFloatWithScale(this.maxValue, this.maxValueScale);
		this.payload = Bytes.concat([[this.type], min, max]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const minValueScale = getScale(this.minValueScale);
		const maxValueScale = getScale(this.maxValueScale);
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.type,
				),
				"min value": `${this.minValue} ${minValueScale.unit}`,
				"max value": `${this.maxValue} ${maxValueScale.unit}`,
			},
		};
	}
}

// @publicAPI
export interface ThermostatSetpointCCCapabilitiesGetOptions {
	setpointType: ThermostatSetpointType;
}

@CCCommand(ThermostatSetpointCommand.CapabilitiesGet)
@expectedCCResponse(ThermostatSetpointCCCapabilitiesReport)
export class ThermostatSetpointCCCapabilitiesGet extends ThermostatSetpointCC {
	public constructor(
		options: WithAddress<ThermostatSetpointCCCapabilitiesGetOptions>,
	) {
		super(options);
		this.setpointType = options.setpointType;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatSetpointCCCapabilitiesGet {
		validatePayload(raw.payload.length >= 1);
		const setpointType: ThermostatSetpointType = raw.payload[0] & 0b1111;

		return new this({
			nodeId: ctx.sourceNodeId,
			setpointType,
		});
	}

	public setpointType: ThermostatSetpointType;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.setpointType & 0b1111]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

// @publicAPI
export interface ThermostatSetpointCCSupportedReportOptions {
	supportedSetpointTypes: ThermostatSetpointType[];
}

@CCCommand(ThermostatSetpointCommand.SupportedReport)
@ccValueProperty(
	"supportedSetpointTypes",
	ThermostatSetpointCCValues.supportedSetpointTypes,
)
export class ThermostatSetpointCCSupportedReport extends ThermostatSetpointCC {
	public constructor(
		options: WithAddress<ThermostatSetpointCCSupportedReportOptions>,
	) {
		super(options);

		if (options.supportedSetpointTypes.length === 0) {
			throw new ZWaveError(
				`At least one setpoint type must be supported`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.supportedSetpointTypes = options.supportedSetpointTypes;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ThermostatSetpointCCSupportedReport {
		validatePayload(raw.payload.length >= 1);
		const bitMask = raw.payload;
		const supported = parseBitMask(bitMask, ThermostatSetpointType["N/A"]);
		// We use this command only when we are sure that bitmask interpretation A is used
		// FIXME: Figure out if we can do this without the CC version
		const supportedSetpointTypes: ThermostatSetpointType[] = supported.map(
			(i) => thermostatSetpointTypeMap[i],
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			supportedSetpointTypes,
		});
	}

	public readonly supportedSetpointTypes: readonly ThermostatSetpointType[];

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = encodeBitMask(
			// Encode as interpretation A
			this.supportedSetpointTypes
				.map((t) => thermostatSetpointTypeMap.indexOf(t))
				.filter((t) => t !== -1),
			undefined,
			ThermostatSetpointType["N/A"],
		);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"supported setpoint types": logList(
					this.supportedSetpointTypes.map((t) =>
						getEnumMemberName(ThermostatSetpointType, t),
					),
				),
			},
		};
	}
}

@CCCommand(ThermostatSetpointCommand.SupportedGet)
@expectedCCResponse(ThermostatSetpointCCSupportedReport)
/**
 * Issues a SupportedGet command to the node. Due to inconsistencies in interpretation,
 * this command should not be used for nodes with CC versions 1 or 2
 */
export class ThermostatSetpointCCSupportedGet extends ThermostatSetpointCC {}
