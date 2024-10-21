import {
	CommandClasses,
	EncapsulationFlags,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	type CCRaw,
	CommandClass,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { MultiCommandCommand } from "../lib/_Types";

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
		options: MultiCommandCCCommandEncapsulationOptions & CCCommandOptions,
	) {
		super(options);
		this.encapsulated = options.encapsulated;
		for (const cc of options.encapsulated) {
			cc.encapsulatingCC = this as any;
		}
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiCommandCCCommandEncapsulation {
		validatePayload(raw.payload.length >= 1);
		const numCommands = raw.payload[0];
		const encapsulated: CommandClass[] = [];
		let offset = 1;
		for (let i = 0; i < numCommands; i++) {
			validatePayload(raw.payload.length >= offset + 1);
			const cmdLength = raw.payload[offset];
			validatePayload(raw.payload.length >= offset + 1 + cmdLength);
			encapsulated.push(
				CommandClass.from({
					data: raw.payload.subarray(
						offset + 1,
						offset + 1 + cmdLength,
					),
					fromEncapsulation: true,
					// FIXME: 🐔 🥚
					encapCC: this,
					origin: options.origin,
					context: options.context,
				}),
			);
			offset += 1 + cmdLength;
		}

		return new MultiCommandCCCommandEncapsulation({
			nodeId: ctx.sourceNodeId,
			encapsulated,
		});
	}

	public encapsulated: CommandClass[];

	public serialize(ctx: CCEncodingContext): Buffer {
		const buffers: Buffer[] = [];
		buffers.push(Buffer.from([this.encapsulated.length]));
		for (const cmd of this.encapsulated) {
			const cmdBuffer = cmd.serialize(ctx);
			buffers.push(Buffer.from([cmdBuffer.length]));
			buffers.push(cmdBuffer);
		}
		this.payload = Buffer.concat(buffers);
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
