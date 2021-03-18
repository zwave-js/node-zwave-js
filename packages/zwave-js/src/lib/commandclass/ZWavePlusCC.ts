import type { Maybe, MessageOrCCLogEntry, ValueID } from "@zwave-js/core";
import { CommandClasses, validatePayload } from "@zwave-js/core";
import { getEnumMemberName, num2hex, pick } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import { PhysicalCCAPI } from "./API";
import {
	API,
	CCCommand,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";

export enum ZWavePlusCommand {
	Get = 0x01,
	Report = 0x02,
}

/**
 * @publicAPI
 */
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

/**
 * @publicAPI
 */
export enum ZWavePlusNodeType {
	Node = 0x00, // ZWave+ Node
	IPGateway = 0x02, // ZWave+ for IP Gateway
}

// SDS13782 The advertised Z-Wave Plus Version, Role Type and Node Type information values
// MUST be identical for the Root Device and all Multi Channel End Points
// --> We only access endpoint 0

export function getZWavePlusVersionValueId(): ValueID {
	return {
		commandClass: CommandClasses["Z-Wave Plus Info"],
		property: "zwavePlusVersion",
	};
}

export function getNodeTypeValueId(): ValueID {
	return {
		commandClass: CommandClasses["Z-Wave Plus Info"],
		property: "nodeType",
	};
}

export function getRoleTypeValueId(): ValueID {
	return {
		commandClass: CommandClasses["Z-Wave Plus Info"],
		property: "roleType",
	};
}

export function getInstallerIconValueId(endpoint: number = 0): ValueID {
	return {
		commandClass: CommandClasses["Z-Wave Plus Info"],
		endpoint,
		property: "installerIcon",
	};
}

export function getUserIconValueId(endpoint: number = 0): ValueID {
	return {
		commandClass: CommandClasses["Z-Wave Plus Info"],
		endpoint,
		property: "userIcon",
	};
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Z-Wave Plus Info"])
export class ZWavePlusCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: ZWavePlusCommand): Maybe<boolean> {
		switch (cmd) {
			case ZWavePlusCommand.Get:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async get() {
		this.assertSupportsCommand(ZWavePlusCommand, ZWavePlusCommand.Get);

		const cc = new ZWavePlusCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<ZWavePlusCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"zwavePlusVersion",
				"nodeType",
				"roleType",
				"installerIcon",
				"userIcon",
			]);
		}
	}
}

@commandClass(CommandClasses["Z-Wave Plus Info"])
@implementedVersion(2)
export class ZWavePlusCC extends CommandClass {
	declare ccCommand: ZWavePlusCommand;

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Z-Wave Plus Info"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying Z-Wave+ information...",
			direction: "outbound",
		});

		const zwavePlusResponse = await api.get();
		if (zwavePlusResponse) {
			const logMessage = `received response for Z-Wave+ information:
Z-Wave+ version: ${zwavePlusResponse.zwavePlusVersion}
role type:       ${ZWavePlusRoleType[zwavePlusResponse.roleType]}
node type:       ${ZWavePlusNodeType[zwavePlusResponse.nodeType]}
installer icon:  ${num2hex(zwavePlusResponse.installerIcon)}
user icon:       ${num2hex(zwavePlusResponse.userIcon)}`;
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(ZWavePlusCommand.Report)
export class ZWavePlusCCReport extends ZWavePlusCC {
	public constructor(
		driver: Driver,
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
	@ccValue({ internal: true })
	public get zwavePlusVersion(): number {
		return this._zwavePlusVersion;
	}

	private _nodeType: ZWavePlusNodeType;
	@ccValue({ internal: true })
	public get nodeType(): ZWavePlusNodeType {
		return this._nodeType;
	}

	private _roleType: ZWavePlusRoleType;
	@ccValue({ internal: true })
	public get roleType(): ZWavePlusRoleType {
		return this._roleType;
	}

	private _installerIcon: number;
	@ccValue({ internal: true })
	public get installerIcon(): number {
		return this._installerIcon;
	}

	private _userIcon: number;
	@ccValue({ internal: true })
	public get userIcon(): number {
		return this._userIcon;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				version: this._zwavePlusVersion,
				"node type": getEnumMemberName(
					ZWavePlusNodeType,
					this._nodeType,
				),
				"role type": getEnumMemberName(
					ZWavePlusRoleType,
					this._roleType,
				),
				"icon (mgmt.)": num2hex(this._installerIcon),
				"icon (user)": num2hex(this._userIcon),
			},
		};
	}
}

@CCCommand(ZWavePlusCommand.Get)
@expectedCCResponse(ZWavePlusCCReport)
export class ZWavePlusCCGet extends ZWavePlusCC {}
