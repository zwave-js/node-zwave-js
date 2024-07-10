import {
	CommandClasses,
	MAX_NODES,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	Timeout,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	enumValuesToMetadataStates,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { padStart } from "alcalzone-shared/strings";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	LocalProtectionState,
	ProtectionCommand,
	RFProtectionState,
} from "../lib/_Types";

export const ProtectionCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Protection, {
		...V.staticProperty(
			"exclusiveControlNodeId",
			{
				...ValueMetadata.UInt8,
				min: 1,
				max: MAX_NODES,
				label: "Node ID with exclusive control",
			} as const,
			{ minVersion: 2 } as const,
		),

		...V.staticPropertyWithName(
			"localProtectionState",
			"local",
			{
				...ValueMetadata.Number,
				label: "Local protection state",
				states: enumValuesToMetadataStates(LocalProtectionState),
			} as const,
		),

		...V.staticPropertyWithName(
			"rfProtectionState",
			"rf",
			{
				...ValueMetadata.Number,
				label: "RF protection state",
				states: enumValuesToMetadataStates(RFProtectionState),
			} as const,
			{ minVersion: 2 } as const,
		),

		...V.staticProperty(
			"timeout",
			{
				...ValueMetadata.UInt8,
				label: "RF protection timeout",
			} as const,
			{ minVersion: 2 } as const,
		),

		...V.staticProperty("supportsExclusiveControl", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsTimeout", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedLocalStates", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportedRFStates", undefined, {
			internal: true,
		}),
	}),
});

@API(CommandClasses.Protection)
export class ProtectionCCAPI extends CCAPI {
	public supportsCommand(cmd: ProtectionCommand): MaybeNotKnown<boolean> {
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
					this.isSinglecast()
					&& this.tryGetValueDB()?.getValue<boolean>(
						ProtectionCCValues.supportsTimeout.endpoint(
							this.endpoint.index,
						),
					)
				);
			}
			case ProtectionCommand.ExclusiveControlGet:
			case ProtectionCommand.ExclusiveControlSet: {
				return (
					this.isSinglecast()
					&& this.tryGetValueDB()?.getValue<boolean>(
						ProtectionCCValues.supportsExclusiveControl.endpoint(
							this.endpoint.index,
						),
					)
				);
			}
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(this: ProtectionCCAPI, { property }, value) {
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
					ProtectionCCValues.rfProtectionState.endpoint(
						this.endpoint.index,
					),
				);
				return this.set(value, rf);
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
					ProtectionCCValues.localProtectionState.endpoint(
						this.endpoint.index,
					),
				);
				return this.set(
					local ?? LocalProtectionState.Unprotected,
					value,
				);
			} else if (property === "exclusiveControlNodeId") {
				if (typeof value !== "number") {
					throwWrongValueType(
						this.ccId,
						property,
						"number",
						typeof value,
					);
				}
				return this.setExclusiveControl(value);
			} else {
				throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: ProtectionCCAPI, { property }) {
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
	}

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
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(ProtectionCommand, ProtectionCommand.Set);

		const cc = new ProtectionCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			local,
			rf,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
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
		const response = await this.applHost.sendCommand<
			ProtectionCCSupportedReport
		>(
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

	public async getExclusiveControl(): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.ExclusiveControlGet,
		);

		const cc = new ProtectionCCExclusiveControlGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			ProtectionCCExclusiveControlReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.exclusiveControlNodeId;
	}

	@validateArgs()
	public async setExclusiveControl(
		nodeId: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.ExclusiveControlSet,
		);

		const cc = new ProtectionCCExclusiveControlSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			exclusiveControlNodeId: nodeId,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getTimeout(): Promise<MaybeNotKnown<Timeout>> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.TimeoutGet,
		);

		const cc = new ProtectionCCTimeoutGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			ProtectionCCTimeoutReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.timeout;
	}

	@validateArgs()
	public async setTimeout(
		timeout: Timeout,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ProtectionCommand,
			ProtectionCommand.TimeoutSet,
		);

		const cc = new ProtectionCCTimeoutSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			timeout,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Protection)
@implementedVersion(2)
@ccValues(ProtectionCCValues)
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
local protection states: ${
					resp.supportedLocalStates
						.map((local) =>
							getEnumMemberName(LocalProtectionState, local)
						)
						.map((str) => `\n· ${str}`)
						.join("")
				}
