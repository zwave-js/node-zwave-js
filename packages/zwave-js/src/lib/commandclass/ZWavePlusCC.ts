import type { Maybe, MessageOrCCLogEntry, ValueID } from "@zwave-js/core";
import { CommandClasses, validatePayload } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { getEnumMemberName, num2hex, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import type { Driver } from "../driver/Driver";
import { PhysicalCCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import {
	ZWavePlusCommand,
	ZWavePlusNodeType,
	ZWavePlusRoleType,
} from "./_Types";

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
			case ZWavePlusCommand.Report:
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

	@validateArgs()
	public async sendReport(options: ZWavePlusCCReportOptions): Promise<void> {
		this.assertSupportsCommand(ZWavePlusCommand, ZWavePlusCommand.Report);

		const cc = new ZWavePlusCCReport(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Z-Wave Plus Info"])
@implementedVersion(2)
export class ZWavePlusCC extends CommandClass {
	declare ccCommand: ZWavePlusCommand;

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses["Z-Wave Plus Info"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		driver.controllerLog.logNode(node.id, {
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
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

export interface ZWavePlusCCReportOptions {
	zwavePlusVersion: number;
	nodeType: ZWavePlusNodeType;
	roleType: ZWavePlusRoleType;
	installerIcon: number;
	userIcon: number;
}

@CCCommand(ZWavePlusCommand.Report)
export class ZWavePlusCCReport extends ZWavePlusCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & ZWavePlusCCReportOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 7);
			this.zwavePlusVersion = this.payload[0];
			this.roleType = this.payload[1];
			this.nodeType = this.payload[2];
			this.installerIcon = this.payload.readUInt16BE(3);
			this.userIcon = this.payload.readUInt16BE(5);
			this.persistValues();
		} else {
			this.zwavePlusVersion = options.zwavePlusVersion;
			this.roleType = options.roleType;
			this.nodeType = options.nodeType;
			this.installerIcon = options.installerIcon;
			this.userIcon = options.userIcon;
		}
	}

	@ccValue({ internal: true })
	public zwavePlusVersion: number;
	@ccValue({ internal: true })
	public nodeType: ZWavePlusNodeType;
	@ccValue({ internal: true })
	public roleType: ZWavePlusRoleType;
	@ccValue({ internal: true })
	public installerIcon: number;
	@ccValue({ internal: true })
	public userIcon: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.zwavePlusVersion,
			this.roleType,
			this.nodeType,
			// placeholder for icons
			0,
			0,
			0,
			0,
		]);
		this.payload.writeUInt16BE(this.installerIcon, 3);
		this.payload.writeUInt16BE(this.userIcon, 5);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				version: this.zwavePlusVersion,
				"node type": getEnumMemberName(
					ZWavePlusNodeType,
					this.nodeType,
				),
				"role type": getEnumMemberName(
					ZWavePlusRoleType,
					this.roleType,
				),
				"icon (mgmt.)": num2hex(this.installerIcon),
				"icon (user)": num2hex(this.userIcon),
			},
		};
	}
}

@CCCommand(ZWavePlusCommand.Get)
@expectedCCResponse(ZWavePlusCCReport)
export class ZWavePlusCCGet extends ZWavePlusCC {}
