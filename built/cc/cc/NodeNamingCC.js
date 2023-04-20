"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeNamingAndLocationCCLocationGet = exports.NodeNamingAndLocationCCLocationReport = exports.NodeNamingAndLocationCCLocationSet = exports.NodeNamingAndLocationCCNameGet = exports.NodeNamingAndLocationCCNameReport = exports.NodeNamingAndLocationCCNameSet = exports.NodeNamingAndLocationCC = exports.NodeNamingAndLocationCCAPI = exports.NodeNamingAndLocationCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__string = $o => {
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    return _string($o);
};
const safe_1 = require("@zwave-js/core/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.NodeNamingAndLocationCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Node Naming and Location"], {
        ...Values_1.V.staticProperty("name", {
            ...safe_1.ValueMetadata.String,
            label: "Node name",
        }, { supportsEndpoints: false }),
        ...Values_1.V.staticProperty("location", {
            ...safe_1.ValueMetadata.String,
            label: "Node location",
        }, { supportsEndpoints: false }),
    }),
});
function isASCII(str) {
    return /^[\x00-\x7F]*$/.test(str);
}
let NodeNamingAndLocationCCAPI = class NodeNamingAndLocationCCAPI extends API_1.PhysicalCCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            if (property !== "name" && property !== "location") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (typeof value !== "string") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "string", typeof value);
            }
            switch (property) {
                case "name":
                    return this.setName(value);
                case "location":
                    return this.setLocation(value);
            }
            return undefined;
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "name":
                    return this.getName();
                case "location":
                    return this.getLocation();
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.NodeNamingAndLocationCommand.NameGet:
            case _Types_1.NodeNamingAndLocationCommand.NameSet:
            case _Types_1.NodeNamingAndLocationCommand.LocationGet:
            case _Types_1.NodeNamingAndLocationCommand.LocationSet:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    async getName() {
        this.assertSupportsCommand(_Types_1.NodeNamingAndLocationCommand, _Types_1.NodeNamingAndLocationCommand.NameGet);
        const cc = new NodeNamingAndLocationCCNameGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.name;
    }
    async setName(name) {
        __assertType("name", "string", __assertType__string.bind(void 0, name));
        this.assertSupportsCommand(_Types_1.NodeNamingAndLocationCommand, _Types_1.NodeNamingAndLocationCommand.NameSet);
        const cc = new NodeNamingAndLocationCCNameSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            name,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getLocation() {
        this.assertSupportsCommand(_Types_1.NodeNamingAndLocationCommand, _Types_1.NodeNamingAndLocationCommand.LocationGet);
        const cc = new NodeNamingAndLocationCCLocationGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.location;
    }
    async setLocation(location) {
        __assertType("location", "string", __assertType__string.bind(void 0, location));
        this.assertSupportsCommand(_Types_1.NodeNamingAndLocationCommand, _Types_1.NodeNamingAndLocationCommand.LocationSet);
        const cc = new NodeNamingAndLocationCCLocationSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            location,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
NodeNamingAndLocationCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Node Naming and Location"])
], NodeNamingAndLocationCCAPI);
exports.NodeNamingAndLocationCCAPI = NodeNamingAndLocationCCAPI;
let NodeNamingAndLocationCC = class NodeNamingAndLocationCC extends CommandClass_1.CommandClass {
    skipEndpointInterview() {
        // As the name says, this is for the node, not for endpoints
        return true;
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Node Naming and Location"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            message: "retrieving node name...",
            direction: "outbound",
        });
        const name = await api.getName();
        if (name != undefined) {
            applHost.controllerLog.logNode(node.id, {
                message: `is named "${name}"`,
                direction: "inbound",
            });
        }
        applHost.controllerLog.logNode(node.id, {
            message: "retrieving node location...",
            direction: "outbound",
        });
        const location = await api.getLocation();
        if (location != undefined) {
            applHost.controllerLog.logNode(node.id, {
                message: `received location: ${location}`,
                direction: "inbound",
            });
        }
    }
};
NodeNamingAndLocationCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Node Naming and Location"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.NodeNamingAndLocationCCValues)
], NodeNamingAndLocationCC);
exports.NodeNamingAndLocationCC = NodeNamingAndLocationCC;
let NodeNamingAndLocationCCNameSet = class NodeNamingAndLocationCCNameSet extends NodeNamingAndLocationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.name = options.name;
        }
    }
    serialize() {
        const encoding = isASCII(this.name) ? "ascii" : "utf16le";
        this.payload = Buffer.allocUnsafe(1 + this.name.length * (encoding === "ascii" ? 1 : 2));
        this.payload[0] = encoding === "ascii" ? 0x0 : 0x2;
        let nameAsBuffer = Buffer.from(this.name, encoding);
        if (encoding === "utf16le") {
            // Z-Wave expects UTF16 BE
            nameAsBuffer = nameAsBuffer.swap16();
        }
        // Copy at max 16 bytes
        nameAsBuffer.copy(this.payload, 0, 0, Math.min(16, nameAsBuffer.length));
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { name: this.name },
        };
    }
};
NodeNamingAndLocationCCNameSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NodeNamingAndLocationCommand.NameSet),
    (0, CommandClassDecorators_1.useSupervision)()
], NodeNamingAndLocationCCNameSet);
exports.NodeNamingAndLocationCCNameSet = NodeNamingAndLocationCCNameSet;
let NodeNamingAndLocationCCNameReport = class NodeNamingAndLocationCCNameReport extends NodeNamingAndLocationCC {
    constructor(host, options) {
        super(host, options);
        const encoding = this.payload[0] === 2 ? "utf16le" : "ascii";
        let nameBuffer = this.payload.slice(1);
        if (encoding === "utf16le") {
            (0, safe_1.validatePayload)(nameBuffer.length % 2 === 0);
            // Z-Wave expects UTF16 BE
            nameBuffer = nameBuffer.swap16();
        }
        this.name = nameBuffer.toString(encoding);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { name: this.name },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.NodeNamingAndLocationCCValues.name)
], NodeNamingAndLocationCCNameReport.prototype, "name", void 0);
NodeNamingAndLocationCCNameReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NodeNamingAndLocationCommand.NameReport)
], NodeNamingAndLocationCCNameReport);
exports.NodeNamingAndLocationCCNameReport = NodeNamingAndLocationCCNameReport;
let NodeNamingAndLocationCCNameGet = class NodeNamingAndLocationCCNameGet extends NodeNamingAndLocationCC {
};
NodeNamingAndLocationCCNameGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NodeNamingAndLocationCommand.NameGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(NodeNamingAndLocationCCNameReport)
], NodeNamingAndLocationCCNameGet);
exports.NodeNamingAndLocationCCNameGet = NodeNamingAndLocationCCNameGet;
let NodeNamingAndLocationCCLocationSet = class NodeNamingAndLocationCCLocationSet extends NodeNamingAndLocationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.location = options.location;
        }
    }
    serialize() {
        const encoding = isASCII(this.location) ? "ascii" : "utf16le";
        this.payload = Buffer.allocUnsafe(1 + this.location.length * (encoding === "ascii" ? 1 : 2));
        this.payload[0] = encoding === "ascii" ? 0x0 : 0x2;
        let locationAsBuffer = Buffer.from(this.location, encoding);
        if (encoding === "utf16le") {
            // Z-Wave expects UTF16 BE
            locationAsBuffer = locationAsBuffer.swap16();
        }
        // Copy at max 16 bytes
        locationAsBuffer.copy(this.payload, 0, 0, Math.min(16, locationAsBuffer.length));
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { location: this.location },
        };
    }
};
NodeNamingAndLocationCCLocationSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NodeNamingAndLocationCommand.LocationSet),
    (0, CommandClassDecorators_1.useSupervision)()
], NodeNamingAndLocationCCLocationSet);
exports.NodeNamingAndLocationCCLocationSet = NodeNamingAndLocationCCLocationSet;
let NodeNamingAndLocationCCLocationReport = class NodeNamingAndLocationCCLocationReport extends NodeNamingAndLocationCC {
    constructor(host, options) {
        super(host, options);
        const encoding = this.payload[0] === 2 ? "utf16le" : "ascii";
        let locationBuffer = this.payload.slice(1);
        if (encoding === "utf16le") {
            (0, safe_1.validatePayload)(locationBuffer.length % 2 === 0);
            // Z-Wave expects UTF16 BE
            locationBuffer = locationBuffer.swap16();
        }
        this.location = locationBuffer.toString(encoding);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { location: this.location },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.NodeNamingAndLocationCCValues.location)
], NodeNamingAndLocationCCLocationReport.prototype, "location", void 0);
NodeNamingAndLocationCCLocationReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NodeNamingAndLocationCommand.LocationReport)
], NodeNamingAndLocationCCLocationReport);
exports.NodeNamingAndLocationCCLocationReport = NodeNamingAndLocationCCLocationReport;
let NodeNamingAndLocationCCLocationGet = class NodeNamingAndLocationCCLocationGet extends NodeNamingAndLocationCC {
};
NodeNamingAndLocationCCLocationGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NodeNamingAndLocationCommand.LocationGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(NodeNamingAndLocationCCLocationReport)
], NodeNamingAndLocationCCLocationGet);
exports.NodeNamingAndLocationCCLocationGet = NodeNamingAndLocationCCLocationGet;
//# sourceMappingURL=NodeNamingCC.js.map