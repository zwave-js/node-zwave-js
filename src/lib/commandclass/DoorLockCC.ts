import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { pick, validatePayload } from "../util/misc";
import { Duration } from "../values/Duration";
import { Maybe, parseBitMask } from "../values/Primitive";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum DoorLockCommand {
	OperationSet = 0x01,
	OperationGet = 0x02,
	OperationReport = 0x03,
	ConfigurationSet = 0x04,
	ConfigurationGet = 0x05,
	ConfigurationReport = 0x06,
	CapabilitiesGet = 0x07,
	CapabilitiesReport = 0x08,
}

// @publicAPI
export enum DoorLockMode {
	Unsecured = 0x00,
	UnsecuredWithTimeout = 0x01,
	InsideUnsecured = 0x10,
	InsideUnsecuredWithTimeout = 0x11,
	OutsideUnsecured = 0x20,
	OutsideUnsecuredWithTimeout = 0x21,
	Unknown = 0xfe,
	Secured = 0xff,
}

// @publicAPI
export enum DoorLockOperationType {
	Constant = 0x01,
	Timed = 0x02,
}

// @publicAPI
export type DoorHandleStatus = [boolean, boolean, boolean, boolean];

@API(CommandClasses["Door Lock"])
export class DoorLockCCAPI extends CCAPI {
	public supportsCommand(cmd: DoorLockCommand): Maybe<boolean> {
		switch (cmd) {
			case DoorLockCommand.OperationSet:
			case DoorLockCommand.OperationGet:
			case DoorLockCommand.ConfigurationSet:
			case DoorLockCommand.ConfigurationGet:
				return true; // This is mandatory
			case DoorLockCommand.CapabilitiesGet:
				return this.version >= 4;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getCapabilities() {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.CapabilitiesGet,
		);

		const cc = new DoorLockCCCapabilitiesGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			DoorLockCCCapabilitiesReport
		>(cc))!;
		return pick(response, [
			"autoRelockSupported",
			"blockToBlockSupported",
			"boltSupported",
			"doorSupported",
			"holdAndReleaseSupported",
			"latchSupported",
			"supportedDoorLockModes",
			"supportedInsideHandles",
			"supportedOperationTypes",
			"supportedOutsideHandles",
		]);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.OperationGet,
		);

		const cc = new DoorLockCCOperationGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			DoorLockCCOperationReport
		>(cc))!;
		return pick(response, [
			"currentMode",
			"targetMode",
			"duration",
			"outsideHandlesCanOpenDoor",
			"insideHandlesCanOpenDoor",
			"latchStatus",
			"boltStatus",
			"doorStatus",
			"lockTimeout",
		]);
	}

	public async set(mode: DoorLockMode): Promise<void> {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.OperationSet,
		);

		const cc = new DoorLockCCOperationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			mode,
		});
		await this.driver.sendCommand(cc);
	}

	public async setConfiguration(
		configuration: DoorLockCCConfigurationSetOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.ConfigurationSet,
		);

		const cc = new DoorLockCCConfigurationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...configuration,
		});
		await this.driver.sendCommand(cc);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getConfiguration() {
		this.assertSupportsCommand(
			DoorLockCommand,
			DoorLockCommand.ConfigurationGet,
		);

		const cc = new DoorLockCCConfigurationGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			DoorLockCCConfigurationReport
		>(cc))!;
		return pick(response, [
			"operationType",
			"outsideHandlesCanOpenDoorConfiguration",
			"insideHandlesCanOpenDoorConfiguration",
			"lockTimeoutConfiguration",
			"autoRelockTime",
			"holdAndReleaseTime",
			"twistAssist",
			"blockToBlock",
		]);
	}
}

@commandClass(CommandClasses["Door Lock"])
@implementedVersion(4)
export class DoorLockCC extends CommandClass {
	declare ccCommand: DoorLockCommand;
}

interface DoorLockCCOperationSetOptions extends CCCommandOptions {
	mode: DoorLockMode;
}

