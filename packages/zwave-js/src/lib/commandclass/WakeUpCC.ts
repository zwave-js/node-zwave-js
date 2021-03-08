import type { Maybe, MessageOrCCLogEntry, ValueID } from "@zwave-js/core";
import {
	CommandClasses,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import type { ZWaveNode } from "../node/Node";
import { NodeStatus } from "../node/Types";
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

export function getWakeUpIntervalValueId(): ValueID {
	return {
		commandClass: CommandClasses["Wake Up"],
		property: "wakeUpInterval",
	};
}

export enum WakeUpCommand {
	IntervalSet = 0x04,
	IntervalGet = 0x05,
	IntervalReport = 0x06,
	WakeUpNotification = 0x07,
	NoMoreInformation = 0x08,
	IntervalCapabilitiesGet = 0x09,
	IntervalCapabilitiesReport = 0x0a,
}

@API(CommandClasses["Wake Up"])
export class WakeUpCCAPI extends CCAPI {
	public supportsCommand(cmd: WakeUpCommand): Maybe<boolean> {
		switch (cmd) {
			case WakeUpCommand.IntervalGet:
				return this.isSinglecast();
			case WakeUpCommand.IntervalSet:
			case WakeUpCommand.NoMoreInformation:
				return true; // This is mandatory
			case WakeUpCommand.IntervalCapabilitiesGet:
				return this.version >= 2 && this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "wakeUpInterval") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}
		await this.setInterval(value, this.driver.controller.ownNodeId ?? 1);

		if (this.isSinglecast()) {
			// Verify the current value after a delay
			this.schedulePoll({ property });
		}
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "wakeUpInterval":
				return (await this.getInterval())?.[property];
			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getInterval() {
		this.assertSupportsCommand(WakeUpCommand, WakeUpCommand.IntervalGet);

		const cc = new WakeUpCCIntervalGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<WakeUpCCIntervalReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["wakeUpInterval", "controllerNodeId"]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getIntervalCapabilities() {
		this.assertSupportsCommand(
			WakeUpCommand,
			WakeUpCommand.IntervalCapabilitiesGet,
		);

		const cc = new WakeUpCCIntervalCapabilitiesGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<WakeUpCCIntervalCapabilitiesReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"defaultWakeUpInterval",
				"minWakeUpInterval",
				"maxWakeUpInterval",
				"wakeUpIntervalSteps",
			]);
		}
	}

	public async setInterval(
		wakeUpInterval: number,
		controllerNodeId: number,
	): Promise<void> {
		this.assertSupportsCommand(WakeUpCommand, WakeUpCommand.IntervalSet);

		const cc = new WakeUpCCIntervalSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			wakeUpInterval,
			controllerNodeId,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async sendNoMoreInformation(): Promise<void> {
		this.assertSupportsCommand(
			WakeUpCommand,
			WakeUpCommand.NoMoreInformation,
		);

		const cc = new WakeUpCCNoMoreInformation(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		await this.driver.sendCommand(cc, {
			...this.commandOptions,
			// This command must be sent as part of the wake up queue
			priority: MessagePriority.WakeUp,
			// Don't try to resend this - if we get no response, the node is most likely asleep
			maxSendAttempts: 1,
		});
	}
}

@commandClass(CommandClasses["Wake Up"])
@implementedVersion(2)
export class WakeUpCC extends CommandClass {
	declare ccCommand: WakeUpCommand;

	public isAwake(): boolean {
		return WakeUpCC.isAwake(this.getNode()!);
	}

	public static isAwake(node: ZWaveNode): boolean {
		switch (node.status) {
			case NodeStatus.Asleep:
			case NodeStatus.Dead:
				return false;
			case NodeStatus.Unknown:
			// We assume all nodes to be awake - we'll find out soon enough if they are
			case NodeStatus.Alive:
			case NodeStatus.Awake:
				return true;
		}
	}

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Wake Up"].withOptions({
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

		if (node.isControllerNode()) {
			this.driver.controllerLog.logNode(
				node.id,
				`skipping wakeup configuration for the controller`,
			);
		} else if (node.isFrequentListening) {
			this.driver.controllerLog.logNode(
				node.id,
				`skipping wakeup configuration for frequent listening device`,
			);
		} else {
			// Retrieve the allowed wake up intervals if possible
			if (this.version >= 2) {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"retrieving wakeup capabilities from the device...",
					direction: "outbound",
				});
				const wakeupCaps = await api.getIntervalCapabilities();
				if (wakeupCaps) {
					const logMessage = `received wakeup capabilities:
default wakeup interval: ${wakeupCaps.defaultWakeUpInterval} seconds
minimum wakeup interval: ${wakeupCaps.minWakeUpInterval} seconds
maximum wakeup interval: ${wakeupCaps.maxWakeUpInterval} seconds
wakeup interval steps:   ${wakeupCaps.wakeUpIntervalSteps} seconds`;
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: logMessage,
						direction: "inbound",
					});
				} else {
					hadCriticalTimeout = true;
				}
			}

			// SDS14223 prescribes a IntervalSet followed by a check
			// We have no intention of changing the interval (maybe some time in the future)
			// So for now get the current interval and just set the controller ID

			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "retrieving wakeup interval from the device...",
				direction: "outbound",
			});
			const wakeupResp = await api.getInterval();
			if (wakeupResp) {
				const logMessage = `received wakeup configuration:
wakeup interval: ${wakeupResp.wakeUpInterval} seconds
controller node: ${wakeupResp.controllerNodeId}`;
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});

				const ownNodeId = this.driver.controller.ownNodeId!;
				// Only change the destination if necessary
				if (wakeupResp.controllerNodeId !== ownNodeId) {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: "configuring wakeup destination node",
						direction: "outbound",
					});
					await api.setInterval(wakeupResp.wakeUpInterval, ownNodeId);
					this.driver.controllerLog.logNode(
						node.id,
						"wakeup destination node changed!",
					);
				}
			} else {
				// TODO: Change destination as the first thing during bootstrapping a node
				// and make it non-critical here
				hadCriticalTimeout = true;
			}
		}

		// Remember that the interview is complete
		if (!hadCriticalTimeout) this.interviewComplete = true;
	}
}

