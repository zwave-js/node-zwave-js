import type {
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CommandClasses,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
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
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

// All the supported commands
export enum EntryControlCommand {
	Notification = 0x01,
	KeySupportedGet = 0x02,
	KeySupportedReport = 0x03,
	EventSupportedGet = 0x04,
	EventSupportedReport = 0x05,
	ConfigurationSet = 0x06,
	ConfigurationGet = 0x07,
	ConfigurationReport = 0x08,
}

export enum EntryControlEventTypes {
	Caching = 0x00,
	CachedKeys = 0x01,
	Enter = 0x02,
	DisarmAll = 0x03,
	ArmAll = 0x04,
	ArmAway = 0x05,
	ArmHome = 0x06,
	ExitDelay = 0x07,
	Arm1 = 0x08,
	Arm2 = 0x09,
	Arm3 = 0x0a,
	Arm4 = 0x0b,
	Arm5 = 0x0c,
	Arm6 = 0x0d,
	Rfid = 0x0e,
	Bell = 0x0f,
	Fire = 0x10,
	Police = 0x11,
	AlertPanic = 0x12,
	AlertMedical = 0x13,
	GateOpen = 0x14,
	GateClose = 0x15,
	Lock = 0x16,
	Unlock = 0x17,
	Test = 0x18,
	Cancel = 0x19,
}

export enum EntryControlDataTypes {
	None = 0x00,
	Raw = 0x01,
	ASCII = 0x02,
	MD5 = 0x03,
}

function getValueID(property: string, endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Entry Control"],
		endpoint,
		property: property,
	};
}

export function getKeyCacheSizeStateValueID(endpoint: number): ValueID {
	return getValueID("keyCacheSize", endpoint);
}

export function getKeyCacheTimeoutStateValueID(endpoint: number): ValueID {
	return getValueID("keyCacheTimeout", endpoint);
}

