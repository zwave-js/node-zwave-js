import {
	CommandClasses,
	type MessageOrCCLogEntry,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown } from "@zwave-js/core/safe";
import type { ZWaveHost, ZWaveValueHost } from "@zwave-js/host";
import { getEnumMemberName } from "@zwave-js/shared";
import { CCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
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

		const cc = new InclusionControllerCCInitiate(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			includedNodeId: nodeId,
			step,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
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

		const cc = new InclusionControllerCCComplete(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			step,
			status,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}
}

// @publicAPI
export interface InclusionControllerCCCompleteOptions extends CCCommandOptions {
	step: InclusionControllerStep;
	status: InclusionControllerStatus;
}

@CCCommand(InclusionControllerCommand.Complete)
export class InclusionControllerCCComplete extends InclusionControllerCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| InclusionControllerCCCompleteOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.step = this.payload[0];
			validatePayload.withReason("Invalid inclusion controller step")(
				this.step in InclusionControllerStep,
			);
			this.status = this.payload[1];
		} else {
			this.step = options.step;
			this.status = options.status;
		}
	}

	public step: InclusionControllerStep;
	public status: InclusionControllerStatus;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.step, this.status]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
export interface InclusionControllerCCInitiateOptions extends CCCommandOptions {
	includedNodeId: number;
	step: InclusionControllerStep;
}

@CCCommand(InclusionControllerCommand.Initiate)
export class InclusionControllerCCInitiate extends InclusionControllerCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| InclusionControllerCCInitiateOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.includedNodeId = this.payload[0];
			this.step = this.payload[1];
			validatePayload.withReason("Invalid inclusion controller step")(
				this.step in InclusionControllerStep,
			);
		} else {
			this.includedNodeId = options.includedNodeId;
			this.step = options.step;
		}
	}

	public includedNodeId: number;
	public step: InclusionControllerStep;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.includedNodeId, this.step]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"included node id": this.includedNodeId,
				step: getEnumMemberName(InclusionControllerStep, this.step),
			},
		};
	}
}
