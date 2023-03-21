"use strict";
/* eslint-disable @typescript-eslint/require-await */
// Clone of https://github.com/serialport/binding-mock with support for emitting events on the written side
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockPortBinding = exports.MockBinding = exports.CanceledError = void 0;
const shared_1 = require("@zwave-js/shared");
let ports = {};
let serialNumber = 0;
function resolveNextTick() {
    return new Promise((resolve) => process.nextTick(() => resolve()));
}
class CanceledError extends Error {
    constructor(message) {
        super(message);
        this.canceled = true;
    }
}
exports.CanceledError = CanceledError;
exports.MockBinding = {
    reset() {
        ports = {};
        serialNumber = 0;
    },
    // Create a mock port
    createPort(path, options = {}) {
        serialNumber++;
        const optWithDefaults = {
            echo: false,
            record: false,
            manufacturer: "The J5 Robotics Company",
            vendorId: undefined,
            productId: undefined,
            maxReadSize: 1024,
            ...options,
        };
        ports[path] = {
            data: Buffer.alloc(0),
            // echo: optWithDefaults.echo,
            // record: optWithDefaults.record,
            readyData: optWithDefaults.readyData,
            maxReadSize: optWithDefaults.maxReadSize,
            info: {
                path,
                manufacturer: optWithDefaults.manufacturer,
                serialNumber: `${serialNumber}`,
                pnpId: undefined,
                locationId: undefined,
                vendorId: optWithDefaults.vendorId,
                productId: optWithDefaults.productId,
            },
        };
    },
    async list() {
        return Object.values(ports).map((port) => port.info);
    },
    async open(options) {
        if (!options || typeof options !== "object" || Array.isArray(options)) {
            throw new TypeError('"options" is not an object');
        }
        if (!options.path) {
            throw new TypeError('"path" is not a valid port');
        }
        if (!options.baudRate) {
            throw new TypeError('"baudRate" is not a valid baudRate');
        }
        const openOptions = {
            dataBits: 8,
            lock: true,
            stopBits: 1,
            parity: "none",
            rtscts: false,
            xon: false,
            xoff: false,
            xany: false,
            hupcl: true,
            ...options,
        };
        const { path } = openOptions;
        const port = ports[path];
        await resolveNextTick();
        if (!port) {
            throw new Error(`Port does not exist - please call MockBinding.createPort('${path}') first`);
        }
        if (port.openOpt?.lock) {
            throw new Error("Port is locked cannot open");
        }
        port.openOpt = { ...openOptions };
        port.instance = new MockPortBinding(port, openOptions);
        return port.instance;
    },
    getInstance(path) {
        return ports[path]?.instance;
    },
};
/**
 * Mock bindings for pretend serialport access
 */
