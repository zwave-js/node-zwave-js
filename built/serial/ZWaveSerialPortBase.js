"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZWaveSerialPortBase = exports.isZWaveSerialPortImplementation = exports.ZWaveSerialMode = void 0;
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const events_1 = require("events");
const stream_1 = require("stream");
const Logger_1 = require("./Logger");
const MessageHeaders_1 = require("./MessageHeaders");
const BootloaderParsers_1 = require("./parsers/BootloaderParsers");
const SerialAPIParser_1 = require("./parsers/SerialAPIParser");
var ZWaveSerialMode;
(function (ZWaveSerialMode) {
    ZWaveSerialMode[ZWaveSerialMode["SerialAPI"] = 0] = "SerialAPI";
    ZWaveSerialMode[ZWaveSerialMode["Bootloader"] = 1] = "Bootloader";
})(ZWaveSerialMode = exports.ZWaveSerialMode || (exports.ZWaveSerialMode = {}));
function isZWaveSerialPortImplementation(obj) {
    return ((0, typeguards_1.isObject)(obj) &&
        typeof obj.create === "function" &&
        typeof obj.open === "function" &&
        typeof obj.close === "function");
}
exports.isZWaveSerialPortImplementation = isZWaveSerialPortImplementation;
// This is basically a duplex transform stream wrapper around any stream (network, serial, ...)
// 0 ┌─────────────────┐ ┌─────────────────┐ ┌──
// 1 <--               <--   PassThrough   <-- write
// 1 │    any stream   │ │ ZWaveSerialPort │ │
// 0 -->               -->     Parsers     --> read
// 1 └─────────────────┘ └─────────────────┘ └──
// The implementation idea is based on https://stackoverflow.com/a/17476600/10179833
let ZWaveSerialPortBase = class ZWaveSerialPortBase extends stream_1.PassThrough {
    constructor(implementation, loggers) {
        super({ readableObjectMode: true });
        this.implementation = implementation;
        this._isOpen = false;
        // Route the data event handlers to the parser and handle everything else ourselves
        for (const method of [
            "on",
            "once",
            "off",
            "addListener",
            "removeListener",
            "removeAllListeners",
        ]) {
            const original = this[method].bind(this);
            this[method] = (event, ...args) => {
                if (event === "data") {
                    // @ts-expect-error
                    this.parser[method]("data", ...args);
                }
                else if (event === "bootloaderData") {
                    // @ts-expect-error
                    this.bootloaderParser[method]("data", ...args);
                }
                else {
                    original(event, ...args);
                }
                return this;
            };
        }
        this.logger = new Logger_1.SerialLogger(loggers);
        this.serial = implementation.create().on("error", (e) => {
            // Pass errors through
            this.emit("error", e);
        });
        // Prepare parsers to hook up to the serial port
        // -> Serial API mode
        this.parser = new SerialAPIParser_1.SerialAPIParser(this.logger, (discarded) => this.emit("discardedData", discarded));
        // -> Bootloader mode
        // This one looks for NUL chars which terminate each bootloader output screen
        this.bootloaderScreenParser = new BootloaderParsers_1.BootloaderScreenParser(this.logger);
        // This one parses the bootloader output into a more usable format
        this.bootloaderParser = new BootloaderParsers_1.BootloaderParser();
        // this.bootloaderParser.pipe(this.output);
        this.bootloaderScreenParser.pipe(this.bootloaderParser);
        // Check the incoming messages and route them to the correct parser
        this.serial.on("data", (data) => {
            if (this.mode == undefined) {
                // If we haven't figured out the startup mode yet,
                // inspect the chunk to see if it contains the bootloader preamble
                const str = data.toString("ascii").trim();
                this.mode = str.startsWith(BootloaderParsers_1.bootloaderMenuPreamble)
                    ? ZWaveSerialMode.Bootloader
                    : ZWaveSerialMode.SerialAPI;
            }
            if (this.mode === ZWaveSerialMode.Bootloader) {
                this.bootloaderScreenParser.write(data);
            }
            else {
                this.parser.write(data);
            }
        });
        // When something is piped to us, pipe it to the serial port instead
        // Also pass all written data to the serialport unchanged
        this.on("pipe", (source) => {
            source.unpipe(this);
            // Pass all written data to the serialport unchanged
            source.pipe(this.serial, { end: false });
        });
        // When the wrapper is piped to a stream, pipe the serial API stream instead
        this.pipe = this.parser.pipe.bind(this.parser);
        this.unpipe = (destination) => {
            this.parser.unpipe(destination);
            return this;
        };
        // Delegate iterating to the serial API parser
        this[Symbol.asyncIterator] = () => this.parser[Symbol.asyncIterator]();
    }
    async open() {
        await this.implementation.open(this.serial);
        this._isOpen = true;
    }
    close() {
        this._isOpen = false;
        return this.implementation.close(this.serial);
    }
    get isOpen() {
        return this._isOpen;
    }
    async writeAsync(data) {
        if (!this.isOpen) {
            throw new Error("The serial port is not open!");
        }
        // Only log in Serial API mode
        if (this.mode === ZWaveSerialMode.SerialAPI && data.length === 1) {
            switch (data[0]) {
                case MessageHeaders_1.MessageHeaders.ACK:
                    this.logger.ACK("outbound");
                    break;
                case MessageHeaders_1.MessageHeaders.CAN:
                    this.logger.CAN("outbound");
                    break;
                case MessageHeaders_1.MessageHeaders.NAK:
                    this.logger.NAK("outbound");
                    break;
            }
        }
        else {
            this.logger.data("outbound", data);
        }
        return new Promise((resolve, reject) => {
            this.serial.write(data, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
};
ZWaveSerialPortBase = __decorate([
    (0, shared_1.Mixin)([events_1.EventEmitter])
], ZWaveSerialPortBase);
exports.ZWaveSerialPortBase = ZWaveSerialPortBase;
//# sourceMappingURL=ZWaveSerialPortBase.js.map