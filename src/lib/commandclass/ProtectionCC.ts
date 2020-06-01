import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import type { ValueID } from "../node/ValueDB";
import { validatePayload } from "../util/misc";
import { enumValuesToMetadataStates, ValueMetadata } from "../values/Metadata";
import { parseBitMask } from "../values/Primitive";
import { Timeout } from "../values/Timeout";
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
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum ProtectionCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	SupportedGet = 0x04,
	SupportedReport = 0x05,
	ExclusiveControlSet = 0x06,
	ExclusiveControlGet = 0x07,
	ExclusiveControlReport = 0x08,
	TimeoutSet = 0x09,
	TimeoutGet = 0x0a,
	TimeoutReport = 0x0b,
}

// @publicAPI
export enum LocalProctectionState {
	Unprotected = 0,
	ProtectedBySequence = 1,
	NoOperationPossible = 2,
}

// @publicAPI
export enum RFProctectionState {
	Unprotected = 0,
	NoControl = 1,
	NoResponse = 2,
}

export function getExclusiveControlValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Protection,
		endpoint,
		property: "exclusiveControl",
	};
}

export function getTimeoutValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Protection,
		endpoint,
		property: "timeout",
	};
}

@commandClass(CommandClasses.Protection)
@implementedVersion(2)
export class ProtectionCC extends CommandClass {
	declare ccCommand: ProtectionCommand;
}

interface ProtectionCCSetOptions extends CCCommandOptions {
	local: LocalProctectionState;
	rf?: RFProctectionState;
}

@CCCommand(ProtectionCommand.Set)
export class ProtectionCCSet extends ProtectionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | ProtectionCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.local = options.local;
			this.rf = options.rf;
		}
	}

	public local: LocalProctectionState;
	public rf?: RFProctectionState;

	public serialize(): Buffer {
		const payload = [this.local & 0b1111];
		if (this.version >= 2 && this.rf != undefined) {
			payload.push(this.rf & 0b1111);
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
	}
}

@CCCommand(ProtectionCommand.Report)
export class ProtectionCCReport extends ProtectionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.local = this.payload[0] & 0b1111;
		if (this.payload.length >= 2) {
			this.rf = this.payload[1] & 0b1111;
		}

		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Number,
		label: "Local protection state",
		states: enumValuesToMetadataStates(LocalProctectionState),
	})
	public readonly local: LocalProctectionState;

	@ccValue({ minVersion: 2 })
	@ccValueMetadata({
		...ValueMetadata.Number,
		label: "RF protection state",
		states: enumValuesToMetadataStates(RFProctectionState),
	})
	public readonly rf?: RFProctectionState;
}

@CCCommand(ProtectionCommand.Get)
@expectedCCResponse(ProtectionCCReport)
export class ProtectionCCGet extends ProtectionCC {}

@CCCommand(ProtectionCommand.SupportedReport)
export class ProtectionCCSupportedReport extends ProtectionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 5);
		this.timeout = !!(this.payload[0] & 0b1);
		this.exclusiveControl = !!(this.payload[0] & 0b10);
		this.supportedLocalStates = parseBitMask(this.payload.slice(2, 4));
		this.supportedRFStates = parseBitMask(this.payload.slice(4, 6));

		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly exclusiveControl: boolean;

	@ccValue({ internal: true })
	public readonly timeout: boolean;

	@ccValue({ internal: true })
	public readonly supportedLocalStates: LocalProctectionState[];

	@ccValue({ internal: true })
	public readonly supportedRFStates: RFProctectionState[];
}

@CCCommand(ProtectionCommand.SupportedGet)
@expectedCCResponse(ProtectionCCSupportedReport)
export class ProtectionCCSupportedGet extends ProtectionCC {}

@CCCommand(ProtectionCommand.ExclusiveControlReport)
export class ProtectionCCExclusiveControlReport extends ProtectionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.exclusiveNodeId = this.payload[0];

		const valueId = getExclusiveControlValueID(this.endpointIndex);
		this.getValueDB().setValue(valueId, this.exclusiveNodeId);
	}

	public readonly exclusiveNodeId: number;
}

@CCCommand(ProtectionCommand.ExclusiveControlGet)
@expectedCCResponse(ProtectionCCExclusiveControlReport)
export class ProtectionCCExclusiveControlGet extends ProtectionCC {}

interface ProtectionCCExclusiveControlSetOptions extends CCCommandOptions {
	exclusiveNodeId: number;
}

@CCCommand(ProtectionCommand.ExclusiveControlSet)
@expectedCCResponse(ProtectionCCReport)
export class ProtectionCCExclusiveControlSet extends ProtectionCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| ProtectionCCExclusiveControlSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.exclusiveNodeId = options.exclusiveNodeId;
		}
	}

	public exclusiveNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.exclusiveNodeId]);
		return super.serialize();
	}
}

@CCCommand(ProtectionCommand.TimeoutReport)
export class ProtectionCCTimeoutReport extends ProtectionCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.timeout = Timeout.parse(this.payload[0]);

		const valueId = getTimeoutValueID(this.endpointIndex);
		this.getValueDB().setValue(valueId, this.timeout);
	}

	public readonly timeout: Timeout;
}

@CCCommand(ProtectionCommand.TimeoutGet)
@expectedCCResponse(ProtectionCCTimeoutReport)
export class ProtectionCCTimeoutGet extends ProtectionCC {}

interface ProtectionCCTimeoutSetOptions extends CCCommandOptions {
	timeout: Timeout;
}

@CCCommand(ProtectionCommand.TimeoutSet)
@expectedCCResponse(ProtectionCCReport)
export class ProtectionCCTimeoutSet extends ProtectionCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| ProtectionCCTimeoutSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.timeout = options.timeout;
		}
	}

	public timeout: Timeout;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.timeout.serialize()]);
		return super.serialize();
	}
}
