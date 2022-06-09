import type {
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	MessagePriority,
	parseBitMask,
	Timeout,
	unknownBoolean,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { padStart } from "alcalzone-shared/strings";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	ccValue,
	ccValueMetadata,
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import {
	LocalProtectionState,
	ProtectionCommand,
	RFProtectionState,
} from "../lib/_Types";

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
				return (
					this.isSinglecast() &&
					(this.tryGetValueDB()?.getValue<Maybe<boolean>>(
						getSupportsTimeoutValueID(this.endpoint.index),
					) ??
						unknownBoolean)
				);
			}
			case ProtectionCommand.ExclusiveControlGet:
			case ProtectionCommand.ExclusiveControlSet: {
				return (
					this.isSinglecast() &&
					(this.tryGetValueDB()?.getValue<Maybe<boolean>>(
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
		const valueDB = this.tryGetValueDB();
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
			const rf = valueDB?.getValue<RFProtectionState>(
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
			const local = valueDB?.getValue<LocalProtectionState>(
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

		const cc = new ProtectionCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<ProtectionCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["local", "rf"]);
		}
	}

	@validateArgs({ strictEnums: true })
	public async set(
		local: LocalProtectionState,
		rf?: RFProtectionState,
	): Promise<void> {
		this.assertSupportsCommand(ProtectionCommand, ProtectionCommand.Set);

		const cc = new ProtectionCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			local,
			rf,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupported() {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.SupportedGet,
		);

		const cc = new ProtectionCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<ProtectionCCSupportedReport>(
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

		const cc = new ProtectionCCExclusiveControlGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<ProtectionCCExclusiveControlReport>(
				cc,
				this.commandOptions,
			);
		return response?.exclusiveControlNodeId;
	}

	@validateArgs()
	public async setExclusiveControl(nodeId: number): Promise<void> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.ExclusiveControlSet,
		);

		const cc = new ProtectionCCExclusiveControlSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			exclusiveControlNodeId: nodeId,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getTimeout(): Promise<Timeout | undefined> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.TimeoutGet,
		);

		const cc = new ProtectionCCTimeoutGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<ProtectionCCTimeoutReport>(
				cc,
				this.commandOptions,
			);
		return response?.timeout;
	}

	@validateArgs()
	public async setTimeout(timeout: Timeout): Promise<void> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.TimeoutSet,
		);

		const cc = new ProtectionCCTimeoutSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			timeout,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Protection)
@implementedVersion(2)
export class ProtectionCC extends CommandClass {
	declare ccCommand: ProtectionCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Protection,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// We need to do some queries after a potential timeout
		// In this case, do now mark this CC as interviewed completely
		let hadCriticalTimeout = false;

		// First find out what the device supports
		if (this.version >= 2) {
			applHost.controllerLog.logNode(node.id, {
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
				applHost.controllerLog.logNode(node.id, {
					message: logMessage,
					direction: "inbound",
				});
			} else {
				hadCriticalTimeout = true;
			}
		}

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		if (!hadCriticalTimeout) this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Protection,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const valueDB = this.getValueDB(applHost);

		const supportsExclusiveControl = !!valueDB.getValue<boolean>(
			getSupportsExclusiveControlValueID(this.endpointIndex),
		);
		const supportsTimeout = !!valueDB.getValue<boolean>(
			getSupportsTimeoutValueID(this.endpointIndex),
		);

		// Query the current state
		applHost.controllerLog.logNode(node.id, {
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
			applHost.controllerLog.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}

		if (supportsTimeout) {
			// Query the current timeout
			applHost.controllerLog.logNode(node.id, {
				message: "querying protection timeout...",
				direction: "outbound",
			});
			const timeout = await api.getTimeout();
			if (timeout) {
				applHost.controllerLog.logNode(node.id, {
					message: `received timeout: ${timeout.toString()}`,
					direction: "inbound",
				});
			}
		}

		if (supportsExclusiveControl) {
			// Query the current timeout
			applHost.controllerLog.logNode(node.id, {
				message: "querying exclusive control node...",
				direction: "outbound",
			});
			const nodeId = await api.getExclusiveControl();
			if (nodeId != undefined) {
				applHost.controllerLog.logNode(node.id, {
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | ProtectionCCSetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			local: getEnumMemberName(LocalProtectionState, this.local),
		};
		if (this.rf != undefined) {
			message.rf = getEnumMemberName(RFProtectionState, this.rf);
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(ProtectionCommand.Report)
export class ProtectionCCReport extends ProtectionCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		this.local = this.payload[0] & 0b1111;
		if (this.payload.length >= 2) {
			this.rf = this.payload[1] & 0b1111;
		}
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			local: getEnumMemberName(LocalProtectionState, this.local),
		};
		if (this.rf != undefined) {
			message.rf = getEnumMemberName(RFProtectionState, this.rf);
		}
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
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
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		const valueDb = this.getValueDB(applHost);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		this.exclusiveControlNodeId = this.payload[0];
	}

	@ccValue({ minVersion: 2 })
	public readonly exclusiveControlNodeId: number;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ProtectionCCExclusiveControlSetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"exclusive control node id": this.exclusiveControlNodeId,
			},
		};
	}
}

@CCCommand(ProtectionCommand.TimeoutReport)
export class ProtectionCCTimeoutReport extends ProtectionCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		this.timeout = Timeout.parse(this.payload[0]);
	}

	@ccValue({ minVersion: 2 })
	public readonly timeout: Timeout;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ProtectionCCTimeoutSetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { timeout: this.timeout.toString() },
		};
	}
}
