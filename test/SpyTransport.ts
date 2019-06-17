import { stripColor } from "ansi-colors";
import { MESSAGE } from "triple-beam";
import * as Transport from "winston-transport";

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
		ignoreColor: boolean;
		callNumber: number;
	}>,
) {
	const callNumber = options.callNumber || 0;
	expect(transport.spy.mock.calls.length).toBeGreaterThan(callNumber);
	const callArg = transport.spy.mock.calls[callNumber][0];
	let actualMessage = callArg[MESSAGE];
	// By default ignore the color codes
	const ignoreColor = options.ignoreColor !== false;
	if (ignoreColor) {
		actualMessage = stripColor(actualMessage);
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
