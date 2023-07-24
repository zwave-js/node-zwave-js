import { createDefaultTransportFormat } from "@zwave-js/core";
import { TypedEventEmitter } from "@zwave-js/shared";
import { Writable } from "stream";
import winston from "winston";

export function createLogTransport(
	stream: Writable,
): winston.transports.StreamTransportInstance {
	return new winston.transports.Stream({
		stream,
		format: createDefaultTransportFormat(true, true),
	});
}

export interface LinesBufferEvents {
	change: () => void;
}

export class LinesBuffer extends TypedEventEmitter<LinesBufferEvents> {
	constructor(public readonly maxSize: number) {
		super();

		const _lines: string[] = [];
		let incomplete: string = "";

		const that = this;

		this._stream = new Writable({
			write(chunk, encoding, callback) {
				// TODO: maybe consider ansi codes here
				const newLines = (chunk.toString() + incomplete).split("\n");
				// Remember the last line if it doesn't end with a newline
				incomplete = newLines.pop()!;

				_lines.push(...newLines);
				if (_lines.length > maxSize) {
					_lines.splice(0, _lines.length - maxSize);
				}

				that.emit("change");
				callback();
			},
		});
		this._lines = _lines;
	}

	private _lines: string[];

	private _stream: Writable;
	public get stream(): Writable {
		return this._stream;
	}

	public get size(): number {
		return this._lines.length;
	}

	public getView(start: number, end: number): readonly string[] {
		return this._lines.slice(start, end);
	}

	public clear(): void {
		this._lines.splice(0, this._lines.length);
		this.emit("change");
	}
}
