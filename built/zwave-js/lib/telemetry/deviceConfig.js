"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportMissingDeviceConfig = void 0;
const got_1 = __importDefault(require("@esm2cjs/got"));
const Sentry = __importStar(require("@sentry/node"));
const cc_1 = require("@zwave-js/cc");
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const missingDeviceConfigCache = new Set();
async function reportMissingDeviceConfig(applHost, node) {
    const configFingerprint = `${(0, shared_1.formatId)(node.manufacturerId)}:${(0, shared_1.formatId)(node.productType)}:${(0, shared_1.formatId)(node.productId)}:${node.firmwareVersion}`;
    // We used to get a LOT of false positives, so we should check with our device
    // database whether this config file is actually unknown
    // If we tried to report this file earlier, we can skip the report
    if (missingDeviceConfigCache.has(configFingerprint))
        return;
    // Otherwise ask our device DB if it exists
    try {
        const data = await got_1.default
            .get(`https://devices.zwave-js.io/public_api/getdeviceinfo/${configFingerprint.replace(/:/g, "/")}`)
            .json();
        if ((0, typeguards_1.isObject)(data) &&
            typeof data.deviceFound === "boolean" &&
            data.deviceFound) {
            // This is a false positive - remember it
            missingDeviceConfigCache.add(configFingerprint);
            return;
        }
    }
    catch (e) {
        // didn't work, try again next time
        return;
    }
    const message = `Missing device config: ${configFingerprint}`;
    const deviceInfo = {
        supportsConfigCCV3: node.getCCVersion(core_1.CommandClasses.Configuration) >= 3,
        supportsAGI: node.supportsCC(core_1.CommandClasses["Association Group Information"]),
        supportsZWavePlus: node.supportsCC(core_1.CommandClasses["Z-Wave Plus Info"]),
    };
    try {
        if (deviceInfo.supportsConfigCCV3) {
            // Try to collect all info about config params we can get
            const instance = node.createCCInstanceUnsafe(cc_1.ConfigurationCC);
            deviceInfo.parameters = instance.getQueriedParamInfos(applHost);
        }
        if (deviceInfo.supportsAGI) {
            // Try to collect all info about association groups we can get
            const associationGroupCount = cc_1.AssociationGroupInfoCC["getAssociationGroupCountCached"](applHost, node);
            const names = [];
            for (let group = 1; group <= associationGroupCount; group++) {
                names.push(cc_1.AssociationGroupInfoCC.getGroupNameCached(applHost, node, group) ?? "");
            }
            deviceInfo.associationGroups = names;
        }
        if (deviceInfo.supportsZWavePlus) {
            deviceInfo.zWavePlusVersion = node.zwavePlusVersion;
        }
    }
    catch {
        // Don't fail on the last meters :)
    }
    Sentry.captureMessage(message, (scope) => {
        scope.clearBreadcrumbs();
        // Group by device config, otherwise Sentry groups by "Unknown device config", which is nonsense
        scope.setFingerprint([configFingerprint]);
        scope.setExtras(deviceInfo);
        return scope;
    });
    // Remember that we reported the config
    missingDeviceConfigCache.add(configFingerprint);
}
exports.reportMissingDeviceConfig = reportMissingDeviceConfig;
//# sourceMappingURL=deviceConfig.js.map