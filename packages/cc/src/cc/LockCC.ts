import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import {
	CommandClasses,
	MessagePriority,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PhysicalCCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	ccValue,
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { LockCommand } from "../lib/_Types";

export const LockCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Lock, {
		...V.staticProperty("locked", {
			...ValueMetadata.Boolean,
			label: "Locked",
			description: "Whether the lock is locked",
		} as const),
	}),
});

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

		const cc = new LockCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<LockCCReport>(
			cc,
			this.commandOptions,
		);
		return response?.locked;
	}

	/**
	 * Locks or unlocks the lock
	 * @param locked Whether the lock should be locked
	 */
	@validateArgs()
	public async set(locked: boolean): Promise<void> {
		this.assertSupportsCommand(LockCommand, LockCommand.Set);

		const cc = new LockCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			locked,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
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
		this.schedulePoll({ property }, value);
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

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Lock,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			message: "requesting current lock state...",
			direction: "outbound",
		});
		const locked = await api.get();
		const logMessage = `the lock is ${locked ? "locked" : "unlocked"}`;
		applHost.controllerLog.logNode(node.id, {
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | LockCCSetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { locked: this.locked },
		};
	}
}

@CCCommand(LockCommand.Report)
export class LockCCReport extends LockCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		this.locked = this.payload[0] === 1;
	}

	@ccValue()
	public readonly locked: boolean;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { locked: this.locked },
		};
	}
}

@CCCommand(LockCommand.Get)
@expectedCCResponse(LockCCReport)
export class LockCCGet extends LockCC {}
