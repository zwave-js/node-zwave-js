"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZWavePlusCCGet = exports.ZWavePlusCCReport = exports.ZWavePlusCC = exports.ZWavePlusCCAPI = exports.ZWavePlusCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__ZWavePlusCCReportOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function su__2__3_eu($o) {
        return ![0, 2].includes($o) ? {} : null;
    }
    function su__5__6__7__8__9__10__11__12__13_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 6, 7, 8].includes($o) ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("zwavePlusVersion" in $o && $o["zwavePlusVersion"] !== undefined) {
            const error = _number($o["zwavePlusVersion"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("nodeType" in $o && $o["nodeType"] !== undefined) {
            const error = su__2__3_eu($o["nodeType"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("roleType" in $o && $o["roleType"] !== undefined) {
            const error = su__5__6__7__8__9__10__11__12__13_eu($o["roleType"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("installerIcon" in $o && $o["installerIcon"] !== undefined) {
            const error = _number($o["installerIcon"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("userIcon" in $o && $o["userIcon"] !== undefined) {
            const error = _number($o["userIcon"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    return _0($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
// SDS13782 The advertised Z-Wave Plus Version, Role Type and Node Type information values
// MUST be identical for the Root Device and all Multi Channel End Points
// --> We only access endpoint 0
exports.ZWavePlusCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Z-Wave Plus Info"], {
        ...Values_1.V.staticProperty("zwavePlusVersion", undefined, {
            supportsEndpoints: false,
            internal: true,
        }),
        ...Values_1.V.staticProperty("nodeType", undefined, {
            supportsEndpoints: false,
            internal: true,
        }),
        ...Values_1.V.staticProperty("roleType", undefined, {
            supportsEndpoints: false,
            internal: true,
        }),
        ...Values_1.V.staticProperty("userIcon", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("installerIcon", undefined, {
            internal: true,
        }),
    }),
});
// @noSetValueAPI This CC is read-only
let ZWavePlusCCAPI = class ZWavePlusCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ZWavePlusCommand.Get:
            case _Types_1.ZWavePlusCommand.Report:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.ZWavePlusCommand, _Types_1.ZWavePlusCommand.Get);
        const cc = new ZWavePlusCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "zwavePlusVersion",
                "nodeType",
                "roleType",
                "installerIcon",
                "userIcon",
            ]);
        }
    }
    async sendReport(options) {
        __assertType("options", "ZWavePlusCCReportOptions", __assertType__ZWavePlusCCReportOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.ZWavePlusCommand, _Types_1.ZWavePlusCommand.Report);
        const cc = new ZWavePlusCCReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
};
ZWavePlusCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Z-Wave Plus Info"])
], ZWavePlusCCAPI);
exports.ZWavePlusCCAPI = ZWavePlusCCAPI;
let ZWavePlusCC = class ZWavePlusCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Z-Wave Plus Info"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
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
role type:       ${_Types_1.ZWavePlusRoleType[zwavePlusResponse.roleType]}
node type:       ${_Types_1.ZWavePlusNodeType[zwavePlusResponse.nodeType]}
installer icon:  ${(0, safe_2.num2hex)(zwavePlusResponse.installerIcon)}
user icon:       ${(0, safe_2.num2hex)(zwavePlusResponse.userIcon)}`;
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
};
ZWavePlusCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Z-Wave Plus Info"]),
    (0, CommandClassDecorators_1.implementedVersion)(2),
    (0, CommandClassDecorators_1.ccValues)(exports.ZWavePlusCCValues)
], ZWavePlusCC);
exports.ZWavePlusCC = ZWavePlusCC;
let ZWavePlusCCReport = class ZWavePlusCCReport extends ZWavePlusCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 7);
            this.zwavePlusVersion = this.payload[0];
            this.roleType = this.payload[1];
            this.nodeType = this.payload[2];
            this.installerIcon = this.payload.readUInt16BE(3);
            this.userIcon = this.payload.readUInt16BE(5);
        }
        else {
            this.zwavePlusVersion = options.zwavePlusVersion;
            this.roleType = options.roleType;
            this.nodeType = options.nodeType;
            this.installerIcon = options.installerIcon;
            this.userIcon = options.userIcon;
        }
    }
    serialize() {
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
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                version: this.zwavePlusVersion,
                "node type": (0, safe_2.getEnumMemberName)(_Types_1.ZWavePlusNodeType, this.nodeType),
                "role type": (0, safe_2.getEnumMemberName)(_Types_1.ZWavePlusRoleType, this.roleType),
                "icon (mgmt.)": (0, safe_2.num2hex)(this.installerIcon),
                "icon (user)": (0, safe_2.num2hex)(this.userIcon),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ZWavePlusCCValues.zwavePlusVersion)
], ZWavePlusCCReport.prototype, "zwavePlusVersion", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ZWavePlusCCValues.nodeType)
], ZWavePlusCCReport.prototype, "nodeType", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ZWavePlusCCValues.roleType)
], ZWavePlusCCReport.prototype, "roleType", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ZWavePlusCCValues.installerIcon)
], ZWavePlusCCReport.prototype, "installerIcon", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ZWavePlusCCValues.userIcon)
], ZWavePlusCCReport.prototype, "userIcon", void 0);
ZWavePlusCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWavePlusCommand.Report)
], ZWavePlusCCReport);
exports.ZWavePlusCCReport = ZWavePlusCCReport;
let ZWavePlusCCGet = class ZWavePlusCCGet extends ZWavePlusCC {
};
ZWavePlusCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWavePlusCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ZWavePlusCCReport)
], ZWavePlusCCGet);
exports.ZWavePlusCCGet = ZWavePlusCCGet;
//# sourceMappingURL=ZWavePlusCC.js.map