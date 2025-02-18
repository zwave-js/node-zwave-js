import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import {
	CommandClasses,
	EncapsulationFlags,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	type WithAddress,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI } from "../lib/API.js";
import { type CCRaw, CommandClass } from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	commandClass,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";
import { MultiCommandCommand } from "../lib/_Types.js";

// TODO: Handle this command when received

// @noSetValueAPI This CC has no set-type commands
// @noInterview This CC only has a single encapsulation command

@API(CommandClasses["Multi Command"])
export class MultiCommandCCAPI extends CCAPI {
	public supportsCommand(_cmd: MultiCommandCommand): MaybeNotKnown<boolean> {
		// switch (cmd) {
		// 	case MultiCommandCommand.CommandEncapsulation:
		return true; // This is mandatory
		// }
		// return super.supportsCommand(cmd);
	}

	@validateArgs()
	public async send(commands: CommandClass[]): Promise<void> {
		this.assertSupportsCommand(
			MultiCommandCommand,
			MultiCommandCommand.CommandEncapsulation,
		);

		// FIXME: This should not be on the API but rather on the applHost level
		const cc = new MultiCommandCCCommandEncapsulation({
			nodeId: this.endpoint.nodeId,
			encapsulated: commands,
		});
		cc.endpointIndex = this.endpoint.index;
		await this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Multi Command"])
@implementedVersion(1)
export class MultiCommandCC extends CommandClass {
	declare ccCommand: MultiCommandCommand;

	/** Tests if a command targets a specific endpoint and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		return (
			cc.endpointIndex !== 0
			&& !(cc instanceof MultiCommandCCCommandEncapsulation)
		);
	}

	public static encapsulate(
		CCs: CommandClass[],
	): MultiCommandCCCommandEncapsulation {
		const ret = new MultiCommandCCCommandEncapsulation({
			nodeId: CCs[0].nodeId,
			encapsulated: CCs,
		});

		// Copy the "sum" of the encapsulation flags from the encapsulated CCs
		for (
			const flag of [
				EncapsulationFlags.Supervision,
				EncapsulationFlags.Security,
				EncapsulationFlags.CRC16,
			] as const
		) {
			ret.toggleEncapsulationFlag(
				flag,
				CCs.some((cc) => cc.encapsulationFlags & flag),
			);
		}

		return ret;
	}
}

// @publicAPI
export interface MultiCommandCCCommandEncapsulationOptions {
	encapsulated: CommandClass[];
}

@CCCommand(MultiCommandCommand.CommandEncapsulation)
// When sending commands encapsulated in this CC, responses to GET-type commands likely won't be encapsulated
export class MultiCommandCCCommandEncapsulation extends MultiCommandCC {
	public constructor(
		options: WithAddress<MultiCommandCCCommandEncapsulationOptions>,
	) {
		super(options);
		this.encapsulated = options.encapsulated;
		for (const cc of options.encapsulated) {
			cc.encapsulatingCC = this as any;
			// Multi Command CC is inside Multi Channel CC, so the endpoint must be copied
			cc.endpointIndex = this.endpointIndex;
		}
	}

	public static async from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): Promise<MultiCommandCCCommandEncapsulation> {
		validatePayload(raw.payload.length >= 1);
		const numCommands = raw.payload[0];
		const encapsulated: CommandClass[] = [];
		let offset = 1;
		for (let i = 0; i < numCommands; i++) {
			validatePayload(raw.payload.length >= offset + 1);
			const cmdLength = raw.payload[offset];
			validatePayload(raw.payload.length >= offset + 1 + cmdLength);
			encapsulated.push(
				await CommandClass.parse(
					raw.payload.subarray(
						offset + 1,
						offset + 1 + cmdLength,
					),
					ctx,
				),
			);
			offset += 1 + cmdLength;
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			encapsulated,
		});
	}

	public encapsulated: CommandClass[];

	public async serialize(ctx: CCEncodingContext): Promise<Bytes> {
		const buffers: Bytes[] = [];
		buffers.push(Bytes.from([this.encapsulated.length]));
		for (const cmd of this.encapsulated) {
			const cmdBuffer = await cmd.serialize(ctx);
			buffers.push(Bytes.from([cmdBuffer.length]));
			buffers.push(cmdBuffer);
		}
		this.payload = Bytes.concat(buffers);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			// Hide the default payload line
			message: undefined,
		};
	}
}
