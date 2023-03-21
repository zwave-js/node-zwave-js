"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultBehaviors = void 0;
const cc_1 = require("@zwave-js/cc");
const ZWavePlusCC_1 = require("@zwave-js/cc/ZWavePlusCC");
const ZWaveProtocolCC_1 = require("@zwave-js/cc/ZWaveProtocolCC");
const testing_1 = require("@zwave-js/testing");
const respondToRequestNodeInfo = {
    async onControllerFrame(controller, self, frame) {
        if (frame.type === testing_1.MockZWaveFrameType.Request &&
            frame.payload instanceof ZWaveProtocolCC_1.ZWaveProtocolCCRequestNodeInformationFrame) {
            const cc = new ZWaveProtocolCC_1.ZWaveProtocolCCNodeInformationFrame(self.host, {
                nodeId: self.id,
                ...self.capabilities,
                supportedCCs: [...self.implementedCCs]
                    .filter(([, info]) => info.isSupported)
                    .map(([ccId]) => ccId),
            });
            await self.sendToController((0, testing_1.createMockZWaveRequestFrame)(cc, {
                ackRequested: false,
            }));
            return true;
        }
    },
};
const respondToVersionCCCommandClassGet = {
    async onControllerFrame(controller, self, frame) {
        if (frame.type === testing_1.MockZWaveFrameType.Request &&
            frame.payload instanceof cc_1.VersionCCCommandClassGet) {
            const endpoint = frame.payload.endpointIndex === 0
                ? self
                : self.endpoints.get(frame.payload.endpointIndex);
            if (!endpoint)
                return false;
            let version = 0;
            for (const ep of [self, ...self.endpoints.values()]) {
                const info = ep.implementedCCs.get(frame.payload.requestedCC);
                if (info?.version) {
                    version = info.version;
                    break;
                }
            }
            const cc = new cc_1.VersionCCCommandClassReport(self.host, {
                nodeId: self.id,
                endpoint: "index" in endpoint ? endpoint.index : undefined,
                requestedCC: frame.payload.requestedCC,
                ccVersion: version,
            });
            await self.sendToController((0, testing_1.createMockZWaveRequestFrame)(cc, {
                ackRequested: false,
            }));
            return true;
        }
    },
};
const respondToMultiChannelCCEndPointGet = {
    async onControllerFrame(controller, self, frame) {
        if (frame.type === testing_1.MockZWaveFrameType.Request &&
            frame.payload instanceof cc_1.MultiChannelCCEndPointGet) {
            const cc = new cc_1.MultiChannelCCEndPointReport(self.host, {
                nodeId: controller.host.ownNodeId,
                countIsDynamic: false,
                identicalCapabilities: false,
                individualCount: self.endpoints.size,
            });
            await self.sendToController((0, testing_1.createMockZWaveRequestFrame)(cc, {
                ackRequested: false,
            }));
            return true;
        }
        return false;
    },
};
const respondToMultiChannelCCEndPointFind = {
    async onControllerFrame(controller, self, frame) {
        if (frame.type === testing_1.MockZWaveFrameType.Request &&
            frame.payload instanceof cc_1.MultiChannelCCEndPointFind) {
            const request = frame.payload;
            const cc = new cc_1.MultiChannelCCEndPointFindReport(self.host, {
                nodeId: controller.host.ownNodeId,
                genericClass: request.genericClass,
                specificClass: request.specificClass,
                foundEndpoints: [...self.endpoints.keys()],
                reportsToFollow: 0,
            });
            await self.sendToController((0, testing_1.createMockZWaveRequestFrame)(cc, {
                ackRequested: false,
            }));
            return true;
        }
        return false;
    },
};
const respondToMultiChannelCCCapabilityGet = {
    async onControllerFrame(controller, self, frame) {
        if (frame.type === testing_1.MockZWaveFrameType.Request &&
            frame.payload instanceof cc_1.MultiChannelCCCapabilityGet) {
            const endpoint = self.endpoints.get(frame.payload.requestedEndpoint);
            const cc = new cc_1.MultiChannelCCCapabilityReport(self.host, {
                nodeId: controller.host.ownNodeId,
                endpointIndex: endpoint.index,
                genericDeviceClass: endpoint?.capabilities.genericDeviceClass ??
                    self.capabilities.genericDeviceClass,
                specificDeviceClass: endpoint?.capabilities.specificDeviceClass ??
                    self.capabilities.specificDeviceClass,
                isDynamic: false,
                wasRemoved: false,
                supportedCCs: [...endpoint.implementedCCs.keys()],
            });
            await self.sendToController((0, testing_1.createMockZWaveRequestFrame)(cc, {
                ackRequested: false,
            }));
            return true;
        }
        return false;
    },
};
const respondToZWavePlusCCGet = {
    async onControllerFrame(controller, self, frame) {
        if (frame.type === testing_1.MockZWaveFrameType.Request &&
            frame.payload instanceof ZWavePlusCC_1.ZWavePlusCCGet) {
            const cc = new ZWavePlusCC_1.ZWavePlusCCReport(self.host, {
                nodeId: controller.host.ownNodeId,
                zwavePlusVersion: 2,
                nodeType: cc_1.ZWavePlusNodeType.Node,
                roleType: self.capabilities.isListening
                    ? cc_1.ZWavePlusRoleType.AlwaysOnSlave
                    : self.capabilities.isFrequentListening
                        ? cc_1.ZWavePlusRoleType.SleepingListeningSlave
                        : cc_1.ZWavePlusRoleType.SleepingReportingSlave,
                installerIcon: 0x0000,
                userIcon: 0x0000,
            });
            await self.sendToController((0, testing_1.createMockZWaveRequestFrame)(cc, {
                ackRequested: true,
            }));
            return true;
        }
    },
};
// TODO: We should handle this more generically:
const respondToS0ZWavePlusCCGet = {
    async onControllerFrame(controller, self, frame) {
        if (frame.type === testing_1.MockZWaveFrameType.Request &&
            frame.payload instanceof cc_1.SecurityCCCommandEncapsulation &&
            frame.payload.encapsulated instanceof ZWavePlusCC_1.ZWavePlusCCGet) {
            let cc = new ZWavePlusCC_1.ZWavePlusCCReport(self.host, {
                nodeId: controller.host.ownNodeId,
                zwavePlusVersion: 2,
                nodeType: cc_1.ZWavePlusNodeType.Node,
                roleType: self.capabilities.isListening
                    ? cc_1.ZWavePlusRoleType.AlwaysOnSlave
                    : self.capabilities.isFrequentListening
                        ? cc_1.ZWavePlusRoleType.SleepingListeningSlave
                        : cc_1.ZWavePlusRoleType.SleepingReportingSlave,
                installerIcon: 0x0000,
                userIcon: 0x0000,
            });
            cc = cc_1.SecurityCC.encapsulate(self.host, cc);
            await self.sendToController((0, testing_1.createMockZWaveRequestFrame)(cc, {
                ackRequested: true,
            }));
            return true;
        }
    },
};
const respondToS2ZWavePlusCCGet = {
    async onControllerFrame(controller, self, frame) {
        if (frame.type === testing_1.MockZWaveFrameType.Request &&
            frame.payload instanceof cc_1.Security2CCMessageEncapsulation &&
            frame.payload.encapsulated instanceof ZWavePlusCC_1.ZWavePlusCCGet) {
            let cc = new ZWavePlusCC_1.ZWavePlusCCReport(self.host, {
                nodeId: controller.host.ownNodeId,
                zwavePlusVersion: 2,
                nodeType: cc_1.ZWavePlusNodeType.Node,
                roleType: self.capabilities.isListening
                    ? cc_1.ZWavePlusRoleType.AlwaysOnSlave
                    : self.capabilities.isFrequentListening
                        ? cc_1.ZWavePlusRoleType.SleepingListeningSlave
                        : cc_1.ZWavePlusRoleType.SleepingReportingSlave,
                installerIcon: 0x0000,
                userIcon: 0x0000,
            });
            cc = cc_1.Security2CC.encapsulate(self.host, cc);
            await self.sendToController((0, testing_1.createMockZWaveRequestFrame)(cc, {
                ackRequested: true,
            }));
            return true;
        }
    },
};
/** Predefined default behaviors that are required for interacting with the Mock Controller correctly */
function createDefaultBehaviors() {
    return [
        respondToRequestNodeInfo,
        respondToVersionCCCommandClassGet,
        respondToMultiChannelCCEndPointGet,
        respondToMultiChannelCCEndPointFind,
        respondToMultiChannelCCCapabilityGet,
        respondToZWavePlusCCGet,
        respondToS0ZWavePlusCCGet,
        respondToS2ZWavePlusCCGet,
    ];
}
exports.createDefaultBehaviors = createDefaultBehaviors;
//# sourceMappingURL=MockNodeBehaviors.js.map