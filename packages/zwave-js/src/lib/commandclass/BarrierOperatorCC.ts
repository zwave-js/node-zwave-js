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


// All possible positions for Report
export enum BarrierReportState {
	Closed = 0x00,
	Closing = 0xFC,
	Stopped = 0xFD,
	Openning = 0xFE,
	Open = 0xFF

}

/**
 * @publicAPI
 */
export enum BarrierPosition {
	Closed = 0x00,
	Closing = 0xFC,
	Stopped = 0xFD
	Openning = 0xFE,
	Open = 0xFF,
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

/** Returns the State  */
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
		
		// return raw value if cannot decode
		this._barrierPosition = this.payload[0];
		this.persistValues();
	}

	private _barrierPosition: BarrierPosition | undefined;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Barrier Operator State",
		states: enumValuesToMetadataStates(BarrierPosition)
	})

	public get barrierPosition(): BarrierPosition | undefined {
		return this._barrierPosition;
	}
}
