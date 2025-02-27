import { noop } from "@zwave-js/shared";
import { type SerialLogger } from "../log/Logger.js";
import {
	BootloaderParser,
	BootloaderScreenParser,
} from "../parsers/BootloaderParsers.js";
import { CLIParser } from "../parsers/CLIParser.js";
import { SerialAPIParser } from "../parsers/SerialAPIParser.js";
import { type ZWaveSerialFrame } from "../parsers/ZWaveSerialFrame.js";
import { type ZWaveSerialMode } from "../serialport/definitions.js";
import { mergeReadableStreams } from "./Merge.js";
import { SerialModeSwitch } from "./SerialModeSwitch.js";

/** The internal plumbing to convert raw serial data to Z-Wave serial frames */
export class ZWaveSerialParser {
	public constructor(logger: SerialLogger, signal?: AbortSignal) {
		// Prepare parsers for reading from the serial port
		// -> Serial API mode
		this.parser = new SerialAPIParser(logger);

		// -> CLI mode (SoC end devices)
		const cliParser = new CLIParser(logger);

		// -> Bootloader mode
		// This one looks for NUL chars which terminate each bootloader output screen
		const bootloaderScreenParser = new BootloaderScreenParser(
			logger,
		);
		// This one parses the bootloader output into a more usable format
		const bootloaderParser = new BootloaderParser();

		// Mode switch
		this.modeSwitch = new SerialModeSwitch();

		// Now set up the plumbing:
		//                        ┌>         parser         ┐
		// writable == modeSwitch ┼>       CLI parser       ┼> readable
		//                        └> BL screen -> BL parser ┘

		this.modeSwitch.toSerialAPI
			.pipeTo(this.parser.writable, { signal })
			.catch(noop);

		this.modeSwitch.toCLI
			.pipeTo(cliParser.writable, { signal })
			.catch(noop);

		this.modeSwitch.toBootloader
			.pipeThrough(bootloaderScreenParser, { signal })
			.pipeTo(bootloaderParser.writable, { signal })
			.catch(noop);

		// Join the output streams from the parsers and expose it as the public readable stream
		this.readable = mergeReadableStreams(
			this.parser.readable,
			cliParser.readable,
			bootloaderParser.readable,
		);
	}
	// Public interface to let consumers read from and write to this stream
	public readonly readable: ReadableStream<ZWaveSerialFrame>;
	public get writable(): WritableStream<Uint8Array> {
		return this.modeSwitch;
	}

	private parser: SerialAPIParser;

	// Allow switching between modes
	private modeSwitch: SerialModeSwitch;
	public get mode(): ZWaveSerialMode | undefined {
		return this.modeSwitch.mode;
	}
	public set mode(mode: ZWaveSerialMode | undefined) {
		this.modeSwitch.mode = mode;
	}

	// Allow ignoring the high nibble of an ACK once to work around an issue in the 700 series firmware
	public ignoreAckHighNibbleOnce(): void {
		this.parser.ignoreAckHighNibble = true;
	}
}
