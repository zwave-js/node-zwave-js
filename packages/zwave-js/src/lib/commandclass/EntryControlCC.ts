import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	ccValue,
	ccValueMetadata,
	expectedCCResponse,
	implementedVersion,
	CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "./CommandClass";
import type {
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CommandClasses,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
	ValueMetadata,
	parseBitMask,
} from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";

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
	Arm3 = 0x0A,
	Arm4 = 0x0B,
	Arm5 = 0x0C,
	Arm6 = 0x0D,
	Rfid = 0x0E,
	Bell = 0x0F,
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
	NA = 0x00,
	Raw = 0x01,
	Ascii = 0x02,
	Md5 = 0x03,
}

export function getKeyCachedSizeStateValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Entry Control"],
		endpoint,
		property: "keyCachedSize",
	};
}

export function getKeyCachedTimeoutStateValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Entry Control"],
		endpoint,
		property: "keyCachedTimeout",
	};
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
	public async getKeySupported() {
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
		if (response) {
			return pick(response, ["keySupported"]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getEventSupported() {
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
				"dataTypeSupported",
				"eventTypeSupported",
				"keyCachedSizeMin",
				"keyCachedSizeMax",
				"keyCachedTimeoutMin",
				"keyCachedTimeoutMax",
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
			return pick(response, ["keyCachedSize", "keyCachedTimeout"]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async setConfiguration(keyCacheSize: number, keyCacheTimeout: number) {
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
			return pick(response, ["keyCachedSize", "keyCachedTimeout"]);
		}
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "keyCachedSize" && property !== "keyCachedTimeout") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}
		const valueDB = this.endpoint.getNodeUnsafe()!.valueDB;

		let keyCachedSize = value;
		let keyCachedTimeout: number = value;
		if (property === "keyCachedSize") {
			const oldKeyCachedTimeout = valueDB.getValue<number>(
				getKeyCachedTimeoutStateValueID(this.endpoint.index),
			);
			if (oldKeyCachedTimeout == undefined) {
				throw new ZWaveError(
					`The "keyCachedSize" property cannot be changed before the key cached timeout is known!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			keyCachedTimeout = oldKeyCachedTimeout;
		} else {
			const oldKeyCachedSize = valueDB.getValue<number>(
				getKeyCachedSizeStateValueID(this.endpoint.index),
			);
			if (oldKeyCachedSize == undefined) {
				throw new ZWaveError(
					`The "keyCachedTimeout" property cannot be changed before the key cached size is known!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			keyCachedSize = oldKeyCachedSize;
		}
		await this.setConfiguration(keyCachedSize, keyCachedTimeout);
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "dataTypeSupported":
			case "eventTypeSupported":
			case "keyCachedSizeMin":
			case "keyCachedSizeMax":
			case "keyCachedTimeoutMin":
			case "keyCachedTimeoutMax":
				return (await this.getEventSupported())?.[property];
			case "keySupported":
				return (await this.getKeySupported())?.[property];
			case "keyCachedSize":
			case "keyCachedTimeout":
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

		await api.getKeySupported();
		await api.getEventSupported();
		await api.getConfiguration();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(EntryControlCommand.Notification)
export class EntryControlCCNotication extends EntryControlCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 4);
		this._sequenceNumber = this.payload[0];
		this._dataType = this.payload[1] & 0b11;
		this._eventType = this.payload[2];
		const eventDataLength = this.payload[3];

		validatePayload(this.payload.length >= 4 + eventDataLength);
		this._eventData = Buffer.from(this.payload.slice(4, 4 + eventDataLength));
	}

	private _sequenceNumber: number;
	public get sequenceNumber(): number {
		return this._sequenceNumber;
	}

	private _dataType: EntryControlDataTypes;
	public get dataType(): EntryControlDataTypes {
		return this._dataType;
	}

	private _eventType: EntryControlEventTypes;
	public get eventType(): EntryControlEventTypes {
		return this._eventType;
	}

	private _eventData: Buffer;
	public get eventData(): Buffer {
		return this._eventData;
	}

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
		this._keySupported = parseBitMask(this.payload.slice(1, 1 + length), 0);
		this.persistValues();
	}

	private _keySupported: number[];

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		type: "number[]",
		label: "Supported keys",
		description:
			"A list of supported keys",
	})
	public get keySupported(): number[] {
		return this._keySupported;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "supported keys": this.keySupported.toString() },
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

		validatePayload(this.payload.length >= 6);

		const dataTypeLength = this.payload[0] & 0b0000_0011;
		validatePayload(this.payload.length >= 6 + dataTypeLength);
		this._dataTypeSupported = parseBitMask(this.payload.slice(1, 1 + dataTypeLength), 0);

		const eventTypeLength = this.payload[1 + dataTypeLength] & 0b0001_1111;
		validatePayload(this.payload.length >= 6 + dataTypeLength + eventTypeLength);
		this._eventTypeSupported = parseBitMask(this.payload.slice(2 + dataTypeLength, 2 + dataTypeLength + eventTypeLength), 0);

		const minMaxStart = 2 + dataTypeLength + eventTypeLength;
		this._keyCachedSizeMin = this.payload[minMaxStart];
		this._keyCachedSizeMax = this.payload[minMaxStart + 1];
		this._keyCachedTimeoutMin = this.payload[minMaxStart + 2];
		this._keyCachedTimeoutMax = this.payload[minMaxStart + 3];
		this.persistValues();
	}

	private _dataTypeSupported: EntryControlDataTypes[];

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		type: "number[]",
		label: "Supported data types",
		description: "A list of supported data types",
	})
	public get dataTypeSupported(): EntryControlDataTypes[] {
		return this._dataTypeSupported;
	}

	private _eventTypeSupported: EntryControlEventTypes[];

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		type: "number[]",
		label: "Supported event types",
		description: "A list of supported event types",
	})
	public get eventTypeSupported(): EntryControlEventTypes[] {
		return this._eventTypeSupported;
	}

	private _keyCachedSizeMin: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Minimum supported value of key cache size",
	})
	public get keyCachedSizeMin(): number {
		return this._keyCachedSizeMin;
	}

	private _keyCachedSizeMax: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Maximum supported value of key cache size",
	})
	public get keyCachedSizeMax(): number {
		return this._keyCachedSizeMax;
	}

	private _keyCachedTimeoutMin: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Minimum supported value of key cache timeout",
	})
	public get keyCachedTimeoutMin(): number {
		return this._keyCachedTimeoutMin;
	}

	private _keyCachedTimeoutMax: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Maximum supported value of key cache timeout",
	})
	public get keyCachedTimeoutMax(): number {
		return this._keyCachedTimeoutMax;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported data types": this.dataTypeSupported.map((dt) => EntryControlDataTypes[dt]).toString(),
				"supported event types": this.eventTypeSupported.map((et) => EntryControlEventTypes[et]).toString(),
				"min key cached size": this.keyCachedSizeMin,
				"max key cached size": this.keyCachedSizeMax,
				"min key cached timeout": this.keyCachedTimeoutMin,
				"max key cached timeout": this.keyCachedTimeoutMax,
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

		this._keyCachedSize = this.payload[0];
		this._keyCachedTimeout = this.payload[1];
		this.persistValues();
	}

	private _keyCachedSize: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		label: "Key cache size",
		description:
			"Number of character that must be stored before sending",
	})
	public get keyCachedSize(): number {
		return this._keyCachedSize;
	}

	private _keyCachedTimeout: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		label: "Key cache timeout",
		description:
			"Number of seconds that the key cache must wait for additional characters",
	})
	public get keyCachedTimeout(): number {
		return this._keyCachedTimeout;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"key cached size": this.keyCachedSize,
				"key cached timeout": this.keyCachedTimeout,
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
		options: CommandClassDeserializationOptions | EntryControlCCConfigurationSetOptions,
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

	public keyCacheSize: number;
	public keyCacheTimeout: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.keyCacheSize,
			this.keyCacheTimeout,
		]);
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
