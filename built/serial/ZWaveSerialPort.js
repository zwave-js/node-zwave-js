"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZWaveSerialPort = void 0;
const core_1 = require("@zwave-js/core");
const serialport_1 = require("serialport");
const ZWaveSerialPortBase_1 = require("./ZWaveSerialPortBase");
/** The default version of the Z-Wave serial binding that works using node-serialport */
class ZWaveSerialPort extends ZWaveSerialPortBase_1.ZWaveSerialPortBase {
    constructor(port, loggers, Binding = serialport_1.SerialPort) {
        let removeListeners;
        super({
            create: () => new Binding({
                path: port,
                autoOpen: false,
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: "none",
            }),
            open: (serial) => new Promise((resolve, reject) => {
                const onClose = (err) => {
                    // detect serial disconnection errors
                    if (err?.disconnected === true) {
                        removeListeners(true);
                        this.emit("error", new core_1.ZWaveError(`The serial port closed unexpectedly!`, core_1.ZWaveErrorCodes.Driver_Failed));
                    }
                };
                const onError = (err) => {
                    removeListeners(true);
                    reject(err);
                };
                const onOpen = () => {
                    removeListeners(false);
                    resolve();
                };
                // We need to remove the listeners again no matter which of the handlers is called
                // Otherwise this would cause an EventEmitter leak.
                // Hence this somewhat ugly construct
                removeListeners = (removeOnClose) => {
                    if (removeOnClose)
                        serial.removeListener("close", onClose);
                    serial.removeListener("error", onError);
                    serial.removeListener("open", onOpen);
                };
                serial.once("close", onClose);
                serial.once("error", onError);
                serial.once("open", onOpen).open();
            }),
            close: (serial) => new Promise((resolve) => {
                removeListeners(true);
                serial.once("close", resolve).close();
            }),
        }, loggers);
    }
    get isOpen() {
        return this.serial.isOpen;
    }
}
exports.ZWaveSerialPort = ZWaveSerialPort;
//# sourceMappingURL=ZWaveSerialPort.js.map