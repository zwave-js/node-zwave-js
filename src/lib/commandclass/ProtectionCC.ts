import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import type { ValueID } from "../node/ValueDB";
import { validatePayload } from "../util/misc";
import { enumValuesToMetadataStates, ValueMetadata } from "../values/Metadata";
import { Maybe, parseBitMask, unknownBoolean } from "../values/Primitive";
import { Timeout } from "../values/Timeout";
import {
	CCAPI,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "./API";
import {
	API,
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

export function getExclusiveControlNodeIdValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Protection,
		endpoint,
		property: "exclusiveControlNodeId",
	};
}

export function getLocalStateValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Protection,
		endpoint,
		property: "local",
	};
}

export function getRFStateValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Protection,
		endpoint,
		property: "rf",
	};
}

export function getTimeoutValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Protection,
		endpoint,
		property: "timeout",
	};
}

export function getSupportsExclusiveControlValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Protection,
		endpoint,
		property: "supportsExclusiveControl",
	};
}

export function getSupportsTimeoutValueID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses.Protection,
		endpoint,
		property: "supportsTimeout",
	};
}

@API(CommandClasses.Protection)
export class ProtectionCCAPI extends CCAPI {
	public supportsCommand(cmd: ProtectionCommand): Maybe<boolean> {
		switch (cmd) {
			case ProtectionCommand.Get:
			case ProtectionCommand.Set:
				return true; // This is mandatory
			case ProtectionCommand.SupportedGet:
				return this.version >= 2;
			case ProtectionCommand.TimeoutGet:
			case ProtectionCommand.TimeoutSet: {
				const node = this.endpoint.getNodeUnsafe()!;
				return (
					node.getValue<Maybe<boolean>>(
						getSupportsTimeoutValueID(this.endpoint.index),
					) ?? unknownBoolean
				);
			}
			case ProtectionCommand.ExclusiveControlGet:
			case ProtectionCommand.ExclusiveControlSet: {
				const node = this.endpoint.getNodeUnsafe()!;
				return (
					node.getValue<Maybe<boolean>>(
						getSupportsExclusiveControlValueID(this.endpoint.index),
					) ?? unknownBoolean
				);
			}
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		const valueDB = this.endpoint.getNodeUnsafe()!.valueDB;
		if (property === "local") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			// We need to set both values together, so retrieve the other one from the value DB
			const rf = valueDB.getValue<RFProctectionState>(
				getRFStateValueID(this.endpoint.index),
			);
			await this.set(value, rf);
			// Refresh the status
			await this.get();
		} else if (property === "rf") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			// We need to set both values together, so retrieve the other one from the value DB
			const local = valueDB.getValue<LocalProctectionState>(
				getLocalStateValueID(this.endpoint.index),
			);
			await this.set(local ?? LocalProctectionState.Unprotected, value);
			// Refresh the status
			await this.get();
		} else if (property === "exclusiveControlNodeId") {
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}
			await this.setExclusiveControl(value);
			// Refresh the status
			await this.getExclusiveControl();
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(ProtectionCommand, ProtectionCommand.Get);

		const cc = new ProtectionCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<ProtectionCCReport>(
			cc,
		))!;
		return {
			local: response.local,
			rf: response.rf,
		};
	}

	public async set(
		local: LocalProctectionState,
		rf?: RFProctectionState,
	): Promise<void> {
		this.assertSupportsCommand(ProtectionCommand, ProtectionCommand.Set);

		const cc = new ProtectionCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			local,
			rf,
		});
		await this.driver.sendCommand(cc);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupported() {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.SupportedGet,
		);

		const cc = new ProtectionCCSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			ProtectionCCSupportedReport
		>(cc))!;
		return {
			supportsExclusiveControl: response.supportsExclusiveControl,
			supportsTimeout: response.supportsTimeout,
			supportedLocalStates: response.supportedLocalStates,
			supportedRFStates: response.supportedRFStates,
		};
	}

	public async getExclusiveControl(): Promise<number> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.ExclusiveControlGet,
		);

		const cc = new ProtectionCCExclusiveControlGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			ProtectionCCExclusiveControlReport
		>(cc))!;
		return response.exclusiveControlNodeId;
	}

	public async setExclusiveControl(nodeId: number): Promise<void> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.ExclusiveControlSet,
		);

		const cc = new ProtectionCCExclusiveControlSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			exclusiveControlNodeId: nodeId,
		});
		await this.driver.sendCommand(cc);
	}

	public async getTimeout(): Promise<Timeout> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.TimeoutGet,
		);

		const cc = new ProtectionCCTimeoutGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			ProtectionCCTimeoutReport
		>(cc))!;
		return response.timeout;
	}

	public async setTimeout(timeout: Timeout): Promise<void> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.TimeoutSet,
		);

		const cc = new ProtectionCCTimeoutSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			timeout,
		});
		await this.driver.sendCommand(cc);
	}
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

	// TODO: determine possible states during interview
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
		this.supportsTimeout = !!(this.payload[0] & 0b1);
		this.supportsExclusiveControl = !!(this.payload[0] & 0b10);
		this.supportedLocalStates = parseBitMask(this.payload.slice(2, 4));
		this.supportedRFStates = parseBitMask(this.payload.slice(4, 6));

		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly supportsExclusiveControl: boolean;

	@ccValue({ internal: true })
	public readonly supportsTimeout: boolean;

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
		this.exclusiveControlNodeId = this.payload[0];

		const valueId = getExclusiveControlNodeIdValueID(this.endpointIndex);
		this.getValueDB().setValue(valueId, this.exclusiveControlNodeId);
	}

	public readonly exclusiveControlNodeId: number;
}

@CCCommand(ProtectionCommand.ExclusiveControlGet)
@expectedCCResponse(ProtectionCCExclusiveControlReport)
export class ProtectionCCExclusiveControlGet extends ProtectionCC {}

interface ProtectionCCExclusiveControlSetOptions extends CCCommandOptions {
	exclusiveControlNodeId: number;
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
			this.exclusiveControlNodeId = options.exclusiveControlNodeId;
		}
	}

	public exclusiveControlNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.exclusiveControlNodeId]);
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
