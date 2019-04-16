import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { num2hex } from "../util/strings";
import { Duration } from "../values/Duration";
import { Maybe, parseMaybeNumber, parseNumber } from "../values/Primitive";
import {
	CCCommand,
	ccValue,
	CommandClass,
	commandClass,
	expectedCCResponse,
	getCCCommandConstructor,
	getCCCommandStatic,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum BasicCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@commandClass(CommandClasses.Basic)
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
@expectedCCResponse(CommandClasses.Basic)
export class BasicCC extends CommandClass {
	public constructor(driver: IDriver, data: Buffer);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: BasicCommand,
	);
	// public constructor(
	// 	driver: IDriver,
	// 	nodeId: number,
	// 	ccCommand: BasicCommand.Get,
	// );
	// public constructor(
	// 	driver: IDriver,
	// 	nodeId: number,
	// 	ccCommand: BasicCommand.Set,
	// 	targetValue: number,
	// );

	public constructor(
		driver: IDriver,
		nodeIdOrData: number | Buffer,
		ccCommand?: BasicCommand,
	) {
		if (Buffer.isBuffer(nodeIdOrData)) {
			// Try to find the subclass which implements the serialization
			const ccCommand = CommandClass.getCCCommand(nodeIdOrData);
			if (ccCommand != undefined) {
				const commandConstructor = getCCCommandConstructor(
					BasicCC,
					ccCommand,
				);
				if (
					commandConstructor &&
					(new.target as any) !== commandConstructor
				)
					return new commandConstructor(driver, nodeIdOrData);
			}

			super(driver, nodeIdOrData);
			// Nothing special to deserialize
		}
		if (Buffer.isBuffer(nodeIdOrData))
			ccCommand = CommandClass.getCCCommand(nodeIdOrData);
		switch (ccCommand) {
			case BasicCommand.Get:
				if ((new.target as any) !== BasicCCGet) return new BasicCCGet();
		}
		if (typeof nodeIdOrData === "number") {
			if (
				ccCommand === BasicCommand.Get &&
				(new.target as any) !== BasicCCGet
			)
				return new BasicCCGet(driver, nodeIdOrData);
			super(driver, nodeIdOrData, ccCommand);
		} else {
			const ccCommand = CommandClass.getCCCommand(nodeIdOrData);
			if (
				ccCommand === BasicCommand.Get &&
				(new.target as any) !== BasicCCGet
			)
				return new BasicCCGet(driver, nodeIdOrData);
			super(driver, nodeIdOrData);
			// Nothing special to deserialize
		}

		super(driver, nodeId, ccCommand);
		if (targetValue != undefined) this.targetValue = targetValue;
	}

	public nodeId: number;
	public ccCommand: BasicCommand;

	@ccValue() public currentValue: Maybe<number> | undefined;
	@ccValue() public targetValue: number | undefined;
	@ccValue() public duration: Duration | undefined;

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case BasicCommand.Get:
				// no real payload
				break;
			case BasicCommand.Set:
				this.payload = Buffer.from([this.targetValue]);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a Basic CC with a command other than Get or Set",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case BasicCommand.Report:
				this.currentValue = parseMaybeNumber(this.payload[0]);
				// starting in V2:
				this.targetValue = parseNumber(this.payload[1]);
				this.duration = Duration.parseReport(this.payload[2]);
				break;

			default: {
				throw new ZWaveError(
					`Cannot deserialize a Basic CC with a command other than Report. Received ${
						BasicCommand[this.ccCommand]
					} (${num2hex(this.ccCommand)})`,
					ZWaveErrorCodes.CC_Invalid,
				);
			}
		}
	}
}

@CCCommand(BasicCommand.Get)
export class BasicCCGet extends BasicCC {
	public constructor(driver: IDriver, data: Buffer);
	public constructor(driver: IDriver, nodeId: number);

	public constructor(driver: IDriver, nodeIdOrData: number | Buffer) {
		if (typeof nodeIdOrData === "number") {
			super(driver, nodeIdOrData, getCCCommandStatic(new.target)!);
		} else {
			super(driver, nodeIdOrData);
			// Nothing special to deserialize
		}
	}
}

@CCCommand(BasicCommand.Set)
export class BasicCCSet extends BasicCC {
	public constructor(driver: IDriver, data: Buffer);
	public constructor(driver: IDriver, nodeId: number, targetValue: number);

	public constructor(
		driver: IDriver,
		nodeIdOrData: number | Buffer,
		targetValue?: number,
	) {
		if (typeof nodeIdOrData === "number") {
			super(driver, nodeIdOrData, getCCCommandStatic(new.target)!);
			this.targetValue = targetValue!;
		} else {
			super(driver, nodeIdOrData);
			this.targetValue = this.payload[0];
		}
	}

	public targetValue: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.targetValue]);
		return super.serialize();
	}
}
