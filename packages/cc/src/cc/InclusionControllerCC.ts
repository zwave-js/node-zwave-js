import {
	CommandClasses,
	type MessageOrCCLogEntry,
	type WithAddress,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown } from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host";
import { getEnumMemberName } from "@zwave-js/shared";
import { CCAPI } from "../lib/API";
import { type CCRaw, CommandClass } from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import {
	InclusionControllerCommand,
	InclusionControllerStatus,
	InclusionControllerStep,
} from "../lib/_Types";

// This CC should not be used directly from user code
/* eslint-disable @zwave-js/ccapi-validate-args */

@commandClass(CommandClasses["Inclusion Controller"])
@implementedVersion(1)
export class InclusionControllerCC extends CommandClass {
	declare ccCommand: InclusionControllerCommand;
}

@API(CommandClasses["Inclusion Controller"])
export class InclusionControllerCCAPI extends CCAPI {
	public supportsCommand(
		cmd: InclusionControllerCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case InclusionControllerCommand.Initiate:
			case InclusionControllerCommand.Complete:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	/** Instruct the target to initiate the given inclusion step for the given node */
	public async initiateStep(
		nodeId: number,
		step: InclusionControllerStep,
	): Promise<void> {
		this.assertSupportsCommand(
			InclusionControllerCommand,
			InclusionControllerCommand.Initiate,
		);

		const cc = new InclusionControllerCCInitiate({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			includedNodeId: nodeId,
			step,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	/** Indicate to the other node that the given inclusion step has been completed */
	public async completeStep(
		step: InclusionControllerStep,
		status: InclusionControllerStatus,
	): Promise<void> {
		this.assertSupportsCommand(
			InclusionControllerCommand,
			InclusionControllerCommand.Complete,
		);

		const cc = new InclusionControllerCCComplete({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			step,
			status,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}
}

// @publicAPI
export interface InclusionControllerCCCompleteOptions {
	step: InclusionControllerStep;
	status: InclusionControllerStatus;
}

@CCCommand(InclusionControllerCommand.Complete)
export class InclusionControllerCCComplete extends InclusionControllerCC {
	public constructor(
		options: WithAddress<InclusionControllerCCCompleteOptions>,
	) {
		super(options);
		this.step = options.step;
		this.status = options.status;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): InclusionControllerCCComplete {
		validatePayload(raw.payload.length >= 2);
		const step: InclusionControllerStep = raw.payload[0];

		validatePayload.withReason("Invalid inclusion controller step")(
			step in InclusionControllerStep,
		);
		const status: InclusionControllerStatus = raw.payload[1];

		return new InclusionControllerCCComplete({
			nodeId: ctx.sourceNodeId,
			step,
			status,
		});
	}

	public step: InclusionControllerStep;
	public status: InclusionControllerStatus;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.step, this.status]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				step: getEnumMemberName(InclusionControllerStep, this.step),
				status: getEnumMemberName(
					InclusionControllerStatus,
					this.status,
				),
			},
		};
	}
}

// @publicAPI
export interface InclusionControllerCCInitiateOptions {
	includedNodeId: number;
	step: InclusionControllerStep;
}

@CCCommand(InclusionControllerCommand.Initiate)
export class InclusionControllerCCInitiate extends InclusionControllerCC {
	public constructor(
		options: WithAddress<InclusionControllerCCInitiateOptions>,
	) {
		super(options);
		this.includedNodeId = options.includedNodeId;
		this.step = options.step;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): InclusionControllerCCInitiate {
		validatePayload(raw.payload.length >= 2);
		const includedNodeId = raw.payload[0];
		const step: InclusionControllerStep = raw.payload[1];

		validatePayload.withReason("Invalid inclusion controller step")(
			step in InclusionControllerStep,
		);

		return new InclusionControllerCCInitiate({
			nodeId: ctx.sourceNodeId,
			includedNodeId,
			step,
		});
	}

	public includedNodeId: number;
	public step: InclusionControllerStep;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.includedNodeId, this.step]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"included node id": this.includedNodeId,
				step: getEnumMemberName(InclusionControllerStep, this.step),
			},
		};
	}
}