interface WakeUpCCIntervalSetOptions extends CCCommandOptions {
	wakeUpInterval: number;
	controllerNodeId: number;
}

@CCCommand(WakeUpCommand.IntervalSet)
export class WakeUpCCIntervalSet extends WakeUpCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| WakeUpCCIntervalSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			// This error is used to test the driver!
			// When implementing this branch, update the corresponding driver test
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.wakeUpInterval = options.wakeUpInterval;
			this.controllerNodeId = options.controllerNodeId;
		}
	}

	public wakeUpInterval: number;
	public controllerNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			0,
			0,
			0, // placeholder
			this.controllerNodeId,
		]);
		this.payload.writeUIntBE(this.wakeUpInterval, 0, 3);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"wake-up interval": `${this.wakeUpInterval} seconds`,
				"controller node id": this.controllerNodeId,
			},
		};
	}
}

@CCCommand(WakeUpCommand.IntervalReport)
export class WakeUpCCIntervalReport extends WakeUpCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 4);
		this._wakeUpInterval = this.payload.readUIntBE(0, 3);
		this._controllerNodeId = this.payload[3];
		this.persistValues();
	}

	private _wakeUpInterval: number;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt24,
		label: "Wake Up interval",
	})
	public get wakeUpInterval(): number {
		return this._wakeUpInterval;
	}

	private _controllerNodeId: number;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Node ID of the controller",
	})
	public get controllerNodeId(): number {
		return this._controllerNodeId;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"wake-up interval": `${this.wakeUpInterval} seconds`,
				"controller node id": this._controllerNodeId,
			},
		};
	}
}

@CCCommand(WakeUpCommand.IntervalGet)
@expectedCCResponse(WakeUpCCIntervalReport)
export class WakeUpCCIntervalGet extends WakeUpCC {}

@CCCommand(WakeUpCommand.WakeUpNotification)
export class WakeUpCCWakeUpNotification extends WakeUpCC {}

@CCCommand(WakeUpCommand.NoMoreInformation)
export class WakeUpCCNoMoreInformation extends WakeUpCC {}

@CCCommand(WakeUpCommand.IntervalCapabilitiesReport)
export class WakeUpCCIntervalCapabilitiesReport extends WakeUpCC {
	// @noCCValues The values are stored as part of the metadata

	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 12);
		this._minWakeUpInterval = this.payload.readUIntBE(0, 3);
		this._maxWakeUpInterval = this.payload.readUIntBE(3, 3);
		this._defaultWakeUpInterval = this.payload.readUIntBE(6, 3);
		this._wakeUpIntervalSteps = this.payload.readUIntBE(9, 3);

		// Store the received information as metadata for the wake up interval
		this.getValueDB().setMetadata(
			{
				commandClass: this.ccId,
				endpoint: this.endpointIndex,
				property: "wakeUpInterval",
			},
			{
				...ValueMetadata.WriteOnlyUInt24,
				min: this._minWakeUpInterval,
				max: this._maxWakeUpInterval,
				steps: this._wakeUpIntervalSteps,
				default: this._defaultWakeUpInterval,
			},
		);
	}

	private _minWakeUpInterval: number;
	public get minWakeUpInterval(): number {
		return this._minWakeUpInterval;
	}

	private _maxWakeUpInterval: number;
	public get maxWakeUpInterval(): number {
		return this._maxWakeUpInterval;
	}

	private _defaultWakeUpInterval: number;
	public get defaultWakeUpInterval(): number {
		return this._defaultWakeUpInterval;
	}

	private _wakeUpIntervalSteps: number;
	public get wakeUpIntervalSteps(): number {
		return this._wakeUpIntervalSteps;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"default interval": `${this._defaultWakeUpInterval} seconds`,
				"minimum interval": `${this._minWakeUpInterval} seconds`,
				"maximum interval": `${this._maxWakeUpInterval} seconds`,
				"interval steps": `${this._wakeUpIntervalSteps} seconds`,
			},
		};
	}
}

@CCCommand(WakeUpCommand.IntervalCapabilitiesGet)
@expectedCCResponse(WakeUpCCIntervalCapabilitiesReport)
export class WakeUpCCIntervalCapabilitiesGet extends WakeUpCC {}
