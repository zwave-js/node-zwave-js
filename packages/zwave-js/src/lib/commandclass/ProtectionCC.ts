import type {
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	parseBitMask,
	Timeout,
	unknownBoolean,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { padStart } from "alcalzone-shared/strings";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
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
export enum LocalProtectionState {
	Unprotected = 0,
	ProtectedBySequence = 1,
	NoOperationPossible = 2,
}

// @publicAPI
export enum RFProtectionState {
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
				return this.isSinglecast();
			case ProtectionCommand.Set:
				return true; // This is mandatory
			case ProtectionCommand.SupportedGet:
				return this.version >= 2 && this.isSinglecast();
			case ProtectionCommand.TimeoutGet:
			case ProtectionCommand.TimeoutSet: {
				const node = this.endpoint.getNodeUnsafe()!;
				return (
					this.isSinglecast() &&
					(node.getValue<Maybe<boolean>>(
						getSupportsTimeoutValueID(this.endpoint.index),
					) ??
						unknownBoolean)
				);
			}
			case ProtectionCommand.ExclusiveControlGet:
			case ProtectionCommand.ExclusiveControlSet: {
				const node = this.endpoint.getNodeUnsafe()!;
				return (
					this.isSinglecast() &&
					(node.getValue<Maybe<boolean>>(
						getSupportsExclusiveControlValueID(this.endpoint.index),
					) ??
						unknownBoolean)
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
			const rf = valueDB.getValue<RFProtectionState>(
				getRFStateValueID(this.endpoint.index),
			);
			await this.set(value, rf);
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
			const local = valueDB.getValue<LocalProtectionState>(
				getLocalStateValueID(this.endpoint.index),
			);
			await this.set(local ?? LocalProtectionState.Unprotected, value);
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
		} else {
			throwUnsupportedProperty(this.ccId, property);
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "local":
			case "rf":
				return (await this.get())?.[property];
			case "exclusiveControlNodeId":
				return this.getExclusiveControl();
			default:
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
		const response = await this.driver.sendCommand<ProtectionCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["local", "rf"]);
		}
	}

	public async set(
		local: LocalProtectionState,
		rf?: RFProtectionState,
	): Promise<void> {
		this.assertSupportsCommand(ProtectionCommand, ProtectionCommand.Set);

		const cc = new ProtectionCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			local,
			rf,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
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
		const response = await this.driver.sendCommand<ProtectionCCSupportedReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"supportsExclusiveControl",
				"supportsTimeout",
				"supportedLocalStates",
				"supportedRFStates",
			]);
		}
	}

	public async getExclusiveControl(): Promise<number | undefined> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.ExclusiveControlGet,
		);

		const cc = new ProtectionCCExclusiveControlGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<ProtectionCCExclusiveControlReport>(
			cc,
			this.commandOptions,
		);
		return response?.exclusiveControlNodeId;
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
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getTimeout(): Promise<Timeout | undefined> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.TimeoutGet,
		);

		const cc = new ProtectionCCTimeoutGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<ProtectionCCTimeoutReport>(
			cc,
			this.commandOptions,
		);
		return response?.timeout;
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
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Protection)
@implementedVersion(2)
export class ProtectionCC extends CommandClass {
	declare ccCommand: ProtectionCommand;

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Protection.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// We need to do some queries after a potential timeout
		// In this case, do now mark this CC as interviewed completely
		let hadCriticalTimeout = false;

		// First find out what the device supports
		if (this.version >= 2) {
			this.driver.controllerLog.logNode(node.id, {
				message: "querying protection capabilities...",
				direction: "outbound",
			});
			const resp = await api.getSupported();
			if (resp) {
				const logMessage = `received protection capabilities:
exclusive control:       ${resp.supportsExclusiveControl}
timeout:                 ${resp.supportsTimeout}
local protection states: ${resp.supportedLocalStates
					.map((local) =>
						getEnumMemberName(LocalProtectionState, local),
					)
					.map((str) => `\n· ${str}`)
					.join("")}
RF protection states:    ${resp.supportedRFStates
					.map((local) => getEnumMemberName(RFProtectionState, local))
					.map((str) => `\n· ${str}`)
					.join("")}`;
				this.driver.controllerLog.logNode(node.id, {
					message: logMessage,
					direction: "inbound",
				});
			} else {
				hadCriticalTimeout = true;
			}
		}

		await this.refreshValues();

		// Remember that the interview is complete
		if (!hadCriticalTimeout) this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Protection.withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB();

		const supportsExclusiveControl = !!valueDB.getValue<boolean>(
			getSupportsExclusiveControlValueID(this.endpointIndex),
		);
		const supportsTimeout = !!valueDB.getValue<boolean>(
			getSupportsTimeoutValueID(this.endpointIndex),
		);

