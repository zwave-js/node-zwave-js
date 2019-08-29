import { IDriver } from "../driver/IDriver";
import { validatePayload } from "../util/misc";
import { CCAPI } from "./API";
import {
	API,
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

// @noSetValueAPI This CC has no set-type commands

@API(CommandClasses["Multi Command"])
export class MultiCommandCCAPI extends CCAPI {
	public async send(commands: CommandClass[]): Promise<void> {
		// FIXME: This should not be on the API but rather on the driver level
		const cc = new MultiCommandCCCommandEncapsulation(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			commands,
		});
		await this.driver.sendCommand(cc);
	}
}

export interface MultiCommandCC {
	ccCommand: MultiCommandCommand;
}

@commandClass(CommandClasses["Multi Command"])
@implementedVersion(1)
export class MultiCommandCC extends CommandClass {}

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
			validatePayload(this.payload.length >= 1);
			const numCommands = this.payload[0];
			this.commands = [];
			let offset = 1;
			for (let i = 0; i < numCommands; i++) {
				validatePayload(this.payload.length >= offset + 1);
				const cmdLength = this.payload[offset];
				validatePayload(this.payload.length >= offset + 1 + cmdLength);
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
