import {
	type CommandClass,
	MultiChannelCCCapabilityGet,
	MultiChannelCCCapabilityReport,
	MultiChannelCCEndPointFind,
	MultiChannelCCEndPointFindReport,
	MultiChannelCCEndPointGet,
	MultiChannelCCEndPointReport,
	Security2CC,
	Security2CCMessageEncapsulation,
	SecurityCC,
	SecurityCCCommandEncapsulation,
	VersionCCCommandClassGet,
	VersionCCCommandClassReport,
	ZWavePlusNodeType,
	ZWavePlusRoleType,
} from "@zwave-js/cc";
import { ZWavePlusCCGet, ZWavePlusCCReport } from "@zwave-js/cc/ZWavePlusCC";
import {
	ZWaveProtocolCCNodeInformationFrame,
	ZWaveProtocolCCRequestNodeInformationFrame,
} from "@zwave-js/cc/ZWaveProtocolCC";
import {
	type MockNodeBehavior,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";

import { CommandClasses } from "@zwave-js/core";
import { BasicCCBehaviors } from "./mockCCBehaviors/Basic";
import { ConfigurationCCBehaviors } from "./mockCCBehaviors/Configuration";
import { EnergyProductionCCBehaviors } from "./mockCCBehaviors/EnergyProduction";
import { ManufacturerSpecificCCBehaviors } from "./mockCCBehaviors/ManufacturerSpecific";
import { MultilevelSensorCCBehaviors } from "./mockCCBehaviors/MultilevelSensor";
import { NotificationCCBehaviors } from "./mockCCBehaviors/Notification";
import { ScheduleEntryLockCCBehaviors } from "./mockCCBehaviors/ScheduleEntryLock";
import { SoundSwitchCCBehaviors } from "./mockCCBehaviors/SoundSwitch";
import { ThermostatModeCCBehaviors } from "./mockCCBehaviors/ThermostatMode";
import { ThermostatSetpointCCBehaviors } from "./mockCCBehaviors/ThermostatSetpoint";
import { UserCodeCCBehaviors } from "./mockCCBehaviors/UserCode";
import { WindowCoveringCCBehaviors } from "./mockCCBehaviors/WindowCovering";

const respondToRequestNodeInfo: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload
				instanceof ZWaveProtocolCCRequestNodeInformationFrame
		) {
			const cc = new ZWaveProtocolCCNodeInformationFrame(self.host, {
				nodeId: self.id,
				...self.capabilities,
				supportedCCs: [...self.implementedCCs]
					.filter(([, info]) => info.isSupported)
					.map(([ccId]) => ccId),
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			return true;
		}
	},
};

const respondToVersionCCCommandClassGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof VersionCCCommandClassGet
		) {
			const endpoint = frame.payload.endpointIndex === 0
				? self
				: self.endpoints.get(frame.payload.endpointIndex);
			if (!endpoint) return false;

			let version = 0;
			for (const ep of [self, ...self.endpoints.values()]) {
				const info = ep.implementedCCs.get(frame.payload.requestedCC);
				if (info?.version) {
					version = info.version;
					break;
				}
			}

			// Basic CC is always supported implicitly
			if (
				version === 0
				&& frame.payload.requestedCC === CommandClasses.Basic
			) {
				version = 1;
			}

			const cc = new VersionCCCommandClassReport(self.host, {
				nodeId: self.id,
				endpoint: "index" in endpoint ? endpoint.index : undefined,
				requestedCC: frame.payload.requestedCC,
				ccVersion: version,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			return true;
		}
	},
};

const respondToMultiChannelCCEndPointGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof MultiChannelCCEndPointGet
		) {
			const cc = new MultiChannelCCEndPointReport(self.host, {
				nodeId: controller.host.ownNodeId,
				countIsDynamic: false,
				identicalCapabilities: false,
				individualCount: self.endpoints.size,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			return true;
		}
		return false;
	},
};

const respondToMultiChannelCCEndPointFind: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof MultiChannelCCEndPointFind
		) {
			const request = frame.payload;
			const cc = new MultiChannelCCEndPointFindReport(self.host, {
				nodeId: controller.host.ownNodeId,
				genericClass: request.genericClass,
				specificClass: request.specificClass,
				foundEndpoints: [...self.endpoints.keys()],
				reportsToFollow: 0,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			return true;
		}
		return false;
	},
};

const respondToMultiChannelCCCapabilityGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof MultiChannelCCCapabilityGet
		) {
			const endpoint = self.endpoints.get(
				frame.payload.requestedEndpoint,
			)!;
			const cc = new MultiChannelCCCapabilityReport(self.host, {
				nodeId: controller.host.ownNodeId,
				endpointIndex: endpoint.index,
				genericDeviceClass: endpoint?.capabilities.genericDeviceClass
					?? self.capabilities.genericDeviceClass,
				specificDeviceClass: endpoint?.capabilities.specificDeviceClass
					?? self.capabilities.specificDeviceClass,
				isDynamic: false,
				wasRemoved: false,
				supportedCCs: [...endpoint.implementedCCs.keys()],
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			return true;
		}
		return false;
	},
};

const respondToZWavePlusCCGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof ZWavePlusCCGet
		) {
			const cc = new ZWavePlusCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				zwavePlusVersion: 2,
				nodeType: ZWavePlusNodeType.Node,
				roleType: self.capabilities.isListening
					? ZWavePlusRoleType.AlwaysOnSlave
					: self.capabilities.isFrequentListening
					? ZWavePlusRoleType.SleepingListeningSlave
					: ZWavePlusRoleType.SleepingReportingSlave,
				installerIcon: 0x0000,
				userIcon: 0x0000,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: true,
				}),
			);
			return true;
		}
	},
};

// TODO: We should handle this more generically:
const respondToS0ZWavePlusCCGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof SecurityCCCommandEncapsulation
			&& frame.payload.encapsulated instanceof ZWavePlusCCGet
		) {
			let cc: CommandClass = new ZWavePlusCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				zwavePlusVersion: 2,
				nodeType: ZWavePlusNodeType.Node,
				roleType: self.capabilities.isListening
					? ZWavePlusRoleType.AlwaysOnSlave
					: self.capabilities.isFrequentListening
					? ZWavePlusRoleType.SleepingListeningSlave
					: ZWavePlusRoleType.SleepingReportingSlave,
				installerIcon: 0x0000,
				userIcon: 0x0000,
			});
			cc = SecurityCC.encapsulate(self.host, cc);
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: true,
				}),
			);
			return true;
		}
	},
};

const respondToS2ZWavePlusCCGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof Security2CCMessageEncapsulation
			&& frame.payload.encapsulated instanceof ZWavePlusCCGet
		) {
			let cc: CommandClass = new ZWavePlusCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				zwavePlusVersion: 2,
				nodeType: ZWavePlusNodeType.Node,
				roleType: self.capabilities.isListening
					? ZWavePlusRoleType.AlwaysOnSlave
					: self.capabilities.isFrequentListening
					? ZWavePlusRoleType.SleepingListeningSlave
					: ZWavePlusRoleType.SleepingReportingSlave,
				installerIcon: 0x0000,
				userIcon: 0x0000,
			});
			cc = Security2CC.encapsulate(self.host, cc);
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: true,
				}),
			);
			return true;
		}
	},
};

/** Predefined default behaviors that are required for interacting with the Mock Controller correctly */
export function createDefaultBehaviors(): MockNodeBehavior[] {
	return [
		respondToRequestNodeInfo,
		respondToVersionCCCommandClassGet,
		respondToMultiChannelCCEndPointGet,
		respondToMultiChannelCCEndPointFind,
		respondToMultiChannelCCCapabilityGet,

		respondToZWavePlusCCGet,
		respondToS0ZWavePlusCCGet,
		respondToS2ZWavePlusCCGet,

		...BasicCCBehaviors,
		...ConfigurationCCBehaviors,
		...EnergyProductionCCBehaviors,
		...ManufacturerSpecificCCBehaviors,
		...MultilevelSensorCCBehaviors,
		...NotificationCCBehaviors,
		...ScheduleEntryLockCCBehaviors,
		...SoundSwitchCCBehaviors,
		...ThermostatModeCCBehaviors,
		...ThermostatSetpointCCBehaviors,
		...UserCodeCCBehaviors,
		...WindowCoveringCCBehaviors,
	];
}
