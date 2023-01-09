import { Transform, TransformCallback } from "stream";

// const text = `Gecko Bootloader v1.7.1\r\n1. upload gbl\r\n2. run\r\n3. ebl info\r\nBL >`;

const preamble = "Gecko Bootloader";
const preambleRegex = /^Gecko Bootloader v(?<version>\d+\.\d+\.\d+)/;
const waitingForInputToken = "BL >";
const optionsRegex = /^(?<num>\d+)\. (?<option>.+)/gm;

export interface BootloaderStatus {
	error?: undefined;
	version: string;
	options: { num: number; option: string }[];
	waitingForInput: boolean;
	_raw: string;
}

export interface BootloaderError {
	error: string;
	_raw: string;
}

/** Parses the screen output from the bootloader, either waiting for a NUL char or a timeout */
export class BootloaderScreenParser extends Transform {
	constructor() {
		// We read byte streams but emit messages
		super({ readableObjectMode: true });
	}

	private receiveBuffer = "";
	private flushTimeout: NodeJS.Timeout | undefined;

	_transform(
		chunk: any,
		encoding: string,
		callback: TransformCallback,
	): void {
		this.receiveBuffer += chunk.toString("utf8");

		// Emit all full "screens"
		let nulCharIndex: number;
		while ((nulCharIndex = this.receiveBuffer.indexOf("\0")) > -1) {
			const line = this.receiveBuffer.slice(0, nulCharIndex);
			this.receiveBuffer = this.receiveBuffer.slice(nulCharIndex + 1);
			this.push(line);
		}

		// If a partial output is kept for a certain amount of time, emit it aswell
		if (this.flushTimeout) {
			clearTimeout(this.flushTimeout);
			this.flushTimeout = undefined;
		}

		if (this.receiveBuffer) {
			this.flushTimeout = setTimeout(() => {
				this.flushTimeout = undefined;
			}, 500);
		}

		callback();
	}
}

export class BootloaderParser extends Transform {
	constructor() {
		// We read strings and return objects
		super({ objectMode: true });
	}

	_transform(
		chunk: any,
		encoding: string,
		callback: TransformCallback,
	): void {
		const screen = (chunk as string).trim();
		if (!screen.startsWith(preamble)) {
			this.push({ error: "Not in the bootloader", _raw: screen });
			callback();
			return;
		}

		const version = preambleRegex.exec(screen)?.groups?.version;
		if (!version) {
			this.push({
				error: "Could not determine bootloader version",
				_raw: screen,
			});
			callback();
			return;
		}

		const options: { num: number; option: string }[] = [];
		let match: RegExpExecArray | null;
		while ((match = optionsRegex.exec(screen)) !== null) {
			options.push({
				num: parseInt(match.groups!.num),
				option: match.groups!.option,
			});
		}

		const waitingForInput = screen.endsWith(waitingForInputToken);

		this.push({
			version,
			options,
			waitingForInput,
			_raw: screen,
		});

		callback();
	}
}