class MockPortBinding extends shared_1.TypedEventEmitter {
    constructor(port, openOptions) {
        super();
        this.port = port;
        this.openOptions = openOptions;
        this.pendingRead = null;
        this.isOpen = true;
        this.lastWrite = null;
        this.recording = Buffer.alloc(0);
        this.writeOperation = null; // in flight promise or null
        this.serialNumber = port.info.serialNumber;
        if (port.readyData) {
            const data = port.readyData;
            process.nextTick(() => {
                if (this.isOpen) {
                    this.emitData(data);
                }
            });
        }
    }
    // Emit data on a mock port
    emitData(data) {
        if (!this.isOpen || !this.port) {
            throw new Error("Port must be open to pretend to receive data");
        }
        const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
        this.port.data = Buffer.concat([this.port.data, bufferData]);
        if (this.pendingRead) {
            process.nextTick(this.pendingRead);
            this.pendingRead = null;
        }
    }
    async close() {
        if (!this.isOpen) {
            throw new Error("Port is not open");
        }
        const port = this.port;
        if (!port) {
            throw new Error("already closed");
        }
        port.openOpt = undefined;
        // reset data on close
        port.data = Buffer.alloc(0);
        this.serialNumber = undefined;
        this.isOpen = false;
        if (this.pendingRead) {
            this.pendingRead(new CanceledError("port is closed"));
        }
    }
    async read(buffer, offset, length) {
        if (!Buffer.isBuffer(buffer)) {
            throw new TypeError('"buffer" is not a Buffer');
        }
        if (typeof offset !== "number" || isNaN(offset)) {
            throw new TypeError(`"offset" is not an integer got "${isNaN(offset) ? "NaN" : typeof offset}"`);
        }
        if (typeof length !== "number" || isNaN(length)) {
            throw new TypeError(`"length" is not an integer got "${isNaN(length) ? "NaN" : typeof length}"`);
        }
        if (buffer.length < offset + length) {
            throw new Error("buffer is too small");
        }
        if (!this.isOpen) {
            throw new Error("Port is not open");
        }
        await resolveNextTick();
        if (!this.isOpen || !this.port) {
            throw new CanceledError("Read canceled");
        }
        if (this.port.data.length <= 0) {
            return new Promise((resolve, reject) => {
                this.pendingRead = (err) => {
                    if (err) {
                        return reject(err);
                    }
                    this.read(buffer, offset, length).then(resolve, reject);
                };
            });
        }
        const lengthToRead = this.port.maxReadSize > length ? length : this.port.maxReadSize;
        const data = this.port.data.slice(0, lengthToRead);
        const bytesRead = data.copy(buffer, offset);
        this.port.data = this.port.data.slice(lengthToRead);
        return { bytesRead, buffer };
    }
    async write(buffer) {
        if (!Buffer.isBuffer(buffer)) {
            throw new TypeError('"buffer" is not a Buffer');
        }
        if (!this.isOpen || !this.port) {
            throw new Error("Port is not open");
        }
        if (this.writeOperation) {
            throw new Error("Overlapping writes are not supported and should be queued by the serialport object");
        }
        this.writeOperation = (async () => {
            await resolveNextTick();
            if (!this.isOpen || !this.port) {
                return;
                // throw new Error("Write canceled");
            }
            const data = (this.lastWrite = Buffer.from(buffer)); // copy
            this.emit("write", data);
            // if (this.port.record) {
            // 	this.recording = Buffer.concat([this.recording, data]);
            // }
            // if (this.port.echo) {
            // 	process.nextTick(() => {
            // 		if (this.isOpen) {
            // 			this.emitData(data);
            // 		}
            // 	});
            // }
            this.writeOperation = null;
        })();
        return this.writeOperation;
    }
    async update(options) {
        if (typeof options !== "object") {
            throw TypeError('"options" is not an object');
        }
        if (typeof options.baudRate !== "number") {
            throw new TypeError('"options.baudRate" is not a number');
        }
        if (!this.isOpen || !this.port) {
            throw new Error("Port is not open");
        }
        await resolveNextTick();
        if (this.port.openOpt) {
            this.port.openOpt.baudRate = options.baudRate;
        }
    }
    async set(options) {
        if (typeof options !== "object") {
            throw new TypeError('"options" is not an object');
        }
        if (!this.isOpen) {
            throw new Error("Port is not open");
        }
        await resolveNextTick();
    }
    async get() {
        if (!this.isOpen) {
            throw new Error("Port is not open");
        }
        await resolveNextTick();
        return {
            cts: true,
            dsr: false,
            dcd: false,
        };
    }
    async getBaudRate() {
        if (!this.isOpen || !this.port) {
            throw new Error("Port is not open");
        }
        await resolveNextTick();
        if (!this.port.openOpt?.baudRate) {
            throw new Error("Internal Error");
        }
        return {
            baudRate: this.port.openOpt.baudRate,
        };
    }
    async flush() {
        if (!this.isOpen || !this.port) {
            throw new Error("Port is not open");
        }
        await resolveNextTick();
        this.port.data = Buffer.alloc(0);
    }
    async drain() {
        if (!this.isOpen) {
            throw new Error("Port is not open");
        }
        await this.writeOperation;
        await resolveNextTick();
    }
}
exports.MockPortBinding = MockPortBinding;
//# sourceMappingURL=SerialPortBindingMock.js.map