import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	PhysicalCCAPI,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	type CCRaw,
	CommandClass,
	type CommandClassDeserializationOptions,
	type InterviewContext,
	type RefreshValuesContext,
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
import { LockCommand } from "../lib/_Types";

export const LockCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Lock, {
		...V.staticProperty(
			"locked",
			{
				...ValueMetadata.Boolean,
				label: "Locked",
				description: "Whether the lock is locked",
			} as const,
		),
	}),
});

@API(CommandClasses.Lock)
export class LockCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: LockCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case LockCommand.Get:
			case LockCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	public async get(): Promise<MaybeNotKnown<boolean>> {
		this.assertSupportsCommand(LockCommand, LockCommand.Get);

		const cc = new LockCCGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<LockCCReport>(
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
	public async set(locked: boolean): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(LockCommand, LockCommand.Set);

		const cc = new LockCCSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			locked,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(this: LockCCAPI, { property }, value) {
			if (property !== "locked") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof value !== "boolean") {
				throwWrongValueType(
					this.ccId,
					property,
					"boolean",
					typeof value,
				);
			}
			const result = await this.set(value);

			// Verify the current value after a delay, unless the command was supervised and successful
			if (!supervisedCommandSucceeded(result)) {
				this.schedulePoll({ property }, value);
			}

			return result;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: LockCCAPI, { property }) {
			if (property === "locked") return this.get();
			throwUnsupportedProperty(this.ccId, property);
		};
	}
}

@commandClass(CommandClasses.Lock)
@implementedVersion(1)
@ccValues(LockCCValues)
export class LockCC extends CommandClass {
	declare ccCommand: LockCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

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
			CommandClasses.Lock,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			message: "requesting current lock state...",
			direction: "outbound",
		});
		const locked = await api.get();
		const logMessage = `the lock is ${locked ? "locked" : "unlocked"}`;
		ctx.logNode(node.id, {
			message: logMessage,
			direction: "inbound",
		});
	}
}

// @publicAPI
export interface LockCCSetOptions {
	locked: boolean;
}

@CCCommand(LockCommand.Set)
@useSupervision()
export class LockCCSet extends LockCC {
	public constructor(
		options: LockCCSetOptions & CCCommandOptions,
	) {
		super(options);
		this.locked = options.locked;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): LockCCSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new LockCCSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public locked: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.locked ? 1 : 0]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { locked: this.locked },
		};
	}
}

// @publicAPI
export interface LockCCReportOptions {
	locked: boolean;
}

@CCCommand(LockCommand.Report)
export class LockCCReport extends LockCC {
	public constructor(
		options: LockCCReportOptions & CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.locked = options.locked;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): LockCCReport {
		validatePayload(raw.payload.length >= 1);
		const locked = raw.payload[0] === 1;

		return new LockCCReport({
			nodeId: ctx.sourceNodeId,
			locked,
		});
	}

	@ccValue(LockCCValues.locked)
	public readonly locked: boolean;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { locked: this.locked },
		};
	}
}

@CCCommand(LockCommand.Get)
@expectedCCResponse(LockCCReport)
export class LockCCGet extends LockCC {}
