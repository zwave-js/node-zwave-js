import { Transform, TransformCallback } from "stream";

export enum BootloaderChunkType {
	Error,
	Menu,
	Message,
	AwaitingInput,
}

export type BootloaderChunk =
	| {
			type: BootloaderChunkType.Error;
			error: string;
			_raw: string;
	  }
	| {
			type: BootloaderChunkType.Menu;
			version: string;
			options: { num: number; option: string }[];
			_raw: string;
	  }
	| {
			type: BootloaderChunkType.Message;
			message: string;
			_raw: string;
	  }
	| {
			type: BootloaderChunkType.AwaitingInput;
			_raw: string;
	  };

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
			const line = this.receiveBuffer.slice(0, nulCharIndex + 1);
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
				this.push(this.receiveBuffer);
				this.receiveBuffer = "";
			}, 500);
		}

		callback();
	}
}

// const text = `Gecko Bootloader v1.7.1\r\n1. upload gbl\r\n2. run\r\n3. ebl info\r\nBL >`;

const menuPreamble = "Gecko Bootloader";
const preambleRegex = /^Gecko Bootloader v(?<version>\d+\.\d+\.\d+)/;
const menuSuffix = "BL >";
const optionsRegex = /^(?<num>\d+)\. (?<option>.+)/gm;

/** Transforms the bootloader screen output into meaningful chunks */
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
		let screen = (chunk as string).trim();
		if (!screen.endsWith("\0")) {
			// This was triggered by timeout
			return callback(null, {
				type: BootloaderChunkType.AwaitingInput,
				_raw: screen,
			} satisfies BootloaderChunk);
		} else {
			screen = screen.slice(0, -1).trim();
		}

		// Apparently, the bootloader sometimes sends \0 in the wrong location.
		// Therefore check if the screen contains the menu preamble, instead of forcing
		// it to start with it
		const menuPreambleIndex = screen.indexOf(menuPreamble);

		if (menuPreambleIndex > -1 && screen.endsWith(menuSuffix)) {
			screen = screen.slice(menuPreambleIndex);
			const version = preambleRegex.exec(screen)?.groups?.version;
			if (!version) {
				return callback(null, {
					type: BootloaderChunkType.Error,
					error: "Could not determine bootloader version",
					_raw: screen,
				} satisfies BootloaderChunk);
			}

			const options: { num: number; option: string }[] = [];
			let match: RegExpExecArray | null;
			while ((match = optionsRegex.exec(screen)) !== null) {
				options.push({
					num: parseInt(match.groups!.num),
					option: match.groups!.option,
				});
			}

			this.push({
				type: BootloaderChunkType.Menu,
				_raw: screen,
				version,
				options,
			} satisfies BootloaderChunk);
		} else {
			// Some output
			console.log(`some message. raw = ${screen}`);
			this.push({
				type: BootloaderChunkType.Message,
				_raw: screen,
				message: screen,
			} satisfies BootloaderChunk);
		}

		callback();
	}
}