RF protection states:    ${
					resp.supportedRFStates
						.map((local) =>
							getEnumMemberName(RFProtectionState, local)
						)
						.map((str) => `\n· ${str}`)
						.join("")
				}`;
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

		const supportsExclusiveControl = !!this.getValue(
			applHost,
			ProtectionCCValues.supportsExclusiveControl,
		);
		const supportsTimeout = !!this.getValue(
			applHost,
			ProtectionCCValues.supportsTimeout,
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
					message: (nodeId !== 0
						? `Node ${padStart(nodeId.toString(), 3, "0")}`
						: `no node`) + ` has exclusive control`,
					direction: "inbound",
				});
			}
		}
	}
}

// @publicAPI
export interface ProtectionCCSetOptions extends CCCommandOptions {
	local: LocalProtectionState;
	rf?: RFProtectionState;
}

@CCCommand(ProtectionCommand.Set)
@useSupervision()
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
		this.payload = Buffer.from([
			this.local & 0b1111,
			(this.rf ?? RFProtectionState.Unprotected) & 0b1111,
		]);

		if (
			this.version < 2 && this.host.getDeviceConfig?.(
				this.nodeId as number,
			)?.compat?.encodeCCsUsingTargetVersion
		) {
			// When forcing CC version 1, only include the local state
			this.payload = this.payload.subarray(0, 1);
		}

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			local: getEnumMemberName(LocalProtectionState, this.local),
		};
		if (this.rf != undefined) {
			message.rf = getEnumMemberName(RFProtectionState, this.rf);
		}
		return {
			...super.toLogEntry(host),
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

	@ccValue(ProtectionCCValues.localProtectionState)
	public readonly local: LocalProtectionState;

	@ccValue(ProtectionCCValues.rfProtectionState)
	public readonly rf?: RFProtectionState;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			local: getEnumMemberName(LocalProtectionState, this.local),
		};
		if (this.rf != undefined) {
			message.rf = getEnumMemberName(RFProtectionState, this.rf);
		}
		return {
			...super.toLogEntry(host),
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
			this.payload.subarray(1, 3),
			LocalProtectionState.Unprotected,
		);
		this.supportedRFStates = parseBitMask(
			this.payload.subarray(3, 5),
			RFProtectionState.Unprotected,
		);
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// update metadata (partially) for the local and rf values
		const localStateValue = ProtectionCCValues.localProtectionState;
		this.setMetadata(applHost, localStateValue, {
			...localStateValue.meta,
			states: enumValuesToMetadataStates(
				LocalProtectionState,
				this.supportedLocalStates,
			),
		});

		const rfStateValue = ProtectionCCValues.rfProtectionState;
		this.setMetadata(applHost, rfStateValue, {
			...rfStateValue.meta,
			states: enumValuesToMetadataStates(
				RFProtectionState,
				this.supportedRFStates,
			),
		});

		return true;
	}

	@ccValue(ProtectionCCValues.supportsExclusiveControl)
	public readonly supportsExclusiveControl: boolean;

	@ccValue(ProtectionCCValues.supportsTimeout)
	public readonly supportsTimeout: boolean;

	@ccValue(ProtectionCCValues.supportedLocalStates)
	public readonly supportedLocalStates: LocalProtectionState[];

	@ccValue(ProtectionCCValues.supportedRFStates)
	public readonly supportedRFStates: RFProtectionState[];

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supports exclusive control": this.supportsExclusiveControl,
				"supports timeout": this.supportsTimeout,
				"local protection states": this.supportedLocalStates
					.map((local) =>
						getEnumMemberName(LocalProtectionState, local)
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

	@ccValue(ProtectionCCValues.exclusiveControlNodeId)
	public readonly exclusiveControlNodeId: number;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"exclusive control node id": this.exclusiveControlNodeId,
			},
		};
	}
}

@CCCommand(ProtectionCommand.ExclusiveControlGet)
@expectedCCResponse(ProtectionCCExclusiveControlReport)
export class ProtectionCCExclusiveControlGet extends ProtectionCC {}

// @publicAPI
export interface ProtectionCCExclusiveControlSetOptions
	extends CCCommandOptions
{
	exclusiveControlNodeId: number;
}

@CCCommand(ProtectionCommand.ExclusiveControlSet)
@expectedCCResponse(ProtectionCCReport)
@useSupervision()
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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

	@ccValue(ProtectionCCValues.timeout)
	public readonly timeout: Timeout;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { timeout: this.timeout.toString() },
		};
	}
}

@CCCommand(ProtectionCommand.TimeoutGet)
@expectedCCResponse(ProtectionCCTimeoutReport)
export class ProtectionCCTimeoutGet extends ProtectionCC {}

// @publicAPI
export interface ProtectionCCTimeoutSetOptions extends CCCommandOptions {
	timeout: Timeout;
}

@CCCommand(ProtectionCommand.TimeoutSet)
@expectedCCResponse(ProtectionCCReport)
@useSupervision()
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { timeout: this.timeout.toString() },
		};
	}
}
