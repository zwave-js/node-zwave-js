"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BootloaderParser = exports.bootloaderMenuPreamble = exports.BootloaderScreenParser = exports.BootloaderChunkType = void 0;
const stream_1 = require("stream");
const MessageHeaders_1 = require("../MessageHeaders");
var BootloaderChunkType;
(function (BootloaderChunkType) {
    BootloaderChunkType[BootloaderChunkType["Error"] = 0] = "Error";
    BootloaderChunkType[BootloaderChunkType["Menu"] = 1] = "Menu";
    BootloaderChunkType[BootloaderChunkType["Message"] = 2] = "Message";
    BootloaderChunkType[BootloaderChunkType["FlowControl"] = 3] = "FlowControl";
})(BootloaderChunkType = exports.BootloaderChunkType || (exports.BootloaderChunkType = {}));
function isFlowControl(byte) {
    return (byte === MessageHeaders_1.XModemMessageHeaders.ACK ||
        byte === MessageHeaders_1.XModemMessageHeaders.NAK ||
        byte === MessageHeaders_1.XModemMessageHeaders.CAN ||
        byte === MessageHeaders_1.XModemMessageHeaders.C);
}
/** Parses the screen output from the bootloader, either waiting for a NUL char or a timeout */
class BootloaderScreenParser extends stream_1.Transform {
    constructor(logger) {
        // We read byte streams but emit messages
        super({ readableObjectMode: true });
        this.logger = logger;
        this.receiveBuffer = "";
    }
    _transform(chunk, encoding, callback) {
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = undefined;
        }
        this.receiveBuffer += chunk.toString("utf8");
        // Correct buggy ordering of NUL char in error codes.
        // The bootloader may send errors as "some error 0x\012" instead of "some error 0x12\0"
        this.receiveBuffer = this.receiveBuffer.replace(/(error 0x)\0([0-9a-f]+)/gi, "$1$2\0");
        // Emit all full "screens"
        let nulCharIndex;
        while ((nulCharIndex = this.receiveBuffer.indexOf("\0")) > -1) {
            const screen = this.receiveBuffer.slice(0, nulCharIndex).trim();
            this.receiveBuffer = this.receiveBuffer.slice(nulCharIndex + 1);
            this.logger?.bootloaderScreen(screen);
            this.push(screen);
        }
        // Emit single flow-control bytes
        while (this.receiveBuffer.length > 0) {
            const charCode = this.receiveBuffer.charCodeAt(0);
            if (!isFlowControl(charCode))
                break;
            this.logger?.data("inbound", Buffer.from([charCode]));
            this.push(charCode);
            this.receiveBuffer = this.receiveBuffer.slice(1);
        }
        // If a partial output is kept for a certain amount of time, emit it aswell
        if (this.receiveBuffer) {
            this.flushTimeout = setTimeout(() => {
                this.flushTimeout = undefined;
                this.push(this.receiveBuffer);
                this.receiveBuffer = "";
            }, 500);
        }
        callback();
    }
}
exports.BootloaderScreenParser = BootloaderScreenParser;
exports.bootloaderMenuPreamble = "Gecko Bootloader";
const preambleRegex = /^Gecko Bootloader v(?<version>\d+\.\d+\.\d+)/;
const menuSuffix = "BL >";
const optionsRegex = /^(?<num>\d+)\. (?<option>.+)/gm;
/** Transforms the bootloader screen output into meaningful chunks */
class BootloaderParser extends stream_1.Transform {
    constructor() {
        // We read strings and return objects
        super({ objectMode: true });
    }
    _transform(chunk, encoding, callback) {
        // Flow control bytes come in as numbers
        if (typeof chunk === "number") {
            return callback(null, {
                type: BootloaderChunkType.FlowControl,
                command: chunk,
            } /* satisfies BootloaderChunk */);
        }
        let screen = chunk.trim();
        // Apparently, the bootloader sometimes sends \0 in the wrong location.
        // Therefore check if the screen contains the menu preamble, instead of forcing
        // it to start with it
        const menuPreambleIndex = screen.indexOf(exports.bootloaderMenuPreamble);
        if (menuPreambleIndex > -1 && screen.endsWith(menuSuffix)) {
            screen = screen.slice(menuPreambleIndex);
            const version = preambleRegex.exec(screen)?.groups?.version;
            if (!version) {
                return callback(null, {
                    type: BootloaderChunkType.Error,
                    error: "Could not determine bootloader version",
                    _raw: screen,
                } /* satisfies BootloaderChunk */);
            }
            const options = [];
            let match;
            while ((match = optionsRegex.exec(screen)) !== null) {
                options.push({
                    num: parseInt(match.groups.num),
                    option: match.groups.option,
                });
            }
            this.push({
                type: BootloaderChunkType.Menu,
                _raw: screen,
                version,
                options,
            } /* satisfies BootloaderChunk */);
        }
        else {
            // Some output
            this.push({
                type: BootloaderChunkType.Message,
                _raw: screen,
                message: screen,
            } /* satisfies BootloaderChunk */);
        }
        callback();
    }
}
exports.BootloaderParser = BootloaderParser;
//# sourceMappingURL=BootloaderParsers.js.map