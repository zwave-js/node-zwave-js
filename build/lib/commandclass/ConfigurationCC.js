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
const misc_1 = require("../util/misc");
const Primitive_1 = require("../values/Primitive");
const CommandClass_1 = require("./CommandClass");
var ConfigurationCommand;
(function (ConfigurationCommand) {
    ConfigurationCommand[ConfigurationCommand["Set"] = 4] = "Set";
    ConfigurationCommand[ConfigurationCommand["Get"] = 5] = "Get";
    ConfigurationCommand[ConfigurationCommand["Report"] = 6] = "Report";
    ConfigurationCommand[ConfigurationCommand["BulkSet"] = 7] = "BulkSet";
    ConfigurationCommand[ConfigurationCommand["BulkGet"] = 8] = "BulkGet";
    ConfigurationCommand[ConfigurationCommand["BulkReport"] = 9] = "BulkReport";
    ConfigurationCommand[ConfigurationCommand["NameGet"] = 10] = "NameGet";
    ConfigurationCommand[ConfigurationCommand["NameReport"] = 11] = "NameReport";
    ConfigurationCommand[ConfigurationCommand["InfoGet"] = 12] = "InfoGet";
    ConfigurationCommand[ConfigurationCommand["InfoReport"] = 13] = "InfoReport";
    ConfigurationCommand[ConfigurationCommand["PropertiesGet"] = 14] = "PropertiesGet";
    ConfigurationCommand[ConfigurationCommand["PropertiesReport"] = 15] = "PropertiesReport";
    ConfigurationCommand[ConfigurationCommand["DefaultReset"] = 1] = "DefaultReset";
})(ConfigurationCommand = exports.ConfigurationCommand || (exports.ConfigurationCommand = {}));
var ValueFormat;
(function (ValueFormat) {
    ValueFormat[ValueFormat["SignedInteger"] = 0] = "SignedInteger";
    ValueFormat[ValueFormat["UnsignedInteger"] = 1] = "UnsignedInteger";
    ValueFormat[ValueFormat["Enumerated"] = 2] = "Enumerated";
    ValueFormat[ValueFormat["BitField"] = 3] = "BitField";
})(ValueFormat = exports.ValueFormat || (exports.ValueFormat = {}));
// TODO: * Scan available config params (V1-V2)
//       * or use PropertiesGet (V3+)
// TODO: Test how the device interprets the default flag (V1-3) (reset all or only the specified)
let ConfigurationCC = class ConfigurationCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, ...args) {
        super(driver, nodeId, ccCommand);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        // TODO: Find a way to automatically update and store those
        this.values = new Map();
        // TODO: Prefill this with already-known information
        this.paramInformation = new Map();
        if (this.ccCommand === ConfigurationCommand.Get
            || this.ccCommand === ConfigurationCommand.NameGet
            || this.ccCommand === ConfigurationCommand.InfoGet
            || this.ccCommand === ConfigurationCommand.PropertiesGet) {
            this.parameter = args[0];
        }
        else if (this.ccCommand === ConfigurationCommand.Set) {
            [
                this.parameter,
                this.defaultFlag,
                this.valueSize,
                this.valueToSet,
            ] = args;
        }
        else if (this.ccCommand === ConfigurationCommand.BulkSet) {
            let parameters;
            let valuesToSet;
            [
                parameters,
                this.defaultFlag,
                this.valueSize,
                valuesToSet,
                this.handshake,
            ] = args;
            if (!parameters || !valuesToSet || parameters.length < 1 || valuesToSet.length < 1) {
                throw new ZWaveError_1.ZWaveError(`In a ConfigurationCC.BulkSet, parameters and valuesToSet must be non-empty arrays`, ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
            }
            if (parameters.length !== valuesToSet.length) {
                throw new ZWaveError_1.ZWaveError(`In a ConfigurationCC.BulkSet, parameters and valuesToSet must have the same size`, ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
            }
            const combined = parameters
                .map((param, i) => [param, valuesToSet[i]])
                .sort(([paramA], [paramB]) => paramA - paramB);
            parameters = combined.map(([param]) => param);
            if (!misc_1.isConsecutiveArray(parameters)) {
                throw new ZWaveError_1.ZWaveError(`A ConfigurationCC.BulkSet can only be used for consecutive parameters`, ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
            }
            this.parameters = parameters;
            this.valuesToSet = combined.map(([, value]) => value);
        }
        else if (this.ccCommand === ConfigurationCommand.BulkGet) {
            this.parameters = args[0].sort();
            if (!misc_1.isConsecutiveArray(this.parameters)) {
                throw new ZWaveError_1.ZWaveError(`A ConfigurationCC.BulkGet can only be used for consecutive parameters`, ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
            }
        }
    }
    extendParamInformation(parameter, info) {
        if (!this.paramInformation.has(parameter)) {
            this.paramInformation.set(parameter, {});
        }
        Object.assign(this.paramInformation.get(parameter), info);
    }
    getParamInformation(parameter) {
        return this.paramInformation.get(parameter) || {};
    }
    get reportsToFollow() {
        return this._reportsToFollow;
    }
    expectMoreMessages() {
        return this._reportsToFollow != undefined && this._reportsToFollow > 0;
    }
    get nextParameter() {
        return this._nextParameter;
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case ConfigurationCommand.Get:
            case ConfigurationCommand.Set:
                return true; // This is mandatory
            case ConfigurationCommand.BulkGet:
            case ConfigurationCommand.BulkSet:
                return this.version >= 2;
            case ConfigurationCommand.NameGet:
            case ConfigurationCommand.InfoGet:
            case ConfigurationCommand.PropertiesGet:
                return this.version >= 3;
        }
        return super.supportsCommand(cmd);
    }
    serialize() {
        switch (this.ccCommand) {
            case ConfigurationCommand.DefaultReset:
                // No payload
                break;
            case ConfigurationCommand.Set: {
                const valueSize = this.defaultFlag ? 1 : this.valueSize;
                const payloadLength = 2 + valueSize;
                this.payload = Buffer.alloc(payloadLength, 0);
                this.payload[0] = this.parameter;
                this.payload[1] = (this.defaultFlag ? 128 : 0) | (valueSize & 0b111);
                if (!this.defaultFlag) {
                    serializeValue(this.payload, 2, valueSize, this.getParamInformation(this.parameter).format || ValueFormat.SignedInteger, this.valueToSet);
                }
                break;
            }
            case ConfigurationCommand.Get:
                this.payload = Buffer.from([this.parameter & 0xff]);
                break;
            case ConfigurationCommand.BulkSet: {
                const valueSize = this.defaultFlag ? 1 : this.valueSize;
                const payloadLength = 4 + valueSize * this.parameters.length;
                this.payload = Buffer.alloc(payloadLength, 0);
                this.payload.writeUInt16BE(this.parameters[0], 0);
                this.payload[2] = this.parameters.length;
                this.payload[3] = (this.defaultFlag ? 128 : 0)
                    | (this.handshake ? 64 : 0)
                    | (valueSize & 0b111);
                if (!this.defaultFlag) {
                    for (let i = 0; i < this.parameters.length; i++) {
                        const param = this.parameters[i];
                        serializeValue(this.payload, 4 + i * valueSize, valueSize, this.getParamInformation(param).format || ValueFormat.SignedInteger, this.valuesToSet[i]);
                    }
                }
                break;
            }
            case ConfigurationCommand.BulkGet: {
                this.payload = Buffer.allocUnsafe(3);
                this.payload.writeUInt16BE(this.parameters[0], 0);
                this.payload[2] = this.parameters.length;
                break;
            }
            case ConfigurationCommand.NameGet:
            case ConfigurationCommand.InfoGet:
            case ConfigurationCommand.PropertiesGet: {
                this.payload = Buffer.allocUnsafe(2);
                this.payload.writeUInt16BE(this.parameter, 0);
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a Configuration CC with a command other than Set, Get, BulkSet, BulkGet, NameGet, InfoGet, PropertiesGet or DefaultReset", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        switch (this.ccCommand) {
            case ConfigurationCommand.Report:
                this.parameter = this.payload[0];
                this.valueSize = this.payload[1] & 0b111;
                this.values.set(this.parameter, this.payload.readIntBE(2, this.valueSize));
                break;
            case ConfigurationCommand.BulkReport: {
                const firstParameter = this.payload.readUInt16BE(0);
                const numParams = this.payload[2];
                this._reportsToFollow = this.payload[3];
                this.defaultFlag = !!(this.payload[4] & 128);
                this.handshake = !!(this.payload[4] & 64);
                this.valueSize = this.payload[4] & 0b111;
                for (let i = 0; i < numParams; i++) {
                    const param = firstParameter + i;
                    this.values.set(param, parseValue(this.payload.slice(5 + i * this.valueSize), this.valueSize, this.getParamInformation(param).format || ValueFormat.SignedInteger));
                }
                break;
            }
            case ConfigurationCommand.NameReport: {
                this.parameter = this.payload.readUInt16BE(0);
                this._reportsToFollow = this.payload[2];
                // Concatenation happens on the final message
                this.extendParamInformation(this.parameter, {
                    name: this.payload.slice(3).toString("utf8"),
                });
                break;
            }
            case ConfigurationCommand.InfoReport: {
                this.parameter = this.payload.readUInt16BE(0);
                this._reportsToFollow = this.payload[2];
                // Concatenation happens on the final message
                this.extendParamInformation(this.parameter, {
                    info: this.payload.slice(3).toString("utf8"),
                });
                break;
            }
            case ConfigurationCommand.PropertiesReport: {
                this.parameter = this.payload.readUInt16BE(0);
                const valueFormat = (this.payload[2] & 0b111000) >>> 3;
                this.extendParamInformation(this.parameter, {
                    format: valueFormat,
                    valueSize: this.payload[2] & 0b111,
                });
                if (this.valueSize > 0) {
                    if (valueFormat !== ValueFormat.BitField) {
                        this.extendParamInformation(this.parameter, {
                            minValue: parseValue(this.payload.slice(3), this.valueSize, valueFormat),
                        });
                    }
                    this.extendParamInformation(this.parameter, {
                        maxValue: parseValue(this.payload.slice(3 + this.valueSize), this.valueSize, valueFormat),
                        defaultValue: parseValue(this.payload.slice(3 + 2 * this.valueSize), this.valueSize, valueFormat),
                    });
                }
                if (this.version < 4) {
                    // Read the last 2 bytes to work around nodes not omitting min/max value when their size is 0
                    this._nextParameter = this.payload.readUInt16BE(this.payload.length - 2);
                }
                else {
                    this._nextParameter = this.payload.readUInt16BE(3 + 3 * this.valueSize);
                    const options1 = this.payload[2];
                    const options2 = this.payload[3 + 3 * this.valueSize + 2];
                    this.extendParamInformation(this.parameter, {
                        requiresReInclusion: !!(options1 & 128),
                        isReadonly: !!(options1 & 64),
                        isAdvanced: !!(options2 & 0b1),
                        noBulkSupport: !!(options2 & 0b10),
                    });
                }
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a Configuration CC with a command other than Report, BulkReport, NameReport, InfoReport or PropertiesReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
    mergePartialCCs(partials) {
        switch (this.ccCommand) {
            case ConfigurationCommand.BulkReport: {
                // Merge values
                for (const partial of partials) {
                    for (const [param, val] of partial.values.entries()) {
                        if (!this.values.has(param))
                            this.values.set(param, val);
                    }
                }
                break;
            }
            case ConfigurationCommand.NameReport: {
                // Concat the name
                const name = [...partials, this]
                    .map(report => report.getParamInformation(this.parameter).name)
                    .reduce((prev, cur) => prev + cur, "");
                this.extendParamInformation(this.parameter, { name });
                break;
            }
            case ConfigurationCommand.InfoReport: {
                // Concat the param description
                const info = [...partials, this]
                    .map(report => report.getParamInformation(this.parameter).info)
                    .reduce((prev, cur) => prev + cur, "");
                this.extendParamInformation(this.parameter, { info });
                break;
            }
        }
    }
};
ConfigurationCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses.Configuration),
    CommandClass_1.implementedVersion(4),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses.Configuration),
    __metadata("design:paramtypes", [Object, Number, Number, Object])
], ConfigurationCC);
exports.ConfigurationCC = ConfigurationCC;
/** Interprets values from the payload depending on the value format */
function parseValue(raw, size, format) {
    switch (format) {
        case ValueFormat.SignedInteger:
            return raw.readIntBE(0, size);
        case ValueFormat.UnsignedInteger:
        case ValueFormat.Enumerated:
            return raw.readUIntBE(0, size);
        case ValueFormat.BitField:
            return new Set(Primitive_1.parseBitMask(raw.slice(0, size)));
    }
}
/** Serializes values into the payload according to the value format */
function serializeValue(payload, offset, size, format, value) {
    switch (format) {
        case ValueFormat.SignedInteger:
            payload.writeIntBE(value, offset, size);
            return;
        case ValueFormat.UnsignedInteger:
        case ValueFormat.Enumerated:
            payload.writeUIntBE(value, offset, size);
            return;
        case ValueFormat.BitField: {
            const mask = Primitive_1.encodeBitMask([...value.values()], size * 8);
            mask.copy(payload, offset);
            return;
        }
    }
}
