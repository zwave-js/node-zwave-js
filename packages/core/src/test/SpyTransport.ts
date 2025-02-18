import c from "ansi-colors";
import sinon from "sinon";
import { MESSAGE } from "triple-beam";
import { type ExpectStatic } from "vitest";
import Transport from "winston-transport";
import type { ZWaveLogInfo } from "../log/shared.js";

const timestampRegex = /\d{2}\:\d{2}\:\d{2}\.\d{3}/g;
const timestampPrefixRegex = new RegExp(
	`^(${c.ansiRegex.source})?${timestampRegex.source}(${c.ansiRegex.source})? `,
	"gm",
);
const channelRegex = /(SERIAL|CNTRLR|DRIVER|RFLCTN)/g;
const channelPrefixRegex = new RegExp(
	`(${c.ansiRegex.source})?${channelRegex.source}(${c.ansiRegex.source})? `,
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
	expect: ExpectStatic,
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
	expect(transport.spy.callCount > callNumber).toBe(true);
	const callArg = transport.spy.getCall(callNumber).args[0];
	let actualMessage: string = callArg[MESSAGE];
	// By default ignore the color codes
	const ignoreColor = options.ignoreColor !== false;
	if (ignoreColor) {
		actualMessage = c.stripColor(actualMessage);
	}
	// By default, strip away the timestamp and placeholder
	if (options.ignoreTimestamp !== false) {
		actualMessage = actualMessage
			.replace(timestampPrefixRegex, "")
			.replaceAll(/^ {13}/gm, "");
	}
	// by default, strip away the channel label and placeholder
	if (options.ignoreChannel !== false) {
		actualMessage = actualMessage
			.replace(channelPrefixRegex, "")
			.replaceAll(/^ {7}/gm, "");
	}
	if (typeof options.message === "string") {
		if (ignoreColor) {
			options.message = c.stripColor(options.message);
		}
		expect(actualMessage).toBe(options.message);
	}
	if (typeof options.predicate === "function") {
		expect(options.predicate(actualMessage)).toBe(true);
	}
}

export function assertLogInfo(
	expect: ExpectStatic,
	transport: SpyTransport,
	options: Partial<{
		level: string;
		predicate: (info: ZWaveLogInfo) => boolean;
		callNumber: number;
	}>,
): void {
	const callNumber = options.callNumber || 0;
	expect(transport.spy.callCount > callNumber).toBe(true);
	const callArg = transport.spy.getCall(callNumber).args[0];

	if (typeof options.level === "string") {
		expect(callArg.level).toBe(options.level);
	}
	if (typeof options.predicate === "function") {
		expect(options.predicate(callArg)).toBe(true);
	}
}
