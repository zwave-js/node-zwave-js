import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import {
	CommandClass,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum MultiCommandCommand {
	CommandEncapsulation = 0x01,
}

// TODO: Handle this command when received

@commandClass(CommandClasses["Multi Command"])
@implementedVersion(1)
@expectedCCResponse(CommandClasses["Multi Command"])
export class MultiCommandCC extends CommandClass {
	// tslint:disable:unified-signatures
	public constructor(driver: IDriver, nodeId?: number);

	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: MultiCommandCommand.CommandEncapsulation,
		commands: CommandClass[],
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: MultiCommandCommand,
		public commands?: CommandClass[],
	) {
		super(driver, nodeId, ccCommand);
	}
	// tslint:enable:unified-signatures

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case MultiCommandCommand.CommandEncapsulation: {
				const buffers: Buffer[] = [];
				buffers.push(Buffer.from([this.commands.length]));
				for (const cmd of this.commands) {
					const cmdBuffer = cmd.serializeForEncapsulation();
					buffers.push(Buffer.from([cmdBuffer.length]));
					buffers.push(cmdBuffer);
				}
				this.payload = Buffer.concat(buffers);
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot serialize a MultiCommand CC with a command other than CommandEncapsulation",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case MultiCommandCommand.CommandEncapsulation: {
				const numCommands = this.payload[0];
				this.commands = [];
				let offset = 0;
				for (let i = 0; i < numCommands; i++) {
					const cmdLength = this.payload[offset];
					this.commands.push(
						CommandClass.fromEncapsulated(
							this.driver,
							this,
							this.payload.slice(
								offset + 1,
								offset + 1 + cmdLength,
							),
						),
					);
					offset += 1 + cmdLength;
				}
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a MultiCommand CC with a command other than CommandEncapsulation",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}
}
