import type { Maybe, MessageOrCCLogEntry, ValueID } from "@zwave-js/core";
import { CommandClasses, validatePayload, ValueMetadata } from "@zwave-js/core";
import { getEnumMemberName, num2hex } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import log from "../log";
import { MessagePriority } from "../message/Constants";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	ccValue,
	ccValueMetadata,
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

export function getZWavePlusVersionValueId(endpoint: number = 0): ValueID {
	return {
		commandClass: CommandClasses["Z-Wave Plus Info"],
		endpoint,
		property: "zwavePlusVersion",
	};
}

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Z-Wave Plus Info"])
export class ZWavePlusCCAPI extends CCAPI {
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
		const response = (await this.driver.sendCommand<ZWavePlusCCReport>(
			cc,
			this.commandOptions,
		))!;
		return {
			zwavePlusVersion: response.zwavePlusVersion,
			nodeType: response.nodeType,
			roleType: response.roleType,
			installerIcon: response.installerIcon,
			userIcon: response.userIcon,
		};
	}
}

@commandClass(CommandClasses["Z-Wave Plus Info"])
@implementedVersion(2)
export class ZWavePlusCC extends CommandClass {
	declare ccCommand: ZWavePlusCommand;

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Z-Wave Plus Info"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		if (complete) {
			// This information does not change
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying Z-Wave+ information...",
				direction: "outbound",
			});

			const zwavePlusResponse = await api.get();

			const logMessage = `received response for Z-Wave+ information:
Z-Wave+ version: ${zwavePlusResponse.zwavePlusVersion}
role type:       ${ZWavePlusRoleType[zwavePlusResponse.roleType]}
node type:       ${ZWavePlusNodeType[zwavePlusResponse.nodeType]}
installer icon:  ${num2hex(zwavePlusResponse.installerIcon)}
user icon:       ${num2hex(zwavePlusResponse.userIcon)}`;
			log.controller.logNode(node.id, {
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
	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnly,
		label: "Version of the Z-Wave+ framework",
	})
	public get zwavePlusVersion(): number {
		return this._zwavePlusVersion;
	}

	private _nodeType: ZWavePlusNodeType;
	@ccValue()
	@ccValueMetadata({
		// TODO: This should be a value list
		...ValueMetadata.ReadOnly,
		label: "Z-Wave+ node type",
	})
	public get nodeType(): ZWavePlusNodeType {
		return this._nodeType;
	}

	private _roleType: ZWavePlusRoleType;
	@ccValue()
	@ccValueMetadata({
		// TODO: This should be a value list
		...ValueMetadata.ReadOnly,
		label: "Z-Wave+ role type",
	})
	public get roleType(): ZWavePlusRoleType {
		return this._roleType;
	}

	private _installerIcon: number;
	@ccValue()
	@ccValueMetadata({
		// TODO: This should be a value list
		...ValueMetadata.ReadOnly,
		label: "Z-Wave+ Icon (for management)",
	})
	public get installerIcon(): number {
		return this._installerIcon;
	}

	private _userIcon: number;
	@ccValue()
	@ccValueMetadata({
		// TODO: This should be a value list
		...ValueMetadata.ReadOnly,
		label: "Z-Wave+ Icon (for end users)",
	})
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
