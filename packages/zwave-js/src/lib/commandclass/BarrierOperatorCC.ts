import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	CommandClassDeserializationOptions,
	gotDeserializationOptions,
	ccValue,
} from "./CommandClass";
import { CommandClasses, parseBitMask, validatePayload } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { expectedResponse } from "../message/Message";

// All the supported commands
export enum BarrierOperatorCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	CapabilitiesGet = 0x04,
	CapabilitiesReport = 0x05,
	EventSignalSet = 0x06,
	EventSignalGet = 0x07,
	EventSignalReport = 0x08,
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

// @publicAPI
export enum SignalType {
	"Not Supported" = 0x00,
	Audible = 0x01,
	Visual = 0x02,
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

@CCCommand(BarrierOperatorCommand.CapabilitiesGet)
@expectedResponse(BarrierOperatorCCCapabilitiesReport)
export class BarrierOperatorCCCapabilitiesGet extends BarrierOperatorCC {}

@CCCommand(BarrierOperatorCommand.CapabilitiesReport)
export class BarrierOperatorCCCapabilitiesReport extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		
		validatePayload(this.payload.length >=1);
		const bitMaskLength = this.payload.length;
		validatePayload(this.payload.length >= bitMaskLength);
		this._supportedSignalTypes = parseBitMask(
			this.payload.slice(0, bitMaskLength),
			SignalType['Not Supported'],
		);

		this this.persistValues();
	}

	private _supportedSignalTypes: SignalType[];
	@@ccValue({ internal: true})
	public get supportedSignalTypes(): readonly SignalType[] {
		return this._supportedSignalTypes;
	}
