import {
	CommandClasses,
	Duration,
	EncapsulationFlags,
	type EndpointId,
	type GetEndpoint,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type NodeId,
	type SinglecastCC,
	type SupervisionResult,
	SupervisionStatus,
	type SupportsCC,
	TransmitOptions,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	isTransmissionError,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetNode,
	GetValueDB,
} from "@zwave-js/host/safe";
import { getEnumMemberName } from "@zwave-js/shared/safe";
import { PhysicalCCAPI } from "../lib/API";
import { type CCRaw, CommandClass } from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	shouldUseSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { SupervisionCommand } from "../lib/_Types";

export const SupervisionCCValues = Object.freeze({
	...V.defineDynamicCCValues(CommandClasses.Supervision, {
		// Used to remember whether a node supports supervision-encapsulation of the given CC
		...V.dynamicPropertyAndKeyWithName(
			"ccSupported",
			"ccSupported",
			(ccId: CommandClasses) => ccId,
			({ property, propertyKey }) =>
				property === "commandSupported"
				&& typeof propertyKey === "number",
			undefined,
			{ internal: true, supportsEndpoints: false },
		),
	}),
});

// @noSetValueAPI - This CC has no values to set
// @noInterview - This CC is only used for encapsulation

// Encapsulation CCs are used internally and too frequently that we
// want to pay the cost of validating each call
/* eslint-disable @zwave-js/ccapi-validate-args */

@API(CommandClasses.Supervision)
export class SupervisionCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: SupervisionCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case SupervisionCommand.Get:
			case SupervisionCommand.Report:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	public async sendReport(
		options: SupervisionCCReportOptions & {
			encapsulationFlags?: EncapsulationFlags;
			lowPriority?: boolean;
		},
	): Promise<void> {
		// Here we don't assert support - some devices only half-support Supervision, so we treat them
		// as if they don't support it. We still need to be able to respond to the Get command though.

		const {
			encapsulationFlags = EncapsulationFlags.None,
			lowPriority = false,
			...cmdOptions
		} = options;
		const cc = new SupervisionCCReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...cmdOptions,
		});

		// The report must be sent back with the same encapsulation order
		cc.encapsulationFlags = encapsulationFlags;

		try {
			await this.host.sendCommand(cc, {
				...this.commandOptions,
				// Supervision Reports must be prioritized over normal messages
				priority: lowPriority
					? MessagePriority.ImmediateLow
					: MessagePriority.Immediate,
				// But we don't want to wait for an ACK because this can lock up the network for seconds
				// if the target node is asleep or unreachable
				transmitOptions: TransmitOptions.DEFAULT_NOACK,
				// Only try sending the report once. If it fails, the node will ask again
				maxSendAttempts: 1,
			});
		} catch (e) {
			if (isTransmissionError(e)) {
				// Swallow errors related to transmission failures
				return;
			} else {
				// Pass other errors through
				throw e;
			}
		}
	}
}

@commandClass(CommandClasses.Supervision)
@implementedVersion(2)
export class SupervisionCC extends CommandClass {
	declare ccCommand: SupervisionCommand;
	// Force singlecast for the supervision CC
	declare nodeId: number;

