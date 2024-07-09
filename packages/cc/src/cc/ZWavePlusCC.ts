import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { getEnumMemberName, num2hex, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API";
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
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	ZWavePlusCommand,
	ZWavePlusNodeType,
	ZWavePlusRoleType,
} from "../lib/_Types";

// SDS13782 The advertised Z-Wave Plus Version, Role Type and Node Type information values
// MUST be identical for the Root Device and all Multi Channel End Points
// --> We only access endpoint 0

export const ZWavePlusCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Z-Wave Plus Info"], {
		...V.staticProperty("zwavePlusVersion", undefined, {
			supportsEndpoints: false,
			internal: true,
		}),

		...V.staticProperty("nodeType", undefined, {
			supportsEndpoints: false,
			internal: true,
		}),

		...V.staticProperty("roleType", undefined, {
			supportsEndpoints: false,
			internal: true,
		}),

		...V.staticProperty("userIcon", undefined, {
			internal: true,
		}),

		...V.staticProperty("installerIcon", undefined, {
			internal: true,
		}),
	}),
});

// @noSetValueAPI This CC is read-only

@API(CommandClasses["Z-Wave Plus Info"])
export class ZWavePlusCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: ZWavePlusCommand): MaybeNotKnown<boolean> {
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

		const cc = new ZWavePlusCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<ZWavePlusCCReport>(
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

		const cc = new ZWavePlusCCReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Z-Wave Plus Info"])
@implementedVersion(2)
@ccValues(ZWavePlusCCValues)
export class ZWavePlusCC extends CommandClass {
	declare ccCommand: ZWavePlusCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Z-Wave Plus Info"],
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

		applHost.controllerLog.logNode(node.id, {
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
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}
}

// @publicAPI
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
		} else {
			this.zwavePlusVersion = options.zwavePlusVersion;
			this.roleType = options.roleType;
			this.nodeType = options.nodeType;
			this.installerIcon = options.installerIcon;
			this.userIcon = options.userIcon;
		}
	}

	@ccValue(ZWavePlusCCValues.zwavePlusVersion)
	public zwavePlusVersion: number;

	@ccValue(ZWavePlusCCValues.nodeType)
	public nodeType: ZWavePlusNodeType;

	@ccValue(ZWavePlusCCValues.roleType)
	public roleType: ZWavePlusRoleType;

	@ccValue(ZWavePlusCCValues.installerIcon)
	public installerIcon: number;

	@ccValue(ZWavePlusCCValues.userIcon)
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
