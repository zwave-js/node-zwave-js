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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentralSceneCCConfigurationSet = exports.CentralSceneCCConfigurationGet = exports.CentralSceneCCConfigurationReport = exports.CentralSceneCCSupportedGet = exports.CentralSceneCCSupportedReport = exports.CentralSceneCCNotification = exports.CentralSceneCC = exports.CentralSceneCCAPI = exports.CentralSceneCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__boolean = $o => {
    function _boolean($o) {
        return typeof $o !== "boolean" ? {} : null;
    }
    return _boolean($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const strings_1 = require("alcalzone-shared/strings");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const ccUtils = __importStar(require("../lib/utils"));
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
const AssociationGroupInfoCC_1 = require("./AssociationGroupInfoCC");
exports.CentralSceneCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Central Scene"], {
        ...Values_1.V.staticProperty("sceneCount", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportsSlowRefresh", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportedKeyAttributes", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("slowRefresh", {
            ...safe_1.ValueMetadata.Boolean,
            label: "Send held down notifications at a slow rate",
            description: "When this is true, KeyHeldDown notifications are sent every 55s. When this is false, the notifications are sent every 200ms.",
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Central Scene"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("scene", "scene", (sceneNumber) => (0, strings_1.padStart)(sceneNumber.toString(), 3, "0"), ({ property, propertyKey }) => property === "scene" &&
            typeof propertyKey === "string" &&
            /^\d{3}$/.test(propertyKey), (sceneNumber) => ({
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: `Scene ${(0, strings_1.padStart)(sceneNumber.toString(), 3, "0")}`,
        })),
    }),
});
let CentralSceneCCAPI = class CentralSceneCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            if (property !== "slowRefresh") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (typeof value !== "boolean") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "boolean", typeof value);
            }
            return this.setConfiguration(value);
        };
        this[_b] = async ({ property, }) => {
            if (property === "slowRefresh") {
                return (await this.getConfiguration())?.[property];
            }
            (0, API_1.throwUnsupportedProperty)(this.ccId, property);
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.CentralSceneCommand.SupportedGet:
                return this.isSinglecast(); // this is mandatory
            case _Types_1.CentralSceneCommand.ConfigurationGet:
                return this.version >= 3 && this.isSinglecast();
            case _Types_1.CentralSceneCommand.ConfigurationSet:
                return this.version >= 3;
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSupported() {
        this.assertSupportsCommand(_Types_1.CentralSceneCommand, _Types_1.CentralSceneCommand.SupportedGet);
        const cc = new CentralSceneCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "sceneCount",
                "supportsSlowRefresh",
                "supportedKeyAttributes",
            ]);
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getConfiguration() {
        this.assertSupportsCommand(_Types_1.CentralSceneCommand, _Types_1.CentralSceneCommand.ConfigurationGet);
        const cc = new CentralSceneCCConfigurationGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["slowRefresh"]);
        }
    }
    async setConfiguration(slowRefresh) {
        __assertType("slowRefresh", "boolean", __assertType__boolean.bind(void 0, slowRefresh));
        this.assertSupportsCommand(_Types_1.CentralSceneCommand, _Types_1.CentralSceneCommand.ConfigurationSet);
        const cc = new CentralSceneCCConfigurationSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            slowRefresh,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
CentralSceneCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Central Scene"])
], CentralSceneCCAPI);
exports.CentralSceneCCAPI = CentralSceneCCAPI;
let CentralSceneCC = class CentralSceneCC extends CommandClass_1.CommandClass {
    determineRequiredCCInterviews() {
        return [
            ...super.determineRequiredCCInterviews(),
            safe_1.CommandClasses.Association,
            safe_1.CommandClasses["Multi Channel Association"],
            safe_1.CommandClasses["Association Group Information"],
        ];
    }
    skipEndpointInterview() {
        // Central scene notifications are issued by the root device
        return true;
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Central Scene"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // If one Association group issues CentralScene notifications,
        // we need to associate ourselves with that channel
        if (node.supportsCC(safe_1.CommandClasses["Association Group Information"]) &&
            (node.supportsCC(safe_1.CommandClasses.Association) ||
                node.supportsCC(safe_1.CommandClasses["Multi Channel Association"]))) {
            const groupsIssueingNotifications = AssociationGroupInfoCC_1.AssociationGroupInfoCC.findGroupsForIssuedCommand(applHost, node, this.ccId, _Types_1.CentralSceneCommand.Notification);
            if (groupsIssueingNotifications.length > 0) {
                // We always grab the first group - usually it should be the lifeline
                const groupId = groupsIssueingNotifications[0];
                const existingAssociations = ccUtils.getAssociations(applHost, node).get(groupId) ?? [];
                if (!existingAssociations.some((a) => a.nodeId === applHost.ownNodeId)) {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: "Configuring associations to receive Central Scene notifications...",
                        direction: "outbound",
                    });
                    await ccUtils.addAssociations(applHost, node, groupId, [
                        { nodeId: applHost.ownNodeId },
                    ]);
                }
            }
        }
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "Querying supported scenes...",
            direction: "outbound",
        });
        const ccSupported = await api.getSupported();
        if (ccSupported) {
            const logMessage = `received supported scenes:
# of scenes:           ${ccSupported.sceneCount}
supports slow refresh: ${ccSupported.supportsSlowRefresh}`;
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
        else {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Querying supported scenes timed out, skipping interview...",
                level: "warn",
            });
            return;
        }
        // The slow refresh capability should be enabled whenever possible
        if (this.version >= 3 && ccSupported?.supportsSlowRefresh) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Enabling slow refresh capability...",
                direction: "outbound",
            });
            await api.setConfiguration(true);
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
};
CentralSceneCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Central Scene"]),
    (0, CommandClassDecorators_1.implementedVersion)(3),
    (0, CommandClassDecorators_1.ccValues)(exports.CentralSceneCCValues)
], CentralSceneCC);
exports.CentralSceneCC = CentralSceneCC;
let CentralSceneCCNotification = class CentralSceneCCNotification extends CentralSceneCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this.sequenceNumber = this.payload[0];
        this.keyAttribute = this.payload[1] & 0b111;
        this.sceneNumber = this.payload[2];
        if (this.keyAttribute === _Types_1.CentralSceneKeys.KeyHeldDown &&
            this.version >= 3) {
            // A receiving node MUST ignore this field if the command is not
            // carrying the Key Held Down key attribute.
            this.slowRefresh = !!(this.payload[1] & 128);
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // In case the interview is not yet completed, we still create some basic metadata
        const sceneValue = exports.CentralSceneCCValues.scene(this.sceneNumber);
        this.ensureMetadata(applHost, sceneValue);
        // The spec behavior is pretty complicated, so we cannot just store
        // the value and call it a day. Handling of these notifications will
        // happen in the receiving node class
        return true;
    }
    toLogEntry(applHost) {
        const message = {
            "sequence number": this.sequenceNumber,
            "key attribute": (0, safe_2.getEnumMemberName)(_Types_1.CentralSceneKeys, this.keyAttribute),
            "scene number": this.sceneNumber,
        };
        if (this.slowRefresh != undefined) {
            message["slow refresh"] = this.slowRefresh;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
CentralSceneCCNotification = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.CentralSceneCommand.Notification)
], CentralSceneCCNotification);
exports.CentralSceneCCNotification = CentralSceneCCNotification;
let CentralSceneCCSupportedReport = class CentralSceneCCSupportedReport extends CentralSceneCC {
    constructor(host, options) {
        super(host, options);
        this._supportedKeyAttributes = new Map();
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.sceneCount = this.payload[0];
        this.supportsSlowRefresh =
            this.version >= 3 ? !!(this.payload[1] & 128) : undefined;
        const bitMaskBytes = (this.payload[1] & 0b110) >>> 1;
        const identicalKeyAttributes = !!(this.payload[1] & 0b1);
        const numEntries = identicalKeyAttributes ? 1 : this.sceneCount;
        (0, safe_1.validatePayload)(this.payload.length >= 2 + bitMaskBytes * numEntries);
        for (let i = 0; i < numEntries; i++) {
            const mask = this.payload.slice(2 + i * bitMaskBytes, 2 + (i + 1) * bitMaskBytes);
            this._supportedKeyAttributes.set(i + 1, (0, safe_1.parseBitMask)(mask, _Types_1.CentralSceneKeys.KeyPressed));
        }
        if (identicalKeyAttributes) {
            // The key attributes are only transmitted for scene 1, copy them to the others
            for (let i = 2; i <= this.sceneCount; i++) {
                this._supportedKeyAttributes.set(i, this._supportedKeyAttributes.get(1));
            }
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Create/extend metadata for all scenes
        for (let i = 1; i <= this.sceneCount; i++) {
            const sceneValue = exports.CentralSceneCCValues.scene(i);
            this.setMetadata(applHost, sceneValue, {
                ...sceneValue.meta,
                states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.CentralSceneKeys, this._supportedKeyAttributes.get(i)),
            });
        }
        return true;
    }
    get supportedKeyAttributes() {
        return this._supportedKeyAttributes;
    }
    toLogEntry(applHost) {
        const message = {
            "scene count": this.sceneCount,
            "supports slow refresh": this.supportsSlowRefresh,
        };
        for (const [scene, keys] of this.supportedKeyAttributes) {
            message[`supported attributes (scene #${scene})`] = keys
                .map((k) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.CentralSceneKeys, k)}`)
                .join("");
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.CentralSceneCCValues.sceneCount)
], CentralSceneCCSupportedReport.prototype, "sceneCount", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.CentralSceneCCValues.supportsSlowRefresh)
], CentralSceneCCSupportedReport.prototype, "supportsSlowRefresh", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.CentralSceneCCValues.supportedKeyAttributes)
], CentralSceneCCSupportedReport.prototype, "supportedKeyAttributes", null);
CentralSceneCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.CentralSceneCommand.SupportedReport)
], CentralSceneCCSupportedReport);
exports.CentralSceneCCSupportedReport = CentralSceneCCSupportedReport;
let CentralSceneCCSupportedGet = class CentralSceneCCSupportedGet extends CentralSceneCC {
};
CentralSceneCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.CentralSceneCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(CentralSceneCCSupportedReport)
], CentralSceneCCSupportedGet);
exports.CentralSceneCCSupportedGet = CentralSceneCCSupportedGet;
let CentralSceneCCConfigurationReport = class CentralSceneCCConfigurationReport extends CentralSceneCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.slowRefresh = !!(this.payload[0] & 128);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "slow refresh": this.slowRefresh },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.CentralSceneCCValues.slowRefresh)
], CentralSceneCCConfigurationReport.prototype, "slowRefresh", void 0);
CentralSceneCCConfigurationReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.CentralSceneCommand.ConfigurationReport)
], CentralSceneCCConfigurationReport);
exports.CentralSceneCCConfigurationReport = CentralSceneCCConfigurationReport;
let CentralSceneCCConfigurationGet = class CentralSceneCCConfigurationGet extends CentralSceneCC {
};
CentralSceneCCConfigurationGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.CentralSceneCommand.ConfigurationGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(CentralSceneCCConfigurationReport)
], CentralSceneCCConfigurationGet);
exports.CentralSceneCCConfigurationGet = CentralSceneCCConfigurationGet;
let CentralSceneCCConfigurationSet = class CentralSceneCCConfigurationSet extends CentralSceneCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.slowRefresh = options.slowRefresh;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.slowRefresh ? 128 : 0]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "slow refresh": this.slowRefresh },
        };
    }
};
CentralSceneCCConfigurationSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.CentralSceneCommand.ConfigurationSet),
    (0, CommandClassDecorators_1.useSupervision)()
], CentralSceneCCConfigurationSet);
exports.CentralSceneCCConfigurationSet = CentralSceneCCConfigurationSet;
//# sourceMappingURL=CentralSceneCC.js.map