	/** Tests if a command should be supervised and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		return (
			!!(cc.encapsulationFlags & EncapsulationFlags.Supervision)
			&& !(cc instanceof SupervisionCCGet)
			&& !(cc instanceof SupervisionCCReport)
		);
	}

	/** Encapsulates a command that targets a specific endpoint */
	public static encapsulate(
		cc: CommandClass,
		sessionId: number,
		requestStatusUpdates: boolean = true,
	): SupervisionCCGet {
		if (!cc.isSinglecast()) {
			throw new ZWaveError(
				`Supervision is only possible for singlecast commands!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const ret = new SupervisionCCGet({
			nodeId: cc.nodeId,
			// Supervision CC is wrapped inside MultiChannel CCs, so the endpoint must be copied
			endpointIndex: cc.endpointIndex,
			encapsulated: cc,
			sessionId,
			requestStatusUpdates,
		});

		// Copy the encapsulation flags from the encapsulated command
		// but omit Supervision, since we're doing that right now
		ret.encapsulationFlags = cc.encapsulationFlags
			& ~EncapsulationFlags.Supervision;

		return ret;
	}

	/**
	 * Given a CC instance, this returns the Supervision session ID which is used for this command.
	 * Returns `undefined` when there is no session ID or the command was sent as multicast.
	 */
	public static getSessionId(command: CommandClass): number | undefined {
		if (
			command.isEncapsulatedWith(
				CommandClasses.Supervision,
				SupervisionCommand.Get,
			)
		) {
			const supervisionEncapsulation = command.getEncapsulatingCC(
				CommandClasses.Supervision,
				SupervisionCommand.Get,
			) as SupervisionCCGet;
			if (
				supervisionEncapsulation.frameType !== "broadcast"
				&& supervisionEncapsulation.frameType !== "multicast"
			) {
				return supervisionEncapsulation.sessionId;
			}
		}
	}

	/**
	 * Returns whether a node supports the given CC with Supervision encapsulation.
	 */
	public static getCCSupportedWithSupervision(
		ctx: GetValueDB,
		endpoint: EndpointId,
		ccId: CommandClasses,
	): boolean {
		// By default assume supervision is supported for all CCs, unless we've remembered one not to be
		return (
			ctx
				.getValueDB(endpoint.nodeId)
				.getValue(
					SupervisionCCValues.ccSupported(ccId).endpoint(
						endpoint.index,
					),
				) ?? true
		);
	}

	/**
	 * Remembers whether a node supports the given CC with Supervision encapsulation.
	 */
	public static setCCSupportedWithSupervision(
		ctx: GetValueDB,
		endpoint: EndpointId,
		ccId: CommandClasses,
		supported: boolean,
	): void {
		ctx
			.getValueDB(endpoint.nodeId)
			.setValue(
				SupervisionCCValues.ccSupported(ccId).endpoint(endpoint.index),
				supported,
			);
	}

	/** Returns whether this is a valid command to send supervised */
	public static mayUseSupervision<T extends CommandClass>(
		ctx:
			& GetValueDB
			& GetNode<
				NodeId & SupportsCC & GetEndpoint<EndpointId>
			>,
		command: T,
	): command is SinglecastCC<T> {
		// Supervision may only be used for singlecast CCs that expect no response
		// The specs mention that Supervision CAN be used for S2 multicast, but conveniently fail to explain how to respond to that.
		if (!command.isSinglecast()) return false;
		if (command.expectsCCResponse()) return false;

		// with a valid node and endpoint
		const node = command.getNode(ctx);
		if (!node) return false;
		const endpoint = command.getEndpoint(ctx);
		if (!endpoint) return false;

		// and only if ...
		return (
			// ... the node supports it
			node.supportsCC(CommandClasses.Supervision)
			// ... the command is marked as "should use supervision"
			&& shouldUseSupervision(command)
			// ... and we haven't previously determined that the node doesn't properly support it
			&& SupervisionCC.getCCSupportedWithSupervision(
				ctx,
				endpoint,
				command.ccId,
			)
		);
	}
}

// @publicAPI
export type SupervisionCCReportOptions =
	& {
		moreUpdatesFollow: boolean;
		requestWakeUpOnDemand?: boolean;
		sessionId: number;
	}
	& (
		| {
			status: SupervisionStatus.Working;
			duration: Duration;
		}
		| {
			status:
				| SupervisionStatus.NoSupport
				| SupervisionStatus.Fail
				| SupervisionStatus.Success;
		}
	);

@CCCommand(SupervisionCommand.Report)
export class SupervisionCCReport extends SupervisionCC {
	public constructor(
		options: WithAddress<SupervisionCCReportOptions>,
	) {
		super(options);

		this.moreUpdatesFollow = options.moreUpdatesFollow;
		this.requestWakeUpOnDemand = !!options.requestWakeUpOnDemand;
		this.sessionId = options.sessionId;
		this.status = options.status;
		if (options.status === SupervisionStatus.Working) {
			this.duration = options.duration;
		} else {
			this.duration = new Duration(0, "seconds");
		}
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): SupervisionCCReport {
		validatePayload(raw.payload.length >= 3);
		const moreUpdatesFollow = !!(raw.payload[0] & 0b1_0_000000);
		const requestWakeUpOnDemand = !!(raw.payload[0] & 0b0_1_000000);
		const sessionId = raw.payload[0] & 0b111111;
		const status: SupervisionStatus = raw.payload[1];

		if (status === SupervisionStatus.Working) {
			const duration = Duration.parseReport(raw.payload[2])
				?? new Duration(0, "seconds");
			return new SupervisionCCReport({
				nodeId: ctx.sourceNodeId,
				moreUpdatesFollow,
				requestWakeUpOnDemand,
				sessionId,
				status,
				duration,
			});
		} else {
			return new SupervisionCCReport({
				nodeId: ctx.sourceNodeId,
				moreUpdatesFollow,
				requestWakeUpOnDemand,
				sessionId,
				status,
			});
		}
	}

	public readonly moreUpdatesFollow: boolean;
	public readonly requestWakeUpOnDemand: boolean;
	public readonly sessionId: number;
	public readonly status: SupervisionStatus;
	public readonly duration: Duration | undefined;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([
				(this.moreUpdatesFollow ? 0b1_0_000000 : 0)
				| (this.requestWakeUpOnDemand ? 0b0_1_000000 : 0)
				| (this.sessionId & 0b111111),
				this.status,
			]),
		]);

		if (this.duration) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([this.duration.serializeReport()]),
			]);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"session id": this.sessionId,
			"more updates follow": this.moreUpdatesFollow,
			status: getEnumMemberName(SupervisionStatus, this.status),
		};
		if (this.duration) {
			message.duration = this.duration.toString();
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}

	public toSupervisionResult(): SupervisionResult {
		if (this.status === SupervisionStatus.Working) {
			return {
				status: this.status,
				remainingDuration: this.duration!,
			};
		} else {
			return {
				status: this.status,
			};
		}
	}
}

// @publicAPI
export interface SupervisionCCGetOptions {
	requestStatusUpdates: boolean;
	encapsulated: CommandClass;
	sessionId: number;
}

function testResponseForSupervisionCCGet(
	sent: SupervisionCCGet,
	received: SupervisionCCReport,
) {
	return received.sessionId === sent.sessionId;
}

@CCCommand(SupervisionCommand.Get)
@expectedCCResponse(SupervisionCCReport, testResponseForSupervisionCCGet)
export class SupervisionCCGet extends SupervisionCC {
	public constructor(
		options: WithAddress<SupervisionCCGetOptions>,
	) {
		super(options);
		this.sessionId = options.sessionId;
		this.requestStatusUpdates = options.requestStatusUpdates;
		this.encapsulated = options.encapsulated;
		this.encapsulated.encapsulatingCC = this as any;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): SupervisionCCGet {
		validatePayload(raw.payload.length >= 3);
		const requestStatusUpdates = !!(raw.payload[0] & 0b1_0_000000);
		const sessionId = raw.payload[0] & 0b111111;

		const encapsulated = CommandClass.parse(raw.payload.subarray(2), ctx);
		return new SupervisionCCGet({
			nodeId: ctx.sourceNodeId,
			requestStatusUpdates,
			sessionId,
			encapsulated,
		});
	}

	public requestStatusUpdates: boolean;
	public sessionId: number;
	public encapsulated: CommandClass;

	public serialize(ctx: CCEncodingContext): Buffer {
		const encapCC = this.encapsulated.serialize(ctx);
		this.payload = Buffer.concat([
			Buffer.from([
				(this.requestStatusUpdates ? 0b10_000000 : 0)
				| (this.sessionId & 0b111111),
				encapCC.length,
			]),
			encapCC,
		]);
		return super.serialize(ctx);
	}

	protected computeEncapsulationOverhead(): number {
		// Supervision CC adds two bytes (control byte + cc length)
		return super.computeEncapsulationOverhead() + 2;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"session id": this.sessionId,
				"request updates": this.requestStatusUpdates,
			},
		};
	}
}
