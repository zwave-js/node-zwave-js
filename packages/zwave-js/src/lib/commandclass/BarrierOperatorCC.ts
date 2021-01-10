import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "./CommandClass";
import { CommandClasses } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";

// All the supported commands
export enum BarrierOperatorCommand {
	Set = 0x01
	Get = 0x02
}

@commandClass(CommandClasses.BarrierOperator)
@implementedVersion(1)
export class BarrierOperatorCC extends CommandClass {
	declare ccCommand: BarrierOperatorCommand;
}

// To be reviewed as CC should only accept 0x00 or 0xFF, if more work needed
@CCCommand(BarrierOperatorCommand.Set)
export class BarrierOperatorCCSet extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | BarrierOperatorCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.targetValue = this.payload[0];
		} else {
			this.targetValue = options.targetValue;
		}
	}

	public targetValue: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.targetValue]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "target value": this.targetValue },
		};
	}
}

interface BarrierOperatorCCGetOptions extends CCCommandOptions {
	someProperty: number;
}

@CCCommand(BarrierOperatorCommand.Get)
@expectedCCResponse(BarrierOperatorCCReport)
export class BarrierOperatorCCGet extends BarrierOperatorCC {}

@CCCommand(BarrierOperatorCommand.Report)
export class BarrierOperatorCCReport extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._payload = this.payload[0];
		if (this._payload === 0x00) {
			this._closed
		} else if (this._payload >= 0x01 & this._payload <= 0x63) {
			this._stoppedPosition = this._payload
		} else if (this._payload === 0xfc) {
			this._closing
		} else if (this._payload === 0xfd) {
			this._stopped
		} else if (this._payload === 0xfe) {
			this._openning
		} else if (this._payload === 0xff) {
			this._open
		}

		this.persistValues();
	}
}
