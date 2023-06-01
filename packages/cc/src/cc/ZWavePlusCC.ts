import {
	CommandClasses,
	MessagePriority,
	getCCName,
	validatePayload,
	type IZWaveEndpoint,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName, num2hex, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API";
import {
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
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

			if (zwavePlusResponse.zwavePlusVersion >= 2) {
				// A Z-Wave Plus v2 node MUST support:
				// - Association, version 2
				// - Association Group Information
				// - Device Reset Locally
				// - Firmware Update Meta Data, version 5
				// - Indicator, version 3
				// - Manufacturer Specific
				// - Multi Channel Association, version 3
				// - Powerlevel
				// - Security 2
				// - Supervision
				// - Transport Service, version 2
				// - Version, version 2
				// - Z-Wave Plus Info, version 2
				//
				// All Multi Channel End Points MUST support:
				// - Association, version 2
				// - Association Group Information
				// - Multi Channel Association, version 3
				// - Supervision
				// - Z-Wave Plus Info, version 2

				// It has been found that some devices are not advertising all of these (looking at you CTT!),
				// so we force-add support here:
				const maybeAddCC = (
					endpoint: IZWaveEndpoint,
					cc: CommandClasses,
					version: number,
				) => {
					if (
						!endpoint.supportsCC(cc) ||
						endpoint.getCCVersion(cc) < version
					) {
						applHost.controllerLog.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `force-adding support for mandatory CC ${getCCName(
								cc,
							)}${version > 1 ? ` v${version}` : ""}`,
							level: "warn",
						});

						endpoint.addCC(cc, {
							isSupported: true,
							version: Math.max(
								endpoint.getCCVersion(cc),
								version,
							),
						});
					}
				};

				const mandatoryCCs: { cc: CommandClasses; version: number }[] =
					endpoint.index === 0
						? [
								{ cc: CommandClasses.Association, version: 2 },
								{
									cc: CommandClasses[
										"Association Group Information"
									],
									version: 1,
								},
								{
									cc: CommandClasses["Device Reset Locally"],
									version: 1,
								},
								{
									cc: CommandClasses[
										"Firmware Update Meta Data"
									],
									version: 5,
								},
								{ cc: CommandClasses.Indicator, version: 3 },
								{
									cc: CommandClasses["Manufacturer Specific"],
									version: 1,
								},
								{
									cc: CommandClasses[
										"Multi Channel Association"
									],
									version: 3,
								},
								{ cc: CommandClasses.Powerlevel, version: 1 },
								{ cc: CommandClasses.Security, version: 1 },
								{ cc: CommandClasses.Supervision, version: 1 },
								{
									cc: CommandClasses["Transport Service"],
									version: 2,
								},
								{ cc: CommandClasses.Version, version: 2 },
						  ]
						: [
								{ cc: CommandClasses.Association, version: 2 },
								{
									cc: CommandClasses[
										"Association Group Information"
									],
									version: 1,
								},
								{
									cc: CommandClasses[
										"Multi Channel Association"
									],
									version: 3,
								},
								{ cc: CommandClasses.Supervision, version: 1 },
						  ];

				for (const { cc, version } of mandatoryCCs) {
					maybeAddCC(endpoint, cc, version);
				}
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