		// Query the current state
		this.driver.controllerLog.logNode(node.id, {
			message: "querying protection status...",
			direction: "outbound",
		});
		const protectionResp = await api.get();
		if (protectionResp) {
			let logMessage = `received protection status:
local: ${getEnumMemberName(LocalProtectionState, protectionResp.local)}`;
			if (protectionResp.rf != undefined) {
				logMessage += `
rf     ${getEnumMemberName(RFProtectionState, protectionResp.rf)}`;
			}
			this.driver.controllerLog.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}

		if (supportsTimeout) {
			// Query the current timeout
			this.driver.controllerLog.logNode(node.id, {
				message: "querying protection timeout...",
				direction: "outbound",
			});
			const timeout = await api.getTimeout();
			if (timeout) {
				this.driver.controllerLog.logNode(node.id, {
					message: `received timeout: ${timeout.toString()}`,
					direction: "inbound",
				});
			}
		}

		if (supportsExclusiveControl) {
			// Query the current timeout
			this.driver.controllerLog.logNode(node.id, {
				message: "querying exclusive control node...",
				direction: "outbound",
			});
			const nodeId = await api.getExclusiveControl();
			if (nodeId != undefined) {
				this.driver.controllerLog.logNode(node.id, {
					message:
						(nodeId !== 0
							? `Node ${padStart(nodeId.toString(), 3, "0")}`
							: `no node`) + ` has exclusive control`,
					direction: "inbound",
				});
			}
		}
	}
}

interface ProtectionCCSetOptions extends CCCommandOptions {
	local: LocalProtectionState;
	rf?: RFProtectionState;
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

	public local: LocalProtectionState;
	public rf?: RFProtectionState;

	public serialize(): Buffer {
		const payload = [this.local & 0b1111];
		if (this.version >= 2 && this.rf != undefined) {
			payload.push(this.rf & 0b1111);
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			local: getEnumMemberName(LocalProtectionState, this.local),
		};
		if (this.rf != undefined) {
			message.rf = getEnumMemberName(RFProtectionState, this.rf);
		}
		return {
			...super.toLogEntry(),
			message,
		};
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
		states: enumValuesToMetadataStates(LocalProtectionState),
	})
	public readonly local: LocalProtectionState;

	@ccValue({ minVersion: 2 })
	@ccValueMetadata({
		...ValueMetadata.Number,
		label: "RF protection state",
		states: enumValuesToMetadataStates(RFProtectionState),
	})
	public readonly rf?: RFProtectionState;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			local: getEnumMemberName(LocalProtectionState, this.local),
		};
		if (this.rf != undefined) {
			message.rf = getEnumMemberName(RFProtectionState, this.rf);
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
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
		this.supportedLocalStates = parseBitMask(
			this.payload.slice(1, 3),
			LocalProtectionState.Unprotected,
		);
		this.supportedRFStates = parseBitMask(
			this.payload.slice(3, 5),
			RFProtectionState.Unprotected,
		);

		this.persistValues();
	}

	public persistValues(): boolean {
		if (!super.persistValues()) return false;
		const valueDb = this.getValueDB();
		// update metadata (partially) for the local and rf values
		valueDb.setMetadata(getLocalStateValueID(this.endpointIndex), {
			...ValueMetadata.Number,
			states: enumValuesToMetadataStates(
				LocalProtectionState,
				this.supportedLocalStates,
			),
		});
		// update metadata (partially) for the local and rf values
		valueDb.setMetadata(getRFStateValueID(this.endpointIndex), {
			...ValueMetadata.Number,
			states: enumValuesToMetadataStates(
				RFProtectionState,
				this.supportedRFStates,
			),
		});
		return true;
	}

	@ccValue({ internal: true })
	public readonly supportsExclusiveControl: boolean;

	@ccValue({ internal: true })
	public readonly supportsTimeout: boolean;

	@ccValue({ internal: true })
	public readonly supportedLocalStates: LocalProtectionState[];

	@ccValue({ internal: true })
	public readonly supportedRFStates: RFProtectionState[];

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supports exclusive control": this.supportsExclusiveControl,
				"supports timeout": this.supportsTimeout,
				"local protection states": this.supportedLocalStates
					.map((local) =>
						getEnumMemberName(LocalProtectionState, local),
					)
					.map((str) => `\n· ${str}`)
					.join(""),
				"RF protection states": this.supportedRFStates
					.map((rf) => getEnumMemberName(RFProtectionState, rf))
					.map((str) => `\n· ${str}`)
					.join(""),
			},
		};
	}
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
		this.persistValues();
	}

	@ccValue({ minVersion: 2 })
	public readonly exclusiveControlNodeId: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"exclusive control node id": this.exclusiveControlNodeId,
			},
		};
	}
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"exclusive control node id": this.exclusiveControlNodeId,
			},
		};
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
		this.persistValues();
	}

	@ccValue({ minVersion: 2 })
	public readonly timeout: Timeout;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { timeout: this.timeout.toString() },
		};
	}
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { timeout: this.timeout.toString() },
		};
	}
}
