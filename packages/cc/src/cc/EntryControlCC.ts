import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import {
	CommandClasses,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	getCCName,
	parseBitMask,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { buffer2hex, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
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
	EntryControlCommand,
	EntryControlDataTypes,
	EntryControlEventTypes,
} from "../lib/_Types.js";
import * as ccUtils from "../lib/utils.js";

export const EntryControlCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Entry Control"], {
		...V.staticProperty(
			"keyCacheSize",
			{
				...ValueMetadata.UInt8,
				label: "Key cache size",
				description:
					"Number of character that must be stored before sending",
				min: 1,
				max: 32,
			} as const,
		),

		...V.staticProperty(
			"keyCacheTimeout",
			{
				...ValueMetadata.UInt8,
				label: "Key cache timeout",
				unit: "seconds",
				description:
					"How long the key cache must wait for additional characters",
				min: 1,
				max: 10,
			} as const,
		),

		...V.staticProperty("supportedDataTypes", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedEventTypes", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedKeys", undefined, {
			internal: true,
		}),
	}),
});

@API(CommandClasses["Entry Control"])
export class EntryControlCCAPI extends CCAPI {
	public supportsCommand(cmd: EntryControlCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case EntryControlCommand.KeySupportedGet:
			case EntryControlCommand.EventSupportedGet:
			case EntryControlCommand.ConfigurationGet:
				return this.isSinglecast();
			case EntryControlCommand.ConfigurationSet:
				return true;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupportedKeys() {
		this.assertSupportsCommand(
			EntryControlCommand,
			EntryControlCommand.KeySupportedGet,
		);

		const cc = new EntryControlCCKeySupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			EntryControlCCKeySupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedKeys;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getEventCapabilities() {
		this.assertSupportsCommand(
			EntryControlCommand,
			EntryControlCommand.EventSupportedGet,
		);

		const cc = new EntryControlCCEventSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			EntryControlCCEventSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"supportedDataTypes",
				"supportedEventTypes",
				"minKeyCacheSize",
				"maxKeyCacheSize",
				"minKeyCacheTimeout",
				"maxKeyCacheTimeout",
			]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getConfiguration() {
		this.assertSupportsCommand(
			EntryControlCommand,
			EntryControlCommand.ConfigurationGet,
		);

		const cc = new EntryControlCCConfigurationGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			EntryControlCCConfigurationReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["keyCacheSize", "keyCacheTimeout"]);
		}
	}

	@validateArgs()
	public async setConfiguration(
		keyCacheSize: number,
		keyCacheTimeout: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			EntryControlCommand,
			EntryControlCommand.ConfigurationGet,
		);

		const cc = new EntryControlCCConfigurationSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			keyCacheSize,
			keyCacheTimeout,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(this: EntryControlCCAPI, { property }, value) {
			if (property !== "keyCacheSize" && property !== "keyCacheTimeout") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}

			let keyCacheSize = value;
			let keyCacheTimeout = 2;
			if (property === "keyCacheTimeout") {
				keyCacheTimeout = value;

				const oldKeyCacheSize = this.tryGetValueDB()?.getValue<number>(
					EntryControlCCValues.keyCacheSize.endpoint(
						this.endpoint.index,
					),
				);
				if (oldKeyCacheSize == undefined) {
					throw new ZWaveError(
						`The "keyCacheTimeout" property cannot be changed before the key cache size is known!`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
				keyCacheSize = oldKeyCacheSize;
			}
			const result = await this.setConfiguration(
				keyCacheSize,
				keyCacheTimeout,
			);

			// Verify the change after a short delay, unless the command was supervised and successful
			if (this.isSinglecast() && !supervisedCommandSucceeded(result)) {
				this.schedulePoll({ property }, value, { transition: "fast" });
			}

			return result;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: EntryControlCCAPI, { property }) {
			switch (property) {
				case "keyCacheSize":
				case "keyCacheTimeout":
					return (await this.getConfiguration())?.[property];
			}
			throwUnsupportedProperty(this.ccId, property);
		};
	}
}

