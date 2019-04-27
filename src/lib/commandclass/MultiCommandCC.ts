import { IDriver } from "../driver/IDriver";
import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum MultiCommandCommand {
	CommandEncapsulation = 0x01,
}

// TODO: Handle this command when received

@commandClass(CommandClasses["Multi Command"])
@implementedVersion(1)
export class MultiCommandCC extends CommandClass {
	public ccCommand!: MultiCommandCommand;
}

interface MultiCommandCCCommandEncapsulationOptions extends CCCommandOptions {
	commands: CommandClass[];
}

@CCCommand(MultiCommandCommand.CommandEncapsulation)
// TODO: This probably expects multiple commands in return
export class MultiCommandCCCommandEncapsulation extends MultiCommandCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultiCommandCCCommandEncapsulationOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			const numCommands = this.payload[0];
			this.commands = [];
			let offset = 0;
			for (let i = 0; i < numCommands; i++) {
				const cmdLength = this.payload[offset];
				this.commands.push(
					CommandClass.fromEncapsulated(
						this.driver,
						this,
						this.payload.slice(offset + 1, offset + 1 + cmdLength),
					),
				);
				offset += 1 + cmdLength;
			}
		} else {
			this.commands = options.commands;
		}
	}

	public commands: CommandClass[];

	public serialize(): Buffer {
		const buffers: Buffer[] = [];
		buffers.push(Buffer.from([this.commands.length]));
		for (const cmd of this.commands) {
			const cmdBuffer = cmd.serializeForEncapsulation();
			buffers.push(Buffer.from([cmdBuffer.length]));
			buffers.push(cmdBuffer);
		}
		this.payload = Buffer.concat(buffers);
		return super.serialize();
	}
}
