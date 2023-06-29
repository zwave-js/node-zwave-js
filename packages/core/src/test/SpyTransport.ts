import { ansiRegex, stripColor } from "ansi-colors";
import type { Assertions } from "ava";
import sinon from "sinon";
import { MESSAGE } from "triple-beam";
import Transport from "winston-transport";
import type { ZWaveLogInfo } from "../log/shared_safe";

const timestampRegex = /\d{2}\:\d{2}\:\d{2}\.\d{3}/g;
const timestampPrefixRegex = new RegExp(
	`^(${ansiRegex.source})?${timestampRegex.source}(${ansiRegex.source})? `,
	"gm",
);
const channelRegex = /(SERIAL|CNTRLR|DRIVER|RFLCTN)/g;
const channelPrefixRegex = new RegExp(
	`(${ansiRegex.source})?${channelRegex.source}(${ansiRegex.source})? `,
	"gm",
);

/** Log to a sinon.spy() in order to perform assertions during unit tests */
export class SpyTransport extends Transport {
	public constructor() {
		super({
			level: "silly",
		});
		this._spy = sinon.spy();
	}
	private _spy: sinon.SinonSpy;
	public get spy(): sinon.SinonSpy {
		return this._spy;
	}
	public log(info: any, next: () => void): any {
		this._spy(info);
		next();
	}
}

/** Tests a printed log message */
export function assertMessage(
	t: Assertions,
	transport: SpyTransport,
	options: Partial<{
		message: string;
		predicate: (msg: string) => boolean;
		/** Default: true */
		ignoreColor: boolean;
		/** Default: true */
		ignoreTimestamp: boolean;
		/** Default: true */
		ignoreChannel: boolean;
		callNumber: number;
	}>,
): void {
	const callNumber = options.callNumber || 0;
	t.true(transport.spy.callCount > callNumber);
	const callArg = transport.spy.getCall(callNumber).args[0];
	let actualMessage: string = callArg[MESSAGE];
	// By default ignore the color codes
	const ignoreColor = options.ignoreColor !== false;
	if (ignoreColor) {
		actualMessage = stripColor(actualMessage);
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
			options.message = stripColor(options.message);
		}
		t.is(actualMessage, options.message);
	}
	if (typeof options.predicate === "function") {
		t.true(options.predicate(actualMessage));
	}
}

export function assertLogInfo(
	t: Assertions,
	transport: SpyTransport,
	options: Partial<{
		level: string;
		predicate: (info: ZWaveLogInfo) => boolean;
		callNumber: number;
	}>,
): void {
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
