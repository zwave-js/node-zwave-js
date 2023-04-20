"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestingHost = void 0;
/* eslint-disable @typescript-eslint/require-await */
const config_1 = require("@zwave-js/config");
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
/** Creates a {@link ZWaveApplicationHost} that can be used for testing */
function createTestingHost(options = {}) {
    const valuesStorage = new Map();
    const metadataStorage = new Map();
    const valueDBCache = new Map();
    const ret = {
        homeId: options.homeId ?? 0x7e570001,
        ownNodeId: options.ownNodeId ?? 1,
        isControllerNode: (nodeId) => nodeId === ret.ownNodeId,
        securityManager: undefined,
        securityManager2: undefined,
        getDeviceConfig: undefined,
        controllerLog: new Proxy({}, {
            get() {
                return () => {
                    /* intentionally empty */
                };
            },
        }),
        configManager: new config_1.ConfigManager(),
        options: {
            attempts: {
                nodeInterview: 1,
                // openSerialPort: 1,
                sendData: 3,
                controller: 3,
            },
            timeouts: {
                refreshValue: 5000,
                refreshValueAfterTransition: 1000,
            },
        },
        nodes: (0, shared_1.createThrowingMap)((nodeId) => {
            throw new core_1.ZWaveError(`Node ${nodeId} was not found!`, core_1.ZWaveErrorCodes.Controller_NodeNotFound);
        }),
        getSafeCCVersionForNode: options.getSafeCCVersionForNode ?? (() => 100),
        getSupportedCCVersionForEndpoint: options.getSupportedCCVersionForEndpoint ??
            options.getSafeCCVersionForNode ??
            (() => 100),
        getNextCallbackId: (0, shared_1.createWrappingCounter)(0xff),
        getNextSupervisionSessionId: (0, shared_1.createWrappingCounter)(core_1.MAX_SUPERVISION_SESSION_ID),
        getValueDB: (nodeId) => {
            if (!valueDBCache.has(nodeId)) {
                valueDBCache.set(nodeId, new core_1.ValueDB(nodeId, valuesStorage, metadataStorage));
            }
            return valueDBCache.get(nodeId);
        },
        tryGetValueDB: (nodeId) => {
            return ret.getValueDB(nodeId);
        },
        isCCSecure: (ccId, nodeId, endpointIndex = 0) => {
            const node = ret.nodes.get(nodeId);
            const endpoint = node?.getEndpoint(endpointIndex);
            return (node?.isSecure !== false &&
                !!(endpoint ?? node)?.isCCSecure(ccId) &&
                !!(ret.securityManager || ret.securityManager2));
        },
        getHighestSecurityClass: (nodeId) => {
            const node = ret.nodes.getOrThrow(nodeId);
            return node.getHighestSecurityClass();
        },
        hasSecurityClass: (nodeId, securityClass) => {
            const node = ret.nodes.getOrThrow(nodeId);
            return node.hasSecurityClass(securityClass);
        },
        setSecurityClass: (nodeId, securityClass, granted) => {
            const node = ret.nodes.getOrThrow(nodeId);
            node.setSecurityClass(securityClass, granted);
        },
        sendCommand: async (_command, _options) => {
            return undefined;
        },
        waitForCommand: async (_predicate, _timeout) => {
            return undefined;
        },
        schedulePoll: (_nodeId, _valueId, _options) => {
            return false;
        },
    };
    return ret;
}
exports.createTestingHost = createTestingHost;
//# sourceMappingURL=mocks.js.map