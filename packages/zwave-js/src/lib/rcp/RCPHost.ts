import {
	ChannelConfiguration,
	type LogConfig,
	type LogContainer,
	MPDU,
	type MPDUParsingContext,
	type MaybeNotKnown,
	NOT_KNOWN,
	type ProtocolDataRate,
	RFRegion,
	type RSSI,
	ZWaveError,
	ZWaveErrorCodes,
	convertRawRSSI,
	isZWaveError,
	protocolDataRateToString,
} from "@zwave-js/core";
import {
	MessageHeaders,
	RCPFunctionType,
	RCPMessage,
	RCPMessageType,
	RCPSerialFrameType,
	type RCPSerialStream,
	RCPSerialStreamFactory,
	type ZWaveSerialBindingFactory,
	type ZWaveSerialPortImplementation,
	isSuccessIndicator,
	isZWaveSerialPortImplementation,
	wrapLegacySerialBinding,
} from "@zwave-js/serial";
import {
	AbortBeamRequest,
	AbortBeamResponse,
	type ChannelInfo,
	GetFirmwareInfoRequest,
	type GetFirmwareInfoResponse,
	MeasureNoiseFloorRequest,
	type MeasureNoiseFloorResponse,
	RadioCapability,
	RadioLibrary,
	ReceiveCallback,
	SetupRadio_GetCapabilitiesRequest,
	type SetupRadio_GetCapabilitiesResponse,
	SetupRadio_GetRegionRequest,
	type SetupRadio_GetRegionResponse,
	SetupRadio_GetTxPowerRangeRequest,
	type SetupRadio_GetTxPowerRangeResponse,
	SetupRadio_SetRegionRequest,
	type SetupRadio_SetRegionResponse,
	type TransmitBeamCallback,
	TransmitBeamRequest,
	TransmitBeamResponse,
	TransmitCallback,
	TransmitCallbackStatus,
	TransmitRequest,
	TransmitResponse,
	TransmitResponseStatus,
} from "@zwave-js/serial/rcp";
import {
	AsyncQueue,
	type AwaitedThing,
	Bytes,
	type BytesView,
	type DeepPartial,
	type Expand,
	TypedEventTarget,
	buffer2hex,
	cloneDeep,
	getEnumMemberName,
	getErrorMessage,
	isAbortError,
	mergeDeep,
	noop,
	num2hex,
	pick,
	setTimer,
} from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";

import {
	type SerialAPICommandMachineInput,
	createSerialAPICommandMachine,
} from "../driver/SerialAPICommandMachine.js";
import { serialAPICommandErrorToZWaveError } from "../driver/StateMachineShared.js";
import type { ZWaveOptions } from "../driver/ZWaveOptions.js";
import { RCPLogger } from "../log/RCP.js";

import {
	type MpduRxInfo,
	type PHYLayer,
	type RegionConfig,
	type TransmitBeamOptions,
	type TransmitOptions,
	type TransmitResult,
	type TxPowerRange,
	getProtocolDataRateOrThrow,
} from "./PHYLayer.js";
import { RCPTransaction } from "./RCPTransaction.js";

const logo: string = `
███████╗     ██╗    ██╗  █████╗  ██╗   ██╗ ██████╗   ██████╗   █████╗ ██████╗
╚══███╔╝     ██║    ██║ ██╔══██╗ ██║   ██║ ██╔═══╝   ██╔══██╗ ██╔═══╝ ██╔══██╗
  ███╔╝ ███╗ ██║ █╗ ██║ ███████║ ██║   ██║ █████╗    ██████╔╝ ██║     ██████╔╝
 ███╔╝  ╚══╝ ██║███╗██║ ██╔══██║ ╚██╗ ██╔╝ ██╔══╝    ██╔══██╗ ██║     ██╔═══╝
███████╗     ╚███╔███╔╝ ██║  ██║  ╚████╔╝  ██████╗   ██║  ██║ ╚█████╗ ██║
╚══════╝      ╚══╝╚══╝  ╚═╝  ╚═╝   ╚═══╝   ╚═════╝   ╚═╝  ╚═╝  ╚════╝ ╚═╝
`.trim();

type AwaitedMessageHeader = AwaitedThing<MessageHeaders>;
type AwaitedMessageEntry = AwaitedThing<RCPMessage>;

export interface RCPHostEventCallbacks {
	ready: () => void;
	error: (err: Error) => void;
	"mpdu received": (mpdu: MPDU, info: MpduRxInfo) => void;
}

export type RCPHostEvents = Extract<keyof RCPHostEventCallbacks, string>;

export interface RCPHostOptions {
	/**
	 * Optional log configuration
	 */
	logConfig?: Partial<LogConfig>;

	host?: ZWaveOptions["host"];

	/** Specify timeouts in milliseconds */
	timeouts: {
		/** how long to wait for an ACK */
		ack: number; // >=1, default: 500 ms

		/**
		 * How long to wait for a controller response. Usually this should never elapse, but when it does,
		 * the driver will abort the transmission and try to recover the controller if it is unresponsive.
		 */
		response: number; // [100...10000], default: 1000 ms

		callback: number; // [500...10000], default: 2000 ms
	};
}

