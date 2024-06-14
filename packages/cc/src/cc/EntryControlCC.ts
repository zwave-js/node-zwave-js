import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	getCCName,
	parseBitMask,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
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
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	EntryControlCommand,
	EntryControlDataTypes,
	EntryControlEventTypes,
} from "../lib/_Types";
import * as ccUtils from "../lib/utils";

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

		const cc = new EntryControlCCKeySupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new EntryControlCCEventSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new EntryControlCCConfigurationGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new EntryControlCCConfigurationSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			keyCacheSize,
			keyCacheTimeout,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
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

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Entry Control"],
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

		// If one Association group issues Entry Control notifications,
		// we must associate ourselves with that channel
		try {
			await ccUtils.assignLifelineIssueingCommand(
				applHost,
				endpoint,
				this.ccId,
				EntryControlCommand.Notification,
			);
		} catch {
			applHost.controllerLog.logNode(node.id, {
				endpoint: endpoint.index,
				message: `Configuring associations to receive ${
					getCCName(
						this.ccId,
					)
				} commands failed!`,
				level: "warn",
			});
		}

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting entry control supported keys...",
			direction: "outbound",
		});

		const supportedKeys = await api.getSupportedKeys();
		if (supportedKeys) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`received entry control supported keys: ${supportedKeys.toString()}`,
				direction: "inbound",
			});
		}

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting entry control supported events...",
			direction: "outbound",
		});

		const eventCapabilities = await api.getEventCapabilities();
		if (eventCapabilities) {
			applHost.controllerLog.logNode(node.id, {
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

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Entry Control"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting entry control configuration...",
			direction: "outbound",
		});

		const conf = await api.getConfiguration();
		if (conf) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `received entry control configuration:
key cache size:    ${conf.keyCacheSize}
key cache timeout: ${conf.keyCacheTimeout} seconds`,
				direction: "inbound",
			});
		}
	}
}

@CCCommand(EntryControlCommand.Notification)
export class EntryControlCCNotification extends EntryControlCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 4);
		this.sequenceNumber = this.payload[0];
		this.dataType = this.payload[1] & 0b11;
		this.eventType = this.payload[2];
		const eventDataLength = this.payload[3];
		validatePayload(eventDataLength >= 0 && eventDataLength <= 32);

		const offset = 4;
		validatePayload(this.payload.length >= offset + eventDataLength);
		if (eventDataLength > 0) {
			// We shouldn't need to check this, since the specs are pretty clear which format to expect.
			// But as always - manufacturers don't care and send ASCII data with 0 bytes...

			// We also need to disable the strict validation for some devices to make them work
			const noStrictValidation = !!this.host.getDeviceConfig?.(
				this.nodeId as number,
			)?.compat?.disableStrictEntryControlDataValidation;

			const eventData = Buffer.from(
				this.payload.subarray(offset, offset + eventDataLength),
			);
			switch (this.dataType) {
				case EntryControlDataTypes.Raw:
					// RAW 1 to 32 bytes of arbitrary binary data
					if (!noStrictValidation) {
						validatePayload(
							eventDataLength >= 1 && eventDataLength <= 32,
						);
					}
					this.eventData = eventData;
					break;
				case EntryControlDataTypes.ASCII:
					// ASCII 1 to 32 ASCII encoded characters. ASCII codes MUST be in the value range 0x00-0xF7.
					// The string MUST be padded with the value 0xFF to fit 16 byte blocks when sent in a notification.
					if (!noStrictValidation) {
						validatePayload(
							eventDataLength === 16 || eventDataLength === 32,
						);
					}
					// Using toString("ascii") converts the padding bytes 0xff to 0x7f
					this.eventData = eventData.toString("ascii");
					if (!noStrictValidation) {
						validatePayload(
							/^[\u0000-\u007f]+[\u007f]*$/.test(this.eventData),
						);
					}
					// Trim padding
					this.eventData = this.eventData.replace(/[\u007f]*$/, "");
					break;
				case EntryControlDataTypes.MD5:
					// MD5 16 byte binary data encoded as a MD5 hash value.
					if (!noStrictValidation) {
						validatePayload(eventDataLength === 16);
					}
					this.eventData = eventData;
					break;
			}
		} else {
			this.dataType = EntryControlDataTypes.None;
		}
	}

	public readonly sequenceNumber: number;
	public readonly dataType: EntryControlDataTypes;
	public readonly eventType: EntryControlEventTypes;
	public readonly eventData?: Buffer | string;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(EntryControlCommand.KeySupportedReport)
