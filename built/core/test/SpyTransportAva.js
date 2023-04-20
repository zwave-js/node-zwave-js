"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertLogInfo = exports.assertMessage = exports.SpyTransport = void 0;
const ansi_colors_1 = require("ansi-colors");
const sinon_1 = __importDefault(require("sinon"));
const triple_beam_1 = require("triple-beam");
const winston_transport_1 = __importDefault(require("winston-transport"));
const timestampRegex = /\d{2}\:\d{2}\:\d{2}\.\d{3}/g;
const timestampPrefixRegex = new RegExp(`^(${ansi_colors_1.ansiRegex.source})?${timestampRegex.source}(${ansi_colors_1.ansiRegex.source})? `, "gm");
const channelRegex = /(SERIAL|CNTRLR|DRIVER|RFLCTN)/g;
const channelPrefixRegex = new RegExp(`(${ansi_colors_1.ansiRegex.source})?${channelRegex.source}(${ansi_colors_1.ansiRegex.source})? `, "gm");
/** Log to a sinon.spy() in order to perform assertions during unit tests */
class SpyTransport extends winston_transport_1.default {
    constructor() {
        super({
            level: "silly",
        });
        this._spy = sinon_1.default.spy();
    }
    get spy() {
        return this._spy;
    }
    log(info, next) {
        this._spy(info);
        next();
    }
}
exports.SpyTransport = SpyTransport;
/** Tests a printed log message */
function assertMessage(t, transport, options) {
    const callNumber = options.callNumber || 0;
    t.true(transport.spy.callCount > callNumber);
    const callArg = transport.spy.getCall(callNumber).args[0];
    let actualMessage = callArg[triple_beam_1.MESSAGE];
    // By default ignore the color codes
    const ignoreColor = options.ignoreColor !== false;
    if (ignoreColor) {
        actualMessage = (0, ansi_colors_1.stripColor)(actualMessage);
    }
    // By default, strip away the timestamp and placeholder
    if (options.ignoreTimestamp !== false) {
        actualMessage = actualMessage
            .replace(timestampPrefixRegex, "")
            .replace(/^ {13}/gm, "");
    }
    // by default, strip away the channel label and placeholder
    if (options.ignoreChannel !== false) {
        actualMessage = actualMessage
            .replace(channelPrefixRegex, "")
            .replace(/^ {7}/gm, "");
    }
    if (typeof options.message === "string") {
        if (ignoreColor) {
            options.message = (0, ansi_colors_1.stripColor)(options.message);
        }
        t.is(actualMessage, options.message);
    }
    if (typeof options.predicate === "function") {
        t.true(options.predicate(actualMessage));
    }
}
exports.assertMessage = assertMessage;
function assertLogInfo(t, transport, options) {
    const callNumber = options.callNumber || 0;
    t.true(transport.spy.callCount > callNumber);
    const callArg = transport.spy.getCall(callNumber).args[0];
    if (typeof options.level === "string") {
        t.is(callArg.level, options.level);
    }
    if (typeof options.predicate === "function") {
        t.true(options.predicate(callArg));
    }
}
exports.assertLogInfo = assertLogInfo;
//# sourceMappingURL=SpyTransportAva.js.map