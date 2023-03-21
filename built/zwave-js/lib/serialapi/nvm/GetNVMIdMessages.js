"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetNVMIdResponse = exports.GetNVMIdRequest = exports.nvmSizeToBufferSize = exports.NVMSize = exports.NVMType = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
var NVMType;
(function (NVMType) {
    NVMType[NVMType["Flash"] = 128] = "Flash";
    NVMType[NVMType["DataFlash"] = 129] = "DataFlash";
    NVMType[NVMType["EEPROM"] = 255] = "EEPROM";
})(NVMType = exports.NVMType || (exports.NVMType = {}));
var NVMSize;
(function (NVMSize) {
    NVMSize[NVMSize["16KB"] = 14] = "16KB";
    NVMSize[NVMSize["32KB"] = 15] = "32KB";
    NVMSize[NVMSize["64KB"] = 16] = "64KB";
    NVMSize[NVMSize["128KB"] = 17] = "128KB";
    NVMSize[NVMSize["256KB"] = 18] = "256KB";
    NVMSize[NVMSize["512KB"] = 19] = "512KB";
    NVMSize[NVMSize["1MB"] = 20] = "1MB";
    NVMSize[NVMSize["2MB"] = 21] = "2MB";
    NVMSize[NVMSize["4MB"] = 22] = "4MB";
    NVMSize[NVMSize["8MB"] = 23] = "8MB";
    NVMSize[NVMSize["16MB"] = 24] = "16MB";
    NVMSize[NVMSize["Unknown"] = 255] = "Unknown";
})(NVMSize = exports.NVMSize || (exports.NVMSize = {}));
function nvmSizeToBufferSize(size) {
    switch (size) {
        case NVMSize["16KB"]:
            return 16 * 1024;
        case NVMSize["32KB"]:
            return 32 * 1024;
        case NVMSize["64KB"]:
            return 64 * 1024;
        case NVMSize["128KB"]:
            return 128 * 1024;
        case NVMSize["256KB"]:
            return 256 * 1024;
        case NVMSize["512KB"]:
            return 512 * 1024;
        case NVMSize["1MB"]:
            return 1 * 1024 * 1024;
        case NVMSize["2MB"]:
            return 2 * 1024 * 1024;
        case NVMSize["4MB"]:
            return 4 * 1024 * 1024;
        case NVMSize["8MB"]:
            return 8 * 1024 * 1024;
        case NVMSize["16MB"]:
            return 16 * 1024 * 1024;
        default:
            return undefined;
    }
}
exports.nvmSizeToBufferSize = nvmSizeToBufferSize;
let GetNVMIdRequest = class GetNVMIdRequest extends serial_1.Message {
};
GetNVMIdRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetNVMId),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetNVMId),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], GetNVMIdRequest);
exports.GetNVMIdRequest = GetNVMIdRequest;
let GetNVMIdResponse = class GetNVMIdResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.nvmManufacturerId = this.payload[1];
        this.memoryType = this.payload[2];
        this.memorySize = this.payload[3];
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                manufacturer: (0, shared_1.num2hex)(this.nvmManufacturerId),
                "memory type": (0, shared_1.getEnumMemberName)(NVMType, this.memoryType),
                "memory size": (0, shared_1.getEnumMemberName)(NVMSize, this.memorySize),
            },
        };
    }
};
GetNVMIdResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetNVMId)
], GetNVMIdResponse);
exports.GetNVMIdResponse = GetNVMIdResponse;
//# sourceMappingURL=GetNVMIdMessages.js.map