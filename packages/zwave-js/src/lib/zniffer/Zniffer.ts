import {
	ZWaveError,
	ZWaveErrorCodes,
	ZWaveLogContainer,
	ZnifferRegion,
} from "@zwave-js/core";
import {
	type ZWaveSerialPortImplementation,
	type ZnifferDataMessage,
	ZnifferGetFrequenciesRequest,
	ZnifferGetFrequenciesResponse,
	ZnifferGetFrequencyInfoRequest,
	ZnifferGetFrequencyInfoResponse,
	ZnifferGetVersionRequest,
	ZnifferGetVersionResponse,
	ZnifferMessage,
	ZnifferMessageType,
	ZnifferSerialPort,
	ZnifferSerialPortBase,
	ZnifferSetBaudRateRequest,
	ZnifferSetBaudRateResponse,
	ZnifferSetFrequencyRequest,
	ZnifferSetFrequencyResponse,
	ZnifferSocket,
	ZnifferStartRequest,
	ZnifferStartResponse,
	ZnifferStopRequest,
	ZnifferStopResponse,
	isZWaveSerialPortImplementation,
} from "@zwave-js/serial";
import { TypedEventEmitter, getEnumMemberName, pick } from "@zwave-js/shared";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { ZnifferLogger } from "../log/Zniffer";
import { MPDU, MPDUHeaderType } from "./MPDU";

const logo: string = `
███████╗ ███╗   ██╗ ██╗ ██████╗ ██████╗ ███████╗ ██████╗          ██╗ ███████╗
╚══███╔╝ ████╗  ██║ ██║ ██╔═══╝ ██╔═══╝ ██╔════╝ ██╔══██╗         ██║ ██╔════╝
  ███╔╝  ██╔██╗ ██║ ██║ ████╗   ████╗   █████╗   ██████╔╝         ██║ ███████╗
 ███╔╝   ██║╚██╗██║ ██║ ██╔═╝   ██╔═╝   ██╔══╝   ██╔══██╗    ██   ██║ ╚════██║
███████╗ ██║ ╚████║ ██║ ██║     ██║     ███████╗ ██║  ██║    ╚█████╔╝ ███████║
╚══════╝ ╚═╝  ╚═══╝ ╚═╝ ╚═╝     ╚═╝     ╚══════╝ ╚═╝  ╚═╝     ╚════╝  ╚══════╝
`.trim();

export interface ZnifferEventCallbacks {
	ready: () => void;
	error: (err: Error) => void;
}

export type ZnifferEvents = Extract<keyof ZnifferEventCallbacks, string>;

interface AwaitedThing<T> {
	handler: (thing: T) => void;
	timeout?: NodeJS.Timeout;
	predicate: (msg: T) => boolean;
}

type AwaitedMessageEntry = AwaitedThing<ZnifferMessage>;

