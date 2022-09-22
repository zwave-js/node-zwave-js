import type { ZWaveLogInfo } from "@zwave-js/core";
import { ansiRegex, stripColor } from "ansi-colors";
import { MESSAGE } from "triple-beam";
import Transport from "winston-transport";

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

/** Log to a jest.fn() in order to perform assertions during unit tests */
export class SpyTransport extends Transport {
	public constructor() {
		super({
			level: "silly",
		});
		this._spy = jest.fn();
	}
	private _spy: jest.Mock;
	public get spy(): jest.Mock {
		return this._spy;
	}
	public log(info: any, next: () => void): any {
		this._spy(info);
		next();
	}
}

/** Tests a printed log message */
export function assertMessage(
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
	expect(transport.spy.mock.calls.length).toBeGreaterThan(callNumber);
	const callArg = transport.spy.mock.calls[callNumber][0];
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
		expect(actualMessage).toEqual(options.message);
	}
	if (typeof options.predicate === "function") {
		expect(actualMessage).toSatisfy(options.predicate);
	}
}

export function assertLogInfo(
	transport: SpyTransport,
	options: Partial<{
		level: string;
		predicate: (info: ZWaveLogInfo) => boolean;
		callNumber: number;
	}>,
): void {
	const callNumber = options.callNumber || 0;
	expect(transport.spy.mock.calls.length).toBeGreaterThan(callNumber);
	const callArg = transport.spy.mock.calls[callNumber][0];

	if (typeof options.level === "string") {
		expect(callArg.level).toEqual(options.level);
	}
	if (typeof options.predicate === "function") {
		expect(callArg).toSatisfy(options.predicate);
	}
}
