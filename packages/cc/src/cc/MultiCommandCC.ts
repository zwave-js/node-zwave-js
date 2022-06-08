import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import { CommandClasses, validatePayload } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI } from "../lib/API";
import {
	API,
	CCCommand,
	CommandClass,
	commandClass,
	gotDeserializationOptions,
	implementedVersion,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import { MultiCommandCommand } from "../lib/_Types";

// TODO: Handle this command when received

// @noSetValueAPI This CC has no set-type commands
// @noInterview This CC only has a single encapsulation command

@API(CommandClasses["Multi Command"])
export class MultiCommandCCAPI extends CCAPI {
	public supportsCommand(_cmd: MultiCommandCommand): Maybe<boolean> {
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
		const cc = new MultiCommandCCCommandEncapsulation(this.applHost, {
			nodeId: this.endpoint.nodeId,
			encapsulated: commands,
		});
		cc.endpointIndex = this.endpoint.index;
		await this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Multi Command"])
@implementedVersion(1)
export class MultiCommandCC extends CommandClass {
	declare ccCommand: MultiCommandCommand;

	/** Tests if a command targets a specific endpoint and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		return (
			cc.endpointIndex !== 0 &&
			!(cc instanceof MultiCommandCCCommandEncapsulation)
		);
	}

	/** Encapsulates a command that targets a specific endpoint */
	public static encapsulate(
		host: ZWaveHost,
		CCs: CommandClass[],
	): MultiCommandCCCommandEncapsulation {
		return new MultiCommandCCCommandEncapsulation(host, {
			nodeId: CCs[0].nodeId,
			encapsulated: CCs,
			// MultiCommand CC is wrapped inside Supervision CC, so the supervision status must be preserved
			supervised: CCs.some((cc) => cc.supervised),
		});
	}
}

interface MultiCommandCCCommandEncapsulationOptions extends CCCommandOptions {
	encapsulated: CommandClass[];
}

@CCCommand(MultiCommandCommand.CommandEncapsulation)
// TODO: This probably expects multiple commands in return
export class MultiCommandCCCommandEncapsulation extends MultiCommandCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiCommandCCCommandEncapsulationOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const numCommands = this.payload[0];
			this.encapsulated = [];
			let offset = 1;
			for (let i = 0; i < numCommands; i++) {
				validatePayload(this.payload.length >= offset + 1);
				const cmdLength = this.payload[offset];
				validatePayload(this.payload.length >= offset + 1 + cmdLength);
				this.encapsulated.push(
					CommandClass.from(this.host, {
						data: this.payload.slice(
							offset + 1,
							offset + 1 + cmdLength,
						),
						fromEncapsulation: true,
						encapCC: this,
						origin: options.origin,
					}),
				);
				offset += 1 + cmdLength;
			}
		} else {
			this.encapsulated = options.encapsulated;
			for (const cc of options.encapsulated) {
				cc.encapsulatingCC = this as any;
			}
		}
	}

	public encapsulated: CommandClass[];

	public serialize(): Buffer {
		const buffers: Buffer[] = [];
		buffers.push(Buffer.from([this.encapsulated.length]));
		for (const cmd of this.encapsulated) {
			const cmdBuffer = cmd.serialize();
			buffers.push(Buffer.from([cmdBuffer.length]));
			buffers.push(cmdBuffer);
		}
		this.payload = Buffer.concat(buffers);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			// Hide the default payload line
			message: undefined,
		};
	}
}