@commandClass(CommandClasses["Entry Control"])
@implementedVersion(1)
@ccValues(EntryControlCCValues)
export class EntryControlCC extends CommandClass {
	declare ccCommand: EntryControlCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses.Association,
			CommandClasses["Multi Channel Association"],
			CommandClasses["Association Group Information"],
		];
	}

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Entry Control"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// If one Association group issues Entry Control notifications,
		// we must associate ourselves with that channel
		try {
			await ccUtils.assignLifelineIssueingCommand(
				ctx,
				endpoint,
				this.ccId,
				EntryControlCommand.Notification,
			);
		} catch {
			ctx.logNode(node.id, {
				endpoint: endpoint.index,
				message: `Configuring associations to receive ${
					getCCName(
						this.ccId,
					)
				} commands failed!`,
				level: "warn",
			});
		}

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting entry control supported keys...",
			direction: "outbound",
		});

		const supportedKeys = await api.getSupportedKeys();
		if (supportedKeys) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`received entry control supported keys: ${supportedKeys.toString()}`,
				direction: "inbound",
			});
		}

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting entry control supported events...",
			direction: "outbound",
		});

		const eventCapabilities = await api.getEventCapabilities();
		if (eventCapabilities) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `received entry control supported keys:
data types:            ${
					eventCapabilities.supportedDataTypes
						.map((e) => EntryControlDataTypes[e])
						.toString()
				}
event types:           ${
					eventCapabilities.supportedEventTypes
						.map((e) => EntryControlEventTypes[e])
						.toString()
				}
min key cache size:    ${eventCapabilities.minKeyCacheSize}
max key cache size:    ${eventCapabilities.maxKeyCacheSize}
min key cache timeout: ${eventCapabilities.minKeyCacheTimeout} seconds
max key cache timeout: ${eventCapabilities.maxKeyCacheTimeout} seconds`,
				direction: "inbound",
			});
		}

		await this.refreshValues(ctx);

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Entry Control"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting entry control configuration...",
			direction: "outbound",
		});

		const conf = await api.getConfiguration();
		if (conf) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `received entry control configuration:
key cache size:    ${conf.keyCacheSize}
key cache timeout: ${conf.keyCacheTimeout} seconds`,
				direction: "inbound",
			});
		}
	}
}

// @publicAPI
export interface EntryControlCCNotificationOptions {
	sequenceNumber: number;
	dataType: EntryControlDataTypes;
	eventType: EntryControlEventTypes;
	eventData?: string | Bytes;
}

@CCCommand(EntryControlCommand.Notification)
export class EntryControlCCNotification extends EntryControlCC {
	public constructor(
		options: WithAddress<EntryControlCCNotificationOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.sequenceNumber = options.sequenceNumber;
		this.dataType = options.dataType;
		this.eventType = options.eventType;
		this.eventData = options.eventData;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): EntryControlCCNotification {
		validatePayload(raw.payload.length >= 4);
		const sequenceNumber = raw.payload[0];
		let dataType: EntryControlDataTypes = raw.payload[1] & 0b11;
		const eventType: EntryControlEventTypes = raw.payload[2];
		const eventDataLength = raw.payload[3];
		validatePayload(eventDataLength >= 0 && eventDataLength <= 32);
		const offset = 4;
		validatePayload(raw.payload.length >= offset + eventDataLength);
		let eventData: string | Bytes | undefined;
		if (eventDataLength > 0) {
			// We shouldn't need to check this, since the specs are pretty clear which format to expect.
			// But as always - manufacturers don't care and send ASCII data with 0 bytes...

			// We also need to disable the strict validation for some devices to make them work
			const noStrictValidation = !!ctx.getDeviceConfig?.(
				ctx.sourceNodeId,
			)?.compat?.disableStrictEntryControlDataValidation;

			eventData = Bytes.from(
				raw.payload.subarray(offset, offset + eventDataLength),
			);
			switch (dataType) {
				case EntryControlDataTypes.Raw:
					// RAW 1 to 32 bytes of arbitrary binary data
					if (!noStrictValidation) {
						validatePayload(
							eventDataLength >= 1 && eventDataLength <= 32,
						);
					}
					break;
				case EntryControlDataTypes.ASCII:
					// ASCII 1 to 32 ASCII encoded characters. ASCII codes MUST be in the value range 0x00-0xF7.
					// The string MUST be padded with the value 0xFF to fit 16 byte blocks when sent in a notification.
					if (!noStrictValidation) {
						validatePayload(
							eventDataLength === 16 || eventDataLength === 32,
						);
					}
					// Trim 0xff padding bytes
					let paddingStart = eventDataLength;
					while (
						paddingStart > 0
						&& eventData[paddingStart - 1] === 0xff
					) {
						paddingStart--;
					}
					eventData = eventData.subarray(0, paddingStart).toString(
						"ascii",
					);

					if (!noStrictValidation) {
						validatePayload(/^[\u0000-\u007f]+$/.test(eventData));
					}
					break;
				case EntryControlDataTypes.MD5:
					// MD5 16 byte binary data encoded as a MD5 hash value.
					if (!noStrictValidation) {
						validatePayload(eventDataLength === 16);
					}
					break;
			}
		} else {
			dataType = EntryControlDataTypes.None;
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			sequenceNumber,
			dataType,
			eventType,
			eventData,
		});
	}

	public readonly sequenceNumber: number;
	public readonly dataType: EntryControlDataTypes;
	public readonly eventType: EntryControlEventTypes;
	public readonly eventData?: Uint8Array | string;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"sequence number": this.sequenceNumber,
			"data type": this.dataType,
			"event type": this.eventType,
		};
		if (this.eventData) {
			switch (this.eventType) {
				case EntryControlEventTypes.CachedKeys:
				case EntryControlEventTypes.Enter:
					// The event data is likely the user's PIN code, hide it from logs
					message["event data"] = "*".repeat(this.eventData.length);
					break;

				default:
					message["event data"] = typeof this.eventData === "string"
						? this.eventData
						: buffer2hex(this.eventData);
			}
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface EntryControlCCKeySupportedReportOptions {
	supportedKeys: number[];
}

@CCCommand(EntryControlCommand.KeySupportedReport)
@ccValueProperty("supportedKeys", EntryControlCCValues.supportedKeys)
export class EntryControlCCKeySupportedReport extends EntryControlCC {
	public constructor(
		options: WithAddress<EntryControlCCKeySupportedReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.supportedKeys = options.supportedKeys;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): EntryControlCCKeySupportedReport {
		validatePayload(raw.payload.length >= 1);
		const length = raw.payload[0];
		validatePayload(raw.payload.length >= 1 + length);
		const supportedKeys = parseBitMask(
			raw.payload.subarray(1, 1 + length),
			0,
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			supportedKeys,
		});
	}

	public readonly supportedKeys: readonly number[];

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "supported keys": this.supportedKeys.toString() },
		};
	}
}