export class Zniffer extends TypedEventEmitter<ZnifferEventCallbacks> {
	public constructor(
		private port: string | ZWaveSerialPortImplementation,
	) {
		super();

		// Ensure the given serial port is valid
		if (
			typeof port !== "string"
			&& !isZWaveSerialPortImplementation(port)
		) {
			throw new ZWaveError(
				`The port must be a string or a valid custom serial port implementation!`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		}

		// Initialize logging
		this._logContainer = new ZWaveLogContainer(/*this._options.logConfig*/);
		this.znifferLog = new ZnifferLogger(this._logContainer);
	}

	/** The serial port instance */
	private serial: ZnifferSerialPortBase | undefined;

	private _logContainer: ZWaveLogContainer;
	private znifferLog: ZnifferLogger;

	/** A list of awaited messages */
	private awaitedMessages: AwaitedMessageEntry[] = [];

	public async init(): Promise<void> {
		// Open the serial port
		if (typeof this.port === "string") {
			if (this.port.startsWith("tcp://")) {
				const url = new URL(this.port);
				// this.driverLog.print(`opening serial port ${this.port}`);
				this.serial = new ZnifferSocket(
					{
						host: url.hostname,
						port: parseInt(url.port),
					},
					this._logContainer,
				);
			} else {
				// this.driverLog.print(`opening serial port ${this.port}`);
				this.serial = new ZnifferSerialPort(
					this.port,
					this._logContainer,
				);
			}
		} else {
			// this.driverLog.print(
			// 	"opening serial port using the provided custom implementation",
			// );
			this.serial = new ZnifferSerialPortBase(
				this.port,
				this._logContainer,
			);
		}
		this.serial
			.on("data", this.serialport_onData.bind(this))
			.on("error", (err) => {
				this.emit("error", err);
			});

		await this.serial.open();

		this.znifferLog.print(logo, "info");

		await this.stop();

		const versionInfo = await this.getVersion();
		this.znifferLog.print(
			`received Zniffer info:
  Chip type:       ${versionInfo.chipType}
  Zniffer version: ${versionInfo.majorVersion}.${versionInfo.minorVersion}`,
			"info",
		);

		await this.setBaudrate(0);

		const freqs = await this.getFrequencies();
		this.znifferLog.print(
			`received frequency info:
  current frequency:     ${
				getEnumMemberName(ZnifferRegion, freqs.currentFrequency)
			}
  supported frequencies: ${
				freqs.supportedFrequencies.map((f) =>
					`\n  · ${getEnumMemberName(ZnifferRegion, f)}`
				).join("")
			}`,
			"info",
		);

		// TODO: Make configurable
		if (freqs.currentFrequency !== ZnifferRegion.Europe) {
			await this.setFrequency(ZnifferRegion.Europe);
		}

		this.emit("ready");
	}

	/**
	 * Is called when the serial port has received a Zniffer frame
	 */
	private async serialport_onData(
		data: Buffer,
	): Promise<void> {
		let msg: ZnifferMessage | undefined;
		try {
			msg = ZnifferMessage.from({ data });
		} catch (e: any) {
			console.error(e);
			return;
		}

		if (msg.type === ZnifferMessageType.Command) {
			await this.handleResponse(msg);
		} else {
			await this.handleDataMessage(msg as ZnifferDataMessage);
		}
	}

	/**
	 * Is called when a Request-type message was received
	 */
	private async handleResponse(msg: ZnifferMessage): Promise<void> {
		// Check if we have a dynamic handler waiting for this message
		for (const entry of this.awaitedMessages) {
			if (entry.predicate(msg)) {
				// We do
				entry.handler(msg);
				return;
			}
		}
	}

	/**
	 * Is called when a Request-type message was received
	 */
	private async handleDataMessage(msg: ZnifferDataMessage): Promise<void> {
		try {
			const mpdu = MPDU.from(msg);
			this.znifferLog.mpdu(mpdu);

			if (
				mpdu.homeId !== 0xd14ca7c9
				&& mpdu.headerType !== MPDUHeaderType.Explorer
				&& mpdu.headerType !== MPDUHeaderType.Routed
				&& !mpdu.routed
			) return;
			console.dir({ mpdu });
		} catch (e: any) {
			console.error(e);
		}
	}

	/**
	 * Waits until a certain serial message is received or a timeout has elapsed. Returns the received message.
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 * @param predicate A predicate function to test all incoming messages.
	 */
	public waitForMessage<T extends ZnifferMessage>(
		predicate: (msg: ZnifferMessage) => boolean,
		timeout: number,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const promise = createDeferredPromise<ZnifferMessage>();
			const entry: AwaitedMessageEntry = {
				predicate,
				handler: (msg) => promise.resolve(msg),
				timeout: undefined,
			};
			this.awaitedMessages.push(entry);
			const removeEntry = () => {
				if (entry.timeout) clearTimeout(entry.timeout);
				const index = this.awaitedMessages.indexOf(entry);
				if (index !== -1) this.awaitedMessages.splice(index, 1);
			};
			// When the timeout elapses, remove the wait entry and reject the returned Promise
			entry.timeout = setTimeout(() => {
				removeEntry();
				reject(
					new ZWaveError(
						`Received no matching message within the provided timeout!`,
						ZWaveErrorCodes.Controller_Timeout,
					),
				);
			}, timeout);
			// When the promise is resolved, remove the wait entry and resolve the returned Promise
			void promise.then((cc) => {
				removeEntry();
				resolve(cc as T);
			});
		});
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getVersion() {
		const req = new ZnifferGetVersionRequest();
		await this.serial?.writeAsync(req.serialize());
		const res = await this.waitForMessage<ZnifferGetVersionResponse>(
			(msg) => msg instanceof ZnifferGetVersionResponse,
			1000,
		);

		return pick(res, ["chipType", "majorVersion", "minorVersion"]);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getFrequencies() {
		const req = new ZnifferGetFrequenciesRequest();
		await this.serial?.writeAsync(req.serialize());
		const res = await this.waitForMessage<ZnifferGetFrequenciesResponse>(
			(msg) => msg instanceof ZnifferGetFrequenciesResponse,
			1000,
		);

		return pick(res, [
			"currentFrequency",
			"supportedFrequencies",
		]);
	}

	public async setFrequency(frequency: ZnifferRegion): Promise<void> {
		const req = new ZnifferSetFrequencyRequest({ frequency });
		await this.serial?.writeAsync(req.serialize());
		await this.waitForMessage<ZnifferSetFrequencyResponse>(
			(msg) => msg instanceof ZnifferSetFrequencyResponse,
			1000,
		);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getFrequencyInfo(frequency: ZnifferRegion) {
		const req = new ZnifferGetFrequencyInfoRequest({ frequency });
		await this.serial?.writeAsync(req.serialize());
		const res = await this.waitForMessage<ZnifferGetFrequencyInfoResponse>(
			(msg) =>
				msg instanceof ZnifferGetFrequencyInfoResponse
				&& msg.frequency === frequency,
			1000,
		);

		return pick(res, ["numChannels", "frequencyName"]);
	}

	public async start(): Promise<void> {
		const req = new ZnifferStartRequest();
		await this.serial?.writeAsync(req.serialize());
		await this.waitForMessage<ZnifferStartResponse>(
			(msg) => msg instanceof ZnifferStartResponse,
			1000,
		);
	}

	public async stop(): Promise<void> {
		const req = new ZnifferStopRequest();
		await this.serial?.writeAsync(req.serialize());
		await this.waitForMessage<ZnifferStopResponse>(
			(msg) => msg instanceof ZnifferStopResponse,
			1000,
		);
	}

	public async setBaudrate(baudrate: 0): Promise<void> {
		const req = new ZnifferSetBaudRateRequest({ baudrate });
		await this.serial?.writeAsync(req.serialize());
		await this.waitForMessage<ZnifferSetBaudRateResponse>(
			(msg) => msg instanceof ZnifferSetBaudRateResponse,
			1000,
		);
	}
}
