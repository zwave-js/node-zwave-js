"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSerialApiInitDataResponse = exports.GetSerialApiInitDataRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const ZWaveChipTypes_1 = require("../../controller/ZWaveChipTypes");
let GetSerialApiInitDataRequest = class GetSerialApiInitDataRequest extends serial_1.Message {
};
GetSerialApiInitDataRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetSerialApiInitData),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetSerialApiInitData),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], GetSerialApiInitDataRequest);
exports.GetSerialApiInitDataRequest = GetSerialApiInitDataRequest;
let GetSerialApiInitDataResponse = class GetSerialApiInitDataResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            const apiVersion = this.payload[0];
            if (apiVersion < 10) {
                this.zwaveApiVersion = {
                    kind: "legacy",
                    version: apiVersion,
                };
            }
            else {
                // this module uses the officially specified Host API
                this.zwaveApiVersion = {
                    kind: "official",
                    version: apiVersion - 9,
                };
            }
            const capabilities = this.payload[1];
            // The new "official" Host API specs incorrectly switched the meaning of some flags
            // Apparently this was never intended, and the firmware correctly uses the "old" encoding.
            // https://community.silabs.com/s/question/0D58Y00009qjEghSAE/bug-in-firmware-7191-get-init-data-response-does-not-match-host-api-specification?language=en_US
            this.nodeType =
                capabilities & 0b0001
                    ? core_1.NodeType["End Node"]
                    : core_1.NodeType.Controller;
            this.supportsTimers = !!(capabilities & 0b0010);
            this.isPrimary = !(capabilities & 0b0100);
            this.isSIS = !!(capabilities & 0b1000);
            let offset = 2;
            this.nodeIds = [];
            if (this.payload.length > offset) {
                const nodeListLength = this.payload[offset];
                // Controller Nodes MUST set this field to 29
                if (nodeListLength === core_1.NUM_NODEMASK_BYTES &&
                    this.payload.length >= offset + 1 + nodeListLength) {
                    const nodeBitMask = this.payload.slice(offset + 1, offset + 1 + nodeListLength);
                    this.nodeIds = (0, core_1.parseNodeBitMask)(nodeBitMask);
                }
                offset += 1 + nodeListLength;
            }
            // these might not be present:
            const chipType = this.payload[offset];
            const chipVersion = this.payload[offset + 1];
            if (chipType != undefined && chipVersion != undefined) {
                this.zwaveChipType = (0, ZWaveChipTypes_1.getZWaveChipType)(chipType, chipVersion);
            }
        }
        else {
            this.zwaveApiVersion = options.zwaveApiVersion;
            this.isPrimary = options.isPrimary;
            this.nodeType = options.nodeType;
            this.supportsTimers = options.supportsTimers;
            this.isSIS = options.isSIS;
            this.nodeIds = options.nodeIds;
            this.zwaveChipType = options.zwaveChipType;
        }
    }
    serialize() {
        let chipType;
        if (typeof this.zwaveChipType === "string") {
            chipType = (0, ZWaveChipTypes_1.getChipTypeAndVersion)(this.zwaveChipType);
        }
        else {
            chipType = this.zwaveChipType;
        }
        this.payload = Buffer.allocUnsafe(3 + core_1.NUM_NODEMASK_BYTES + (chipType ? 2 : 0));
        let capabilities = 0;
        if (this.supportsTimers)
            capabilities |= 0b0010;
        if (this.isSIS)
            capabilities |= 0b1000;
        if (this.zwaveApiVersion.kind === "legacy") {
            this.payload[0] = this.zwaveApiVersion.version;
            if (this.nodeType === core_1.NodeType["End Node"])
                capabilities |= 0b0001;
            if (!this.isPrimary)
                capabilities |= 0b0100;
        }
        else {
            this.payload[0] = this.zwaveApiVersion.version + 9;
            if (this.nodeType === core_1.NodeType.Controller)
                capabilities |= 0b0001;
            if (this.isPrimary)
                capabilities |= 0b0100;
        }
        this.payload[1] = capabilities;
        this.payload[2] = core_1.NUM_NODEMASK_BYTES;
        const nodeBitMask = (0, core_1.encodeBitMask)(this.nodeIds, core_1.MAX_NODES);
        nodeBitMask.copy(this.payload, 3);
        if (chipType) {
            this.payload[3 + core_1.NUM_NODEMASK_BYTES] = chipType.type;
            this.payload[3 + core_1.NUM_NODEMASK_BYTES + 1] = chipType.version;
        }
        return super.serialize();
    }
};
GetSerialApiInitDataResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetSerialApiInitData)
], GetSerialApiInitDataResponse);
exports.GetSerialApiInitDataResponse = GetSerialApiInitDataResponse;
// Z-Stick 7, 7.15
// 12:15:28.505 DRIVER « [RES] [GetSerialApiInitData]
//                         Z-Wave API Version: 9 (proprietary)
//                         node type:          controller
//                         supports timers:    false
//                         is secondary:       false
//                         is SUC:             true
//                         chip type:          7
//                         chip version:       0
// ACC-UZB3
// 12:21:11.141 DRIVER « [RES] [GetSerialApiInitData]
//                         Z-Wave API Version: 8 (proprietary)
//                         node type:          controller
//                         supports timers:    false
//                         is secondary:       false
//                         is SUC:             true
//                         chip type:          5
//                         chip version:       0
// UZB7, 7.11
// 12:33:14.211 DRIVER « [RES] [GetSerialApiInitData]
//                         Z-Wave API Version: 8 (proprietary)
//                         node type:          controller
//                         supports timers:    false
//                         is secondary:       false
//                         is SUC:             true
//                         chip type:          7
//                         chip version:       0
//# sourceMappingURL=GetSerialApiInitDataMessages.js.map