@CCCommand(EntryControlCommand.KeySupportedGet)
@expectedCCResponse(EntryControlCCKeySupportedReport)
export class EntryControlCCKeySupportedGet extends EntryControlCC {}

// @publicAPI
export interface EntryControlCCEventSupportedReportOptions {
	supportedDataTypes: EntryControlDataTypes[];
	supportedEventTypes: EntryControlEventTypes[];
	minKeyCacheSize: number;
	maxKeyCacheSize: number;
	minKeyCacheTimeout: number;
	maxKeyCacheTimeout: number;
}

@CCCommand(EntryControlCommand.EventSupportedReport)
@ccValueProperty("supportedDataTypes", EntryControlCCValues.supportedDataTypes)
@ccValueProperty(
	"supportedEventTypes",
	EntryControlCCValues.supportedEventTypes,
)
export class EntryControlCCEventSupportedReport extends EntryControlCC {
	public constructor(
		options: WithAddress<EntryControlCCEventSupportedReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.supportedDataTypes = options.supportedDataTypes;
		this.supportedEventTypes = options.supportedEventTypes;
		this.minKeyCacheSize = options.minKeyCacheSize;
		this.maxKeyCacheSize = options.maxKeyCacheSize;
		this.minKeyCacheTimeout = options.minKeyCacheTimeout;
		this.maxKeyCacheTimeout = options.maxKeyCacheTimeout;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): EntryControlCCEventSupportedReport {
		validatePayload(raw.payload.length >= 1);
		const dataTypeLength = raw.payload[0] & 0b11;
		let offset = 1;
		validatePayload(raw.payload.length >= offset + dataTypeLength);
		const supportedDataTypes: EntryControlDataTypes[] = parseBitMask(
			raw.payload.subarray(offset, offset + dataTypeLength),
			EntryControlDataTypes.None,
		);
		offset += dataTypeLength;
		validatePayload(raw.payload.length >= offset + 1);
		const eventTypeLength = raw.payload[offset] & 0b11111;
		offset += 1;
		validatePayload(raw.payload.length >= offset + eventTypeLength);
		const supportedEventTypes: EntryControlEventTypes[] = parseBitMask(
			raw.payload.subarray(offset, offset + eventTypeLength),
			EntryControlEventTypes.Caching,
		);
		offset += eventTypeLength;
		validatePayload(raw.payload.length >= offset + 4);
		const minKeyCacheSize = raw.payload[offset];
		validatePayload(
			minKeyCacheSize >= 1 && minKeyCacheSize <= 32,
		);
		const maxKeyCacheSize = raw.payload[offset + 1];
		validatePayload(
			maxKeyCacheSize >= minKeyCacheSize
				&& maxKeyCacheSize <= 32,
		);
		const minKeyCacheTimeout = raw.payload[offset + 2];
		const maxKeyCacheTimeout = raw.payload[offset + 3];

		return new this({
			nodeId: ctx.sourceNodeId,
			supportedDataTypes,
			supportedEventTypes,
			minKeyCacheSize,
			maxKeyCacheSize,
			minKeyCacheTimeout,
			maxKeyCacheTimeout,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Store min/max cache size and timeout as metadata
		const keyCacheSizeValue = EntryControlCCValues.keyCacheSize;
		this.setMetadata(ctx, keyCacheSizeValue, {
			...keyCacheSizeValue.meta,
			min: this.minKeyCacheSize,
			max: this.maxKeyCacheSize,
		});

		const keyCacheTimeoutValue = EntryControlCCValues.keyCacheTimeout;
		this.setMetadata(ctx, keyCacheTimeoutValue, {
			...keyCacheTimeoutValue.meta,
			min: this.minKeyCacheTimeout,
			max: this.maxKeyCacheTimeout,
		});

		return true;
	}

	public readonly supportedDataTypes: readonly EntryControlDataTypes[];

	public readonly supportedEventTypes: readonly EntryControlEventTypes[];

	public readonly minKeyCacheSize: number;
	public readonly maxKeyCacheSize: number;
	public readonly minKeyCacheTimeout: number;
	public readonly maxKeyCacheTimeout: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"supported data types": this.supportedDataTypes
					.map((dt) => EntryControlDataTypes[dt])
					.toString(),
				"supported event types": this.supportedEventTypes
					.map((et) => EntryControlEventTypes[et])
					.toString(),
				"min key cache size": this.minKeyCacheSize,
				"max key cache size": this.maxKeyCacheSize,
				"min key cache timeout": this.minKeyCacheTimeout,
				"max key cache timeout": this.maxKeyCacheTimeout,
			},
		};
	}
}

