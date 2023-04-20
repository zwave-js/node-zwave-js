"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionCCZWaveSoftwareGet = exports.VersionCCZWaveSoftwareReport = exports.VersionCCCapabilitiesGet = exports.VersionCCCapabilitiesReport = exports.VersionCCCommandClassGet = exports.VersionCCCommandClassReport = exports.VersionCCGet = exports.VersionCCReport = exports.VersionCC = exports.VersionCCAPI = exports.VersionCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    return _number($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.VersionCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Version, {
        ...Values_1.V.staticProperty("firmwareVersions", {
            ...safe_1.ValueMetadata.ReadOnly,
            type: "string[]",
            label: "Z-Wave chip firmware versions",
        }, { supportsEndpoints: false }),
        ...Values_1.V.staticProperty("libraryType", {
            ...safe_1.ValueMetadata.ReadOnlyNumber,
            label: "Library type",
            states: (0, safe_1.enumValuesToMetadataStates)(safe_1.ZWaveLibraryTypes),
        }, { supportsEndpoints: false }),
        ...Values_1.V.staticProperty("protocolVersion", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Z-Wave protocol version",
        }, { supportsEndpoints: false }),
        ...Values_1.V.staticProperty("hardwareVersion", {
            ...safe_1.ValueMetadata.ReadOnlyNumber,
            label: "Z-Wave chip hardware version",
        }, {
            minVersion: 2,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("supportsZWaveSoftwareGet", undefined, {
            minVersion: 3,
            internal: true,
        }),
        ...Values_1.V.staticProperty("sdkVersion", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "SDK version",
        }, {
            minVersion: 3,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("applicationFrameworkAPIVersion", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Z-Wave application framework API version",
        }, {
            minVersion: 3,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("applicationFrameworkBuildNumber", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Z-Wave application framework API build number",
        }, {
            minVersion: 3,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticPropertyWithName("serialAPIVersion", "hostInterfaceVersion", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Serial API version",
        }, {
            minVersion: 3,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticPropertyWithName("serialAPIBuildNumber", "hostInterfaceBuildNumber", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Serial API build number",
        }, {
            minVersion: 3,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("zWaveProtocolVersion", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Z-Wave protocol version",
        }, {
            minVersion: 3,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("zWaveProtocolBuildNumber", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Z-Wave protocol build number",
        }, {
            minVersion: 3,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("applicationVersion", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Application version",
        }, {
            minVersion: 3,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("applicationBuildNumber", {
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: "Application build number",
        }, {
            minVersion: 3,
            supportsEndpoints: false,
        }),
    }),
});
function parseVersion(buffer) {
    if (buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 0)
        return "unused";
    return `${buffer[0]}.${buffer[1]}.${buffer[2]}`;
}
// @noSetValueAPI This CC is read-only
let VersionCCAPI = class VersionCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.VersionCommand.Get:
            case _Types_1.VersionCommand.CommandClassGet:
                return true; // This is mandatory
            case _Types_1.VersionCommand.CapabilitiesGet:
                // The API might have been created before the versions were determined,
                // so `this.version` may contains a wrong value
                return (this.applHost.getSafeCCVersionForNode(this.ccId, this.endpoint.nodeId, this.endpoint.index) >= 3);
            case _Types_1.VersionCommand.ZWaveSoftwareGet: {
                let ret = this.getValueDB().getValue(exports.VersionCCValues.supportsZWaveSoftwareGet.endpoint(this.endpoint.index));
                if (ret == undefined)
                    ret = safe_1.unknownBoolean;
                return ret;
            }
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.VersionCommand, _Types_1.VersionCommand.Get);
        const cc = new VersionCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "libraryType",
                "protocolVersion",
                "firmwareVersions",
                "hardwareVersion",
            ]);
        }
    }
    async getCCVersion(requestedCC) {
        __assertType("requestedCC", "CommandClasses", __assertType__number.bind(void 0, requestedCC));
        this.assertSupportsCommand(_Types_1.VersionCommand, _Types_1.VersionCommand.CommandClassGet);
        const cc = new VersionCCCommandClassGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            requestedCC,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.ccVersion;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getCapabilities() {
        this.assertSupportsCommand(_Types_1.VersionCommand, _Types_1.VersionCommand.CapabilitiesGet);
        const cc = new VersionCCCapabilitiesGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["supportsZWaveSoftwareGet"]);
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getZWaveSoftware() {
        this.assertSupportsCommand(_Types_1.VersionCommand, _Types_1.VersionCommand.ZWaveSoftwareGet);
        const cc = new VersionCCZWaveSoftwareGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "sdkVersion",
                "applicationFrameworkAPIVersion",
                "applicationFrameworkBuildNumber",
                "hostInterfaceVersion",
                "hostInterfaceBuildNumber",
                "zWaveProtocolVersion",
                "zWaveProtocolBuildNumber",
                "applicationVersion",
                "applicationBuildNumber",
            ]);
        }
    }
};
VersionCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Version)
], VersionCCAPI);
exports.VersionCCAPI = VersionCCAPI;
let VersionCC = class VersionCC extends CommandClass_1.CommandClass {
    determineRequiredCCInterviews() {
        // VersionCC must be the 2nd CC after ManufacturerSpecificCC
        return [safe_1.CommandClasses["Manufacturer Specific"]];
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        // SDS13782: In a Multi Channel device, the Version Command Class MUST be supported by the Root Device, while
        // the Version Command Class SHOULD NOT be supported by individual End Points.
        //
        // There may be cases where a given Command Class is not implemented by the Root Device of a Multi
        // Channel device. However, the Root Device MUST respond to Version requests for any Command Class
        // implemented by the Multi Channel device; also in cases where the actual Command Class is only
        // provided by an End Point.
        const endpoint = this.getEndpoint(applHost);
        // Use the CC API of the root device for all queries
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Version, applHost, node).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        const queryCCVersion = async (cc) => {
            // only query the ones we support a version > 1 for
            const maxImplemented = (0, CommandClassDecorators_1.getImplementedVersion)(cc);
            if (maxImplemented <= 1) {
                applHost.controllerLog.logNode(node.id, `  skipping query for ${safe_1.CommandClasses[cc]} (${(0, safe_2.num2hex)(cc)}) because max implemented version is ${maxImplemented}`);
                return;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `  querying the CC version for ${(0, safe_1.getCCName)(cc)}...`,
                direction: "outbound",
            });
            // query the CC version
            const supportedVersion = await api.getCCVersion(cc);
            if (supportedVersion != undefined) {
                // Remember which CC version this endpoint supports
                let logMessage;
                if (supportedVersion > 0) {
                    endpoint.addCC(cc, {
                        version: supportedVersion,
                    });
                    logMessage = `  supports CC ${safe_1.CommandClasses[cc]} (${(0, safe_2.num2hex)(cc)}) in version ${supportedVersion}`;
                }
                else {
                    // We were lied to - the NIF said this CC is supported, now the node claims it isn't
                    // Make sure this is not a critical CC, which must be supported though
                    switch (cc) {
                        case safe_1.CommandClasses.Version:
                        case safe_1.CommandClasses["Manufacturer Specific"]:
                            logMessage = `  claims NOT to support CC ${safe_1.CommandClasses[cc]} (${(0, safe_2.num2hex)(cc)}), but it must. Assuming the ${this.endpointIndex === 0 ? "node" : "endpoint"} supports version 1...`;
                            endpoint.addCC(cc, { version: 1 });
                            break;
                        default:
                            logMessage = `  does NOT support CC ${safe_1.CommandClasses[cc]} (${(0, safe_2.num2hex)(cc)})`;
                            endpoint.removeCC(cc);
                    }
                }
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                });
            }
            else {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `CC version query for ${(0, safe_1.getCCName)(cc)} timed out - assuming the ${this.endpointIndex === 0 ? "node" : "endpoint"} supports version 1...`,
                    level: "warn",
                });
            }
        };
        // Version information should not change (except for firmware updates)
        // And it is only relevant on the root endpoint (the node)
        if (this.endpointIndex === 0) {
            // Step 1: Query Version CC version
            await queryCCVersion(safe_1.CommandClasses.Version);
            // The CC instance was created before the versions were determined, so `this.version` contains a wrong value
            this.version = applHost.getSafeCCVersionForNode(safe_1.CommandClasses.Version, node.id, this.endpointIndex);
            // Step 2: Query node versions
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "querying node versions...",
                direction: "outbound",
            });
            const versionGetResponse = await api.get();
            if (versionGetResponse) {
                // prettier-ignore
                let logMessage = `received response for node versions:
  library type:      ${safe_1.ZWaveLibraryTypes[versionGetResponse.libraryType]} (${(0, safe_2.num2hex)(versionGetResponse.libraryType)})
  protocol version:  ${versionGetResponse.protocolVersion}
  firmware versions: ${versionGetResponse.firmwareVersions.join(", ")}`;
                if (versionGetResponse.hardwareVersion != undefined) {
                    logMessage += `\n  hardware version:  ${versionGetResponse.hardwareVersion}`;
                }
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
        }
        // Step 3: Query all other CC versions
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying CC versions...",
            direction: "outbound",
        });
        for (const [cc] of endpoint.getCCs()) {
            // We already queried the Version CC version at the start of this interview
            if (cc === safe_1.CommandClasses.Version)
                continue;
            // Skip the query of endpoint CCs that are also supported by the root device
            if (this.endpointIndex > 0 && node.getCCVersion(cc) > 0)
                continue;
            await queryCCVersion(cc);
        }
        // Step 4: Query VersionCC capabilities (root device only)
        if (this.endpointIndex === 0 && this.version >= 3) {
            // Step 4a: Support for SoftwareGet
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "querying if Z-Wave Software Get is supported...",
                direction: "outbound",
            });
            const capsResponse = await api.getCapabilities();
            if (capsResponse) {
                const { supportsZWaveSoftwareGet } = capsResponse;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `Z-Wave Software Get is${supportsZWaveSoftwareGet ? "" : " not"} supported`,
                    direction: "inbound",
                });
                if (supportsZWaveSoftwareGet) {
                    // Step 4b: Query Z-Wave Software versions
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: "querying Z-Wave software versions...",
                        direction: "outbound",
                    });
                    await api.getZWaveSoftware();
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: "received Z-Wave software versions",
                        direction: "inbound",
                    });
                }
            }
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
};
VersionCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Version),
    (0, CommandClassDecorators_1.implementedVersion)(3),
    (0, CommandClassDecorators_1.ccValues)(exports.VersionCCValues)
], VersionCC);
exports.VersionCC = VersionCC;
let VersionCCReport = class VersionCCReport extends VersionCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 5);
        this.libraryType = this.payload[0];
        this.protocolVersion = `${this.payload[1]}.${this.payload[2]}`;
        this.firmwareVersions = [`${this.payload[3]}.${this.payload[4]}`];
        if (this.version >= 2 && this.payload.length >= 7) {
            this.hardwareVersion = this.payload[5];
            const additionalFirmwares = this.payload[6];
            (0, safe_1.validatePayload)(this.payload.length >= 7 + 2 * additionalFirmwares);
            for (let i = 0; i < additionalFirmwares; i++) {
                this.firmwareVersions.push(`${this.payload[7 + 2 * i]}.${this.payload[7 + 2 * i + 1]}`);
            }
        }
    }
    toLogEntry(applHost) {
        const message = {
            "library type": (0, safe_2.getEnumMemberName)(safe_1.ZWaveLibraryTypes, this.libraryType),
            "protocol version": this.protocolVersion,
            "firmware versions": this.firmwareVersions.join(", "),
        };
        if (this.hardwareVersion != undefined) {
            message["hardware version"] = this.hardwareVersion;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.libraryType)
], VersionCCReport.prototype, "libraryType", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.protocolVersion)
], VersionCCReport.prototype, "protocolVersion", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.firmwareVersions)
], VersionCCReport.prototype, "firmwareVersions", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.hardwareVersion)
], VersionCCReport.prototype, "hardwareVersion", void 0);
VersionCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.VersionCommand.Report)
], VersionCCReport);
exports.VersionCCReport = VersionCCReport;
let VersionCCGet = class VersionCCGet extends VersionCC {
};
VersionCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.VersionCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(VersionCCReport)
], VersionCCGet);
exports.VersionCCGet = VersionCCGet;
let VersionCCCommandClassReport = class VersionCCCommandClassReport extends VersionCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 2);
            this.requestedCC = this.payload[0];
            this.ccVersion = this.payload[1];
        }
        else {
            this.requestedCC = options.requestedCC;
            this.ccVersion = options.ccVersion;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.requestedCC, this.ccVersion]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                CC: (0, safe_1.getCCName)(this.requestedCC),
                version: this.ccVersion,
            },
        };
    }
};
VersionCCCommandClassReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.VersionCommand.CommandClassReport)
], VersionCCCommandClassReport);
exports.VersionCCCommandClassReport = VersionCCCommandClassReport;
function testResponseForVersionCommandClassGet(sent, received) {
    // We expect a Version CommandClass Report that matches the requested CC
    return sent.requestedCC === received.requestedCC;
}
let VersionCCCommandClassGet = class VersionCCCommandClassGet extends VersionCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.requestedCC = this.payload[0];
        }
        else {
            this.requestedCC = options.requestedCC;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.requestedCC]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { CC: (0, safe_1.getCCName)(this.requestedCC) },
        };
    }
};
VersionCCCommandClassGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.VersionCommand.CommandClassGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(VersionCCCommandClassReport, testResponseForVersionCommandClassGet)
], VersionCCCommandClassGet);
exports.VersionCCCommandClassGet = VersionCCCommandClassGet;
let VersionCCCapabilitiesReport = class VersionCCCapabilitiesReport extends VersionCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        const capabilities = this.payload[0];
        this.supportsZWaveSoftwareGet = !!(capabilities & 0b100);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supports Z-Wave Software Get command": this.supportsZWaveSoftwareGet,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.supportsZWaveSoftwareGet)
], VersionCCCapabilitiesReport.prototype, "supportsZWaveSoftwareGet", void 0);
VersionCCCapabilitiesReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.VersionCommand.CapabilitiesReport)
], VersionCCCapabilitiesReport);
exports.VersionCCCapabilitiesReport = VersionCCCapabilitiesReport;
let VersionCCCapabilitiesGet = class VersionCCCapabilitiesGet extends VersionCC {
};
VersionCCCapabilitiesGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.VersionCommand.CapabilitiesGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(VersionCCCapabilitiesReport)
], VersionCCCapabilitiesGet);
exports.VersionCCCapabilitiesGet = VersionCCCapabilitiesGet;
let VersionCCZWaveSoftwareReport = class VersionCCZWaveSoftwareReport extends VersionCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 23);
        this.sdkVersion = parseVersion(this.payload);
        this.applicationFrameworkAPIVersion = parseVersion(this.payload.slice(3));
        if (this.applicationFrameworkAPIVersion !== "unused") {
            this.applicationFrameworkBuildNumber = this.payload.readUInt16BE(6);
        }
        else {
            this.applicationFrameworkBuildNumber = 0;
        }
        this.hostInterfaceVersion = parseVersion(this.payload.slice(8));
        if (this.hostInterfaceVersion !== "unused") {
            this.hostInterfaceBuildNumber = this.payload.readUInt16BE(11);
        }
        else {
            this.hostInterfaceBuildNumber = 0;
        }
        this.zWaveProtocolVersion = parseVersion(this.payload.slice(13));
        if (this.zWaveProtocolVersion !== "unused") {
            this.zWaveProtocolBuildNumber = this.payload.readUInt16BE(16);
        }
        else {
            this.zWaveProtocolBuildNumber = 0;
        }
        this.applicationVersion = parseVersion(this.payload.slice(18));
        if (this.applicationVersion !== "unused") {
            this.applicationBuildNumber = this.payload.readUInt16BE(21);
        }
        else {
            this.applicationBuildNumber = 0;
        }
    }
    toLogEntry(applHost) {
        const message = {
            "SDK version": this.sdkVersion,
        };
        message["appl. framework API version"] =
            this.applicationFrameworkAPIVersion;
        if (this.applicationFrameworkAPIVersion !== "unused") {
            message["appl. framework build number"] =
                this.applicationFrameworkBuildNumber;
        }
        message["host interface version"] = this.hostInterfaceVersion;
        if (this.hostInterfaceVersion !== "unused") {
            message["host interface  build number"] =
                this.hostInterfaceBuildNumber;
        }
        message["Z-Wave protocol version"] = this.zWaveProtocolVersion;
        if (this.zWaveProtocolVersion !== "unused") {
            message["Z-Wave protocol build number"] =
                this.zWaveProtocolBuildNumber;
        }
        message["application version"] = this.applicationVersion;
        if (this.applicationVersion !== "unused") {
            message["application build number"] = this.applicationBuildNumber;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.sdkVersion)
], VersionCCZWaveSoftwareReport.prototype, "sdkVersion", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.applicationFrameworkAPIVersion)
], VersionCCZWaveSoftwareReport.prototype, "applicationFrameworkAPIVersion", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.applicationFrameworkBuildNumber)
], VersionCCZWaveSoftwareReport.prototype, "applicationFrameworkBuildNumber", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.serialAPIVersion)
], VersionCCZWaveSoftwareReport.prototype, "hostInterfaceVersion", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.serialAPIBuildNumber)
], VersionCCZWaveSoftwareReport.prototype, "hostInterfaceBuildNumber", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.zWaveProtocolVersion)
], VersionCCZWaveSoftwareReport.prototype, "zWaveProtocolVersion", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.zWaveProtocolBuildNumber)
], VersionCCZWaveSoftwareReport.prototype, "zWaveProtocolBuildNumber", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.applicationVersion)
], VersionCCZWaveSoftwareReport.prototype, "applicationVersion", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.VersionCCValues.applicationBuildNumber)
], VersionCCZWaveSoftwareReport.prototype, "applicationBuildNumber", void 0);
VersionCCZWaveSoftwareReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.VersionCommand.ZWaveSoftwareReport)
], VersionCCZWaveSoftwareReport);
exports.VersionCCZWaveSoftwareReport = VersionCCZWaveSoftwareReport;
let VersionCCZWaveSoftwareGet = class VersionCCZWaveSoftwareGet extends VersionCC {
};
VersionCCZWaveSoftwareGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.VersionCommand.ZWaveSoftwareGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(VersionCCZWaveSoftwareReport)
], VersionCCZWaveSoftwareGet);
exports.VersionCCZWaveSoftwareGet = VersionCCZWaveSoftwareGet;
//# sourceMappingURL=VersionCC.js.map