import { IDriver } from "../driver/IDriver";
import log from "../log";
import { MessagePriority } from "../message/Constants";
import { ZWaveNode } from "../node/Node";
import { validatePayload } from "../util/misc";
import { num2hex } from "../util/strings";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum ZWavePlusCommand {
	Get = 0x01,
	Report = 0x02,
}

export enum ZWavePlusRoleType {
	CentralStaticController = 0x00,
	SubStaticController = 0x01,
	PortableController = 0x02,
	PortableReportingController = 0x03,
	PortableSlave = 0x04,
	AlwaysOnSlave = 0x05,
	SleepingReportingSlave = 0x06,
	SleepingListeningSlave = 0x07,
}

export enum ZWavePlusNodeType {
	Node = 0x00, // ZWave+ Node
	IPGateway = 0x02, // ZWave+ for IP Gateway
}

@API(CommandClasses["Z-Wave Plus Info"])
export class ZWavePlusCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async get() {
		const cc = new ZWavePlusCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<ZWavePlusCCReport>(cc, {
			priority: MessagePriority.NodeQuery,
		}))!;
		return {
			zwavePlusVersion: response.zwavePlusVersion,
			nodeType: response.nodeType,
			roleType: response.roleType,
			installerIcon: response.installerIcon,
			userIcon: response.userIcon,
		};
	}
}

export interface ZWavePlusCC {
	ccCommand: ZWavePlusCommand;
}

@commandClass(CommandClasses["Z-Wave Plus Info"])
@implementedVersion(2)
export class ZWavePlusCC extends CommandClass {
	public static async interview(
		driver: IDriver,
		node: ZWaveNode,
	): Promise<void> {
		log.controller.logNode(node.id, {
			message: "querying Z-Wave+ information...",
			direction: "outbound",
		});

		const zwavePlusResponse = await node.commandClasses[
			"Z-Wave Plus Info"
		].get();

		const logMessage = `received response for Z-Wave+ information:
Z-Wave+ version: ${zwavePlusResponse.zwavePlusVersion}
role type:       ${ZWavePlusRoleType[zwavePlusResponse.roleType]}
node type:       ${ZWavePlusNodeType[zwavePlusResponse.nodeType]}
installer icon:  ${num2hex(zwavePlusResponse.installerIcon)}
user icon:       ${num2hex(zwavePlusResponse.userIcon)}`;
		log.controller.logNode(node.id, {
			message: logMessage,
			direction: "inbound",
		});

		// Remember that the interview is complete
		this.setInterviewComplete(node, true);
	}
}

@CCCommand(ZWavePlusCommand.Report)
export class ZWavePlusCCReport extends ZWavePlusCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 7);
		this._zwavePlusVersion = this.payload[0];
		this._roleType = this.payload[1];
		this._nodeType = this.payload[2];
		this._installerIcon = this.payload.readUInt16BE(3);
		this._userIcon = this.payload.readUInt16BE(5);
		this.persistValues();
	}

	private _zwavePlusVersion: number;
	@ccValue() public get zwavePlusVersion(): number {
		return this._zwavePlusVersion;
	}

	private _nodeType: ZWavePlusNodeType;
	@ccValue() public get nodeType(): ZWavePlusNodeType {
		return this._nodeType;
	}

	private _roleType: ZWavePlusRoleType;
	@ccValue() public get roleType(): ZWavePlusRoleType {
		return this._roleType;
	}

	private _installerIcon: number;
	@ccValue() public get installerIcon(): number {
		return this._installerIcon;
	}

	private _userIcon: number;
	@ccValue() public get userIcon(): number {
		return this._userIcon;
	}
}

@CCCommand(ZWavePlusCommand.Get)
@expectedCCResponse(ZWavePlusCCReport)
export class ZWavePlusCCGet extends ZWavePlusCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}
