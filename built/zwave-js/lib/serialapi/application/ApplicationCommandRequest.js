"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationCommandRequest = exports.ApplicationCommandStatusFlags = void 0;
const cc_1 = require("@zwave-js/cc");
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
var ApplicationCommandStatusFlags;
(function (ApplicationCommandStatusFlags) {
    ApplicationCommandStatusFlags[ApplicationCommandStatusFlags["RoutedBusy"] = 1] = "RoutedBusy";
    ApplicationCommandStatusFlags[ApplicationCommandStatusFlags["LowPower"] = 2] = "LowPower";
    ApplicationCommandStatusFlags[ApplicationCommandStatusFlags["TypeSingle"] = 0] = "TypeSingle";
    ApplicationCommandStatusFlags[ApplicationCommandStatusFlags["TypeBroad"] = 4] = "TypeBroad";
    ApplicationCommandStatusFlags[ApplicationCommandStatusFlags["TypeMulti"] = 8] = "TypeMulti";
    ApplicationCommandStatusFlags[ApplicationCommandStatusFlags["TypeMask"] = 12] = "TypeMask";
    ApplicationCommandStatusFlags[ApplicationCommandStatusFlags["Explore"] = 16] = "Explore";
    ApplicationCommandStatusFlags[ApplicationCommandStatusFlags["ForeignFrame"] = 64] = "ForeignFrame";
    ApplicationCommandStatusFlags[ApplicationCommandStatusFlags["ForeignHomeId"] = 128] = "ForeignHomeId";
})(ApplicationCommandStatusFlags = exports.ApplicationCommandStatusFlags || (exports.ApplicationCommandStatusFlags = {}));
let ApplicationCommandRequest = class ApplicationCommandRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            // first byte is a status flag
            const status = this.payload[0];
            this.routedBusy = !!(status & ApplicationCommandStatusFlags.RoutedBusy);
            switch (status & ApplicationCommandStatusFlags.TypeMask) {
                case ApplicationCommandStatusFlags.TypeMulti:
                    this.frameType = "multicast";
                    break;
                case ApplicationCommandStatusFlags.TypeBroad:
                    this.frameType = "broadcast";
                    break;
                default:
                    this.frameType = "singlecast";
            }
            this.isExploreFrame =
                this.frameType === "broadcast" &&
                    !!(status & ApplicationCommandStatusFlags.Explore);
            this.isForeignFrame = !!(status & ApplicationCommandStatusFlags.ForeignFrame);
            this.fromForeignHomeId = !!(status & ApplicationCommandStatusFlags.ForeignHomeId);
            // followed by a node ID
            const nodeId = this.payload[1];
            // and a command class
            const commandLength = this.payload[2];
            this.command = cc_1.CommandClass.from(this.host, {
                data: this.payload.slice(3, 3 + commandLength),
                nodeId,
                origin: options.origin,
                frameType: this.frameType,
            });
        }
        else {
            // TODO: This logic is unsound
            if (!options.command.isSinglecast()) {
                throw new core_1.ZWaveError(`ApplicationCommandRequest can only be used for singlecast CCs`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.frameType = options.frameType ?? "singlecast";
            this.routedBusy = !!options.routedBusy;
            this.command = options.command;
            this.isExploreFrame = false;
            this.isForeignFrame = false;
            this.fromForeignHomeId = false;
        }
    }
    getNodeId() {
        if (this.command.isSinglecast()) {
            return this.command.nodeId;
        }
        return super.getNodeId();
    }
    serialize() {
        const statusByte = (this.frameType === "broadcast"
            ? ApplicationCommandStatusFlags.TypeBroad
            : this.frameType === "multicast"
                ? ApplicationCommandStatusFlags.TypeMulti
                : 0) |
            (this.routedBusy ? ApplicationCommandStatusFlags.RoutedBusy : 0);
        const serializedCC = this.command.serialize();
        this.payload = Buffer.concat([
            Buffer.from([
                statusByte,
                this.getNodeId() ?? this.host.ownNodeId,
                serializedCC.length,
            ]),
            serializedCC,
        ]);
        return super.serialize();
    }
    toLogEntry() {
        const message = {};
        if (this.frameType !== "singlecast") {
            message.type = this.frameType;
        }
        return {
            ...super.toLogEntry(),
            message,
        };
    }
};
ApplicationCommandRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.ApplicationCommand)
    // This does not expect a response. The controller sends us this when a node sends a command
    ,
    (0, serial_1.priority)(core_1.MessagePriority.Normal)
], ApplicationCommandRequest);
exports.ApplicationCommandRequest = ApplicationCommandRequest;
//# sourceMappingURL=ApplicationCommandRequest.js.map