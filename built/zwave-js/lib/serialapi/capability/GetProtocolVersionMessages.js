"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetProtocolVersionResponse = exports.GetProtocolVersionRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
let GetProtocolVersionRequest = class GetProtocolVersionRequest extends serial_1.Message {
};
GetProtocolVersionRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetProtocolVersion),
    (0, serial_1.priority)(core_1.MessagePriority.Controller),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetProtocolVersion)
], GetProtocolVersionRequest);
exports.GetProtocolVersionRequest = GetProtocolVersionRequest;
let GetProtocolVersionResponse = class GetProtocolVersionResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.protocolType = this.payload[0];
        this.protocolVersion = [
            this.payload[1],
            this.payload[2],
            this.payload[3],
        ].join(".");
        if (this.payload.length >= 6) {
            const appBuild = this.payload.readUInt16BE(4);
            if (appBuild !== 0)
                this.applicationFrameworkBuildNumber = appBuild;
        }
        if (this.payload.length >= 22) {
            const commitHash = this.payload.slice(6, 22);
            if (!commitHash.every((b) => b === 0)) {
                this.gitCommitHash = commitHash.toString("hex");
            }
        }
    }
};
GetProtocolVersionResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetProtocolVersion)
], GetProtocolVersionResponse);
exports.GetProtocolVersionResponse = GetProtocolVersionResponse;
//# sourceMappingURL=GetProtocolVersionMessages.js.map