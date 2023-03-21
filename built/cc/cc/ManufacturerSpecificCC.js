"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManufacturerSpecificCCDeviceSpecificGet = exports.ManufacturerSpecificCCDeviceSpecificReport = exports.ManufacturerSpecificCCGet = exports.ManufacturerSpecificCCReport = exports.ManufacturerSpecificCC = exports.ManufacturerSpecificCCAPI = exports.ManufacturerSpecificCCValues = void 0;
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
exports.ManufacturerSpecificCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Manufacturer Specific"], {
        ...Values_1.V.staticProperty("manufacturerId", {
            ...safe_1.ValueMetadata.ReadOnlyUInt16,
            label: "Manufacturer ID",
        }, { supportsEndpoints: false }),
        ...Values_1.V.staticProperty("productType", {
            ...safe_1.ValueMetadata.ReadOnlyUInt16,
            label: "Product type",
        }, { supportsEndpoints: false }),
        ...Values_1.V.staticProperty("productId", {
            ...safe_1.ValueMetadata.ReadOnlyUInt16,
            label: "Product ID",
        }, { supportsEndpoints: false }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Manufacturer Specific"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("deviceId", "deviceId", (type) => (0, safe_2.getEnumMemberName)(_Types_1.DeviceIdType, type), ({ property, propertyKey }) => property === "deviceId" &&
            typeof propertyKey === "string" &&
            propertyKey in _Types_1.DeviceIdType, (type) => ({
            ...safe_1.ValueMetadata.ReadOnlyString,
            label: `Device ID (${(0, safe_2.getEnumMemberName)(_Types_1.DeviceIdType, type)})`,
        }), { minVersion: 2 }),
    }),
});
// @noSetValueAPI This CC is read-only
let ManufacturerSpecificCCAPI = class ManufacturerSpecificCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ManufacturerSpecificCommand.Get:
                return true; // This is mandatory
            case _Types_1.ManufacturerSpecificCommand.DeviceSpecificGet:
                return this.version >= 2;
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.ManufacturerSpecificCommand, _Types_1.ManufacturerSpecificCommand.Get);
        const cc = new ManufacturerSpecificCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "manufacturerId",
                "productType",
                "productId",
            ]);
        }
    }
    async deviceSpecificGet(deviceIdType) {
        __assertType("deviceIdType", "DeviceIdType", __assertType__number.bind(void 0, deviceIdType));
        this.assertSupportsCommand(_Types_1.ManufacturerSpecificCommand, _Types_1.ManufacturerSpecificCommand.DeviceSpecificGet);
        const cc = new ManufacturerSpecificCCDeviceSpecificGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            deviceIdType,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.deviceId;
    }
};
ManufacturerSpecificCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Manufacturer Specific"])
], ManufacturerSpecificCCAPI);
exports.ManufacturerSpecificCCAPI = ManufacturerSpecificCCAPI;
let ManufacturerSpecificCC = class ManufacturerSpecificCC extends CommandClass_1.CommandClass {
    determineRequiredCCInterviews() {
        // The Manufacturer Specific CC MUST be interviewed first
        return [];
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Manufacturer Specific"], applHost, endpoint).withOptions({ priority: safe_1.MessagePriority.NodeQuery });
        if (!applHost.isControllerNode(node.id)) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `Interviewing ${this.ccName}...`,
                direction: "none",
            });
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "querying manufacturer information...",
                direction: "outbound",
            });
            const mfResp = await api.get();
            if (mfResp) {
                const logMessage = `received response for manufacturer information:
  manufacturer: ${applHost.configManager.lookupManufacturer(mfResp.manufacturerId) ||
                    "unknown"} (${(0, safe_2.num2hex)(mfResp.manufacturerId)})
  product type: ${(0, safe_2.num2hex)(mfResp.productType)}
  product id:   ${(0, safe_2.num2hex)(mfResp.productId)}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
};
ManufacturerSpecificCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Manufacturer Specific"]),
    (0, CommandClassDecorators_1.implementedVersion)(2),
    (0, CommandClassDecorators_1.ccValues)(exports.ManufacturerSpecificCCValues)
], ManufacturerSpecificCC);
exports.ManufacturerSpecificCC = ManufacturerSpecificCC;
let ManufacturerSpecificCCReport = class ManufacturerSpecificCCReport extends ManufacturerSpecificCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 6);
        this.manufacturerId = this.payload.readUInt16BE(0);
        this.productType = this.payload.readUInt16BE(2);
        this.productId = this.payload.readUInt16BE(4);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "manufacturer id": (0, safe_2.num2hex)(this.manufacturerId),
                "product type": (0, safe_2.num2hex)(this.productType),
                "product id": (0, safe_2.num2hex)(this.productId),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ManufacturerSpecificCCValues.manufacturerId)
], ManufacturerSpecificCCReport.prototype, "manufacturerId", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ManufacturerSpecificCCValues.productType)
], ManufacturerSpecificCCReport.prototype, "productType", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ManufacturerSpecificCCValues.productId)
], ManufacturerSpecificCCReport.prototype, "productId", void 0);
ManufacturerSpecificCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ManufacturerSpecificCommand.Report)
], ManufacturerSpecificCCReport);
exports.ManufacturerSpecificCCReport = ManufacturerSpecificCCReport;
let ManufacturerSpecificCCGet = class ManufacturerSpecificCCGet extends ManufacturerSpecificCC {
};
ManufacturerSpecificCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ManufacturerSpecificCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ManufacturerSpecificCCReport)
], ManufacturerSpecificCCGet);
exports.ManufacturerSpecificCCGet = ManufacturerSpecificCCGet;
let ManufacturerSpecificCCDeviceSpecificReport = class ManufacturerSpecificCCDeviceSpecificReport extends ManufacturerSpecificCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.type = this.payload[0] & 0b111;
        const dataFormat = this.payload[1] >>> 5;
        const dataLength = this.payload[1] & 0b11111;
        (0, safe_1.validatePayload)(dataLength > 0, this.payload.length >= 2 + dataLength);
        const deviceIdData = this.payload.slice(2, 2 + dataLength);
        this.deviceId =
            dataFormat === 0
                ? deviceIdData.toString("utf8")
                : "0x" + deviceIdData.toString("hex");
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "device id type": (0, safe_2.getEnumMemberName)(_Types_1.DeviceIdType, this.type),
                "device id": this.deviceId,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ManufacturerSpecificCCValues.deviceId, (self) => [self.type])
], ManufacturerSpecificCCDeviceSpecificReport.prototype, "deviceId", void 0);
ManufacturerSpecificCCDeviceSpecificReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ManufacturerSpecificCommand.DeviceSpecificReport)
], ManufacturerSpecificCCDeviceSpecificReport);
exports.ManufacturerSpecificCCDeviceSpecificReport = ManufacturerSpecificCCDeviceSpecificReport;
let ManufacturerSpecificCCDeviceSpecificGet = class ManufacturerSpecificCCDeviceSpecificGet extends ManufacturerSpecificCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.deviceIdType = options.deviceIdType;
        }
    }
    serialize() {
        this.payload = Buffer.from([(this.deviceIdType || 0) & 0b111]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "device id type": (0, safe_2.getEnumMemberName)(_Types_1.DeviceIdType, this.deviceIdType),
            },
        };
    }
};
ManufacturerSpecificCCDeviceSpecificGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ManufacturerSpecificCommand.DeviceSpecificGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ManufacturerSpecificCCDeviceSpecificReport)
], ManufacturerSpecificCCDeviceSpecificGet);
exports.ManufacturerSpecificCCDeviceSpecificGet = ManufacturerSpecificCCDeviceSpecificGet;
//# sourceMappingURL=ManufacturerSpecificCC.js.map