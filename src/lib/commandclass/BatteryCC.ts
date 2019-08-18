import { IDriver } from "../driver/IDriver";
import log from "../log";
import { ZWaveNode } from "../node/Node";
import { JSONObject, validatePayload } from "../util/misc";
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
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

@API(CommandClasses.Battery)
export class BatteryCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		const cc = new BatteryCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<BatteryCCReport>(cc))!;
		return {
			level: response.level,
			isLow: response.isLow,
		};
	}
}

export enum BatteryCommand {
	Get = 0x02,
	Report = 0x03,
}

export interface BatteryCC {
	ccCommand: BatteryCommand;
}

@commandClass(CommandClasses.Battery)
@implementedVersion(1)
export class BatteryCC extends CommandClass {
	public static async interview(
		driver: IDriver,
		node: ZWaveNode,
	): Promise<void> {
		log.controller.logNode(node.id, {
			message: "querying battery information...",
			direction: "outbound",
		});

		const batteryResponse = await node.commandClasses.Battery.get();

		const logMessage = `received response for battery information:
level: ${batteryResponse.level}${batteryResponse.isLow ? " (low)" : ""}`;
		log.controller.logNode(node.id, {
			message: logMessage,
			direction: "inbound",
		});

		// Remember that the interview is complete
		this.setInterviewComplete(node, true);
	}
}

@CCCommand(BatteryCommand.Report)
export class BatteryCCReport extends BatteryCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._level = this.payload[0];
		if (this._level === 0xff) {
			this._level = 0;
			this._isLow = true;
		} else {
			this._isLow = false;
		}
		this.persistValues();
	}

	private _level: number;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		max: 100,
		label: "Battery level",
	})
	public get level(): number {
		return this._level;
	}

	private _isLow: boolean;
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Level is low",
	})
	public get isLow(): boolean {
		return this._isLow;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			level: this.level,
			isLow: this.isLow,
		});
	}
}

@CCCommand(BatteryCommand.Get)
@expectedCCResponse(BatteryCCReport)
export class BatteryCCGet extends BatteryCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