@API(CommandClasses["Entry Control"])
export class EntryControlCCAPI extends CCAPI {
	public supportsCommand(cmd: EntryControlCommand): Maybe<boolean> {
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

		const cc = new EntryControlCCKeySupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<EntryControlCCKeySupportedReport>(
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

		const cc = new EntryControlCCEventSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<EntryControlCCEventSupportedReport>(
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

		const cc = new EntryControlCCConfigurationGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<EntryControlCCConfigurationReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["keyCacheSize", "keyCacheTimeout"]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async setConfiguration(
		keyCacheSize: number,
		keyCacheTimeout: number,
	) {
		this.assertSupportsCommand(
			EntryControlCommand,
			EntryControlCommand.ConfigurationGet,
		);

		const cc = new EntryControlCCConfigurationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			keyCacheSize,
			keyCacheTimeout,
		});
		const response = await this.driver.sendCommand<EntryControlCCConfigurationReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["keyCacheSize", "keyCacheTimeout"]);
		}
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "keyCacheSize" && property !== "keyCacheTimeout") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}
		const valueDB = this.endpoint.getNodeUnsafe()!.valueDB;

		let keyCacheSize = value;
		let keyCacheTimeout = 2;
		if (property === "keyCacheTimeout") {
			keyCacheTimeout = value;

			const oldKeyCacheSize = valueDB.getValue<number>(
				getKeyCacheSizeStateValueID(this.endpoint.index),
			);
			if (oldKeyCacheSize == undefined) {
				throw new ZWaveError(
					`The "keyCacheTimeout" property cannot be changed before the key cache size is known!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			keyCacheSize = oldKeyCacheSize;
		}
		await this.setConfiguration(keyCacheSize, keyCacheTimeout);
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "keyCacheSize":
			case "keyCacheTimeout":
				return (await this.getConfiguration())?.[property];
		}
		throwUnsupportedProperty(this.ccId, property);
	};
}

@commandClass(CommandClasses["Entry Control"])
@implementedVersion(1)
export class EntryControlCC extends CommandClass {
	declare ccCommand: EntryControlCommand;

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Entry Control"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting entry control supported keys...",
			direction: "outbound",
		});

		const supportedKeys = await api.getSupportedKeys();
		if (supportedKeys) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `received entry control supported keys: ${supportedKeys.toString()}`,
				direction: "inbound",
			});
		}

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting entry control supported events...",
			direction: "outbound",
		});

		const eventCapabilities = await api.getEventCapabilities();
		if (eventCapabilities) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `received entry control supported keys:
data types:             ${eventCapabilities.supportedDataTypes
					.map((e) => EntryControlDataTypes[e])
					.toString()}
event types:            ${eventCapabilities.supportedEventTypes
					.map((e) => EntryControlEventTypes[e])
					.toString()}
key cached size min:    ${eventCapabilities.minKeyCacheSize}
key cached size max:    ${eventCapabilities.maxKeyCacheSize}
key cached timeout min: ${eventCapabilities.minKeyCacheTimeout}
key cached timeout max: ${eventCapabilities.maxKeyCacheTimeout}`,
				direction: "inbound",
			});
		}

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "requesting entry control configuration...",
			direction: "outbound",
		});

		const conf = await api.getConfiguration();
		if (conf) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `received entry control supported keys:
key cached size:    ${conf.keyCacheSize}
key cached timeout: ${conf.keyCacheTimeout}`,
				direction: "inbound",
			});
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(EntryControlCommand.Notification)
export class EntryControlCCNotification extends EntryControlCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 4);
		this.sequenceNumber = this.payload[0];
		this.dataType = this.payload[1] & 0b11;
		this.eventType = this.payload[2];
		const eventDataLength = this.payload[3];
		validatePayload(eventDataLength >= 0 && eventDataLength <= 32);

		const offset = 4;
		validatePayload(this.payload.length >= offset + eventDataLength);
		const eventData = Buffer.from(
			this.payload.slice(offset, offset + eventDataLength),
		);
		this.eventData =
			this.dataType == EntryControlDataTypes.ASCII
				? eventData.toString()
				: eventData;
	}

	public readonly sequenceNumber: number;
	public readonly dataType: EntryControlDataTypes;
	public readonly eventType: EntryControlEventTypes;
	public readonly eventData: Buffer | string;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"sequence number": this.sequenceNumber,
			"data type": this.dataType,
			"event type": this.eventType,
			"event data": this.eventData.toString(),
		};
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(EntryControlCommand.KeySupportedReport)
export class EntryControlCCKeySupportedReport extends EntryControlCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		const length = this.payload[0];
		validatePayload(this.payload.length >= 1 + length);
		this.supportedKeys = parseBitMask(this.payload.slice(1, 1 + length), 0);
		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly supportedKeys: readonly number[];

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		const dataTypeLength = this.payload[0] & 0b11;
		let offset = 1;

		validatePayload(this.payload.length >= offset + dataTypeLength);
		this.supportedDataTypes = parseBitMask(
			this.payload.slice(offset, offset + dataTypeLength),
			EntryControlDataTypes.None,
		);
		offset += dataTypeLength;

		validatePayload(this.payload.length >= offset + 1);
		const eventTypeLength = this.payload[offset] & 0b11111;
		offset += 1;

		validatePayload(this.payload.length >= offset + eventTypeLength);
		this.supportedEventTypes = parseBitMask(
			this.payload.slice(offset, offset + eventTypeLength),
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
			this.maxKeyCacheSize >= this.minKeyCacheSize &&
				this.maxKeyCacheSize <= 32,
		);
		this.minKeyCacheTimeout = this.payload[offset + 2];
		this.maxKeyCacheTimeout = this.payload[offset + 3];

		const keyCacheSizeValueId = getKeyCacheSizeStateValueID(
			this.endpointIndex,
		);
		this.getValueDB().setMetadata(keyCacheSizeValueId, {
			...ValueMetadata.UInt8,
			min: this.minKeyCacheSize,
			max: this.maxKeyCacheSize,
		});

		const keyCacheTimeoutValueId = getKeyCacheTimeoutStateValueID(
			this.endpointIndex,
		);
		this.getValueDB().setMetadata(keyCacheTimeoutValueId, {
			...ValueMetadata.UInt8,
			min: this.minKeyCacheTimeout,
			max: this.maxKeyCacheTimeout,
		});

		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly supportedDataTypes: readonly EntryControlDataTypes[];

	@ccValue({ internal: true })
	public readonly supportedEventTypes: readonly EntryControlEventTypes[];

	@ccValue({ internal: true })
	public readonly minKeyCacheSize: number;

	@ccValue({ internal: true })
	public readonly maxKeyCacheSize: number;

	@ccValue({ internal: true })
	public readonly minKeyCacheTimeout: number;

	@ccValue({ internal: true })
	public readonly maxKeyCacheTimeout: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported data types": this.supportedDataTypes
					.map((dt) => EntryControlDataTypes[dt])
					.toString(),
				"supported event types": this.supportedEventTypes
					.map((et) => EntryControlEventTypes[et])
					.toString(),
				"min key cached size": this.minKeyCacheSize,
				"max key cached size": this.maxKeyCacheSize,
				"min key cached timeout": this.minKeyCacheTimeout,
				"max key cached timeout": this.maxKeyCacheTimeout,
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
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);

		this.keyCacheSize = this.payload[0];
		validatePayload(this.keyCacheSize >= 1 && this.keyCacheSize <= 32);
		this.keyCacheTimeout = this.payload[1];
		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		label: "Key cache size",
		description: "Number of character that must be stored before sending",
		min: 1,
		max: 32,
	})
	public readonly keyCacheSize: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		label: "Key cache timeout",
		description:
			"Number of seconds that the key cache must wait for additional characters",
		min: 1,
		max: 10,
	})
	public readonly keyCacheTimeout: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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

interface EntryControlCCConfigurationSetOptions extends CCCommandOptions {
	keyCacheSize: number;
	keyCacheTimeout: number;
}

@CCCommand(EntryControlCommand.ConfigurationSet)
@expectedCCResponse(EntryControlCCConfigurationReport)
export class EntryControlCCConfigurationSet extends EntryControlCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| EntryControlCCConfigurationSetOptions,
	) {
		super(driver, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"key cache size": this.keyCacheSize,
				"key cache timeout": this.keyCacheTimeout,
			},
		};
	}
}
