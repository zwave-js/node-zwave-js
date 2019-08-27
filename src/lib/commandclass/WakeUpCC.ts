import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { MessagePriority } from "../message/Constants";
import { NodeStatus } from "../node/INode";
import { ZWaveNode } from "../node/Node";
import { validatePayload } from "../util/misc";
import { ValueMetadata } from "../values/Metadata";
import { CCAPI } from "./API";
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
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getInterval() {
		const cc = new WakeUpCCIntervalGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<WakeUpCCIntervalReport>(
			cc,
		))!;
		return {
			wakeUpInterval: response.wakeUpInterval,
			controllerNodeId: response.controllerNodeId,
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getIntervalCapabilities() {
		const cc = new WakeUpCCIntervalCapabilitiesGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			WakeUpCCIntervalCapabilitiesReport
		>(cc))!;
		return {
			defaultWakeUpInterval: response.defaultWakeUpInterval,
			minWakeUpInterval: response.minWakeUpInterval,
			maxWakeUpInterval: response.maxWakeUpInterval,
			wakeUpIntervalSteps: response.wakeUpIntervalSteps,
		};
	}

	public async setInterval(
		wakeUpInterval: number,
		controllerNodeId: number,
	): Promise<void> {
		const cc = new WakeUpCCIntervalSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			wakeUpInterval,
			controllerNodeId,
		});
		await this.driver.sendCommand(cc);
	}

	public async sendNoMoreInformation(): Promise<void> {
		const cc = new WakeUpCCNoMoreInformation(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		await this.driver.sendCommand(cc, {
			// This command must be sent as part of the wake up queue
			priority: MessagePriority.WakeUp,
		});
	}
}

export interface WakeUpCC {
	ccCommand: WakeUpCommand;
}

@commandClass(CommandClasses["Wake Up"])
@implementedVersion(2)
export class WakeUpCC extends CommandClass {
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
			case NodeStatus.Awake:
				return true;
		}
	}

	public setAwake(awake: boolean): void {
		WakeUpCC.setAwake(this.getNode()!, awake);
	}

	public static setAwake(node: ZWaveNode, awake: boolean): void {
		node.status = awake ? NodeStatus.Awake : NodeStatus.Asleep;
	}

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		if (node.isControllerNode()) {
			log.controller.logNode(
				node.id,
				`skipping wakeup configuration for the controller`,
			);
		} else if (node.isFrequentListening) {
			log.controller.logNode(
				node.id,
				`skipping wakeup configuration for frequent listening device`,
			);
		} else {
			const API = node.commandClasses["Wake Up"];
			// Retrieve the allowed wake up intervals if possible
			if (this.version >= 2) {
				log.controller.logNode(node.id, {
					message:
						"retrieving wakeup capabilities from the device...",
					direction: "outbound",
				});
				const wakeupCaps = await API.getIntervalCapabilities();
				const logMessage = `received wakeup capabilities:
default wakeup interval: ${wakeupCaps.defaultWakeUpInterval} seconds
minimum wakeup interval: ${wakeupCaps.minWakeUpInterval} seconds
maximum wakeup interval: ${wakeupCaps.maxWakeUpInterval} seconds
wakeup interval steps:   ${wakeupCaps.wakeUpIntervalSteps} seconds`;
				log.controller.logNode(node.id, {
					message: logMessage,
					direction: "inbound",
				});
			}

			// SDS14223 prescribes a IntervalSet followed by a check
			// We have no intention of changing the interval (maybe some time in the future)
			// So for now get the current interval and just set the controller ID

			log.controller.logNode(node.id, {
				message: "retrieving wakeup interval from the device...",
				direction: "outbound",
			});
			const wakeupResp = await API.getInterval();
			const logMessage = `received wakeup configuration:
wakeup interval: ${wakeupResp.wakeUpInterval} seconds
controller node: ${wakeupResp.controllerNodeId}`;
			log.controller.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});

			log.controller.logNode(node.id, {
				message: "configuring wakeup destination node",
				direction: "outbound",
			});

			await API.setInterval(
				wakeupResp.wakeUpInterval,
				this.driver.controller!.ownNodeId!,
			);
			log.controller.logNode(node.id, "wakeup destination node changed!");
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

interface WakeUpCCIntervalSetOptions extends CCCommandOptions {
	wakeUpInterval: number;
	controllerNodeId: number;
}

@CCCommand(WakeUpCommand.IntervalSet)
export class WakeUpCCIntervalSet extends WakeUpCC {
	public constructor(
		driver: IDriver,
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
}

@CCCommand(WakeUpCommand.IntervalReport)
export class WakeUpCCIntervalReport extends WakeUpCC {
	public constructor(
		driver: IDriver,
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
}

@CCCommand(WakeUpCommand.IntervalGet)
@expectedCCResponse(WakeUpCCIntervalReport)
export class WakeUpCCIntervalGet extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(WakeUpCommand.WakeUpNotification)
export class WakeUpCCWakeUpNotification extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(WakeUpCommand.NoMoreInformation)
export class WakeUpCCNoMoreInformation extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(WakeUpCommand.IntervalCapabilitiesReport)
export class WakeUpCCIntervalCapabilitiesReport extends WakeUpCC {
	public constructor(
		driver: IDriver,
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
				endpoint: this.endpoint,
				propertyName: "wakeUpInterval",
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
}

@CCCommand(WakeUpCommand.IntervalCapabilitiesGet)
@expectedCCResponse(WakeUpCCIntervalCapabilitiesReport)
export class WakeUpCCIntervalCapabilitiesGet extends WakeUpCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
