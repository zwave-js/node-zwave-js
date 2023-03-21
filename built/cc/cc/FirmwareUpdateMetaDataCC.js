"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirmwareUpdateMetaDataCCPrepareGet = exports.FirmwareUpdateMetaDataCCPrepareReport = exports.FirmwareUpdateMetaDataCCActivationSet = exports.FirmwareUpdateMetaDataCCActivationReport = exports.FirmwareUpdateMetaDataCCStatusReport = exports.FirmwareUpdateMetaDataCCReport = exports.FirmwareUpdateMetaDataCCGet = exports.FirmwareUpdateMetaDataCCRequestGet = exports.FirmwareUpdateMetaDataCCRequestReport = exports.FirmwareUpdateMetaDataCCMetaDataGet = exports.FirmwareUpdateMetaDataCCMetaDataReport = exports.FirmwareUpdateMetaDataCC = exports.FirmwareUpdateMetaDataCCAPI = exports.FirmwareUpdateMetaDataCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__FirmwareUpdateMetaDataCCRequestGetOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("manufacturerId" in $o && $o["manufacturerId"] !== undefined) {
            const error = _number($o["manufacturerId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("firmwareId" in $o && $o["firmwareId"] !== undefined) {
            const error = _number($o["firmwareId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("checksum" in $o && $o["checksum"] !== undefined) {
            const error = _number($o["checksum"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function _boolean($o) {
        return typeof $o !== "boolean" ? {} : null;
    }
    function _3($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("firmwareTarget" in $o && $o["firmwareTarget"] !== undefined) {
            const error = _number($o["firmwareTarget"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("fragmentSize" in $o && $o["fragmentSize"] !== undefined) {
            const error = _number($o["fragmentSize"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("activation" in $o && $o["activation"] !== undefined) {
            const error = _boolean($o["activation"]);
            if (error)
                return error;
        }
        if ("hardwareVersion" in $o && $o["hardwareVersion"] !== undefined) {
            const error = _number($o["hardwareVersion"]);
            if (error)
                return error;
        }
        return null;
    }
    function si__2__3_ei($o) {
        const conditions = [_2, _3];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function _undefined($o) {
        return $o !== undefined ? {} : null;
    }
    function _5($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("firmwareTarget" in $o && $o["firmwareTarget"] !== undefined) {
            const error = _undefined($o["firmwareTarget"]);
            if (error)
                return error;
        }
        if ("fragmentSize" in $o && $o["fragmentSize"] !== undefined) {
            const error = _undefined($o["fragmentSize"]);
            if (error)
                return error;
        }
        if ("activation" in $o && $o["activation"] !== undefined) {
            const error = _undefined($o["activation"]);
            if (error)
                return error;
        }
        if ("hardwareVersion" in $o && $o["hardwareVersion"] !== undefined) {
            const error = _undefined($o["hardwareVersion"]);
            if (error)
                return error;
        }
        return null;
    }
    function si__2__5_ei($o) {
        const conditions = [_2, _5];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function su_si__2__3_ei_si__2__5_ei_eu($o) {
        const conditions = [si__2__3_ei, si__2__5_ei];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su_si__2__3_ei_si__2__5_ei_eu($o);
};
const __assertType__number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    return _number($o);
};
const __assertType__boolean = $o => {
    function _boolean($o) {
        return typeof $o !== "boolean" ? {} : null;
    }
    return _boolean($o);
};
const __assertType__Buffer = $o => {
    function _buffer($o) {
        return !Buffer.isBuffer($o) ? {} : null;
    }
    return _buffer($o);
};
const __assertType__FirmwareUpdateMetaDataCCActivationSetOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("manufacturerId" in $o && $o["manufacturerId"] !== undefined) {
            const error = _number($o["manufacturerId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("firmwareId" in $o && $o["firmwareId"] !== undefined) {
            const error = _number($o["firmwareId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("checksum" in $o && $o["checksum"] !== undefined) {
            const error = _number($o["checksum"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("firmwareTarget" in $o && $o["firmwareTarget"] !== undefined) {
            const error = _number($o["firmwareTarget"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("hardwareVersion" in $o && $o["hardwareVersion"] !== undefined) {
            const error = _number($o["hardwareVersion"]);
            if (error)
                return error;
        }
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
// @noSetValueAPI There are no values to set here
exports.FirmwareUpdateMetaDataCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Firmware Update Meta Data"], {
        ...Values_1.V.staticProperty("supportsActivation", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("firmwareUpgradable", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("additionalFirmwareIDs", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("continuesToFunction", undefined, {
            internal: true,
        }),
    }),
});
let FirmwareUpdateMetaDataCCAPI = class FirmwareUpdateMetaDataCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.FirmwareUpdateMetaDataCommand.MetaDataGet:
            case _Types_1.FirmwareUpdateMetaDataCommand.RequestGet:
            case _Types_1.FirmwareUpdateMetaDataCommand.Report:
            case _Types_1.FirmwareUpdateMetaDataCommand.StatusReport:
                return true;
            case _Types_1.FirmwareUpdateMetaDataCommand.ActivationSet:
                return (this.version >= 4 &&
                    (this.version < 7 ||
                        this.tryGetValueDB()?.getValue(exports.FirmwareUpdateMetaDataCCValues.supportsActivation.endpoint(this.endpoint.index)) === true));
            case _Types_1.FirmwareUpdateMetaDataCommand.PrepareGet:
                return this.version >= 5;
        }
        return super.supportsCommand(cmd);
    }
    /**
     * Requests information about the current firmware on the device
     */
    async getMetaData() {
        this.assertSupportsCommand(_Types_1.FirmwareUpdateMetaDataCommand, _Types_1.FirmwareUpdateMetaDataCommand.MetaDataGet);
        const cc = new FirmwareUpdateMetaDataCCMetaDataGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "manufacturerId",
                "firmwareId",
                "checksum",
                "firmwareUpgradable",
                "maxFragmentSize",
                "additionalFirmwareIDs",
                "hardwareVersion",
                "continuesToFunction",
                "supportsActivation",
            ]);
        }
    }
    /**
     * Requests the device to start the firmware update process.
     * WARNING: This method may wait up to 60 seconds for a reply.
     */
    async requestUpdate(options) {
        __assertType("options", "FirmwareUpdateMetaDataCCRequestGetOptions", __assertType__FirmwareUpdateMetaDataCCRequestGetOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.FirmwareUpdateMetaDataCommand, _Types_1.FirmwareUpdateMetaDataCommand.RequestGet);
        const cc = new FirmwareUpdateMetaDataCCRequestGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        // Since the response may take longer than with other commands,
        // we do not use the built-in waiting functionality, which would block
        // all other communication
        await this.applHost.sendCommand(cc, this.commandOptions);
        const { status } = await this.applHost.waitForCommand((cc) => cc instanceof FirmwareUpdateMetaDataCCRequestReport &&
            cc.nodeId === this.endpoint.nodeId, 60000);
        return status;
    }
    /**
     * Sends a fragment of the new firmware to the device
     */
    async sendFirmwareFragment(fragmentNumber, isLastFragment, data) {
        __assertType("fragmentNumber", "number", __assertType__number.bind(void 0, fragmentNumber));
        __assertType("isLastFragment", "boolean", __assertType__boolean.bind(void 0, isLastFragment));
        __assertType("data", "Buffer", __assertType__Buffer.bind(void 0, data));
        this.assertSupportsCommand(_Types_1.FirmwareUpdateMetaDataCommand, _Types_1.FirmwareUpdateMetaDataCommand.Report);
        const cc = new FirmwareUpdateMetaDataCCReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            reportNumber: fragmentNumber,
            isLast: isLastFragment,
            firmwareData: data,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    /** Activates a previously transferred firmware image */
    async activateFirmware(options) {
        __assertType("options", "FirmwareUpdateMetaDataCCActivationSetOptions", __assertType__FirmwareUpdateMetaDataCCActivationSetOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.FirmwareUpdateMetaDataCommand, _Types_1.FirmwareUpdateMetaDataCommand.ActivationSet);
        const cc = new FirmwareUpdateMetaDataCCActivationSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.activationStatus;
    }
};
FirmwareUpdateMetaDataCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Firmware Update Meta Data"])
], FirmwareUpdateMetaDataCCAPI);
exports.FirmwareUpdateMetaDataCCAPI = FirmwareUpdateMetaDataCCAPI;
let FirmwareUpdateMetaDataCC = class FirmwareUpdateMetaDataCC extends CommandClass_1.CommandClass {
    skipEndpointInterview() {
        return true;
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Firmware Update Meta Data"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "Querying firmware update capabilities...",
            direction: "outbound",
        });
        const caps = await api.getMetaData();
        if (caps) {
            let logMessage = `Received firmware update capabilities:`;
            if (caps.firmwareUpgradable) {
                logMessage += `
  firmware targets:      ${[0, ...caps.additionalFirmwareIDs].join(", ")}
  continues to function: ${caps.continuesToFunction}
  supports activation:   ${caps.supportsActivation}`;
            }
            else {
                logMessage += `\nfirmware upgradeable: false`;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
        else {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Firmware update capability query timed out",
                direction: "inbound",
            });
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
};
FirmwareUpdateMetaDataCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Firmware Update Meta Data"]),
    (0, CommandClassDecorators_1.implementedVersion)(7),
    (0, CommandClassDecorators_1.ccValues)(exports.FirmwareUpdateMetaDataCCValues)
], FirmwareUpdateMetaDataCC);
exports.FirmwareUpdateMetaDataCC = FirmwareUpdateMetaDataCC;
let FirmwareUpdateMetaDataCCMetaDataReport = class FirmwareUpdateMetaDataCCMetaDataReport extends FirmwareUpdateMetaDataCC {
    constructor(host, options) {
        super(host, options);
        this.additionalFirmwareIDs = [];
        this.continuesToFunction = safe_1.unknownBoolean;
        this.supportsActivation = safe_1.unknownBoolean;
        (0, safe_1.validatePayload)(this.payload.length >= 6);
        this.manufacturerId = this.payload.readUInt16BE(0);
        this.firmwareId = this.payload.readUInt16BE(2);
        this.checksum = this.payload.readUInt16BE(4);
        // V1/V2 only have a single firmware which must be upgradable
        this.firmwareUpgradable =
            this.payload[6] === 0xff || this.payload[6] == undefined;
        if (this.version >= 3 && this.payload.length >= 10) {
            this.maxFragmentSize = this.payload.readUInt16BE(8);
            // Read variable length list of additional firmwares
            const numAdditionalFirmwares = this.payload[7];
            const additionalFirmwareIDs = [];
            (0, safe_1.validatePayload)(this.payload.length >= 10 + 2 * numAdditionalFirmwares);
            for (let i = 0; i < numAdditionalFirmwares; i++) {
                additionalFirmwareIDs.push(this.payload.readUInt16BE(10 + 2 * i));
            }
            this.additionalFirmwareIDs = additionalFirmwareIDs;
            // Read hardware version (if it exists)
            let offset = 10 + 2 * numAdditionalFirmwares;
            if (this.version >= 5 && this.payload.length >= offset + 1) {
                this.hardwareVersion = this.payload[offset];
                offset++;
                if (this.version >= 6 && this.payload.length >= offset + 1) {
                    const capabilities = this.payload[offset];
                    offset++;
                    this.continuesToFunction = !!(capabilities & 0b1);
                    if (this.version >= 7)
                        this.supportsActivation = !!(capabilities & 0b10);
                }
            }
        }
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "manufacturer id": this.manufacturerId,
                "firmware id": this.firmwareId,
                checksum: this.checksum,
                "firmware upgradable": this.firmwareUpgradable,
                "max fragment size": this.maxFragmentSize,
                "additional firmware IDs": JSON.stringify(this.additionalFirmwareIDs),
                "hardware version": this.hardwareVersion,
                "continues to function": this.continuesToFunction,
                "supports activation": this.supportsActivation,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.FirmwareUpdateMetaDataCCValues.firmwareUpgradable)
], FirmwareUpdateMetaDataCCMetaDataReport.prototype, "firmwareUpgradable", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.FirmwareUpdateMetaDataCCValues.additionalFirmwareIDs)
], FirmwareUpdateMetaDataCCMetaDataReport.prototype, "additionalFirmwareIDs", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.FirmwareUpdateMetaDataCCValues.continuesToFunction)
], FirmwareUpdateMetaDataCCMetaDataReport.prototype, "continuesToFunction", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.FirmwareUpdateMetaDataCCValues.supportsActivation)
], FirmwareUpdateMetaDataCCMetaDataReport.prototype, "supportsActivation", void 0);
FirmwareUpdateMetaDataCCMetaDataReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.MetaDataReport)
], FirmwareUpdateMetaDataCCMetaDataReport);
exports.FirmwareUpdateMetaDataCCMetaDataReport = FirmwareUpdateMetaDataCCMetaDataReport;
let FirmwareUpdateMetaDataCCMetaDataGet = class FirmwareUpdateMetaDataCCMetaDataGet extends FirmwareUpdateMetaDataCC {
};
FirmwareUpdateMetaDataCCMetaDataGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.MetaDataGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(FirmwareUpdateMetaDataCCMetaDataReport)
], FirmwareUpdateMetaDataCCMetaDataGet);
exports.FirmwareUpdateMetaDataCCMetaDataGet = FirmwareUpdateMetaDataCCMetaDataGet;
let FirmwareUpdateMetaDataCCRequestReport = class FirmwareUpdateMetaDataCCRequestReport extends FirmwareUpdateMetaDataCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.status = this.payload[0];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                status: (0, safe_2.getEnumMemberName)(_Types_1.FirmwareUpdateRequestStatus, this.status),
            },
        };
    }
};
FirmwareUpdateMetaDataCCRequestReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.RequestReport)
], FirmwareUpdateMetaDataCCRequestReport);
exports.FirmwareUpdateMetaDataCCRequestReport = FirmwareUpdateMetaDataCCRequestReport;
let FirmwareUpdateMetaDataCCRequestGet = class FirmwareUpdateMetaDataCCRequestGet extends FirmwareUpdateMetaDataCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.manufacturerId = options.manufacturerId;
            this.firmwareId = options.firmwareId;
            this.checksum = options.checksum;
            if ("firmwareTarget" in options) {
                this.firmwareTarget = options.firmwareTarget;
                this.fragmentSize = options.fragmentSize;
                this.activation = options.activation ?? false;
                this.hardwareVersion = options.hardwareVersion;
            }
        }
    }
    serialize() {
        const isV3 = this.version >= 3 &&
            this.firmwareTarget != undefined &&
            this.fragmentSize != undefined;
        const isV4 = isV3 && this.version >= 4 && this.activation != undefined;
        const isV5 = isV4 && this.version >= 5 && this.hardwareVersion != undefined;
        this.payload = Buffer.allocUnsafe(6 + (isV3 ? 3 : 0) + (isV4 ? 1 : 0) + (isV5 ? 1 : 0));
        this.payload.writeUInt16BE(this.manufacturerId, 0);
        this.payload.writeUInt16BE(this.firmwareId, 2);
        this.payload.writeUInt16BE(this.checksum, 4);
        if (isV3) {
            this.payload[6] = this.firmwareTarget;
            this.payload.writeUInt16BE(this.fragmentSize, 7);
        }
        if (isV4) {
            this.payload[9] = this.activation ? 1 : 0;
        }
        if (isV5) {
            this.payload[10] = this.hardwareVersion;
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "manufacturer id": (0, safe_2.num2hex)(this.manufacturerId),
            "firmware id": (0, safe_2.num2hex)(this.firmwareId),
            checksum: (0, safe_2.num2hex)(this.checksum),
        };
        if (this.firmwareTarget != undefined) {
            message["firmware target"] = this.firmwareTarget;
        }
        if (this.fragmentSize != undefined) {
            message["fragment size"] = this.fragmentSize;
        }
        if (this.activation != undefined) {
            message.activation = this.activation;
        }
        if (this.hardwareVersion != undefined) {
            message["hardware version"] = this.hardwareVersion;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
FirmwareUpdateMetaDataCCRequestGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.RequestGet)
    // This would expect a FirmwareUpdateMetaDataCCRequestReport, but the response may take
    // a while to come. We don't want to block communication, so we don't expect a response here
], FirmwareUpdateMetaDataCCRequestGet);
exports.FirmwareUpdateMetaDataCCRequestGet = FirmwareUpdateMetaDataCCRequestGet;
let FirmwareUpdateMetaDataCCGet = class FirmwareUpdateMetaDataCCGet extends FirmwareUpdateMetaDataCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this.numReports = this.payload[0];
        this.reportNumber = this.payload.readUInt16BE(1) & 0x7fff;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "total # of reports": this.numReports,
                "report number": this.reportNumber,
            },
        };
    }
};
FirmwareUpdateMetaDataCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.Get)
    // This is sent to us from the node, so we expect no response
], FirmwareUpdateMetaDataCCGet);
exports.FirmwareUpdateMetaDataCCGet = FirmwareUpdateMetaDataCCGet;
let FirmwareUpdateMetaDataCCReport = class FirmwareUpdateMetaDataCCReport extends FirmwareUpdateMetaDataCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.reportNumber = options.reportNumber;
            this.firmwareData = options.firmwareData;
            this.isLast = options.isLast;
        }
    }
    serialize() {
        const commandBuffer = Buffer.concat([
            Buffer.allocUnsafe(2),
            this.firmwareData,
        ]);
        commandBuffer.writeUInt16BE((this.reportNumber & 0x7fff) | (this.isLast ? 0x8000 : 0), 0);
        if (this.version >= 2) {
            // Compute and save the CRC16 in the payload
            // The CC header is included in the CRC computation
            let crc = (0, safe_1.CRC16_CCITT)(Buffer.from([this.ccId, this.ccCommand]));
            crc = (0, safe_1.CRC16_CCITT)(commandBuffer, crc);
            this.payload = Buffer.concat([
                commandBuffer,
                Buffer.allocUnsafe(2),
            ]);
            this.payload.writeUInt16BE(crc, this.payload.length - 2);
        }
        else {
            this.payload = commandBuffer;
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "report #": this.reportNumber,
                "is last": this.isLast,
            },
        };
    }
};
FirmwareUpdateMetaDataCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.Report)
    // We send this in reply to the Get command and expect no response
], FirmwareUpdateMetaDataCCReport);
exports.FirmwareUpdateMetaDataCCReport = FirmwareUpdateMetaDataCCReport;
let FirmwareUpdateMetaDataCCStatusReport = class FirmwareUpdateMetaDataCCStatusReport extends FirmwareUpdateMetaDataCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.status = this.payload[0];
        if (this.payload.length >= 3) {
            this.waitTime = this.payload.readUInt16BE(1);
        }
    }
    toLogEntry(applHost) {
        const message = {
            status: (0, safe_2.getEnumMemberName)(_Types_1.FirmwareUpdateStatus, this.status),
        };
        if (this.waitTime != undefined) {
            message["wait time"] = `${this.waitTime} seconds`;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
FirmwareUpdateMetaDataCCStatusReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.StatusReport)
], FirmwareUpdateMetaDataCCStatusReport);
exports.FirmwareUpdateMetaDataCCStatusReport = FirmwareUpdateMetaDataCCStatusReport;
let FirmwareUpdateMetaDataCCActivationReport = class FirmwareUpdateMetaDataCCActivationReport extends FirmwareUpdateMetaDataCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 8);
        this.manufacturerId = this.payload.readUInt16BE(0);
        this.firmwareId = this.payload.readUInt16BE(2);
        this.checksum = this.payload.readUInt16BE(4);
        this.firmwareTarget = this.payload[6];
        this.activationStatus = this.payload[7];
        if (this.version >= 5 && this.payload.length >= 9) {
            this.hardwareVersion = this.payload[8];
        }
    }
    toLogEntry(applHost) {
        const message = {
            "manufacturer id": (0, safe_2.num2hex)(this.manufacturerId),
            "firmware id": (0, safe_2.num2hex)(this.firmwareId),
            checksum: (0, safe_2.num2hex)(this.checksum),
            "firmware target": this.firmwareTarget,
            "activation status": (0, safe_2.getEnumMemberName)(_Types_1.FirmwareUpdateActivationStatus, this.activationStatus),
        };
        if (this.hardwareVersion != undefined) {
            message.hardwareVersion = this.hardwareVersion;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
FirmwareUpdateMetaDataCCActivationReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.ActivationReport)
], FirmwareUpdateMetaDataCCActivationReport);
exports.FirmwareUpdateMetaDataCCActivationReport = FirmwareUpdateMetaDataCCActivationReport;
let FirmwareUpdateMetaDataCCActivationSet = class FirmwareUpdateMetaDataCCActivationSet extends FirmwareUpdateMetaDataCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.manufacturerId = options.manufacturerId;
            this.firmwareId = options.firmwareId;
            this.checksum = options.checksum;
            this.firmwareTarget = options.firmwareTarget;
            this.hardwareVersion = options.hardwareVersion;
        }
    }
    serialize() {
        const isV5 = this.version >= 5 && this.hardwareVersion != undefined;
        this.payload = Buffer.allocUnsafe(7 + (isV5 ? 1 : 0));
        this.payload.writeUInt16BE(this.manufacturerId, 0);
        this.payload.writeUInt16BE(this.firmwareId, 2);
        this.payload.writeUInt16BE(this.checksum, 4);
        this.payload[6] = this.firmwareTarget;
        if (isV5) {
            this.payload[7] = this.hardwareVersion;
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "manufacturer id": (0, safe_2.num2hex)(this.manufacturerId),
            "firmware id": (0, safe_2.num2hex)(this.firmwareId),
            checksum: (0, safe_2.num2hex)(this.checksum),
            "firmware target": this.firmwareTarget,
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
FirmwareUpdateMetaDataCCActivationSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.ActivationSet),
    (0, CommandClassDecorators_1.expectedCCResponse)(FirmwareUpdateMetaDataCCActivationReport)
], FirmwareUpdateMetaDataCCActivationSet);
exports.FirmwareUpdateMetaDataCCActivationSet = FirmwareUpdateMetaDataCCActivationSet;
let FirmwareUpdateMetaDataCCPrepareReport = class FirmwareUpdateMetaDataCCPrepareReport extends FirmwareUpdateMetaDataCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this.status = this.payload[0];
        this.checksum = this.payload.readUInt16BE(1);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                status: (0, safe_2.getEnumMemberName)(_Types_1.FirmwareDownloadStatus, this.status),
                checksum: (0, safe_2.num2hex)(this.checksum),
            },
        };
    }
};
FirmwareUpdateMetaDataCCPrepareReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.PrepareReport)
], FirmwareUpdateMetaDataCCPrepareReport);
exports.FirmwareUpdateMetaDataCCPrepareReport = FirmwareUpdateMetaDataCCPrepareReport;
let FirmwareUpdateMetaDataCCPrepareGet = class FirmwareUpdateMetaDataCCPrepareGet extends FirmwareUpdateMetaDataCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.manufacturerId = options.manufacturerId;
            this.firmwareId = options.firmwareId;
            this.firmwareTarget = options.firmwareTarget;
            this.fragmentSize = options.fragmentSize;
            this.hardwareVersion = options.hardwareVersion;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(8);
        this.payload.writeUInt16BE(this.manufacturerId, 0);
        this.payload.writeUInt16BE(this.firmwareId, 2);
        this.payload[4] = this.firmwareTarget;
        this.payload.writeUInt16BE(this.fragmentSize, 5);
        this.payload[7] = this.hardwareVersion;
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "manufacturer id": (0, safe_2.num2hex)(this.manufacturerId),
                "firmware id": (0, safe_2.num2hex)(this.firmwareId),
                "firmware target": this.firmwareTarget,
                "fragment size": this.fragmentSize,
                "hardware version": this.hardwareVersion,
            },
        };
    }
};
FirmwareUpdateMetaDataCCPrepareGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.FirmwareUpdateMetaDataCommand.PrepareGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(FirmwareUpdateMetaDataCCReport)
], FirmwareUpdateMetaDataCCPrepareGet);
exports.FirmwareUpdateMetaDataCCPrepareGet = FirmwareUpdateMetaDataCCPrepareGet;
//# sourceMappingURL=FirmwareUpdateMetaDataCC.js.map