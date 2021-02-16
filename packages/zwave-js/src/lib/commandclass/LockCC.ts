import type { Maybe, MessageOrCCLogEntry, ValueID } from "@zwave-js/core";
import {
	CommandClasses,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	PhysicalCCAPI,
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
export enum LockCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

export function getLockedValueId(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Lock,
		endpoint,
		property: "locked",
	};
}

@API(CommandClasses.Lock)
export class LockCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: LockCommand): Maybe<boolean> {
		switch (cmd) {
			case LockCommand.Get:
			case LockCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	public async get(): Promise<boolean | undefined> {
		this.assertSupportsCommand(LockCommand, LockCommand.Get);

		const cc = new LockCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<LockCCReport>(
			cc,
			this.commandOptions,
		);
		return response?.locked;
	}

	/**
	 * Locks or unlocks the lock
	 * @param locked Whether the lock should be locked
	 */
	public async set(locked: boolean): Promise<void> {
		this.assertSupportsCommand(LockCommand, LockCommand.Set);

		const cc = new LockCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			locked,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "locked") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "boolean") {
			throwWrongValueType(this.ccId, property, "boolean", typeof value);
		}
		await this.set(value);

		// Verify the current value after a delay
		this.schedulePoll({ property });
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		if (property === "locked") return this.get();
		throwUnsupportedProperty(this.ccId, property);
	};
}

@commandClass(CommandClasses.Lock)
@implementedVersion(1)
export class LockCC extends CommandClass {
	declare ccCommand: LockCommand;

	public async interview(): Promise<void> {
		const node = this.getNode()!;

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Lock.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			message: "requesting current lock state...",
			direction: "outbound",
		});
		const locked = await api.get();
		const logMessage = `the lock is ${locked ? "locked" : "unlocked"}`;
		this.driver.controllerLog.logNode(node.id, {
			message: logMessage,
			direction: "inbound",
		});
	}
}

interface LockCCSetOptions extends CCCommandOptions {
	locked: boolean;
}

@CCCommand(LockCommand.Set)
export class LockCCSet extends LockCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | LockCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.locked = options.locked;
		}
	}

	public locked: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.locked ? 1 : 0]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { locked: this.locked },
		};
	}
}

@CCCommand(LockCommand.Report)
export class LockCCReport extends LockCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.locked = this.payload[0] === 1;
		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Boolean,
		label: "Locked",
		description: "Whether the lock is locked",
	})
	public readonly locked: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { locked: this.locked },
		};
	}
}

@CCCommand(LockCommand.Get)
@expectedCCResponse(LockCCReport)
export class LockCCGet extends LockCC {}
