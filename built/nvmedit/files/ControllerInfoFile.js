"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerInfoFileID = exports.ControllerInfoFile = void 0;
const safe_1 = require("@zwave-js/core/safe");
const shared_1 = require("@zwave-js/shared");
const NVMFile_1 = require("./NVMFile");
let ControllerInfoFile = class ControllerInfoFile extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.homeId = this.payload.slice(0, 4);
            if (this.payload.length === 13) {
                this.nodeId = this.payload[4];
                this.lastNodeId = this.payload[5];
                this.staticControllerNodeId = this.payload[6];
                this.sucLastIndex = this.payload[7];
                this.controllerConfiguration = this.payload[8];
                this.sucAwarenessPushNeeded = this.payload[9];
                this.maxNodeId = this.payload[10];
                this.reservedId = this.payload[11];
                this.systemState = this.payload[12];
            }
            else if (this.payload.length === 22) {
                this.nodeId = this.payload.readUInt16LE(4);
                this.staticControllerNodeId = this.payload.readUInt16LE(6);
                this.lastNodeIdLR = this.payload.readUInt16LE(8);
                this.lastNodeId = this.payload[10];
                this.sucLastIndex = this.payload[11];
                this.maxNodeIdLR = this.payload.readUInt16LE(12);
                this.maxNodeId = this.payload[14];
                this.controllerConfiguration = this.payload[15];
                this.reservedIdLR = this.payload.readUInt16LE(16);
                this.reservedId = this.payload[18];
                this.systemState = this.payload[19];
                this.primaryLongRangeChannelId = this.payload[20];
                this.dcdcConfig = this.payload[21];
            }
            else {
                throw new safe_1.ZWaveError(`Unsupported payload length`, safe_1.ZWaveErrorCodes.NVM_InvalidFormat);
            }
        }
        else {
            this.homeId = options.homeId;
            this.nodeId = options.nodeId;
            this.lastNodeId = options.lastNodeId;
            this.staticControllerNodeId = options.staticControllerNodeId;
            this.sucLastIndex = options.sucLastIndex;
            this.controllerConfiguration = options.controllerConfiguration;
            this.maxNodeId = options.maxNodeId;
            this.reservedId = options.reservedId;
            this.systemState = options.systemState;
            if ("lastNodeIdLR" in options) {
                this.lastNodeIdLR = options.lastNodeIdLR;
                this.maxNodeIdLR = options.maxNodeIdLR;
                this.reservedIdLR = options.reservedIdLR;
                this.primaryLongRangeChannelId =
                    options.primaryLongRangeChannelId;
                this.dcdcConfig = options.dcdcConfig;
            }
            else {
                this.sucAwarenessPushNeeded = options.sucAwarenessPushNeeded;
            }
        }
    }
    serialize() {
        if (this.lastNodeIdLR != undefined) {
            this.payload = Buffer.allocUnsafe(22);
            this.homeId.copy(this.payload, 0);
            this.payload.writeUInt16LE(this.nodeId, 4);
            this.payload.writeUInt16LE(this.staticControllerNodeId, 6);
            this.payload.writeUInt16LE(this.lastNodeIdLR, 8);
            this.payload[10] = this.lastNodeId;
            this.payload[11] = this.sucLastIndex;
            this.payload.writeUInt16LE(this.maxNodeIdLR, 12);
            this.payload[14] = this.maxNodeId;
            this.payload[15] = this.controllerConfiguration;
            this.payload.writeUInt16LE(this.reservedIdLR, 16);
            this.payload[18] = this.reservedId;
            this.payload[19] = this.systemState;
            this.payload[20] = this.primaryLongRangeChannelId;
            this.payload[21] = this.dcdcConfig;
        }
        else {
            // V0
            this.payload = Buffer.concat([
                this.homeId,
                Buffer.from([
                    this.nodeId,
                    this.lastNodeId,
                    this.staticControllerNodeId,
                    this.sucLastIndex,
                    this.controllerConfiguration,
                    this.sucAwarenessPushNeeded ?? 0,
                    this.maxNodeId,
                    this.reservedId,
                    this.systemState,
                ]),
            ]);
        }
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return (0, safe_1.stripUndefined)({
            ...super.toJSON(),
            homeId: (0, shared_1.buffer2hex)(this.homeId),
            nodeId: this.nodeId,
            lastNodeId: this.lastNodeId,
            staticControllerNodeId: this.staticControllerNodeId,
            sucLastIndex: this.sucLastIndex,
            controllerConfiguration: this.controllerConfiguration,
            sucAwarenessPushNeeded: this.sucAwarenessPushNeeded,
            maxNodeId: this.maxNodeId,
            reservedId: this.reservedId,
            systemState: this.systemState,
            lastNodeIdLR: this.lastNodeIdLR,
            maxNodeIdLR: this.maxNodeIdLR,
            reservedIdLR: this.reservedIdLR,
            primaryLongRangeChannelId: this.primaryLongRangeChannelId,
            dcdcConfig: this.dcdcConfig,
        });
    }
};
ControllerInfoFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x50004)
], ControllerInfoFile);
exports.ControllerInfoFile = ControllerInfoFile;
exports.ControllerInfoFileID = (0, NVMFile_1.getNVMFileIDStatic)(ControllerInfoFile);
//# sourceMappingURL=ControllerInfoFile.js.map