"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FibaroVenetianBlindCCGet = exports.FibaroVenetianBlindCCReport = exports.FibaroVenetianBlindCCSet = exports.FibaroVenetianBlindCC = exports.FibaroVenetianBlindCCCommand = exports.FibaroCC = exports.FibaroCCAPI = exports.FibaroCCIDs = exports.getFibaroVenetianBlindTiltMetadata = exports.getFibaroVenetianBlindTiltValueId = exports.getFibaroVenetianBlindPositionMetadata = exports.getFibaroVenetianBlindPositionValueId = exports.MANUFACTURERID_FIBARO = void 0;
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
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const API_1 = require("../../lib/API");
const CommandClass_1 = require("../../lib/CommandClass");
const CommandClassDecorators_1 = require("../../lib/CommandClassDecorators");
const ManufacturerProprietaryCC_1 = require("../ManufacturerProprietaryCC");
const Decorators_1 = require("./Decorators");
exports.MANUFACTURERID_FIBARO = 0x10f;
/** Returns the ValueID used to store the current venetian blind position */
function getFibaroVenetianBlindPositionValueId(endpoint) {
    return {
        commandClass: safe_1.CommandClasses["Manufacturer Proprietary"],
        endpoint,
        property: "fibaro",
        propertyKey: "venetianBlindsPosition",
    };
}
exports.getFibaroVenetianBlindPositionValueId = getFibaroVenetianBlindPositionValueId;
/** Returns the value metadata for venetian blind position */
function getFibaroVenetianBlindPositionMetadata() {
    return {
        ...safe_1.ValueMetadata.Level,
        label: "Venetian blinds position",
    };
}
exports.getFibaroVenetianBlindPositionMetadata = getFibaroVenetianBlindPositionMetadata;
/** Returns the ValueID used to store the current venetian blind tilt */
function getFibaroVenetianBlindTiltValueId(endpoint) {
    return {
        commandClass: safe_1.CommandClasses["Manufacturer Proprietary"],
        endpoint,
        property: "fibaro",
        propertyKey: "venetianBlindsTilt",
    };
}
exports.getFibaroVenetianBlindTiltValueId = getFibaroVenetianBlindTiltValueId;
/** Returns the value metadata for venetian blind tilt */
function getFibaroVenetianBlindTiltMetadata() {
    return {
        ...safe_1.ValueMetadata.Level,
        label: "Venetian blinds tilt",
    };
}
exports.getFibaroVenetianBlindTiltMetadata = getFibaroVenetianBlindTiltMetadata;
var FibaroCCIDs;
(function (FibaroCCIDs) {
    FibaroCCIDs[FibaroCCIDs["VenetianBlind"] = 38] = "VenetianBlind";
})(FibaroCCIDs = exports.FibaroCCIDs || (exports.FibaroCCIDs = {}));
let FibaroCCAPI = class FibaroCCAPI extends ManufacturerProprietaryCC_1.ManufacturerProprietaryCCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey }, value) => {
            if (property !== "fibaro") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (propertyKey === "venetianBlindsPosition") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                await this.fibaroVenetianBlindsSetPosition(value);
            }
            else if (propertyKey === "venetianBlindsTilt") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                await this.fibaroVenetianBlindsSetTilt(value);
            }
            else {
                // unsupported property key, ignore...
                return;
            }
            // Verify the current value after a delay
            this.schedulePoll({ property, propertyKey }, value);
            return undefined;
        };
        this[_b] = async ({ property, propertyKey, }) => {
            if (property !== "fibaro") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            else if (propertyKey == undefined) {
                (0, API_1.throwMissingPropertyKey)(this.ccId, property);
            }
            switch (propertyKey) {
                case "venetianBlindsPosition":
                    return (await this.fibaroVenetianBlindsGet())?.position;
                case "venetianBlindsTilt":
                    return (await this.fibaroVenetianBlindsGet())?.tilt;
                default:
                    (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
            }
        };
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async fibaroVenetianBlindsGet() {
        const cc = new FibaroVenetianBlindCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, shared_1.pick)(response, ["position", "tilt"]);
        }
    }
    async fibaroVenetianBlindsSetPosition(value) {
        __assertType("value", "number", __assertType__number.bind(void 0, value));
        const cc = new FibaroVenetianBlindCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            position: value,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    async fibaroVenetianBlindsSetTilt(value) {
        __assertType("value", "number", __assertType__number.bind(void 0, value));
        const cc = new FibaroVenetianBlindCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            tilt: value,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
FibaroCCAPI = __decorate([
    (0, Decorators_1.manufacturerProprietaryAPI)(exports.MANUFACTURERID_FIBARO)
], FibaroCCAPI);
exports.FibaroCCAPI = FibaroCCAPI;
let FibaroCC = class FibaroCC extends ManufacturerProprietaryCC_1.ManufacturerProprietaryCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 2);
            this.fibaroCCId = this.payload[0];
            this.fibaroCCCommand = this.payload[1];
            const FibaroConstructor = (0, Decorators_1.getFibaroCCCommandConstructor)(this.fibaroCCId, this.fibaroCCCommand);
            if (FibaroConstructor &&
                new.target !== FibaroConstructor) {
                return new FibaroConstructor(host, options);
            }
            this.payload = this.payload.slice(2);
        }
        else {
            this.fibaroCCId = (0, Decorators_1.getFibaroCCId)(this);
            this.fibaroCCCommand = (0, Decorators_1.getFibaroCCCommand)(this);
        }
    }
    getSupportedFibaroCCIDs(applHost) {
        const node = this.getNode(applHost);
        const proprietaryConfig = applHost.getDeviceConfig?.(node.id)?.proprietary;
        if (proprietaryConfig && (0, typeguards_1.isArray)(proprietaryConfig.fibaroCCs)) {
            return proprietaryConfig.fibaroCCs;
        }
        return [];
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        // Iterate through all supported Fibaro CCs and interview them
        const supportedFibaroCCIDs = this.getSupportedFibaroCCIDs(applHost);
        for (const ccId of supportedFibaroCCIDs) {
            const SubConstructor = (0, Decorators_1.getFibaroCCConstructor)(ccId);
            if (SubConstructor) {
                const instance = new SubConstructor(this.host, {
                    nodeId: node.id,
                });
                await instance.interview(applHost);
            }
        }
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        // Iterate through all supported Fibaro CCs and let them refresh their values
        const supportedFibaroCCIDs = this.getSupportedFibaroCCIDs(applHost);
        for (const ccId of supportedFibaroCCIDs) {
            const SubConstructor = (0, Decorators_1.getFibaroCCConstructor)(ccId);
            if (SubConstructor) {
                const instance = new SubConstructor(this.host, {
                    nodeId: node.id,
                });
                await instance.refreshValues(applHost);
            }
        }
    }
    serialize() {
        if (this.fibaroCCId == undefined) {
            throw new safe_1.ZWaveError("Cannot serialize a Fibaro CC without a Fibaro CC ID", safe_1.ZWaveErrorCodes.CC_Invalid);
        }
        else if (this.fibaroCCCommand == undefined) {
            throw new safe_1.ZWaveError("Cannot serialize a Fibaro CC without a Fibaro CC Command", safe_1.ZWaveErrorCodes.CC_Invalid);
        }
        this.payload = Buffer.concat([
            Buffer.from([this.fibaroCCId, this.fibaroCCCommand]),
            this.payload,
        ]);
        return super.serialize();
    }
};
FibaroCC = __decorate([
    (0, Decorators_1.manufacturerId)(exports.MANUFACTURERID_FIBARO)
], FibaroCC);
exports.FibaroCC = FibaroCC;
var FibaroVenetianBlindCCCommand;
(function (FibaroVenetianBlindCCCommand) {
    FibaroVenetianBlindCCCommand[FibaroVenetianBlindCCCommand["Set"] = 1] = "Set";
    FibaroVenetianBlindCCCommand[FibaroVenetianBlindCCCommand["Get"] = 2] = "Get";
    FibaroVenetianBlindCCCommand[FibaroVenetianBlindCCCommand["Report"] = 3] = "Report";
})(FibaroVenetianBlindCCCommand = exports.FibaroVenetianBlindCCCommand || (exports.FibaroVenetianBlindCCCommand = {}));
let FibaroVenetianBlindCC = class FibaroVenetianBlindCC extends FibaroCC {
    constructor(host, options) {
        super(host, options);
        this.fibaroCCId = FibaroCCIDs.VenetianBlind;
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            if (this.fibaroCCCommand === FibaroVenetianBlindCCCommand.Report &&
                new.target !== FibaroVenetianBlindCCReport) {
                return new FibaroVenetianBlindCCReport(host, options);
            }
        }
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing Fibaro Venetian Blind CC...`,
            direction: "none",
        });
        // Nothing special, just get the values
        await this.refreshValues(applHost);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        applHost.controllerLog.logNode(node.id, {
            message: "Requesting venetian blind position and tilt...",
            direction: "outbound",
        });
        const resp = await applHost.sendCommand(new FibaroVenetianBlindCCGet(this.host, {
            nodeId: this.nodeId,
            endpoint: this.endpointIndex,
        }));
        if (resp) {
            const logMessage = `received venetian blind state:
position: ${resp.position}
tilt:     ${resp.tilt}`;
            applHost.controllerLog.logNode(node.id, {
                message: logMessage,
                direction: "inbound",
            });
        }
    }
};
FibaroVenetianBlindCC = __decorate([
    (0, Decorators_1.fibaroCC)(FibaroCCIDs.VenetianBlind)
], FibaroVenetianBlindCC);
exports.FibaroVenetianBlindCC = FibaroVenetianBlindCC;
let FibaroVenetianBlindCCSet = class FibaroVenetianBlindCCSet extends FibaroVenetianBlindCC {
    constructor(host, options) {
        super(host, options);
        this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Set;
        if (Buffer.isBuffer(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if ("position" in options)
                this.position = options.position;
            if ("tilt" in options)
                this.tilt = options.tilt;
        }
    }
    serialize() {
        const controlByte = (this.position != undefined ? 0b10 : 0) |
            (this.tilt != undefined ? 0b01 : 0);
        this.payload = Buffer.from([
            controlByte,
            this.position ?? 0,
            this.tilt ?? 0,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {};
        if (this.position != undefined) {
            message.position = this.position;
        }
        if (this.tilt != undefined) {
            message.tilt = this.tilt;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
FibaroVenetianBlindCCSet = __decorate([
    (0, Decorators_1.fibaroCCCommand)(FibaroVenetianBlindCCCommand.Set)
], FibaroVenetianBlindCCSet);
exports.FibaroVenetianBlindCCSet = FibaroVenetianBlindCCSet;
let FibaroVenetianBlindCCReport = class FibaroVenetianBlindCCReport extends FibaroVenetianBlindCC {
    constructor(host, options) {
        super(host, options);
        this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Report;
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        // When the node sends a report, payload[0] === 0b11. This is probably a
        // bit mask for position and tilt
        if (!!(this.payload[0] & 0b10)) {
            this._position = (0, safe_1.parseMaybeNumber)(this.payload[1]);
        }
        if (!!(this.payload[0] & 0b01)) {
            this._tilt = (0, safe_1.parseMaybeNumber)(this.payload[2]);
        }
    }
    persistValues(applHost) {
        if (this._position === safe_1.unknownNumber &&
            !applHost.options.preserveUnknownValues) {
            this._position = undefined;
        }
        if (this._tilt === safe_1.unknownNumber &&
            !applHost.options.preserveUnknownValues) {
            this._tilt = undefined;
        }
        if (!super.persistValues(applHost))
            return false;
        const valueDB = this.getValueDB(applHost);
        if (this.position != undefined) {
            const positionValueId = getFibaroVenetianBlindPositionValueId(this.endpointIndex);
            valueDB.setMetadata(positionValueId, {
                ...safe_1.ValueMetadata.Level,
                label: "Venetian blinds position",
            });
            valueDB.setValue(positionValueId, this.position);
        }
        if (this.tilt != undefined) {
            const tiltValueId = getFibaroVenetianBlindTiltValueId(this.endpointIndex);
            valueDB.setMetadata(tiltValueId, {
                ...safe_1.ValueMetadata.Level,
                label: "Venetian blinds tilt",
            });
            valueDB.setValue(tiltValueId, this.tilt);
        }
        return true;
    }
    get position() {
        return this._position;
    }
    get tilt() {
        return this._tilt;
    }
    toLogEntry(applHost) {
        const message = {};
        if (this.position != undefined) {
            message.position = this.position;
        }
        if (this.tilt != undefined) {
            message.tilt = this.tilt;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
FibaroVenetianBlindCCReport = __decorate([
    (0, Decorators_1.fibaroCCCommand)(FibaroVenetianBlindCCCommand.Report)
], FibaroVenetianBlindCCReport);
exports.FibaroVenetianBlindCCReport = FibaroVenetianBlindCCReport;
let FibaroVenetianBlindCCGet = class FibaroVenetianBlindCCGet extends FibaroVenetianBlindCC {
    constructor(host, options) {
        super(host, options);
        this.fibaroCCCommand = FibaroVenetianBlindCCCommand.Get;
    }
};
FibaroVenetianBlindCCGet = __decorate([
    (0, Decorators_1.fibaroCCCommand)(FibaroVenetianBlindCCCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(FibaroVenetianBlindCCReport)
], FibaroVenetianBlindCCGet);
exports.FibaroVenetianBlindCCGet = FibaroVenetianBlindCCGet;
//# sourceMappingURL=FibaroCC.js.map