// oxfmt-ignore
export type PartialRCPHostOptions = Expand<
	& DeepPartial<
		Omit<
			RCPHostOptions,
			| "logConfig"
			| "host"
		>
	>
	& Partial<
		Pick<
			RCPHostOptions,
			"host"
		>
	>
	& {
		logConfig?: Partial<LogConfig>;
	}
>;

const defaultOptions: RCPHostOptions = {
	timeouts: {
		ack: 500,
		response: 1000,
		callback: 2000,
	},
};

/** Ensures that the options are valid */
function checkOptions(options: RCPHostOptions): void {
	if (options.timeouts.ack < 1) {
		throw new ZWaveError(
			`The ACK timeout must be positive!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.timeouts.response < 100 || options.timeouts.response > 10000) {
		throw new ZWaveError(
			`The Response timeout must be between 100 and 10000 milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.timeouts.callback < 500 || options.timeouts.callback > 10000) {
		throw new ZWaveError(
			`The Callback timeout must be between 500 and 10000 milliseconds!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
}

// FIXME: Split out MAC layer functionality

export class RCPHost
	extends TypedEventTarget<RCPHostEventCallbacks>
	implements PHYLayer
{
	public constructor(
		private port:
			| string
			| ZWaveSerialPortImplementation
			| ZWaveSerialBindingFactory,
		options: PartialRCPHostOptions = {},
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

		// Finally apply the defaults, without overwriting any existing settings
		this._options = mergeDeep(
			options,
			cloneDeep(defaultOptions),
		) as RCPHostOptions;

		// And make sure they contain valid values
		checkOptions(this._options);
	}

	// #region Definitions and properties

	private _options: RCPHostOptions;

	/**
	 * The host bindings used to access file system etc.
	 */
	// This is set during `start()` and should not be accessed before
	private bindings!: Omit<Required<NonNullable<ZWaveOptions["host"]>>, "db">;

	private serialFactory: RCPSerialStreamFactory | undefined;
	/** The serial port instance */
	private serial: RCPSerialStream | undefined;

	private _destroyPromise: DeferredPromise<void> | undefined;
	private get wasDestroyed(): boolean {
		return !!this._destroyPromise;
	}

	// This is set during `start()` and should not be accessed before
	private _logContainer!: LogContainer;
	// This is set during `start()` and should not be accessed before
	private rcpLog!: RCPLogger;

	private queue: AsyncQueue<RCPTransaction> = new AsyncQueue();
	/** Used to immediately abort the ongoing Serial API command */
	private abortSerialAPICommand: DeferredPromise<Error> | undefined;

	/** A list of awaited message headers */
	private awaitedMessageHeaders: AwaitedMessageHeader[] = [];
	/** A list of awaited messages */
	private awaitedMessages: AwaitedMessageEntry[] = [];

	private supportedFunctionTypes: MaybeNotKnown<RCPFunctionType[]>;
	private rcpFirmwareVersion: MaybeNotKnown<string>;
	private radioLibraryVersion: MaybeNotKnown<string>;
	private radioLibrary: MaybeNotKnown<RadioLibrary>;

	/** Whether a beam transmission is currently being executed by the firmware */
	private beamActive: boolean = false;

	private rfRegion: MaybeNotKnown<RFRegion>;
	private channelConfig: MaybeNotKnown<ChannelConfiguration>;
	private channels: MaybeNotKnown<ChannelInfo[]>;

	private _txPowerRange: MaybeNotKnown<TxPowerRange>;
	public get txPowerRange(): MaybeNotKnown<TxPowerRange> {
		return this._txPowerRange;
	}

	private _radioCapabilities: MaybeNotKnown<RadioCapability[]>;
	public get radioCapabilities(): MaybeNotKnown<RadioCapability[]> {
		return this._radioCapabilities;
	}

	public get regionConfig(): MaybeNotKnown<RegionConfig> {
		if (this.rfRegion == NOT_KNOWN) return NOT_KNOWN;
		if (this.channelConfig == NOT_KNOWN) return NOT_KNOWN;
		if (this.channels == NOT_KNOWN) return NOT_KNOWN;
		return {
			region: this.rfRegion,
			channelConfig: this.channelConfig,
			channels: this.channels,
		};
	}

	// #region Initialization

	public async start(): Promise<void> {
		if (this.wasDestroyed) {
			throw new ZWaveError(
				"The RCPHost was destroyed. Create a new instance and initialize that one.",
				ZWaveErrorCodes.Driver_Destroyed,
			);
		}

		// Populate default bindings. This has to happen asynchronously, so the driver does not have a hard dependency
		// on Node.js internals
		this.bindings = {
			fs:
				this._options.host?.fs
				?? (await import("@zwave-js/core/bindings/fs/node")).fs,
			serial:
				this._options.host?.serial
				?? (await import("@zwave-js/serial/bindings/node")).serial,
			log:
				this._options.host?.log
				?? (await import("@zwave-js/core/bindings/log/node")).log,
		};

		// Initialize logging
		this._logContainer = this.bindings.log(this._options.logConfig);
		this.rcpLog = new RCPLogger(this._logContainer);

		this.rcpLog.print(logo, "info");

		// Open the serial port
		let binding: ZWaveSerialBindingFactory;
		const baudrate = 460800;
		if (typeof this.port === "string") {
			if (
				typeof this.bindings.serial.createFactoryByPath === "function"
			) {
				this.rcpLog.print(`opening serial port ${this.port}`);
				binding = await this.bindings.serial.createFactoryByPath(
					this.port,
					{ baudrate },
				);
			} else {
				throw new ZWaveError(
					"This platform does not support creating a serial connection by path",
					ZWaveErrorCodes.Driver_Failed,
				);
			}
		} else if (isZWaveSerialPortImplementation(this.port)) {
			this.rcpLog.print(
				"opening serial port using the provided custom implementation",
			);
			this.rcpLog.print(
				"This is deprecated! Switch to the factory pattern instead.",
				"warn",
			);
			binding = wrapLegacySerialBinding(this.port);
		} else {
			this.rcpLog.print(
				"opening serial port using the provided custom factory",
			);
			binding = this.port;
		}
		this.serialFactory = new RCPSerialStreamFactory(
			binding,
			this._logContainer,
		);

		// TODO: Retry - see Driver.ts
		this.serial = await this.serialFactory.createStream();
		void this.handleSerialData(this.serial);

		// Start draining the queue
		void this.drainTransactionQueue();

		// Re-sync communication
		await this.writeHeader(MessageHeaders.NAK);
		await wait(250);

		await this.interview();

		this.emit("ready");
	}

	private async interview(): Promise<void> {
		this.rcpLog.print(`Querying firmware information...`);
		const firmwareInfo = await this.getFirmwareInfo();
		this.rcpFirmwareVersion = firmwareInfo.rcpFirmwareVersion;
		this.radioLibrary = firmwareInfo.radioLibrary;
		this.radioLibraryVersion = firmwareInfo.radioLibraryVersion;
		this.supportedFunctionTypes = firmwareInfo.supportedFunctionTypes;

		this.rcpLog.print(
			`Received firmware information:
	  RCP firmware:  v${this.rcpFirmwareVersion}
	  radio library: ${getEnumMemberName(
			RadioLibrary,
			this.radioLibrary,
		)} v${this.radioLibraryVersion}
	  supported commands: ${this.supportedFunctionTypes
			.map(
				(ft) =>
					`\n  · ${(RCPFunctionType as any)[ft] ?? "unknown"} (${num2hex(
						ft,
					)})`,
			)
			.join("")}`,
		);

		this.rcpLog.print(`Querying region info...`);
		const regionInfo = await this.queryRegion();
		this.rfRegion = regionInfo.region;
		this.channelConfig = regionInfo.channelConfig;
		this.channels = regionInfo.channels;

		this.rcpLog.print(
			`Received region information:
	  region:         ${getEnumMemberName(RFRegion, this.rfRegion)}
	  channel config: ${getEnumMemberName(
			ChannelConfiguration,
			this.channelConfig,
		)}
	  channels: ${this.channels
			.map(
				(ch) =>
					`\n    · ${ch.channel} (${(ch.frequency / 1e6).toFixed(
						2,
					)} MHz): ${protocolDataRateToString(ch.dataRate)}`,
			)
			.join("")}`,
		);

		this.rcpLog.print(`Querying TX power range...`);
		this._txPowerRange = await this.queryTxPowerRange();
		this.rcpLog.print(
			`Received TX power range: ${this._txPowerRange.min.toFixed(
				1,
			)} ... ${this._txPowerRange.max.toFixed(1)} dBm`,
		);

		this.rcpLog.print(`Querying radio capabilities...`);
		this._radioCapabilities = await this.queryRadioCapabilities();
		this.rcpLog.print(
			`Received radio capabilities: ${
				this._radioCapabilities
					.map((c) => getEnumMemberName(RadioCapability, c))
					.join(", ") || "(none)"
			}`,
		);
	}

	// #region Serialport interaction

	private async handleSerialData(serial: RCPSerialStream): Promise<void> {
		try {
			for await (const frame of serial.readable) {
				setImmediate(() => {
					if (frame.type === RCPSerialFrameType.RCP) {
						void this.serialport_onData(frame.data);
					} else {
						// Handle discarded data?
					}
				});
			}
		} catch (e) {
			if (isAbortError(e)) {
				return;
			}
			// This call is not awaited, so a rethrow would surface as an
			// unhandled rejection. Destroy the driver instead, which also
			// emits the "error" event
			void this.destroyWithMessage(getErrorMessage(e));
		}
	}

	/**
	 * Is called when the serial port has received a single-byte message or a complete message buffer
	 */
	private async serialport_onData(
		data: BytesView | MessageHeaders.ACK | MessageHeaders.NAK,
	): Promise<void> {
		if (typeof data === "number") {
			switch (data) {
				case MessageHeaders.ACK:
				case MessageHeaders.NAK: {
					// check if someone is waiting for this
					for (const entry of this.awaitedMessageHeaders) {
						if (entry.predicate(data)) {
							entry.handler(data);
							break;
						}
					}
					return;
				}
			}
		}

		let msg: RCPMessage | undefined;
		try {
			msg = RCPMessage.parse(data, {});

			// all good, send ACK
			await this.writeHeader(MessageHeaders.ACK);
		} catch (e: any) {
			try {
				const response = this.handleDecodeError(e);
				if (response) await this.writeHeader(response);
			} catch (ee: any) {
				if (ee instanceof Error) {
					if (/serial port is not open/.test(ee.message)) {
						this.emit("error", ee);
						void this.destroy();
						return;
					}
					// Print something, so we know what is wrong
					this.rcpLog.print(ee.stack ?? ee.message, "error");
				}
			}
			// Don't keep handling the message
			msg = undefined;
		}

		if (msg) {
			void this.handleReceivedMessage(msg);
		}
	}

	/** Handles a decoding error and returns the desired reply to the stick */
	private handleDecodeError(e: Error): MessageHeaders | undefined {
		if (isZWaveError(e)) {
			switch (e.code) {
				case ZWaveErrorCodes.PacketFormat_Invalid:
				case ZWaveErrorCodes.PacketFormat_Checksum:
				case ZWaveErrorCodes.PacketFormat_Truncated:
					this.rcpLog.print(
						`Dropping message because it contains invalid data`,
						"warn",
					);
					return MessageHeaders.NAK;

				case ZWaveErrorCodes.Deserialization_NotImplemented:
				case ZWaveErrorCodes.CC_NotImplemented:
					this.rcpLog.print(
						`Dropping message because it could not be deserialized: ${e.message}`,
						"warn",
					);
					return MessageHeaders.ACK;

				case ZWaveErrorCodes.Driver_NotReady:
					this.rcpLog.print(
						`Dropping message because the driver is not ready to handle it yet.`,
						"warn",
					);
					return MessageHeaders.ACK;
			}
		} else {
			if (/database is not open/.test(e.message)) {
				// The JSONL-DB is not open yet
				this.rcpLog.print(
					`Dropping message because the driver is not ready to handle it yet.`,
					"warn",
				);
				return MessageHeaders.ACK;
			}
		}
		// Pass all other errors through
		throw e;
	}

	/**
	 * Sends a low-level message like ACK or NAK immediately
	 * @param header The low-level message to send
	 */
	private writeHeader(header: MessageHeaders): Promise<void> {
		return this.writeSerial(Uint8Array.from([header]));
	}

	/** Sends a raw datagram to the serialport (if that is open) */
	private async writeSerial(data: BytesView): Promise<void> {
		return this.serial?.writeAsync(data);
	}

	// #region Command queue

	/** Handles sequencing of queued Serial API commands */
	private async drainTransactionQueue(): Promise<void> {
		for await (const transaction of this.queue) {
			try {
				const ret = await this.executeSerialAPICommand(
					transaction.message,
					transaction.stack,
				);
				transaction.promise.resolve(ret);
			} catch (e) {
				transaction.promise.reject(e);
			}
		}
	}

	/**
	 * Executes a Serial API command and returns or throws the result.
	 * This method should not be called outside of {@link drainSerialAPIQueue}.
	 */
	private async executeSerialAPICommand(
		msg: RCPMessage,
		transactionSource?: string,
	): Promise<RCPMessage | undefined> {
		const machine = createSerialAPICommandMachine(msg);
		const abort = (this.abortSerialAPICommand =
			createDeferredPromise<Error>());
		// Avoid an unhandled rejection when destroying the host while not actively waiting
		abort.catch(noop);
		const abortController = new AbortController();

		let nextInput: SerialAPICommandMachineInput<RCPMessage> | undefined = {
			value: "start",
		};

		try {
			while (!machine.done) {
				if (nextInput == undefined) {
					// We should not be in a situation where we have no input for the state machine
					throw new Error(
						"Serial API Command machine is in an invalid state: no input provided",
					);
				}
				const transition = machine.next(nextInput);
				if (transition == undefined) {
					// We should not be in a situation where the state machine does not transition
					throw new Error(
						"Serial API Command machine is in an invalid state: no transition taken",
					);
				}

				// The input was used
				nextInput = undefined;

				// Transition to the new state
				machine.transition(transition.newState);

				// Now check what needs to be done in the new state
				switch (machine.state.value) {
					case "initial":
						// This should never happen
						throw new Error(
							"Serial API Command machine is in an invalid state: transitioned to initial state",
						);

					case "sending": {
						this.rcpLog.logMessage(msg, {
							direction: "outbound",
						});

						// Mark the message as sent immediately before actually sending
						msg.markAsSent();
						const data = await msg.serialize({});
						await this.writeSerial(data);
						nextInput = { value: "message sent" };
						break;
					}

					case "waitingForACK": {
						const controlFlow = await Promise.race([
							abort.catch((e) => e as Error),
							this.waitForMessageHeader(
								() => true,
								this._options.timeouts.ack,
								abortController.signal,
							).catch(() => "timeout" as const),
						]);

						if (controlFlow instanceof Error) {
							// The command was aborted from the outside
							// Remove the pending wait entry
							abortController.abort();
							throw controlFlow;
						}

						if (controlFlow === "timeout") {
							nextInput = { value: "timeout" };
						} else if (controlFlow === MessageHeaders.ACK) {
							nextInput = { value: "ACK" };
						} else if (controlFlow === MessageHeaders.NAK) {
							nextInput = { value: "NAK" };
						}

						break;
					}

					case "waitingForResponse": {
						const response = await Promise.race([
							abort.catch((e) => e as Error),
							this.waitForMessage(
								(resp) => msg.isExpectedResponse(resp),
								msg.getResponseTimeout()
									?? this._options.timeouts.response,
								undefined,
								abortController.signal,
							).catch(() => "timeout" as const),
						]);

						if (response instanceof Error) {
							// The command was aborted from the outside
							// Remove the pending wait entry
							abortController.abort();
							throw response;
						}

						if (response === "timeout") {
							nextInput = { value: "timeout" };
						} else if (
							isSuccessIndicator(response)
							&& !response.isOK()
						) {
							nextInput = { value: "response NOK", response };
						} else {
							nextInput = { value: "response", response };
						}

						break;
					}

					case "waitingForCallback": {
						const callback = await Promise.race([
							abort.catch((e) => e as Error),
							this.waitForMessage(
								(resp) => msg.isExpectedCallback(resp),
								msg.getCallbackTimeout()
									?? this._options.timeouts.callback,
								undefined,
								abortController.signal,
							).catch(() => "timeout" as const),
						]);

						if (callback instanceof Error) {
							// The command was aborted from the outside
							// Remove the pending wait entry
							abortController.abort();
							throw callback;
						}

						if (callback === "timeout") {
							nextInput = { value: "timeout" };
						} else if (
							isSuccessIndicator(callback)
							&& !callback.isOK()
						) {
							nextInput = { value: "callback NOK", callback };
						} else {
							nextInput = { value: "callback", callback };
						}

						break;
					}

					case "success": {
						return machine.state.result;
					}

					case "failure": {
						const { reason, result } = machine.state;
						throw serialAPICommandErrorToZWaveError(
							reason,
							msg,
							result,
							transactionSource,
						);
					}
				}
			}
		} finally {
			this.abortSerialAPICommand = undefined;
		}
	}

	/**
	 * Sends a message to the Firmware
	 * @param msg The message to send
	 */
	public async queueSerialApiCommand<
		TResponse extends RCPMessage = RCPMessage,
	>(msg: RCPMessage): Promise<TResponse> {
		if (this.wasDestroyed) {
			throw new ZWaveError(
				`The RCP host was destroyed`,
				ZWaveErrorCodes.Driver_Destroyed,
			);
		}

		const resultPromise = createDeferredPromise<TResponse>();

		// Create the transaction
		const transaction = new RCPTransaction({
			message: msg,
			promise: resultPromise,
		});

		// And queue it
		this.queue.add(transaction);

		try {
			return await resultPromise;
		} catch (e) {
			if (isZWaveError(e)) {
				// Enrich errors with the transaction's stack instead of the internal stack
				if (!e.transactionSource) {
					throw new ZWaveError(
						e.message,
						e.code,
						e.context,
						transaction.stack,
					);
				}
			}
			throw e;
		}
	}

	// #region RCP Serial API methods

	private async getFirmwareInfo(): Promise<{
		rcpFirmwareVersion: string;
		radioLibrary: RadioLibrary;
		radioLibraryVersion: string;
		supportedFunctionTypes: RCPFunctionType[];
	}> {
		const msg = new GetFirmwareInfoRequest();
		const result =
			await this.queueSerialApiCommand<GetFirmwareInfoResponse>(msg);

		return pick(result, [
			"rcpFirmwareVersion",
			"radioLibrary",
			"radioLibraryVersion",
			"supportedFunctionTypes",
		]);
	}

	public async queryRegion(): Promise<RegionConfig> {
		const msg = new SetupRadio_GetRegionRequest();
		const result =
			await this.queueSerialApiCommand<SetupRadio_GetRegionResponse>(msg);

		return pick(result, ["region", "channelConfig", "channels"]);
	}

	public async queryTxPowerRange(): Promise<TxPowerRange> {
		const msg = new SetupRadio_GetTxPowerRangeRequest();
		const result =
			await this.queueSerialApiCommand<SetupRadio_GetTxPowerRangeResponse>(
				msg,
			);

		// An unsatisfiable range would reject every TX power later, far from
		// the answer that caused it
		if (result.minTxPower > result.maxTxPower) {
			throw new ZWaveError(
				`The firmware reported an invalid TX power range: ${result.minTxPower} ... ${result.maxTxPower} dBm`,
				ZWaveErrorCodes.Driver_InvalidOptions,
			);
		}

		return {
			min: result.minTxPower,
			max: result.maxTxPower,
		};
	}

	public async setRegion(
		region: RFRegion,
		channelConfig: ChannelConfiguration,
	): Promise<ChannelInfo[]> {
		const msg = new SetupRadio_SetRegionRequest({
			region,
			channelConfig,
		});
		const result =
			await this.queueSerialApiCommand<SetupRadio_SetRegionResponse>(msg);

		if (result.success) {
			return result.channels!;
		} else {
			throw new ZWaveError(
				"Failed to set region",
				ZWaveErrorCodes.Controller_ResponseNOK,
			);
		}
	}

	/**
	 * Transmits an MPDU on the given channel and returns whether the transmit has successfully been executed.
	 * Does not wait for an ACK or anything else.
	 */
	public async transmit(
		data: BytesView,
		options: TransmitOptions,
	): Promise<TransmitResult> {
		this.assertFunctionSupported(RCPFunctionType.Transmit);

		const msg = new TransmitRequest({
			channel: options.channel,
			txPower: options.txPower,
			withCCA: options.withCCA,
			replacements: options.replacements,
			data,
		});
		try {
			const result =
				await this.queueSerialApiCommand<TransmitCallback>(msg);
			// Successful transmission
			return result.status;
		} catch (e) {
			if (isZWaveError(e)) {
				if (
					e.context instanceof TransmitResponse
					|| e.context instanceof TransmitCallback
				) {
					// The transmission failed
					return e.context.status;
				}
			}

			// Unexpected error
			throw e;
		}
	}

	private assertFunctionSupported(functionType: RCPFunctionType): void {
		if (this.supportedFunctionTypes == undefined) {
			throw new ZWaveError(
				`The supported commands are not known before the interview`,
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		if (!this.supportedFunctionTypes.includes(functionType)) {
			throw new ZWaveError(
				`The command ${getEnumMemberName(
					RCPFunctionType,
					functionType,
				)} is not supported by this firmware`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
	}

	/**
	 * Transmits a beam and returns whether it was executed successfully.
	 * The firmware executes the beam on its own and reports back when it is done or was aborted.
	 */
	public async transmitBeam(
		options: TransmitBeamOptions,
	): Promise<TransmitResult> {
		this.assertFunctionSupported(RCPFunctionType.TransmitBeam);

		// The firmware can only execute one beam at a time. The slot must be reserved
		// synchronously, or concurrent calls would all pass this check.
		if (this.beamActive) return TransmitResponseStatus.Busy;
		this.beamActive = true;

		const msg = new TransmitBeamRequest(options);

		try {
			try {
				await this.queueSerialApiCommand<TransmitBeamResponse>(msg);
			} catch (e) {
				if (
					isZWaveError(e)
					&& e.context instanceof TransmitBeamResponse
				) {
					return e.context.status;
				}
				throw e;
			}

			// The beam only starts after the firmware has sent the response, and serial frames
			// are processed in order, so the callback cannot arrive before this wait is registered.
			// Awaiting it outside of the transaction queue keeps the queue free for an abort command.
			try {
				const callback =
					await this.waitForMessage<TransmitBeamCallback>(
						(resp) =>
							resp.type === RCPMessageType.Callback
							&& resp.functionType
								=== RCPFunctionType.TransmitBeam,
						msg.getCallbackTimeout()
							?? this._options.timeouts.callback,
					);
				return callback.status;
			} catch (e) {
				if (
					isZWaveError(e)
					&& e.code === ZWaveErrorCodes.Controller_Timeout
				) {
					this.rcpLog.print(
						`Received no callback for the beam transmission within ${msg.getCallbackTimeout()} ms`,
						"error",
					);
					// The firmware may still be beaming. Leaving it running would
					// block the radio and let the late callback resolve the next beam
					try {
						await this.abortBeam();
					} catch (abortError) {
						this.rcpLog.print(
							`Could not abort the timed out beam: ${getErrorMessage(
								abortError,
							)}`,
							"error",
						);
					}
					return TransmitCallbackStatus.UnknownError;
				}
				throw e;
			}
		} finally {
			this.beamActive = false;
		}
	}

	public get supportsAbortBeam(): boolean {
		return !!this.supportedFunctionTypes?.includes(
			RCPFunctionType.AbortBeam,
		);
	}

	/** Measures the noise floor on the given channel, in dBm */
	public async measureNoiseFloor(channel: number): Promise<RSSI> {
		this.assertFunctionSupported(RCPFunctionType.MeasureNoiseFloor);

		const msg = new MeasureNoiseFloorRequest({ channel });
		const result =
			await this.queueSerialApiCommand<MeasureNoiseFloorResponse>(msg);
		return result.noiseFloor;
	}

	public get supportsMeasureNoiseFloor(): boolean {
		return !!this.supportedFunctionTypes?.includes(
			RCPFunctionType.MeasureNoiseFloor,
		);
	}

	public get supportsTransmitReplacements(): boolean {
		return !!this._radioCapabilities?.includes(
			RadioCapability.TransmitReplacements,
		);
	}

	/** Queries the optional features the firmware implements */
	public async queryRadioCapabilities(): Promise<RadioCapability[]> {
		const msg = new SetupRadio_GetCapabilitiesRequest();
		const result =
			await this.queueSerialApiCommand<SetupRadio_GetCapabilitiesResponse>(
				msg,
			);
		return result.capabilities;
	}

	/**
	 * Stops an ongoing beam transmission. Resolves when no beam is running,
	 * either because the firmware stopped one or because there was none.
	 */
	public async abortBeam(): Promise<void> {
		this.assertFunctionSupported(RCPFunctionType.AbortBeam);

		const msg = new AbortBeamRequest();
		try {
			await this.queueSerialApiCommand<AbortBeamResponse>(msg);
		} catch (e) {
			// The firmware answers NOK when there is no beam to abort, which
			// leaves the radio in the state the caller asked for
			if (isZWaveError(e) && e.context instanceof AbortBeamResponse) {
				return;
			}
			throw e;
		}
	}

	// #region RCPMessage handling

	/**
	 * Is called when a message is received that does not belong to any ongoing transactions
	 * @param msg The decoded message
	 */
	private async handleReceivedMessage(msg: RCPMessage): Promise<void> {
		// This is a message we might have registered handlers for
		try {
			this.rcpLog.logMessage(msg, {
				direction: "inbound",
			});

			if (msg.type === RCPMessageType.Request) {
				await this.handleRequest(msg);
			} else if (msg.type === RCPMessageType.Response) {
				await this.handleResponse(msg);
			} else if (msg.type === RCPMessageType.Callback) {
				this.handleCallback(msg);
			}
		} catch (e) {
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Driver_NotReady) {
				this.rcpLog.print(
					`Cannot handle message because the driver is not ready to handle it yet.`,
					"warn",
				);
			} else {
				throw e;
			}
		}
	}

	/**
	 * Is called when a Response-type message was received
	 */
	private handleResponse(msg: RCPMessage): Promise<void> {
		// Check if we have a dynamic handler waiting for this message
		for (const entry of this.awaitedMessages) {
			if (entry.predicate(msg)) {
				// We do
				entry.handler(msg);
				return Promise.resolve();
			}
		}

		this.rcpLog.print("unexpected response, discarding...", "warn");

		return Promise.resolve();
	}

	/**
	 * Is called when a Callback-type message was received
	 */
	private handleCallback(msg: RCPMessage): void {
		// Check if we have a dynamic handler waiting for this message
		for (const entry of this.awaitedMessages) {
			if (entry.predicate(msg)) {
				// We do
				entry.handler(msg);
				return;
			}
		}

		if (msg instanceof ReceiveCallback) {
			this.handleReceiveCallback(msg);
			return;
		}

		this.rcpLog.print(
			`TODO: Handle callback: ${buffer2hex(msg.payload)}`,
			"warn",
		);

		return;
	}

	private handleReceiveCallback(msg: ReceiveCallback): void {
		if (this.channelConfig == NOT_KNOWN) {
			this.rcpLog.print(
				`Cannot parse received frame: The current channel configuration is not known yet.`,
				"error",
			);
			return;
		}

		let protocolDataRate: ProtocolDataRate;
		try {
			protocolDataRate = getProtocolDataRateOrThrow(
				this.channels,
				msg.channel,
			);
		} catch {
			this.rcpLog.print(
				`Cannot parse received frame: The channel ${msg.channel} is not supported in the current region.`,
				"error",
			);
			return;
		}

		if (this.rfRegion == NOT_KNOWN) {
			this.rcpLog.print(
				`Cannot parse received frame: The region is not known yet.`,
				"error",
			);
			return;
		}

		const ctx: MPDUParsingContext = {
			channel: msg.channel,
			protocolDataRate,
			region: this.rfRegion,
		};

		let mpdu: MPDU;
		try {
			mpdu = MPDU.parse(Bytes.view(msg.data), ctx);
		} catch (e) {
			this.rcpLog.print(
				`Failed to parse received frame: ${getErrorMessage(e)}`,
				"error",
			);
			return;
		}
		const rssi = convertRawRSSI(msg.rssi, this.channelConfig, msg.channel);

		this.emit("mpdu received", mpdu, {
			channel: msg.channel,
			rssi,
			protocolDataRate,
		});
	}

	/**
	 * Is called when a Request-type message was received
	 */
	private handleRequest(msg: RCPMessage): Promise<void> {
		// Check if we have a dynamic handler waiting for this message
		for (const entry of this.awaitedMessages) {
			if (entry.predicate(msg)) {
				// We do
				entry.handler(msg);
				return Promise.resolve();
			}
		}

		this.rcpLog.print(
			"No handlers for received request - discarding...",
			"warn",
		);

		return Promise.resolve();
	}

	/**
	 * Waits until a matching message header is received or an optional timeout has elapsed. Returns the received message.
	 *
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 * @param predicate A predicate function to test all incoming message headers.
	 */
	public waitForMessageHeader(
		predicate: (header: MessageHeaders) => boolean,
		timeout?: number,
		abortSignal?: AbortSignal,
	): Promise<MessageHeaders> {
		return new Promise<MessageHeaders>((resolve, reject) => {
			const promise = createDeferredPromise<MessageHeaders>();
			const entry: AwaitedMessageHeader = {
				predicate,
				handler: (msg) => promise.resolve(msg),
				timeout: undefined,
			};
			this.awaitedMessageHeaders.push(entry);
			const removeEntry = () => {
				entry.timeout?.clear();
				abortSignal?.removeEventListener("abort", removeEntry);
				const index = this.awaitedMessageHeaders.indexOf(entry);
				if (index !== -1) this.awaitedMessageHeaders.splice(index, 1);
			};
			// When the timeout elapses, remove the wait entry and reject the returned Promise
			if (timeout) {
				entry.timeout = setTimer(() => {
					removeEntry();
					reject(
						new ZWaveError(
							`Received no matching serial frame within the provided timeout!`,
							ZWaveErrorCodes.Controller_Timeout,
						),
					);
				}, timeout);
			}
			// When the promise is resolved, remove the wait entry and resolve the returned Promise
			void promise.then((cc) => {
				removeEntry();
				resolve(cc);
			});
			// When the abort signal is used, silently remove the wait entry
			abortSignal?.addEventListener("abort", removeEntry);
		});
	}

	/**
	 * Waits until an unsolicited serial message is received or an optional timeout has elapsed. Returns the received message.
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 * @param predicate A predicate function to test all incoming messages.
	 * @param refreshPredicate A predicate function to test partial messages. If this returns `true` for a message, the timer will be restarted.
	 */
	public waitForMessage<T extends RCPMessage>(
		predicate: (msg: RCPMessage) => boolean,
		timeout?: number,
		refreshPredicate?: (msg: RCPMessage) => boolean,
		abortSignal?: AbortSignal,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const promise = createDeferredPromise<RCPMessage>();
			const entry: AwaitedMessageEntry = {
				predicate,
				refreshPredicate,
				handler: (msg) => promise.resolve(msg),
				timeout: undefined,
			};
			this.awaitedMessages.push(entry);
			const removeEntry = () => {
				entry.timeout?.clear();
				abortSignal?.removeEventListener("abort", removeEntry);
				const index = this.awaitedMessages.indexOf(entry);
				if (index !== -1) this.awaitedMessages.splice(index, 1);
			};
			// When the timeout elapses, remove the wait entry and reject the returned Promise
			if (timeout) {
				entry.timeout = setTimer(() => {
					removeEntry();
					reject(
						new ZWaveError(
							`Received no matching message within the provided timeout!`,
							ZWaveErrorCodes.Controller_Timeout,
						),
					);
				}, timeout);
			}
			// When the promise is resolved, remove the wait entry and resolve the returned Promise
			void promise.then((cc) => {
				removeEntry();
				resolve(cc as T);
			});
			// When the abort signal is used, silently remove the wait entry
			abortSignal?.addEventListener("abort", removeEntry);
		});
	}

	// #region destroy()

	private destroySerialAPIQueue(
		reason: string,
		errorCode?: ZWaveErrorCodes,
	): void {
		this.queue.abort();

		// Abort the currently executed serial API command, so the queue does not lock up
		this.abortSerialAPICommand?.reject(
			new ZWaveError(
				reason,
				errorCode ?? ZWaveErrorCodes.Driver_Destroyed,
			),
		);
	}

	private async destroyWithMessage(message: string): Promise<void> {
		this.rcpLog.print(message, "error");

		const error = new ZWaveError(message, ZWaveErrorCodes.Driver_Failed);
		this.emit("error", error);

		await this.destroy();
	}

	/**
	 * Terminates the RCPHost instance and closes the underlying serial connection.
	 * Must be called under any circumstances.
	 */
	public async destroy(): Promise<void> {
		// Ensure this is only called once and all subsequent calls block
		if (this._destroyPromise) return this._destroyPromise;
		this._destroyPromise = createDeferredPromise();

		this.rcpLog.print("Destroying RCP host...");

		if (this.serial != undefined) {
			// Avoid spewing errors if the port was in the middle of receiving something
			if (this.serial.isOpen) await this.serial.close();
			this.serial = undefined;
		}

		this.destroySerialAPIQueue(
			"The RCP host was destroyed",
			ZWaveErrorCodes.Driver_Destroyed,
		);

		// Remove all timeouts
		for (const timeout of [
			...this.awaitedMessages.map((m) => m.timeout),
			...this.awaitedMessageHeaders.map((h) => h.timeout),
		]) {
			timeout?.clear();
		}

		this.rcpLog.print("RCP host destroyed");

		// destroy loggers as the very last thing
		this._logContainer.destroy();

		this._destroyPromise.resolve();
	}
}
