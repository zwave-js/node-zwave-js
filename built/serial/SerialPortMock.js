"use strict";
// Clone of https://github.com/serialport/node-serialport/blob/4e8a3c4a9f46a09d39374eb67a59ff10eb09a5cd/packages/serialport/lib/serialport-mock.ts
// with support for emitting events on the written side
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerialPortMock = void 0;
const stream_1 = require("@serialport/stream");
const SerialPortBindingMock_1 = require("./SerialPortBindingMock");
class SerialPortMock extends stream_1.SerialPortStream {
    constructor(options, openCallback) {
        const opts = {
            binding: SerialPortBindingMock_1.MockBinding,
            ...options,
        };
        super(opts, openCallback);
    }
}
// eslint-disable-next-line @typescript-eslint/unbound-method
SerialPortMock.list = SerialPortBindingMock_1.MockBinding.list;
SerialPortMock.binding = SerialPortBindingMock_1.MockBinding;
exports.SerialPortMock = SerialPortMock;
//# sourceMappingURL=SerialPortMock.js.map