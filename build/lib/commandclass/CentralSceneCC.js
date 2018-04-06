"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const ZWaveError_1 = require("../error/ZWaveError");
const CommandClass_1 = require("./CommandClass");
var CentralSceneCommand;
(function (CentralSceneCommand) {
    CentralSceneCommand[CentralSceneCommand["SupportedGet"] = 1] = "SupportedGet";
    CentralSceneCommand[CentralSceneCommand["SupportedReport"] = 2] = "SupportedReport";
    CentralSceneCommand[CentralSceneCommand["Notification"] = 3] = "Notification";
    CentralSceneCommand[CentralSceneCommand["ConfigurationSet"] = 4] = "ConfigurationSet";
    CentralSceneCommand[CentralSceneCommand["ConfigurationGet"] = 5] = "ConfigurationGet";
    CentralSceneCommand[CentralSceneCommand["ConfigurationReport"] = 6] = "ConfigurationReport";
})(CentralSceneCommand = exports.CentralSceneCommand || (exports.CentralSceneCommand = {}));
var CentralSceneKeys;
(function (CentralSceneKeys) {
    CentralSceneKeys[CentralSceneKeys["KeyPressed"] = 0] = "KeyPressed";
    CentralSceneKeys[CentralSceneKeys["KeyReleased"] = 1] = "KeyReleased";
    CentralSceneKeys[CentralSceneKeys["KeyHeldDown"] = 2] = "KeyHeldDown";
    CentralSceneKeys[CentralSceneKeys["KeyPressed2x"] = 3] = "KeyPressed2x";
    CentralSceneKeys[CentralSceneKeys["KeyPressed3x"] = 4] = "KeyPressed3x";
    CentralSceneKeys[CentralSceneKeys["KeyPressed4x"] = 5] = "KeyPressed4x";
    CentralSceneKeys[CentralSceneKeys["KeyPressed5x"] = 6] = "KeyPressed5x";
})(CentralSceneKeys = exports.CentralSceneKeys || (exports.CentralSceneKeys = {}));
let CentralSceneCC = class CentralSceneCC extends CommandClass_1.CommandClass {
    constructor(nodeId, centralSceneCommand, slowRefresh) {
        super(nodeId);
        this.nodeId = nodeId;
        this.centralSceneCommand = centralSceneCommand;
        this._slowRefresh = slowRefresh;
    }
    get slowRefresh() {
        return this._slowRefresh;
    }
    get supportsSlowRefresh() {
        return this._supportsSlowRefresh;
    }
    get sequenceNumber() {
        return this._sequenceNumber;
    }
    get keyAttribute() {
        return this._keyAttribute;
    }
    get sceneCount() {
        return this._sceneCount;
    }
    supportsKeyAttribute(sceneNumber, keyAttribute) {
        const bitArrayIndex = this._keyAttributesIdenticalSupport ? 0 : sceneNumber - 1;
        const bitmap = this._supportedKeyAttributes[bitArrayIndex];
        return !!(bitmap & (1 << keyAttribute));
    }
    get sceneNumber() {
        return this._sceneNumber;
    }
    serialize() {
        switch (this.centralSceneCommand) {
            case CentralSceneCommand.SupportedGet:
            case CentralSceneCommand.ConfigurationGet:
                this.payload = Buffer.from([this.centralSceneCommand]);
                break;
            case CentralSceneCommand.ConfigurationSet:
                this.payload = Buffer.from([
                    this.centralSceneCommand,
                    this._slowRefresh ? 128 : 0,
                ]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a Version CC with a command other than SupportedGet, ConfigurationGet and ConfigurationSet", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.centralSceneCommand = this.payload[0];
        switch (this.centralSceneCommand) {
            case CentralSceneCommand.ConfigurationReport: {
                this._slowRefresh = !!(this.payload[1] & 128);
                break;
            }
            case CentralSceneCommand.SupportedReport: {
                this._sceneCount = this.payload[1];
                this._supportsSlowRefresh = !!(this.payload[2] & 128);
                const bitMaskBytes = this.payload[2] & 0b110;
                this._keyAttributesIdenticalSupport = !!(this.payload[2] & 0b1);
                const numEntries = this._keyAttributesIdenticalSupport ? 1 : this._sceneCount;
                this._supportedKeyAttributes = [];
                for (let i = 0; i < numEntries; i++) {
                    let mask = 0;
                    for (let j = 0; j < bitMaskBytes; j++) {
                        mask += this.payload[3 + bitMaskBytes * i + j] << (8 * j);
                    }
                    this._supportedKeyAttributes.push(mask);
                }
                break;
            }
            case CentralSceneCommand.Notification: {
                this._sequenceNumber = this.payload[1];
                this._keyAttribute = this.payload[2] & 0b111;
                this._sceneNumber = this.payload[3];
                this._slowRefresh = !!(this.payload[2] & 128);
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a Version CC with a command other than Notification", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
    toJSON() {
        return super.toJSONInherited({
            centralSceneCommand: CentralSceneCommand[this.centralSceneCommand],
            slowRefresh: this.slowRefresh,
            sequenceNumber: this.sequenceNumber,
            keyAttribute: CentralSceneKeys[this.keyAttribute],
            sceneNumber: this.sceneNumber,
        });
    }
};
CentralSceneCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Central Scene"]),
    CommandClass_1.implementedVersion(3),
    __metadata("design:paramtypes", [Number, Number, Boolean])
], CentralSceneCC);
exports.CentralSceneCC = CentralSceneCC;
