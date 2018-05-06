import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

export enum MultilevelSwitchCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	StartLevelChange = 0x04,
	StopLevelChange = 0x05,
	SupportedGet = 0x06,
	SupportedReport = 0x07,
}

@commandClass(CommandClasses["Multilevel Switch"])
@implementedVersion(1)
@expectedCCResponse(CommandClasses["Multilevel Switch"])
export class MultilevelSwitchCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(nodeId?: number);
	constructor(nodeId: number, ccCommand: MultilevelSwitchCommand.Get);
	constructor(
		nodeId: number,
		ccCommand: MultilevelSwitchCommand.Set,
		value: number,
	);
	constructor(
		nodeId: number,
		ccCommand: MultilevelSwitchCommand.StartLevelChange,
		direction: LevelChangeDirection,
		ignoreStartLevel: boolean,
		startLevel: number,
	);
	constructor(nodeId: number, ccCommand: MultilevelSwitchCommand.StopLevelChange);

	constructor(
		public nodeId: number,
		public ccCommand?: MultilevelSwitchCommand,
		...args: any[],
	) {
		super(nodeId);
	}
	// tslint:enable:unified-signatures

	public serialize(): Buffer {
		switch (this.ccCommand) {
			// case MultilevelSwitchCommand.TODO:
			// 	// serialize payload
			// 	break;
			default:
				throw new ZWaveError(
					"Cannot serialize a MultilevelSwitch CC with a command other than __TODO__",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.ccCommand = this.payload[0];
		switch (this.ccCommand) {
			// case MultilevelSwitchCommand.TODO:
			// 	// parse payload
			// 	break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a MultilevelSwitch CC with a command other than TODO",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}

export type LevelChangeDirection = "up" | "down";