@CCCommand(DoorLockCommand.OperationSet)
export class DoorLockCCOperationSet extends DoorLockCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| DoorLockCCOperationSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.mode === DoorLockMode.Unknown) {
				throw new ZWaveError(
					`Unknown is not a valid door lock target state!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.mode = options.mode;
		}
	}

	public mode: DoorLockMode;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.mode]);
		return super.serialize();
	}
}

@CCCommand(DoorLockCommand.OperationReport)
export class DoorLockCCOperationReport extends DoorLockCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 5);

		this.currentMode = this.payload[0];
		this.outsideHandlesCanOpenDoor = [
			!!(this.payload[1] & 0b0001_0000),
			!!(this.payload[1] & 0b0010_0000),
			!!(this.payload[1] & 0b0100_0000),
			!!(this.payload[1] & 0b1000_0000),
		];
		this.insideHandlesCanOpenDoor = [
			!!(this.payload[1] & 0b0001),
			!!(this.payload[1] & 0b0010),
			!!(this.payload[1] & 0b0100),
			!!(this.payload[1] & 0b1000),
		];
		this.doorStatus = !!(this.payload[2] & 0b1) ? "closed" : "open";
		this.boltStatus = !!(this.payload[2] & 0b10) ? "unlocked" : "locked";
		this.latchStatus = !!(this.payload[2] & 0b100) ? "closed" : "open";
		// Ignore invalid timeout values
		const lockTimeoutMinutes = this.payload[3];
		const lockTimeoutSeconds = this.payload[4];
		if (lockTimeoutMinutes <= 253 && lockTimeoutSeconds <= 59) {
			this.lockTimeout = lockTimeoutSeconds + lockTimeoutMinutes * 60;
		}

		if (this.version >= 3 && this.payload.length >= 7) {
			this.targetMode = this.payload[5];
			this.duration = Duration.parseReport(this.payload[6]);
		}

		this.persistValues();
	}

	@ccValue()
	public readonly currentMode: DoorLockMode;

	@ccValue({ minVersion: 3 })
	public readonly targetMode?: DoorLockMode;

	@ccValue({ minVersion: 3 })
	public readonly duration?: Duration;

	@ccValue()
	public readonly outsideHandlesCanOpenDoor: DoorHandleStatus;
	@ccValue()
	public readonly insideHandlesCanOpenDoor: DoorHandleStatus;

	@ccValue()
	public readonly latchStatus: "open" | "closed";

	@ccValue()
	public readonly boltStatus: "locked" | "unlocked";

	@ccValue()
	public readonly doorStatus: "open" | "closed";

	@ccValue()
	public readonly lockTimeout?: number; // in seconds
}

@CCCommand(DoorLockCommand.OperationGet)
@expectedCCResponse(DoorLockCCOperationReport)
export class DoorLockCCOperationGet extends DoorLockCC {}

@CCCommand(DoorLockCommand.ConfigurationReport)
export class DoorLockCCConfigurationReport extends DoorLockCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 4);

		this.operationType = this.payload[0];
		this.outsideHandlesCanOpenDoorConfiguration = [
			!!(this.payload[1] & 0b0001_0000),
			!!(this.payload[1] & 0b0010_0000),
			!!(this.payload[1] & 0b0100_0000),
			!!(this.payload[1] & 0b1000_0000),
		];
		this.insideHandlesCanOpenDoorConfiguration = [
			!!(this.payload[1] & 0b0001),
			!!(this.payload[1] & 0b0010),
			!!(this.payload[1] & 0b0100),
			!!(this.payload[1] & 0b1000),
		];
		if (this.operationType === DoorLockOperationType.Timed) {
			const lockTimeoutMinutes = this.payload[2];
			const lockTimeoutSeconds = this.payload[3];
			if (lockTimeoutMinutes <= 0xfd && lockTimeoutSeconds <= 59) {
				this.lockTimeoutConfiguration =
					lockTimeoutSeconds + lockTimeoutMinutes * 60;
			}
		}
		if (this.version >= 4 && this.payload.length >= 5) {
			this.autoRelockTime = this.payload.readUInt16BE(4);
			this.holdAndReleaseTime = this.payload.readUInt16BE(6);

			const flags = this.payload[8];
			this.twistAssist = !!(flags & 0b1);
			this.blockToBlock = !!(flags & 0b10);
		}
	}

	@ccValue()
	public readonly operationType: DoorLockOperationType;

	@ccValue()
	public readonly outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;

	@ccValue()
	public readonly insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;

	@ccValue()
	public readonly lockTimeoutConfiguration?: number;

	@ccValue()
	public readonly autoRelockTime?: number;

	@ccValue()
	public readonly holdAndReleaseTime?: number;

	@ccValue()
	public readonly twistAssist?: boolean;

	@ccValue()
	public readonly blockToBlock?: boolean;
}

@CCCommand(DoorLockCommand.ConfigurationGet)
@expectedCCResponse(DoorLockCCConfigurationReport)
export class DoorLockCCConfigurationGet extends DoorLockCC {}

type DoorLockCCConfigurationSetOptions = (
	| {
			operationType: DoorLockOperationType.Timed;
			lockTimeoutConfiguration: number;
	  }
	| {
			operationType: DoorLockOperationType.Constant;
			lockTimeoutConfiguration?: undefined;
	  }
) & {
	outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	// V4+
	autoRelockTime?: number;
	holdAndReleaseTime?: number;
	twistAssist?: boolean;
	blockToBlock?: boolean;
};

@CCCommand(DoorLockCommand.ConfigurationSet)
export class DoorLockCCConfigurationSet extends DoorLockCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & DoorLockCCConfigurationSetOptions),
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.operationType = options.operationType;
			this.outsideHandlesCanOpenDoorConfiguration =
				options.outsideHandlesCanOpenDoorConfiguration;
			this.insideHandlesCanOpenDoorConfiguration =
				options.insideHandlesCanOpenDoorConfiguration;
			this.lockTimeoutConfiguration = options.lockTimeoutConfiguration;
			this.autoRelockTime = options.autoRelockTime;
			this.holdAndReleaseTime = options.holdAndReleaseTime;
			this.twistAssist = options.twistAssist;
			this.blockToBlock = options.blockToBlock;
		}
	}

	public operationType: DoorLockOperationType;
	public outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	public insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
	public lockTimeoutConfiguration?: number;
	public autoRelockTime?: number;
	public holdAndReleaseTime?: number;
	public twistAssist?: boolean;
	public blockToBlock?: boolean;

	public serialize(): Buffer {
		const handles = [
			...this.insideHandlesCanOpenDoorConfiguration,
			...this.outsideHandlesCanOpenDoorConfiguration,
		]
			.map((val, i) => (val ? 1 << i : 0))
			.reduce((acc, cur) => acc | cur, 0);

		let lockTimeoutMinutes: number;
		let lockTimeoutSeconds: number;
		if (this.operationType === DoorLockOperationType.Constant) {
			lockTimeoutMinutes = lockTimeoutSeconds = 0xfe;
		} else {
			lockTimeoutMinutes = Math.floor(
				this.lockTimeoutConfiguration! / 60,
			);
			lockTimeoutSeconds = this.lockTimeoutConfiguration! % 60;
		}

		this.payload = Buffer.from([
			this.operationType,
			handles,
			lockTimeoutMinutes,
			lockTimeoutSeconds,
		]);
		if (
			this.version >= 4 &&
			(this.twistAssist != undefined ||
				this.blockToBlock != undefined ||
				this.autoRelockTime != undefined ||
				this.holdAndReleaseTime != undefined)
		) {
			const flags =
				(this.twistAssist ? 0b1 : 0) | (this.blockToBlock ? 0b10 : 0);
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([
					// placeholder for auto relock time
					0,
					0,
					// placeholder for hold and release time
					0,
					0,
					flags,
				]),
			]);
			this.payload.writeUInt16BE((this.autoRelockTime ?? 0) & 0xffff, 4);
			this.payload.writeUInt16BE(
				(this.holdAndReleaseTime ?? 0) & 0xffff,
				6,
			);
		}
		return super.serialize();
	}
}

@CCCommand(DoorLockCommand.CapabilitiesReport)
export class DoorLockCCCapabilitiesReport extends DoorLockCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		// parse variable length operation type bit mask
		validatePayload(this.payload.length >= 1);
		const bitMaskLength = this.payload[0] & 0b11111;
		let offset = 1;
		validatePayload(this.payload.length >= offset + bitMaskLength + 1);
		this.supportedOperationTypes = parseBitMask(
			this.payload.slice(offset, offset + bitMaskLength),
		);
		offset += bitMaskLength;

		// parse variable length door lock mode list
		const listLength = this.payload[offset];
		offset += 1;
		validatePayload(this.payload.length >= offset + listLength + 3);
		this.supportedDoorLockModes = [
			...this.payload.slice(offset, offset + listLength),
		];
		offset += listLength;

		this.supportedOutsideHandles = [
			!!(this.payload[offset] & 0b0001_0000),
			!!(this.payload[offset] & 0b0010_0000),
			!!(this.payload[offset] & 0b0100_0000),
			!!(this.payload[offset] & 0b1000_0000),
		];
		this.supportedInsideHandles = [
			!!(this.payload[offset] & 0b0001),
			!!(this.payload[offset] & 0b0010),
			!!(this.payload[offset] & 0b0100),
			!!(this.payload[offset] & 0b1000),
		];

		this.doorSupported = !!(this.payload[offset + 1] & 0b1);
		this.boltSupported = !!(this.payload[offset + 1] & 0b10);
		this.latchSupported = !!(this.payload[offset + 1] & 0b100);

		this.blockToBlockSupported = !!(this.payload[offset + 2] & 0b1);
		this.twistAssistSupported = !!(this.payload[offset + 2] & 0b10);
		this.holdAndReleaseSupported = !!(this.payload[offset + 2] & 0b100);
		this.autoRelockSupported = !!(this.payload[offset + 2] & 0b1000);
	}

	@ccValue({ internal: true, minVersion: 4 })
	public readonly supportedOperationTypes: readonly DoorLockOperationType[];

	@ccValue({ internal: true, minVersion: 4 })
	public readonly supportedDoorLockModes: readonly DoorLockMode[];

	@ccValue({ internal: true, minVersion: 4 })
	public readonly supportedOutsideHandles: DoorHandleStatus;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly supportedInsideHandles: DoorHandleStatus;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly latchSupported: boolean;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly boltSupported: boolean;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly doorSupported: boolean;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly autoRelockSupported: boolean;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly holdAndReleaseSupported: boolean;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly twistAssistSupported: boolean;

	@ccValue({ internal: true, minVersion: 4 })
	public readonly blockToBlockSupported: boolean;
}

@CCCommand(DoorLockCommand.CapabilitiesGet)
@expectedCCResponse(DoorLockCCCapabilitiesReport)
export class DoorLockCCCapabilitiesGet extends DoorLockCC {}
