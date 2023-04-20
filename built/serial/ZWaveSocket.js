"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZWaveSocket = void 0;
const core_1 = require("@zwave-js/core");
const net = __importStar(require("net"));
const ZWaveSerialPortBase_1 = require("./ZWaveSerialPortBase");
/** A version of the Z-Wave serial binding that works using a socket (TCP or IPC) */
class ZWaveSocket extends ZWaveSerialPortBase_1.ZWaveSerialPortBase {
    constructor(socketOptions, loggers) {
        super({
            create: () => new net.Socket(),
            open: (serial) => new Promise((resolve, reject) => {
                // eslint-disable-next-line prefer-const
                let removeListeners;
                const onClose = (hadError) => {
                    // detect socket disconnection errors
                    if (hadError) {
                        removeListeners();
                        this.emit("error", new core_1.ZWaveError(`The socket closed unexpectedly!`, core_1.ZWaveErrorCodes.Driver_Failed));
                    }
                };
                const onError = (err) => {
                    removeListeners();
                    reject(err);
                };
                const onConnect = () => {
                    serial.setKeepAlive(true, 2500);
                    removeListeners();
                    resolve();
                };
                // We need to remove the listeners again no matter which of the handlers is called
                // Otherwise this would cause an EventEmitter leak.
                // Hence this somewhat ugly construct
                removeListeners = () => {
                    serial.removeListener("close", onClose);
                    serial.removeListener("error", onError);
                    serial.removeListener("connect", onConnect);
                };
                serial.once("close", onClose);
                serial.once("error", onError);
                serial.once("connect", onConnect);
                serial.connect(this.socketOptions);
            }),
            close: (serial) => new Promise((resolve) => {
                if (serial.destroyed) {
                    resolve();
                }
                else {
                    serial.once("close", () => resolve()).destroy();
                }
            }),
        }, loggers);
        this.socketOptions = socketOptions;
    }
}
exports.ZWaveSocket = ZWaveSocket;
//# sourceMappingURL=ZWaveSocket.js.map