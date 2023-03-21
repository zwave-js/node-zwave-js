"use strict";
// TODO: Get rid of this entire thing and use the serialport-based mocking instead.
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndOpenMockedZWaveSerialPort = exports.MockSerialPort = void 0;
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const events_1 = require("events");
const sinon_1 = __importDefault(require("sinon"));
const stream_1 = require("stream");
const SerialPortBindingMock_1 = require("./SerialPortBindingMock");
const SerialPortMock_1 = require("./SerialPortMock");
const ZWaveSerialPort_1 = require("./ZWaveSerialPort");
const instances = new Map();
let MockBinding = class MockBinding extends stream_1.PassThrough {
};
MockBinding = __decorate([
    (0, shared_1.Mixin)([events_1.EventEmitter])
], MockBinding);
class MockSerialPort extends ZWaveSerialPort_1.ZWaveSerialPort {
    constructor(port, loggers) {
        super(port, loggers, MockBinding);
        this.__isOpen = false;
        this.openStub = sinon_1.default.stub().resolves();
        this.closeStub = sinon_1.default.stub().resolves();
        this.writeStub = sinon_1.default.stub();
        instances.set(port, this);
    }
    static getInstance(port) {
        return instances.get(port);
    }
    get isOpen() {
        return this.__isOpen;
    }
    open() {
        return this.openStub().then(() => {
            this.__isOpen = true;
        });
    }
    close() {
        return this.closeStub().then(() => {
            this.__isOpen = false;
        });
    }
    receiveData(data) {
        this.serial.emit("data", data);
    }
    raiseError(err) {
        this.emit("error", err);
    }
    writeAsync(data) {
        this._lastWrite = data;
        this.emit("write", data);
        return this.writeStub(data);
    }
    get lastWrite() {
        return this._lastWrite;
    }
}
exports.MockSerialPort = MockSerialPort;
async function createAndOpenMockedZWaveSerialPort(path) {
    SerialPortBindingMock_1.MockBinding.reset();
    SerialPortBindingMock_1.MockBinding.createPort(path, {
        record: true,
        readyData: Buffer.from([]),
    });
    const port = new ZWaveSerialPort_1.ZWaveSerialPort(path, new core_1.ZWaveLogContainer({
        enabled: false,
    }), 
    // @ts-expect-error We're using an internal signature here
    SerialPortMock_1.SerialPortMock);
    await port.open();
    const binding = port["serial"].port;
    return { port, binding };
}
exports.createAndOpenMockedZWaveSerialPort = createAndOpenMockedZWaveSerialPort;
//# sourceMappingURL=MockSerialPort.js.map