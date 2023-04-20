"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZWaveProtocolCCSmartStartInclusionRequest = exports.ZWaveProtocolCCSmartStartPrime = exports.ZWaveProtocolCCSmartStartIncludedNodeInformation = exports.ZWaveProtocolCCAssignSUCReturnRoutePriority = exports.ZWaveProtocolCCAssignReturnRoutePriority = exports.ZWaveProtocolCCExcludeRequest = exports.ZWaveProtocolCCSetNWIMode = exports.ZWaveProtocolCCNodesExist = exports.ZWaveProtocolCCNodesExistReply = exports.ZWaveProtocolCCReserveNodeIDs = exports.ZWaveProtocolCCReservedIDs = exports.ZWaveProtocolCCNOPPower = exports.ZWaveProtocolCCAcceptLost = exports.ZWaveProtocolCCLost = exports.ZWaveProtocolCCStaticRouteRequest = exports.ZWaveProtocolCCAssignSUCReturnRoute = exports.ZWaveProtocolCCSetSUCAck = exports.ZWaveProtocolCCSetSUC = exports.ZWaveProtocolCCSUCNodeID = exports.ZWaveProtocolCCAutomaticControllerUpdateStart = exports.ZWaveProtocolCCTransferNewPrimaryControllerComplete = exports.ZWaveProtocolCCNewRangeRegistered = exports.ZWaveProtocolCCNewNodeRegistered = exports.ZWaveProtocolCCAssignReturnRoute = exports.ZWaveProtocolCCTransferEnd = exports.ZWaveProtocolCCTransferRangeInformation = exports.ZWaveProtocolCCTransferNodeInformation = exports.ZWaveProtocolCCTransferPresentation = exports.ZWaveProtocolCCCommandComplete = exports.ZWaveProtocolCCGetNodesInRange = exports.ZWaveProtocolCCRangeInfo = exports.ZWaveProtocolCCFindNodesInRange = exports.ZWaveProtocolCCAssignIDs = exports.ZWaveProtocolCCRequestNodeInformationFrame = exports.ZWaveProtocolCCNodeInformationFrame = exports.ZWaveProtocolCC = void 0;
const core_1 = require("@zwave-js/core");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const _Types_1 = require("../lib/_Types");
// TODO: Move this enumeration into the _Types.ts file
// All additional type definitions (except CC constructor options) must be defined there too
let ZWaveProtocolCC = class ZWaveProtocolCC extends CommandClass_1.CommandClass {
};
ZWaveProtocolCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(core_1.CommandClasses["Z-Wave Protocol"]),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], ZWaveProtocolCC);
exports.ZWaveProtocolCC = ZWaveProtocolCC;
let ZWaveProtocolCCNodeInformationFrame = class ZWaveProtocolCCNodeInformationFrame extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        let nif;
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            nif = (0, core_1.parseNodeInformationFrame)(this.payload);
        }
        else {
            nif = options;
        }
        this.basicDeviceClass = nif.basicDeviceClass;
        this.genericDeviceClass = nif.genericDeviceClass;
        this.specificDeviceClass = nif.specificDeviceClass;
        this.isListening = nif.isListening;
        this.isFrequentListening = nif.isFrequentListening;
        this.isRouting = nif.isRouting;
        this.supportedDataRates = nif.supportedDataRates;
        this.protocolVersion = nif.protocolVersion;
        this.optionalFunctionality = nif.optionalFunctionality;
        this.nodeType = nif.nodeType;
        this.supportsSecurity = nif.supportsSecurity;
        this.supportsBeaming = nif.supportsBeaming;
        this.supportedCCs = nif.supportedCCs;
    }
    serialize() {
        this.payload = (0, core_1.encodeNodeInformationFrame)(this);
        return super.serialize();
    }
};
ZWaveProtocolCCNodeInformationFrame = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.NodeInformationFrame)
], ZWaveProtocolCCNodeInformationFrame);
exports.ZWaveProtocolCCNodeInformationFrame = ZWaveProtocolCCNodeInformationFrame;
let ZWaveProtocolCCRequestNodeInformationFrame = class ZWaveProtocolCCRequestNodeInformationFrame extends ZWaveProtocolCC {
};
ZWaveProtocolCCRequestNodeInformationFrame = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.RequestNodeInformationFrame),
    (0, CommandClassDecorators_1.expectedCCResponse)(ZWaveProtocolCCNodeInformationFrame)
], ZWaveProtocolCCRequestNodeInformationFrame);
exports.ZWaveProtocolCCRequestNodeInformationFrame = ZWaveProtocolCCRequestNodeInformationFrame;
let ZWaveProtocolCCAssignIDs = class ZWaveProtocolCCAssignIDs extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 5);
            this.nodeId = this.payload[0];
            this.homeId = this.payload.readUInt32BE(1);
        }
        else {
            this.nodeId = options.nodeId;
            this.homeId = options.homeId;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(5);
        this.payload[0] = this.nodeId;
        this.payload.writeUInt32BE(this.homeId, 1);
        return super.serialize();
    }
};
ZWaveProtocolCCAssignIDs = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.AssignIDs)
], ZWaveProtocolCCAssignIDs);
exports.ZWaveProtocolCCAssignIDs = ZWaveProtocolCCAssignIDs;
let ZWaveProtocolCCFindNodesInRange = class ZWaveProtocolCCFindNodesInRange extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            const speedPresent = this.payload[0] & 128;
            const bitmaskLength = this.payload[0] & 31;
            (0, core_1.validatePayload)(this.payload.length >= 1 + bitmaskLength);
            this.candidateNodeIds = (0, core_1.parseBitMask)(this.payload.slice(1, 1 + bitmaskLength));
            const rest = this.payload.slice(1 + bitmaskLength);
            if (speedPresent) {
                (0, core_1.validatePayload)(rest.length >= 1);
                if (rest.length === 1) {
                    this.dataRate = rest[0] & 0b111;
                    this.wakeUpTime = _Types_1.WakeUpTime.None;
                }
                else if (rest.length === 2) {
                    this.wakeUpTime = (0, _Types_1.parseWakeUpTime)(rest[0]);
                    this.dataRate = rest[1] & 0b111;
                }
                else {
                    throw core_1.validatePayload.fail("Invalid payload length");
                }
            }
            else if (rest.length >= 1) {
                this.wakeUpTime = (0, _Types_1.parseWakeUpTime)(rest[0]);
                this.dataRate = core_1.ZWaveDataRate["9k6"];
            }
            else {
                this.wakeUpTime = _Types_1.WakeUpTime.None;
                this.dataRate = core_1.ZWaveDataRate["9k6"];
            }
        }
        else {
            this.candidateNodeIds = options.candidateNodeIds;
            this.wakeUpTime = options.wakeUpTime;
            this.dataRate = options.dataRate ?? core_1.ZWaveDataRate["9k6"];
        }
    }
    serialize() {
        const nodesBitmask = (0, core_1.encodeBitMask)(this.candidateNodeIds, core_1.MAX_NODES);
        const speedAndLength = 128 | nodesBitmask.length;
        this.payload = Buffer.concat([
            Buffer.from([speedAndLength]),
            nodesBitmask,
            Buffer.from([this.wakeUpTime, this.dataRate]),
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCFindNodesInRange = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.FindNodesInRange)
], ZWaveProtocolCCFindNodesInRange);
exports.ZWaveProtocolCCFindNodesInRange = ZWaveProtocolCCFindNodesInRange;
let ZWaveProtocolCCRangeInfo = class ZWaveProtocolCCRangeInfo extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            const bitmaskLength = this.payload[0] & 31;
            (0, core_1.validatePayload)(this.payload.length >= 1 + bitmaskLength);
            this.neighborNodeIds = (0, core_1.parseBitMask)(this.payload.slice(1, 1 + bitmaskLength));
            if (this.payload.length >= 2 + bitmaskLength) {
                this.wakeUpTime = (0, _Types_1.parseWakeUpTime)(this.payload[1 + bitmaskLength]);
            }
        }
        else {
            this.neighborNodeIds = options.neighborNodeIds;
            this.wakeUpTime = options.wakeUpTime;
        }
    }
    serialize() {
        const nodesBitmask = (0, core_1.encodeBitMask)(this.neighborNodeIds, core_1.MAX_NODES);
        this.payload = Buffer.concat([
            Buffer.from([nodesBitmask.length]),
            nodesBitmask,
            this.wakeUpTime != undefined
                ? Buffer.from([this.wakeUpTime])
                : Buffer.alloc(0),
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCRangeInfo = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.RangeInfo)
], ZWaveProtocolCCRangeInfo);
exports.ZWaveProtocolCCRangeInfo = ZWaveProtocolCCRangeInfo;
let ZWaveProtocolCCGetNodesInRange = class ZWaveProtocolCCGetNodesInRange extends ZWaveProtocolCC {
};
ZWaveProtocolCCGetNodesInRange = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.GetNodesInRange),
    (0, CommandClassDecorators_1.expectedCCResponse)(ZWaveProtocolCCRangeInfo)
], ZWaveProtocolCCGetNodesInRange);
exports.ZWaveProtocolCCGetNodesInRange = ZWaveProtocolCCGetNodesInRange;
let ZWaveProtocolCCCommandComplete = class ZWaveProtocolCCCommandComplete extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.sequenceNumber = this.payload[0];
        }
        else {
            this.sequenceNumber = options.sequenceNumber;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.sequenceNumber]);
        return super.serialize();
    }
};
ZWaveProtocolCCCommandComplete = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.CommandComplete)
], ZWaveProtocolCCCommandComplete);
exports.ZWaveProtocolCCCommandComplete = ZWaveProtocolCCCommandComplete;
let ZWaveProtocolCCTransferPresentation = class ZWaveProtocolCCTransferPresentation extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            const option = this.payload[0];
            this.supportsNWI = !!(option & 0b0001);
            this.excludeNode = !!(option & 0b0010);
            this.includeNode = !!(option & 0b0100);
        }
        else {
            if (options.includeNode && options.excludeNode) {
                throw new core_1.ZWaveError(`${this.constructor.name}: the includeNode and excludeNode options cannot both be true`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.supportsNWI = options.supportsNWI;
            this.includeNode = options.includeNode;
            this.excludeNode = options.excludeNode;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            (this.supportsNWI ? 0b0001 : 0) |
                (this.excludeNode ? 0b0010 : 0) |
                (this.includeNode ? 0b0100 : 0),
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCTransferPresentation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.TransferPresentation)
], ZWaveProtocolCCTransferPresentation);
exports.ZWaveProtocolCCTransferPresentation = ZWaveProtocolCCTransferPresentation;
let ZWaveProtocolCCTransferNodeInformation = class ZWaveProtocolCCTransferNodeInformation extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        let info;
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.sequenceNumber = this.payload[0];
            this.nodeId = this.payload[1];
            info = (0, core_1.parseNodeProtocolInfoAndDeviceClass)(this.payload.slice(2)).info;
        }
        else {
            this.sequenceNumber = options.sequenceNumber;
            this.nodeId = options.nodeId;
            info = options;
        }
        this.basicDeviceClass = info.basicDeviceClass;
        this.genericDeviceClass = info.genericDeviceClass;
        this.specificDeviceClass = info.specificDeviceClass;
        this.isListening = info.isListening;
        this.isFrequentListening = info.isFrequentListening;
        this.isRouting = info.isRouting;
        this.supportedDataRates = info.supportedDataRates;
        this.protocolVersion = info.protocolVersion;
        this.optionalFunctionality = info.optionalFunctionality;
        this.nodeType = info.nodeType;
        this.supportsSecurity = info.supportsSecurity;
        this.supportsBeaming = info.supportsBeaming;
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.sequenceNumber, this.nodeId]),
            (0, core_1.encodeNodeProtocolInfoAndDeviceClass)(this),
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCTransferNodeInformation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.TransferNodeInformation)
], ZWaveProtocolCCTransferNodeInformation);
exports.ZWaveProtocolCCTransferNodeInformation = ZWaveProtocolCCTransferNodeInformation;
let ZWaveProtocolCCTransferRangeInformation = class ZWaveProtocolCCTransferRangeInformation extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 3);
            this.sequenceNumber = this.payload[0];
            this.nodeId = this.payload[1];
            const bitmaskLength = this.payload[2];
            (0, core_1.validatePayload)(this.payload.length >= 3 + bitmaskLength);
            this.neighborNodeIds = (0, core_1.parseBitMask)(this.payload.slice(3, 3 + bitmaskLength));
        }
        else {
            this.sequenceNumber = options.sequenceNumber;
            this.nodeId = options.nodeId;
            this.neighborNodeIds = options.neighborNodeIds;
        }
    }
    serialize() {
        const nodesBitmask = (0, core_1.encodeBitMask)(this.neighborNodeIds, core_1.MAX_NODES);
        this.payload = Buffer.concat([
            Buffer.from([
                this.sequenceNumber,
                this.nodeId,
                nodesBitmask.length,
            ]),
            nodesBitmask,
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCTransferRangeInformation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.TransferRangeInformation)
], ZWaveProtocolCCTransferRangeInformation);
exports.ZWaveProtocolCCTransferRangeInformation = ZWaveProtocolCCTransferRangeInformation;
let ZWaveProtocolCCTransferEnd = class ZWaveProtocolCCTransferEnd extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.status = this.payload[0];
        }
        else {
            this.status = options.status;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.status]);
        return super.serialize();
    }
};
ZWaveProtocolCCTransferEnd = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.TransferEnd)
], ZWaveProtocolCCTransferEnd);
exports.ZWaveProtocolCCTransferEnd = ZWaveProtocolCCTransferEnd;
let ZWaveProtocolCCAssignReturnRoute = class ZWaveProtocolCCAssignReturnRoute extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 7);
            this.nodeId = this.payload[0];
            this.routeIndex = this.payload[1] >>> 4;
            const numRepeaters = this.payload[1] & 0b1111;
            this.repeaters = [...this.payload.slice(2, 2 + numRepeaters)];
            const speedAndWakeup = this.payload[2 + numRepeaters];
            this.destinationSpeed = (speedAndWakeup >>> 3) & 0b111;
            this.destinationWakeUp = (speedAndWakeup >>> 1) & 0b11;
        }
        else {
            if (options.repeaters.length > core_1.MAX_REPEATERS) {
                throw new core_1.ZWaveError(`${this.constructor.name}: too many repeaters`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.nodeId = options.nodeId;
            this.routeIndex = options.routeIndex;
            this.repeaters = options.repeaters;
            this.destinationWakeUp = options.destinationWakeUp;
            this.destinationSpeed = options.destinationSpeed;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.nodeId,
            (this.routeIndex << 4) | this.repeaters.length,
            this.repeaters[0] ?? 0,
            this.repeaters[1] ?? 0,
            this.repeaters[2] ?? 0,
            this.repeaters[3] ?? 0,
            (this.destinationSpeed << 3) | (this.destinationWakeUp << 1),
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCAssignReturnRoute = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.AssignReturnRoute)
], ZWaveProtocolCCAssignReturnRoute);
exports.ZWaveProtocolCCAssignReturnRoute = ZWaveProtocolCCAssignReturnRoute;
let ZWaveProtocolCCNewNodeRegistered = class ZWaveProtocolCCNewNodeRegistered extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        let nif;
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.nodeId = this.payload[0];
            nif = (0, core_1.parseNodeInformationFrame)(this.payload.slice(1));
        }
        else {
            this.nodeId = options.nodeId;
            nif = options;
        }
        this.basicDeviceClass = nif.basicDeviceClass;
        this.genericDeviceClass = nif.genericDeviceClass;
        this.specificDeviceClass = nif.specificDeviceClass;
        this.isListening = nif.isListening;
        this.isFrequentListening = nif.isFrequentListening;
        this.isRouting = nif.isRouting;
        this.supportedDataRates = nif.supportedDataRates;
        this.protocolVersion = nif.protocolVersion;
        this.optionalFunctionality = nif.optionalFunctionality;
        this.nodeType = nif.nodeType;
        this.supportsSecurity = nif.supportsSecurity;
        this.supportsBeaming = nif.supportsBeaming;
        this.supportedCCs = nif.supportedCCs;
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.nodeId]),
            (0, core_1.encodeNodeInformationFrame)(this),
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCNewNodeRegistered = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.NewNodeRegistered)
], ZWaveProtocolCCNewNodeRegistered);
exports.ZWaveProtocolCCNewNodeRegistered = ZWaveProtocolCCNewNodeRegistered;
let ZWaveProtocolCCNewRangeRegistered = class ZWaveProtocolCCNewRangeRegistered extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.nodeId = this.payload[0];
            const numNeighbors = this.payload[1];
            this.neighborNodeIds = [...this.payload.slice(2, 2 + numNeighbors)];
        }
        else {
            this.nodeId = options.nodeId;
            this.neighborNodeIds = options.neighborNodeIds;
        }
    }
    serialize() {
        const nodesBitmask = (0, core_1.encodeBitMask)(this.neighborNodeIds, core_1.MAX_NODES);
        this.payload = Buffer.concat([
            Buffer.from([this.nodeId, nodesBitmask.length]),
            nodesBitmask,
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCNewRangeRegistered = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.NewRangeRegistered)
], ZWaveProtocolCCNewRangeRegistered);
exports.ZWaveProtocolCCNewRangeRegistered = ZWaveProtocolCCNewRangeRegistered;
let ZWaveProtocolCCTransferNewPrimaryControllerComplete = class ZWaveProtocolCCTransferNewPrimaryControllerComplete extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.genericDeviceClass = this.payload[0];
        }
        else {
            this.genericDeviceClass = options.genericDeviceClass;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.genericDeviceClass]);
        return super.serialize();
    }
};
ZWaveProtocolCCTransferNewPrimaryControllerComplete = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.TransferNewPrimaryControllerComplete)
], ZWaveProtocolCCTransferNewPrimaryControllerComplete);
exports.ZWaveProtocolCCTransferNewPrimaryControllerComplete = ZWaveProtocolCCTransferNewPrimaryControllerComplete;
let ZWaveProtocolCCAutomaticControllerUpdateStart = class ZWaveProtocolCCAutomaticControllerUpdateStart extends ZWaveProtocolCC {
};
ZWaveProtocolCCAutomaticControllerUpdateStart = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.AutomaticControllerUpdateStart)
], ZWaveProtocolCCAutomaticControllerUpdateStart);
exports.ZWaveProtocolCCAutomaticControllerUpdateStart = ZWaveProtocolCCAutomaticControllerUpdateStart;
let ZWaveProtocolCCSUCNodeID = class ZWaveProtocolCCSUCNodeID extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.sucNodeId = this.payload[0];
            const capabilities = this.payload[1] ?? 0;
            this.isSIS = !!(capabilities & 0b1);
        }
        else {
            this.sucNodeId = options.sucNodeId;
            this.isSIS = options.isSIS;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.sucNodeId, this.isSIS ? 0b1 : 0]);
        return super.serialize();
    }
};
ZWaveProtocolCCSUCNodeID = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.SUCNodeID)
], ZWaveProtocolCCSUCNodeID);
exports.ZWaveProtocolCCSUCNodeID = ZWaveProtocolCCSUCNodeID;
let ZWaveProtocolCCSetSUC = class ZWaveProtocolCCSetSUC extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            // Byte 0 must be 0x01 or ignored
            const capabilities = this.payload[1] ?? 0;
            this.enableSIS = !!(capabilities & 0b1);
        }
        else {
            this.enableSIS = options.enableSIS;
        }
    }
    serialize() {
        this.payload = Buffer.from([0x01, this.enableSIS ? 0b1 : 0]);
        return super.serialize();
    }
};
ZWaveProtocolCCSetSUC = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.SetSUC)
], ZWaveProtocolCCSetSUC);
exports.ZWaveProtocolCCSetSUC = ZWaveProtocolCCSetSUC;
let ZWaveProtocolCCSetSUCAck = class ZWaveProtocolCCSetSUCAck extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.accepted = this.payload[0] === 0x01;
            const capabilities = this.payload[1] ?? 0;
            this.isSIS = !!(capabilities & 0b1);
        }
        else {
            this.accepted = options.accepted;
            this.isSIS = options.isSIS;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.accepted ? 0x01 : 0x00,
            this.isSIS ? 0b1 : 0,
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCSetSUCAck = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.SetSUCAck)
], ZWaveProtocolCCSetSUCAck);
exports.ZWaveProtocolCCSetSUCAck = ZWaveProtocolCCSetSUCAck;
let ZWaveProtocolCCAssignSUCReturnRoute = class ZWaveProtocolCCAssignSUCReturnRoute extends ZWaveProtocolCCAssignReturnRoute {
};
ZWaveProtocolCCAssignSUCReturnRoute = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.AssignSUCReturnRoute)
], ZWaveProtocolCCAssignSUCReturnRoute);
exports.ZWaveProtocolCCAssignSUCReturnRoute = ZWaveProtocolCCAssignSUCReturnRoute;
let ZWaveProtocolCCStaticRouteRequest = class ZWaveProtocolCCStaticRouteRequest extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 5);
            this.nodeIds = [...this.payload.slice(0, 5)].filter((id) => id > 0 && id <= core_1.MAX_NODES);
        }
        else {
            if (options.nodeIds.some((n) => n < 1 || n > core_1.MAX_NODES)) {
                throw new core_1.ZWaveError(`All node IDs must be between 1 and ${core_1.MAX_NODES}!`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.nodeIds = options.nodeIds;
        }
    }
    serialize() {
        this.payload = Buffer.alloc(5, 0);
        for (let i = 0; i < this.nodeIds.length && i < 5; i++) {
            this.payload[i] = this.nodeIds[i];
        }
        return super.serialize();
    }
};
ZWaveProtocolCCStaticRouteRequest = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.StaticRouteRequest)
], ZWaveProtocolCCStaticRouteRequest);
exports.ZWaveProtocolCCStaticRouteRequest = ZWaveProtocolCCStaticRouteRequest;
let ZWaveProtocolCCLost = class ZWaveProtocolCCLost extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.nodeId = this.payload[0];
        }
        else {
            this.nodeId = options.nodeId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.nodeId]);
        return super.serialize();
    }
};
ZWaveProtocolCCLost = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.Lost)
], ZWaveProtocolCCLost);
exports.ZWaveProtocolCCLost = ZWaveProtocolCCLost;
let ZWaveProtocolCCAcceptLost = class ZWaveProtocolCCAcceptLost extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            (0, core_1.validatePayload)(this.payload[0] === 0x04 || this.payload[0] === 0x05);
            this.accepted = this.payload[0] === 0x05;
        }
        else {
            this.accepted = options.accepted;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.accepted ? 0x05 : 0x04]);
        return super.serialize();
    }
};
ZWaveProtocolCCAcceptLost = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.AcceptLost)
], ZWaveProtocolCCAcceptLost);
exports.ZWaveProtocolCCAcceptLost = ZWaveProtocolCCAcceptLost;
let ZWaveProtocolCCNOPPower = class ZWaveProtocolCCNOPPower extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            if (this.payload.length >= 2) {
                // Ignore byte 0
                this.powerDampening = this.payload[1];
            }
            else if (this.payload.length === 1) {
                this.powerDampening = [
                    0xf0, 0xc8, 0xa7, 0x91, 0x77, 0x67, 0x60, 0x46, 0x38, 0x35,
                    0x32, 0x30, 0x24, 0x22, 0x20,
                ].indexOf(this.payload[0]);
                if (this.powerDampening === -1)
                    this.powerDampening = 0;
            }
            else {
                throw core_1.validatePayload.fail("Invalid payload length!");
            }
        }
        else {
            if (options.powerDampening < 0 || options.powerDampening > 14) {
                throw new core_1.ZWaveError(`${this.constructor.name}: power dampening must be between 0 and 14 dBm!`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.powerDampening = options.powerDampening;
        }
    }
    serialize() {
        this.payload = Buffer.from([0, this.powerDampening]);
        return super.serialize();
    }
};
ZWaveProtocolCCNOPPower = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.NOPPower)
], ZWaveProtocolCCNOPPower);
exports.ZWaveProtocolCCNOPPower = ZWaveProtocolCCNOPPower;
let ZWaveProtocolCCReservedIDs = class ZWaveProtocolCCReservedIDs extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            const numNodeIDs = this.payload[0];
            (0, core_1.validatePayload)(this.payload.length >= 1 + numNodeIDs);
            this.reservedNodeIDs = [...this.payload.slice(1, 1 + numNodeIDs)];
        }
        else {
            this.reservedNodeIDs = options.reservedNodeIDs;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.reservedNodeIDs.length,
            ...this.reservedNodeIDs,
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCReservedIDs = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.ReservedIDs)
], ZWaveProtocolCCReservedIDs);
exports.ZWaveProtocolCCReservedIDs = ZWaveProtocolCCReservedIDs;
let ZWaveProtocolCCReserveNodeIDs = class ZWaveProtocolCCReserveNodeIDs extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.numNodeIDs = this.payload[0];
        }
        else {
            this.numNodeIDs = options.numNodeIDs;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.numNodeIDs]);
        return super.serialize();
    }
};
ZWaveProtocolCCReserveNodeIDs = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.ReserveNodeIDs),
    (0, CommandClassDecorators_1.expectedCCResponse)(ZWaveProtocolCCReservedIDs)
], ZWaveProtocolCCReserveNodeIDs);
exports.ZWaveProtocolCCReserveNodeIDs = ZWaveProtocolCCReserveNodeIDs;
let ZWaveProtocolCCNodesExistReply = class ZWaveProtocolCCNodesExistReply extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.nodeMaskType = this.payload[0];
            this.nodeListUpdated = this.payload[1] === 0x01;
        }
        else {
            this.nodeMaskType = options.nodeMaskType;
            this.nodeListUpdated = options.nodeListUpdated;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.nodeMaskType,
            this.nodeListUpdated ? 0x01 : 0x00,
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCNodesExistReply = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.NodesExistReply)
], ZWaveProtocolCCNodesExistReply);
exports.ZWaveProtocolCCNodesExistReply = ZWaveProtocolCCNodesExistReply;
function testResponseForZWaveProtocolNodesExist(sent, received) {
    return received.nodeMaskType === sent.nodeMaskType;
}
let ZWaveProtocolCCNodesExist = class ZWaveProtocolCCNodesExist extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.nodeMaskType = this.payload[0];
            const numNodeIDs = this.payload[1];
            (0, core_1.validatePayload)(this.payload.length >= 2 + numNodeIDs);
            this.nodeIDs = [...this.payload.slice(2, 2 + numNodeIDs)];
        }
        else {
            this.nodeMaskType = options.nodeMaskType;
            this.nodeIDs = options.nodeIDs;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.nodeMaskType,
            this.nodeIDs.length,
            ...this.nodeIDs,
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCNodesExist = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.NodesExist),
    (0, CommandClassDecorators_1.expectedCCResponse)(ZWaveProtocolCCNodesExistReply, testResponseForZWaveProtocolNodesExist)
], ZWaveProtocolCCNodesExist);
exports.ZWaveProtocolCCNodesExist = ZWaveProtocolCCNodesExist;
let ZWaveProtocolCCSetNWIMode = class ZWaveProtocolCCSetNWIMode extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.enabled = this.payload[0] === 0x01;
            this.timeoutMinutes = this.payload[1] || undefined;
        }
        else {
            this.enabled = options.enabled;
            this.timeoutMinutes = options.timeoutMinutes;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.enabled ? 0x01 : 0x00,
            this.timeoutMinutes ?? 0x00,
        ]);
        return super.serialize();
    }
};
ZWaveProtocolCCSetNWIMode = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.SetNWIMode)
], ZWaveProtocolCCSetNWIMode);
exports.ZWaveProtocolCCSetNWIMode = ZWaveProtocolCCSetNWIMode;
let ZWaveProtocolCCExcludeRequest = class ZWaveProtocolCCExcludeRequest extends ZWaveProtocolCCNodeInformationFrame {
};
ZWaveProtocolCCExcludeRequest = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.ExcludeRequest)
], ZWaveProtocolCCExcludeRequest);
exports.ZWaveProtocolCCExcludeRequest = ZWaveProtocolCCExcludeRequest;
let ZWaveProtocolCCAssignReturnRoutePriority = class ZWaveProtocolCCAssignReturnRoutePriority extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.targetNodeId = this.payload[0];
            this.routeNumber = this.payload[1];
        }
        else {
            this.targetNodeId = options.targetNodeId;
            this.routeNumber = options.routeNumber;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.targetNodeId, this.routeNumber]);
        return super.serialize();
    }
};
ZWaveProtocolCCAssignReturnRoutePriority = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.AssignReturnRoutePriority)
], ZWaveProtocolCCAssignReturnRoutePriority);
exports.ZWaveProtocolCCAssignReturnRoutePriority = ZWaveProtocolCCAssignReturnRoutePriority;
let ZWaveProtocolCCAssignSUCReturnRoutePriority = class ZWaveProtocolCCAssignSUCReturnRoutePriority extends ZWaveProtocolCCAssignReturnRoutePriority {
};
ZWaveProtocolCCAssignSUCReturnRoutePriority = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.AssignSUCReturnRoutePriority)
], ZWaveProtocolCCAssignSUCReturnRoutePriority);
exports.ZWaveProtocolCCAssignSUCReturnRoutePriority = ZWaveProtocolCCAssignSUCReturnRoutePriority;
let ZWaveProtocolCCSmartStartIncludedNodeInformation = class ZWaveProtocolCCSmartStartIncludedNodeInformation extends ZWaveProtocolCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 4);
            this.nwiHomeId = this.payload.slice(0, 4);
        }
        else {
            if (options.nwiHomeId.length !== 4) {
                throw new core_1.ZWaveError(`nwiHomeId must have length 4`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.nwiHomeId = options.nwiHomeId;
        }
    }
    serialize() {
        this.payload = Buffer.from(this.nwiHomeId);
        return super.serialize();
    }
};
ZWaveProtocolCCSmartStartIncludedNodeInformation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.SmartStartIncludedNodeInformation)
], ZWaveProtocolCCSmartStartIncludedNodeInformation);
exports.ZWaveProtocolCCSmartStartIncludedNodeInformation = ZWaveProtocolCCSmartStartIncludedNodeInformation;
let ZWaveProtocolCCSmartStartPrime = class ZWaveProtocolCCSmartStartPrime extends ZWaveProtocolCCNodeInformationFrame {
};
ZWaveProtocolCCSmartStartPrime = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.SmartStartPrime)
], ZWaveProtocolCCSmartStartPrime);
exports.ZWaveProtocolCCSmartStartPrime = ZWaveProtocolCCSmartStartPrime;
let ZWaveProtocolCCSmartStartInclusionRequest = class ZWaveProtocolCCSmartStartInclusionRequest extends ZWaveProtocolCCNodeInformationFrame {
};
ZWaveProtocolCCSmartStartInclusionRequest = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ZWaveProtocolCommand.SmartStartInclusionRequest)
], ZWaveProtocolCCSmartStartInclusionRequest);
exports.ZWaveProtocolCCSmartStartInclusionRequest = ZWaveProtocolCCSmartStartInclusionRequest;
//# sourceMappingURL=ZWaveProtocolCC.js.map