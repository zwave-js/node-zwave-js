import { IDriver } from "../driver/IDriver";
import { validatePayload } from "../util/misc";
import { Maybe } from "../values/Primitive";
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

	public async send(commands: CommandClass[]): Promise<void> {
		this.assertSupportsCommand(
			MultiCommandCommand,
			MultiCommandCommand.CommandEncapsulation,
		);

		// FIXME: This should not be on the API but rather on the driver level
		const cc = new MultiCommandCCCommandEncapsulation(this.driver, {
			nodeId: this.endpoint.nodeId,
			encapsulated: commands,
		});
		cc.endpointIndex = this.endpoint.index;
		await this.driver.sendCommand(cc);
	}
}

export interface MultiCommandCC {
	ccCommand: MultiCommandCommand;
}

@commandClass(CommandClasses["Multi Command"])
@implementedVersion(1)
export class MultiCommandCC extends CommandClass {
	/** Tests if a command targets a specific endpoint and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		return (
			cc.endpointIndex !== 0 &&
			!(cc instanceof MultiCommandCCCommandEncapsulation)
		);
	}

	/** Encapsulates a command that targets a specific endpoint */
	public static encapsulate(
		driver: IDriver,
		CCs: CommandClass[],
	): MultiCommandCCCommandEncapsulation {
		return new MultiCommandCCCommandEncapsulation(driver, {
			nodeId: CCs[0].nodeId,
			encapsulated: CCs,
		});
	}

	/** Unwraps a multi Command encapsulated command */
	public static unwrap(
		cc: MultiCommandCCCommandEncapsulation,
	): CommandClass[] {
		return cc.encapsulated;
	}
}

interface MultiCommandCCCommandEncapsulationOptions extends CCCommandOptions {
	encapsulated: CommandClass[];
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
			this.encapsulated = [];
			let offset = 1;
			for (let i = 0; i < numCommands; i++) {
				validatePayload(this.payload.length >= offset + 1);
				const cmdLength = this.payload[offset];
				validatePayload(this.payload.length >= offset + 1 + cmdLength);
				this.encapsulated.push(
					CommandClass.fromEncapsulated(
						this.driver,
						this,
						this.payload.slice(offset + 1, offset + 1 + cmdLength),
					),
				);
				offset += 1 + cmdLength;
			}
		} else {
			this.encapsulated = options.encapsulated;
		}
	}

	public encapsulated: CommandClass[];

	public serialize(): Buffer {
		const buffers: Buffer[] = [];
		buffers.push(Buffer.from([this.encapsulated.length]));
		for (const cmd of this.encapsulated) {
			const cmdBuffer = cmd.serializeForEncapsulation();
			buffers.push(Buffer.from([cmdBuffer.length]));
			buffers.push(cmdBuffer);
		}
		this.payload = Buffer.concat(buffers);
		return super.serialize();
	}
}