@CCCommand(EntryControlCommand.EventSupportedGet)
@expectedCCResponse(EntryControlCCEventSupportedReport)
export class EntryControlCCEventSupportedGet extends EntryControlCC {}

// @publicAPI
export interface EntryControlCCConfigurationReportOptions {
	keyCacheSize: number;
	keyCacheTimeout: number;
}

@CCCommand(EntryControlCommand.ConfigurationReport)
@ccValueProperty("keyCacheSize", EntryControlCCValues.keyCacheSize)
@ccValueProperty("keyCacheTimeout", EntryControlCCValues.keyCacheTimeout)
export class EntryControlCCConfigurationReport extends EntryControlCC {
	public constructor(
		options: WithAddress<EntryControlCCConfigurationReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.keyCacheSize = options.keyCacheSize;
		this.keyCacheTimeout = options.keyCacheTimeout;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): EntryControlCCConfigurationReport {
		validatePayload(raw.payload.length >= 2);
		const keyCacheSize = raw.payload[0];
		validatePayload(keyCacheSize >= 1 && keyCacheSize <= 32);
		const keyCacheTimeout = raw.payload[1];

		return new this({
			nodeId: ctx.sourceNodeId,
			keyCacheSize,
			keyCacheTimeout,
		});
	}

	public readonly keyCacheSize: number;

	public readonly keyCacheTimeout: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"key cache size": this.keyCacheSize,
				"key cache timeout": this.keyCacheTimeout,
			},
		};
	}
}

@CCCommand(EntryControlCommand.ConfigurationGet)
@expectedCCResponse(EntryControlCCConfigurationReport)
export class EntryControlCCConfigurationGet extends EntryControlCC {}

// @publicAPI
export interface EntryControlCCConfigurationSetOptions {
	keyCacheSize: number;
	keyCacheTimeout: number;
}

@CCCommand(EntryControlCommand.ConfigurationSet)
@useSupervision()
export class EntryControlCCConfigurationSet extends EntryControlCC {
	public constructor(
		options: WithAddress<EntryControlCCConfigurationSetOptions>,
	) {
		super(options);
		this.keyCacheSize = options.keyCacheSize;
		this.keyCacheTimeout = options.keyCacheTimeout;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): EntryControlCCConfigurationSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new EntryControlCCConfigurationSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public readonly keyCacheSize: number;
	public readonly keyCacheTimeout: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.keyCacheSize, this.keyCacheTimeout]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"key cache size": this.keyCacheSize,
				"key cache timeout": this.keyCacheTimeout,
			},
		};
	}
}