export class EntryControlCCKeySupportedReport extends EntryControlCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		const length = this.payload[0];
		validatePayload(this.payload.length >= 1 + length);
		this.supportedKeys = parseBitMask(
			this.payload.subarray(1, 1 + length),
			0,
		);
	}

	@ccValue(EntryControlCCValues.supportedKeys)
	public readonly supportedKeys: readonly number[];

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "supported keys": this.supportedKeys.toString() },
		};
	}
}

@CCCommand(EntryControlCommand.KeySupportedGet)
@expectedCCResponse(EntryControlCCKeySupportedReport)
export class EntryControlCCKeySupportedGet extends EntryControlCC {}

@CCCommand(EntryControlCommand.EventSupportedReport)
export class EntryControlCCEventSupportedReport extends EntryControlCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		const dataTypeLength = this.payload[0] & 0b11;
		let offset = 1;

		validatePayload(this.payload.length >= offset + dataTypeLength);
		this.supportedDataTypes = parseBitMask(
			this.payload.subarray(offset, offset + dataTypeLength),
			EntryControlDataTypes.None,
		);
		offset += dataTypeLength;

		validatePayload(this.payload.length >= offset + 1);
		const eventTypeLength = this.payload[offset] & 0b11111;
		offset += 1;

		validatePayload(this.payload.length >= offset + eventTypeLength);
		this.supportedEventTypes = parseBitMask(
			this.payload.subarray(offset, offset + eventTypeLength),
			EntryControlEventTypes.Caching,
		);
		offset += eventTypeLength;

		validatePayload(this.payload.length >= offset + 4);
		this.minKeyCacheSize = this.payload[offset];
		validatePayload(
			this.minKeyCacheSize >= 1 && this.minKeyCacheSize <= 32,
		);
		this.maxKeyCacheSize = this.payload[offset + 1];
		validatePayload(
			this.maxKeyCacheSize >= this.minKeyCacheSize
				&& this.maxKeyCacheSize <= 32,
		);
		this.minKeyCacheTimeout = this.payload[offset + 2];
		this.maxKeyCacheTimeout = this.payload[offset + 3];
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Store min/max cache size and timeout as metadata
		const keyCacheSizeValue = EntryControlCCValues.keyCacheSize;
		this.setMetadata(applHost, keyCacheSizeValue, {
			...keyCacheSizeValue.meta,
			min: this.minKeyCacheSize,
			max: this.maxKeyCacheSize,
		});

		const keyCacheTimeoutValue = EntryControlCCValues.keyCacheTimeout;
		this.setMetadata(applHost, keyCacheTimeoutValue, {
			...keyCacheTimeoutValue.meta,
			min: this.minKeyCacheTimeout,
			max: this.maxKeyCacheTimeout,
		});

		return true;
	}

	@ccValue(EntryControlCCValues.supportedDataTypes)
	public readonly supportedDataTypes: readonly EntryControlDataTypes[];

	@ccValue(EntryControlCCValues.supportedEventTypes)
	public readonly supportedEventTypes: readonly EntryControlEventTypes[];

	public readonly minKeyCacheSize: number;
	public readonly maxKeyCacheSize: number;
	public readonly minKeyCacheTimeout: number;
	public readonly maxKeyCacheTimeout: number;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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

@CCCommand(EntryControlCommand.ConfigurationReport)
export class EntryControlCCConfigurationReport extends EntryControlCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);

		this.keyCacheSize = this.payload[0];
		validatePayload(this.keyCacheSize >= 1 && this.keyCacheSize <= 32);
		this.keyCacheTimeout = this.payload[1];
	}

	@ccValue(EntryControlCCValues.keyCacheSize)
	public readonly keyCacheSize: number;

	@ccValue(EntryControlCCValues.keyCacheTimeout)
	public readonly keyCacheTimeout: number;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
export interface EntryControlCCConfigurationSetOptions
	extends CCCommandOptions
{
	keyCacheSize: number;
	keyCacheTimeout: number;
}

@CCCommand(EntryControlCommand.ConfigurationSet)
@useSupervision()
export class EntryControlCCConfigurationSet extends EntryControlCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| EntryControlCCConfigurationSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.keyCacheSize = options.keyCacheSize;
			this.keyCacheTimeout = options.keyCacheTimeout;
		}
	}

	public readonly keyCacheSize: number;
	public readonly keyCacheTimeout: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.keyCacheSize, this.keyCacheTimeout]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"key cache size": this.keyCacheSize,
				"key cache timeout": this.keyCacheTimeout,
			},
		};
	}
}
