import type { MessageOrCCLogEntry } from "@zwave-js/core";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	parseBitMask,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import {
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
// All the supported commands
export enum BarrierOperatorCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	CapabilitiesGet = 0x04,
	CapabilitiesReport = 0x05,
	EventSet = 0x06,
	EventGet = 0x07,
	EventReport = 0x08,
}

/**
 * @publicAPI
 */
export enum BarrierState {
	Closed = 0x00,
	Closing = 0xfc,
	Stopped = 0xfd,
	Opening = 0xfe,
	Open = 0xff,
}

// @publicAPI
export enum SignalType {
	Audible = 0x01,
	Visual = 0x02,
}

// @publicAPI
export enum SignalState {
	OFF = 0x00,
	ON = 0xff,
}

@commandClass(CommandClasses["Barrier Operator"])
@implementedVersion(1)
export class BarrierOperatorCC extends CommandClass {
	declare ccCommand: BarrierOperatorCommand;
}

interface BarrierOperatorCCSetOptions extends CCCommandOptions {
	state: BarrierState.Open | BarrierState.Closed;
}

@CCCommand(BarrierOperatorCommand.Set)
export class BarrierOperatorCCSet extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| BarrierOperatorCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.state = options.state;
		}
	}

	public state: BarrierState.Open | BarrierState.Closed;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.state]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "target state": this.state },
		};
	}
}

@CCCommand(BarrierOperatorCommand.Report)
export class BarrierOperatorCCReport extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);

		/* 
		  return values state and position value
		  if state is 0 - 99 or FF (100%) return the appropriate values.
		  if state is different just use the table and 
		  return undefined position
		*/
		const payloadValue = this.payload[0];
		this._state = payloadValue;
		this._position = undefined;
		if (payloadValue <= 99) {
			this._position = payloadValue;
			if (payloadValue > 0) {
				this._state = undefined;
			}
		} else if (payloadValue === 255) {
			this._position = 100;
			this._state = payloadValue;
		}

		this.persistValues();
	}

	private _state: BarrierState | undefined;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Barrier State",
		states: enumValuesToMetadataStates(BarrierState),
	})
	public get state(): BarrierState | undefined {
		return this._state;
	}

	private _position: number | undefined;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Barrier Position",
		unit: "%",
		max: 100,
	})
	public get position(): number | undefined {
		return this._position;
	}
}

@CCCommand(BarrierOperatorCommand.Get)
@expectedCCResponse(BarrierOperatorCCReport)
export class BarrierOperatorCCGet extends BarrierOperatorCC {}

@CCCommand(BarrierOperatorCommand.CapabilitiesReport)
export class BarrierOperatorCCCapabilitiesReport extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		const bitMaskLength = this.payload.length;
		validatePayload(this.payload.length >= bitMaskLength);
		this._supportedSignalTypes = parseBitMask(
			this.payload,
			SignalType.Audible,
		);

		this.persistValues();
	}

	private _supportedSignalTypes: SignalType[];
	@ccValue({ internal: true })
	public get supportedSignalTypes(): readonly SignalType[] {
		return this._supportedSignalTypes;
	}
}

@CCCommand(BarrierOperatorCommand.CapabilitiesGet)
@expectedCCResponse(BarrierOperatorCCCapabilitiesReport)
export class BarrierOperatorCCCapabilitiesGet extends BarrierOperatorCC {}

interface BarrierOperatorCCEventSetOptions extends CCCommandOptions {
	signalType: SignalType;
	signalState: SignalState;
}

@CCCommand(BarrierOperatorCommand.EventSet)
export class BarrierOperatorCCEventSet extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| BarrierOperatorCCEventSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.type = options.signalType;
			this.state = options.signalState;
		}
	}
	public type: SignalType;
	public state: SignalState;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			(this.payload[0] = this.type),
			(this.payload[1] = this.state),
		]);
		return super.serialize();
	}
}

@CCCommand(BarrierOperatorCommand.Report)
export class BarrierOperatorCCEventReport extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 2);
		this._type = this.payload[0];
		this._state = this.payload[1];

		this.persistValues();
	}

	private _type: SignalType | undefined;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Event Signal Type",
		states: enumValuesToMetadataStates(SignalType),
	})
	public get type(): SignalType | undefined {
		return this._type;
	}

	private _state: SignalState | undefined;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Event Signal State",
		states: enumValuesToMetadataStates(SignalState),
	})
	public get state(): SignalState | undefined {
		return this._state;
	}
}

interface BarrierOperatorCCEventGetOptions extends CCCommandOptions {
	signalType: SignalType;
}

@CCCommand(BarrierOperatorCommand.EventGet)
@expectedCCResponse(BarrierOperatorCCEventReport)
export class BarrierOperatorCCEventGet extends BarrierOperatorCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| BarrierOperatorCCEventGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.signalType = options.signalType;
		}
	}

	public signalType: SignalType;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			/* TODO: serialize */
		]);
		return super.serialize();
	}
}
