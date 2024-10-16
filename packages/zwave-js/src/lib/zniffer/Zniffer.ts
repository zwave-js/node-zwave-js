import {
	CommandClass,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
	SecurityCCNonceReport,
} from "@zwave-js/cc";
import { DeviceConfig } from "@zwave-js/config";
import {
	CommandClasses,
	type LogConfig,
	MPDUHeaderType,
	type MaybeNotKnown,
	type RSSI,
	SPANState,
	SecurityClass,
	SecurityManager,
	SecurityManager2,
	type SecurityManagers,
	type UnknownZWaveChipType,
	ZWaveError,
	ZWaveErrorCodes,
	ZWaveLogContainer,
	ZnifferRegion,
	ZnifferRegionLegacy,
	getChipTypeAndVersion,
	isLongRangeNodeId,
	securityClassIsS2,
} from "@zwave-js/core";
import { type CCParsingContext, type HostIDs } from "@zwave-js/host";
import {
	type ZWaveSerialPortImplementation,
	type ZnifferDataMessage,
	ZnifferFrameType,
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
import {
	TypedEventEmitter,
	getEnumMemberName,
	isEnumMember,
	noop,
	num2hex,
	pick,
} from "@zwave-js/shared";
import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";
import fs from "node:fs/promises";
import { sdkVersionGte } from "../controller/utils";
import { type ZWaveOptions } from "../driver/ZWaveOptions";
import { ZnifferLogger } from "../log/Zniffer";
import {
	type CorruptedFrame,
	type Frame,
	beamToFrame,
	mpduToFrame,
	parseBeamFrame,
	parseMPDU,
	znifferDataMessageToCorruptedFrame,
} from "./MPDU";

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
	frame: (frame: Frame, rawData: Buffer) => void;
	"corrupted frame": (err: CorruptedFrame, rawData: Buffer) => void;
}

export type ZnifferEvents = Extract<keyof ZnifferEventCallbacks, string>;

interface AwaitedThing<T> {
	handler: (thing: T) => void;
	timeout?: NodeJS.Timeout;
	predicate: (msg: T) => boolean;
}

type AwaitedMessageEntry = AwaitedThing<ZnifferMessage>;

export interface ZnifferOptions {
	/**
	 * Optional log configuration
	 */
	logConfig?: Partial<LogConfig>;

	/** Security keys for decrypting Z-Wave traffic */
	securityKeys?: ZWaveOptions["securityKeys"];
	/** Security keys for decrypting Z-Wave Long Range traffic */
	securityKeysLongRange?: ZWaveOptions["securityKeysLongRange"];

	/**
	 * The RSSI values reported by the Zniffer are not actual RSSI values.
	 * They can be converted to dBm, but the conversion is chip dependent and not documented for 700/800 series Zniffers.
	 *
	 * Set this option to `true` enable the conversion. Otherwise the raw values from the Zniffer will be used.
	 */
	convertRSSI?: boolean;

	/**
	 * The frequency to initialize the Zniffer with. If not specified, the current setting will be kept.
	 *
	 * On 700/800 series Zniffers, this value matches the {@link ZnifferRegion}.
	 *
	 * On 400/500 series Zniffers, the value is firmware-specific.
	 * Supported regions and their names have to be queried using the `getFrequencies` and `getFrequencyInfo(frequency)` commands.
	 */
	defaultFrequency?: number;

	/** Limit the number of frames that are kept in memory. */
	maxCapturedFrames?: number;
}

function is700PlusSeries(
	chipType: string | UnknownZWaveChipType,
): boolean {
	if (typeof chipType !== "string") {
		return chipType.type >= 0x07;
	}

	const chipTypeNumeric = getChipTypeAndVersion(chipType);
	if (chipTypeNumeric) {
		return chipTypeNumeric.type >= 0x07;
	}

	return false;
}

function tryConvertRSSI(
	rssi: number,
	chipType: string | UnknownZWaveChipType,
): number {
	// For 400/500 series, the conversion is documented in the Zniffer user guide.
	// The conversion for 700/800 series was reverse-engineered from the Zniffer firmware.
	// Here, we assume that only these two representations exist:
	if (is700PlusSeries(chipType)) {
		return rssi * 4 - 256;
	} else {
		return rssi * 1.5 - 153.5;
	}
}

interface CapturedData {
	timestamp: Date;
	rawData: Buffer;
	frameData: Buffer;
	parsedFrame?: Frame | CorruptedFrame;
}

export interface CapturedFrame {
	timestamp: Date;
	frameData: Buffer;
	parsedFrame: Frame | CorruptedFrame;
}

export class Zniffer extends TypedEventEmitter<ZnifferEventCallbacks> {
	public constructor(
		private port: string | ZWaveSerialPortImplementation,
		options: ZnifferOptions = {},
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
		this._logContainer = new ZWaveLogContainer(options.logConfig);
		this.znifferLog = new ZnifferLogger(this, this._logContainer);

		this._options = options;

		this._active = false;

		this.parsingContext = {
			getHighestSecurityClass(
				_nodeId: number,
			): MaybeNotKnown<SecurityClass> {
				return SecurityClass.S2_AccessControl;
			},

			hasSecurityClass(
				_nodeId: number,
				_securityClass: SecurityClass,
			): MaybeNotKnown<boolean> {
				// We don't actually know. Attempt parsing with all security classes
				return true;
			},

			setSecurityClass(
				_nodeId: number,
				_securityClass: SecurityClass,
				_granted: boolean,
			): void {
				// Do nothing
			},

			getDeviceConfig(_nodeId: number): DeviceConfig | undefined {
				// Disable strict validation while parsing certain CCs
				// Most of this stuff isn't actually needed, only the compat flags...
				return new DeviceConfig(
					"unknown.json",
					false,
					"UNKNOWN_MANUFACTURER",
					0x0000,
					"UNKNOWN_PRODUCT",
					"UNKNOWN_DESCRIPTION",
					[],
					{
						min: "0.0",
						max: "255.255",
					},
					true,
					undefined,
					undefined,
					undefined,
					undefined,
					// ...down here:
					{
						disableStrictEntryControlDataValidation: true,
						disableStrictMeasurementValidation: true,
					},
				);
			},
		};
	}

	private _options: ZnifferOptions;

	/** The serial port instance */
	private serial: ZnifferSerialPortBase | undefined;
	private parsingContext: Omit<
		CCParsingContext,
		keyof HostIDs | "sourceNodeId" | keyof SecurityManagers
	>;

	private _destroyPromise: DeferredPromise<void> | undefined;
	private get wasDestroyed(): boolean {
		return !!this._destroyPromise;
	}

	private _chipType: string | UnknownZWaveChipType | undefined;

	private _currentFrequency: number | undefined;
	/** The currently configured frequency */
	public get currentFrequency(): number | undefined {
		return this._currentFrequency;
	}

	private _supportedFrequencies: Map<number, string> = new Map();
	/** A map of supported frequency identifiers and their names */
	public get supportedFrequencies(): ReadonlyMap<number, string> {
		return this._supportedFrequencies;
	}

	private _logContainer: ZWaveLogContainer;
	private znifferLog: ZnifferLogger;

	/** The security managers for each node */
	private securityManagers: Map<number, {
		securityManager: SecurityManager | undefined;
		securityManager2: SecurityManager2 | undefined;
		securityManagerLR: SecurityManager2 | undefined;
	}> = new Map();

	/** A list of awaited messages */
	private awaitedMessages: AwaitedMessageEntry[] = [];

	private _active: boolean;
	/** Whether the Zniffer instance is currently capturing */
	public get active(): boolean {
		return this._active;
	}

	private _capturedFrames: CapturedData[] = [];

	/** A list of raw captured frames that can be saved to a .zlf file later */
	public get capturedFrames(): Readonly<CapturedFrame>[] {
		return this._capturedFrames.filter((f) => f.parsedFrame !== undefined)
			.map((f) => ({
				timestamp: f.timestamp,
				frameData: f.frameData,
				parsedFrame: f.parsedFrame!,
			}));
	}

	public async init(): Promise<void> {
		if (this.wasDestroyed) {
			throw new ZWaveError(
				"The Zniffer was destroyed. Create a new instance and initialize that one.",
				ZWaveErrorCodes.Driver_Destroyed,
			);
		}

		// Open the serial port
		if (typeof this.port === "string") {
			if (this.port.startsWith("tcp://")) {
				const url = new URL(this.port);
				// this.znifferLog.print(`opening serial port ${this.port}`);
				this.serial = new ZnifferSocket(
					{
						host: url.hostname,
						port: parseInt(url.port),
					},
					this._logContainer,
				);
			} else {
				// this.znifferLog.print(`opening serial port ${this.port}`);
				this.serial = new ZnifferSerialPort(
					this.port,
					this._logContainer,
				);
			}
		} else {
			// this.znifferLog.print(
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
		this._chipType = versionInfo.chipType;
		this.znifferLog.print(
			`received Zniffer info:
  Chip type:       ${
				typeof versionInfo.chipType === "string"
					? versionInfo.chipType
					: `unknown (${num2hex(versionInfo.chipType.type)}, ${
						num2hex(versionInfo.chipType.version)
					})`
			}
  Zniffer version: ${versionInfo.majorVersion}.${versionInfo.minorVersion}`,
			"info",
		);

		await this.setBaudrate(0);

		const freqs = await this.getFrequencies();
		this._currentFrequency = freqs.currentFrequency;
		if (is700PlusSeries(this._chipType)) {
			// The frequencies match the ZnifferRegion enum
			for (const freq of freqs.supportedFrequencies) {
				this._supportedFrequencies.set(
					freq,
					getEnumMemberName(ZnifferRegion, freq),
				);
			}
			// ... but there might be unknown regions. Query those from the Zniffer
			const unknownRegions = freqs.supportedFrequencies.filter((f) =>
				!isEnumMember(ZnifferRegion, f)
			);
			for (const freq of unknownRegions) {
				const freqInfo = await this.getFrequencyInfo(freq);
				this._supportedFrequencies.set(freq, freqInfo.frequencyName);
			}
		} else if (
			// Version 2.55+ supports querying the frequency names
			sdkVersionGte(
				`${versionInfo.majorVersion}.${versionInfo.minorVersion}`,
				"2.55",
			)
		) {
			// The frequencies are firmware-specific. Query them from the Zniffer
			for (const freq of freqs.supportedFrequencies) {
				const freqInfo = await this.getFrequencyInfo(freq);
				this._supportedFrequencies.set(freq, freqInfo.frequencyName);
			}
		} else {
			// The frequencies match the ZnifferRegionLegacy enum, and their info cannot be queried
			for (const freq of freqs.supportedFrequencies) {
				this._supportedFrequencies.set(
					freq,
					getEnumMemberName(ZnifferRegionLegacy, freq),
				);
			}
		}

		this.znifferLog.print(
			`received frequency info:
current frequency:     ${
				this._supportedFrequencies.get(freqs.currentFrequency)
					?? `unknown (${num2hex(freqs.currentFrequency)})`
			}
supported frequencies: ${
				[...this._supportedFrequencies].map(([region, name]) =>
					`\n  · ${region.toString().padStart(2, " ")}: ${name}`
				).join("")
			}`,
			"info",
		);

		if (
			typeof this._options.defaultFrequency === "number"
			&& freqs.currentFrequency !== this._options.defaultFrequency
			&& this._supportedFrequencies.has(this._options.defaultFrequency)
		) {
			await this.setFrequency(this._options.defaultFrequency);
		}

		this.emit("ready");
	}

	/**
	 * Is called when the serial port has received a Zniffer frame
	 */
	private serialport_onData(
		data: Buffer,
	): void {
		let msg: ZnifferMessage | undefined;
		try {
			msg = ZnifferMessage.from({ data });
		} catch (e: any) {
			console.error(e);
			return;
		}

		if (msg.type === ZnifferMessageType.Command) {
			this.handleResponse(msg);
		} else {
			const dataMsg = msg as ZnifferDataMessage;
			const capture: CapturedData = {
				timestamp: new Date(),
				rawData: data,
				frameData: dataMsg.payload,
			};
			this._capturedFrames.push(capture);
			if (
				this._options.maxCapturedFrames != undefined
				&& this._capturedFrames.length > this._options.maxCapturedFrames
			) {
				this._capturedFrames.shift();
			}
			this.handleDataMessage(dataMsg, capture);
		}
	}

	/**
	 * Is called when a Request-type message was received
	 */
	private handleResponse(msg: ZnifferMessage): void {
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
	private handleDataMessage(
		msg: ZnifferDataMessage,
		capture: CapturedData,
	): void {
		try {
			let convertedRSSI: RSSI | undefined;
			if (this._options.convertRSSI && this._chipType) {
				convertedRSSI = tryConvertRSSI(
					msg.rssiRaw,
					this._chipType,
				);
			}

			// Short-circuit if we're dealing with beam frames
			if (
				msg.frameType === ZnifferFrameType.BeamStart
				|| msg.frameType === ZnifferFrameType.BeamStop
			) {
				const beam = parseBeamFrame(msg);
				beam.frameInfo.rssi = convertedRSSI;

				// Emit the captured frame in a format that's easier to work with for applications.
				this.znifferLog.beam(beam);
				const frame = beamToFrame(beam);
				capture.parsedFrame = frame;
				this.emit("frame", frame, capture.frameData);
				return;
			}

			// Only handle messages with a valid checksum, expose the others as CRC errors
			if (!msg.checksumOK) {
				this.znifferLog.crcError(msg);
				const frame = znifferDataMessageToCorruptedFrame(msg);
				capture.parsedFrame = frame;
				this.emit("corrupted frame", frame, capture.frameData);
				return;
			}

			const mpdu = parseMPDU(msg);
			mpdu.frameInfo.rssi = convertedRSSI;

			// Try to decode the CC while assuming the role of the receiver
			let destSecurityManager: SecurityManager | undefined;
			let destSecurityManager2: SecurityManager2 | undefined;
			let destSecurityManagerLR: SecurityManager2 | undefined;
			// Only frames with a destination node id contains something that requires access to the own node ID
			let destNodeId = 0xff;

			let cc: CommandClass | undefined;

			// FIXME: Cache data => parsed CC, so we can understand re-transmitted S2 frames

			if (
				mpdu.payload.length > 0
				&& mpdu.headerType !== MPDUHeaderType.Acknowledgement
			) {
				if ("destinationNodeId" in mpdu) {
					destNodeId = mpdu.destinationNodeId;
					({
						securityManager: destSecurityManager,
						securityManager2: destSecurityManager2,
						securityManagerLR: destSecurityManagerLR,
					} = this.getSecurityManagers(mpdu.destinationNodeId));
				}

				// TODO: Support parsing multicast S2 frames
				try {
					cc = CommandClass.from({
						data: mpdu.payload,
						fromEncapsulation: false,
						nodeId: mpdu.sourceNodeId,
						context: {
							homeId: mpdu.homeId,
							ownNodeId: destNodeId,
							sourceNodeId: mpdu.sourceNodeId,
							securityManager: destSecurityManager,
							securityManager2: destSecurityManager2,
							securityManagerLR: destSecurityManagerLR,
							...this.parsingContext,
						},
					});
				} catch (e: any) {
					// Ignore
					console.error(e.stack);
				}
			}

			this.znifferLog.mpdu(mpdu, cc);

			// Emit the captured frame in a format that's easier to work with for applications.
			const frame = mpduToFrame(mpdu, cc);
			capture.parsedFrame = frame;
			this.emit("frame", frame, capture.frameData);

			// Update the security managers when nonces are exchanged, so we can
			// decrypt the communication
			if (cc?.ccId === CommandClasses["Security 2"]) {
				const securityManagers = this.getSecurityManagers(
					mpdu.sourceNodeId,
				);
				const isLR = isLongRangeNodeId(mpdu.sourceNodeId)
					|| isLongRangeNodeId(destNodeId);
				const senderSecurityManager = isLR
					? securityManagers.securityManagerLR
					: securityManagers.securityManager2;
				const destSecurityManager = isLR
					? destSecurityManagerLR
					: destSecurityManager2;

				if (senderSecurityManager && destSecurityManager) {
					if (cc instanceof Security2CCNonceGet) {
						// Nonce Get -> all nonces are now invalid
						senderSecurityManager.deleteNonce(destNodeId);
						destSecurityManager.deleteNonce(mpdu.sourceNodeId);
					} else if (cc instanceof Security2CCNonceReport && cc.SOS) {
						// Nonce Report (SOS) -> We only know the receiver's nonce
						senderSecurityManager.setSPANState(destNodeId, {
							type: SPANState.LocalEI,
							receiverEI: cc.receiverEI!,
						});
						destSecurityManager.storeRemoteEI(
							mpdu.sourceNodeId,
							cc.receiverEI!,
						);
					} else if (cc instanceof Security2CCMessageEncapsulation) {
						const senderEI = cc.getSenderEI();
						if (senderEI) {
							// The receiver should now have a valid SPAN state, since decoding the S2 CC updates it.
							// The security manager for the sender however, does not. Therefore, update it manually,
							// if the receiver SPAN is indeed valid.

							const receiverSPANState = destSecurityManager
								.getSPANState(mpdu.sourceNodeId);
							if (receiverSPANState.type === SPANState.SPAN) {
								senderSecurityManager.setSPANState(
									destNodeId,
									receiverSPANState,
								);
							}
						}
					}
				}
			} else if (
				cc?.ccId === CommandClasses.Security
				&& cc instanceof SecurityCCNonceReport
			) {
				const senderSecurityManager =
					this.getSecurityManagers(mpdu.sourceNodeId).securityManager;
				const destSecurityManager =
					this.getSecurityManagers(destNodeId).securityManager;

				if (senderSecurityManager && destSecurityManager) {
					// Both nodes have a shared nonce now
					senderSecurityManager.setNonce(
						{
							issuer: mpdu.sourceNodeId,
							nonceId: senderSecurityManager.getNonceId(
								cc.nonce,
							),
						},
						{
							nonce: cc.nonce,
							receiver: destNodeId,
						},
						{ free: true },
					);

					destSecurityManager.setNonce(
						{
							issuer: mpdu.sourceNodeId,
							nonceId: senderSecurityManager.getNonceId(
								cc.nonce,
							),
						},
						{
							nonce: cc.nonce,
							receiver: destNodeId,
						},
						{ free: true },
					);
				}
			}
		} catch (e: any) {
			console.error(e);
		}
	}

	/**
	 * Waits until a certain serial message is received or a timeout has elapsed. Returns the received message.
	 * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
	 * @param predicate A predicate function to test all incoming messages.
	 */
	private waitForMessage<T extends ZnifferMessage>(
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

	private async getVersion() {
		const req = new ZnifferGetVersionRequest();
		await this.serial?.writeAsync(req.serialize());
		const res = await this.waitForMessage<ZnifferGetVersionResponse>(
			(msg) => msg instanceof ZnifferGetVersionResponse,
			1000,
		);

		return pick(res, ["chipType", "majorVersion", "minorVersion"]);
	}

	private async getFrequencies() {
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

	public async setFrequency(frequency: number): Promise<void> {
		const req = new ZnifferSetFrequencyRequest({ frequency });
		await this.serial?.writeAsync(req.serialize());
		await this.waitForMessage<ZnifferSetFrequencyResponse>(
			(msg) => msg instanceof ZnifferSetFrequencyResponse,
			1000,
		);
		this._currentFrequency = frequency;
	}

	private async getFrequencyInfo(frequency: number) {
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

	/** Starts the capture and discards all previously captured frames */
	public async start(): Promise<void> {
		if (this.wasDestroyed) {
			throw new ZWaveError(
				"The Zniffer is not ready or has been destroyed",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		if (this._active) return;
		this._capturedFrames = [];
		this._active = true;

		const req = new ZnifferStartRequest();
		await this.serial?.writeAsync(req.serialize());
		await this.waitForMessage<ZnifferStartResponse>(
			(msg) => msg instanceof ZnifferStartResponse,
			1000,
		);
	}

	public async stop(): Promise<void> {
		if (!this._active) return;
		this._active = false;

		if (!this.serial) return;

		const req = new ZnifferStopRequest();
		await this.serial?.writeAsync(req.serialize());
		await this.waitForMessage<ZnifferStopResponse>(
			(msg) => msg instanceof ZnifferStopResponse,
			1000,
		);
	}

	private async setBaudrate(baudrate: 0): Promise<void> {
		const req = new ZnifferSetBaudRateRequest({ baudrate });
		await this.serial?.writeAsync(req.serialize());
		await this.waitForMessage<ZnifferSetBaudRateResponse>(
			(msg) => msg instanceof ZnifferSetBaudRateResponse,
			1000,
		);
	}

	private getSecurityManagers(
		sourceNodeId: number,
	) {
		if (this.securityManagers.has(sourceNodeId)) {
			return this.securityManagers.get(sourceNodeId)!;
		}
		// Initialize security
		// Set up the S0 security manager. We can only do that after the controller
		// interview because we need to know the controller node id.
		const S0Key = this._options.securityKeys?.S0_Legacy;
		let securityManager: SecurityManager | undefined;
		if (S0Key) {
			// this.znifferLog.print(
			// 	"Network key for S0 configured, enabling S0 security manager...",
			// );
			securityManager = new SecurityManager({
				networkKey: S0Key,
				// FIXME: Track nonces separately for each destination node
				ownNodeId: sourceNodeId,
				nonceTimeout: Number.POSITIVE_INFINITY,
			});
			// } else {
			// 	this.znifferLog.print(
			// 		"No network key for S0 configured, cannot decrypt communication from secure (S0) devices!",
			// 		"warn",
			// 	);
		}

		let securityManager2: SecurityManager2 | undefined;
		if (
			this._options.securityKeys
			// Only set it up if we have security keys for at least one S2 security class
			&& Object.keys(this._options.securityKeys).some(
				(key) =>
					key.startsWith("S2_")
					&& key in SecurityClass
					&& securityClassIsS2((SecurityClass as any)[key]),
			)
		) {
			// this.znifferLog.print(
			// 	"At least one network key for S2 configured, enabling S2 security manager...",
			// );
			securityManager2 = new SecurityManager2();
			// Small hack: Zniffer does not care about S2 duplicates
			securityManager2.isDuplicateSinglecast = () => false;

			// Set up all keys
			for (
				const secClass of [
					"S2_Unauthenticated",
					"S2_Authenticated",
					"S2_AccessControl",
					"S0_Legacy",
				] as const
			) {
				const key = this._options.securityKeys[secClass];
				if (key) {
					securityManager2.setKey(SecurityClass[secClass], key);
				}
			}
			// } else {
			// 	this.znifferLog.print(
			// 		"No network key for S2 configured, cannot decrypt communication from secure (S2) devices!",
			// 		"warn",
			// 	);
		}

		let securityManagerLR: SecurityManager2 | undefined;
		if (
			this._options.securityKeysLongRange?.S2_AccessControl
			|| this._options.securityKeysLongRange?.S2_Authenticated
		) {
			// this.znifferLog.print(
			// 	"At least one network key for Z-Wave Long Range configured, enabling security manager...",
			// );
			securityManagerLR = new SecurityManager2();
			// Small hack: Zniffer does not care about S2 duplicates
			securityManagerLR.isDuplicateSinglecast = () => false;

			// Set up all keys
			if (this._options.securityKeysLongRange?.S2_AccessControl) {
				securityManagerLR.setKey(
					SecurityClass.S2_AccessControl,
					this._options.securityKeysLongRange.S2_AccessControl,
				);
			}
			if (this._options.securityKeysLongRange?.S2_Authenticated) {
				securityManagerLR.setKey(
					SecurityClass.S2_Authenticated,
					this._options.securityKeysLongRange.S2_Authenticated,
				);
			}
			// } else {
			// 	this.znifferLog.print(
			// 		"No network key for Z-Wave Long Range configured, cannot decrypt Long Range communication!",
			// 		"warn",
			// 	);
		}

		const ret = {
			securityManager,
			securityManager2,
			securityManagerLR,
		};
		this.securityManagers.set(sourceNodeId, ret);
		return ret;
	}

	/** Clears the list of captured frames */
	public clearCapturedFrames(): void {
		this._capturedFrames = [];
	}

	/**
	 * Get the captured frames in the official Zniffer application format.
	 * @param frameFilter Optional predicate function to filter the frames included in the capture
	 */
	public getCaptureAsZLFBuffer(
		frameFilter?: (frame: CapturedFrame) => boolean,
	): Buffer {
		// Mimics the current Zniffer software, without using features like sessions and comments
		const header = Buffer.alloc(2048, 0);
		header[0] = 0x68; // zniffer version
		header.writeUInt16BE(0x2312, 0x07fe); // checksum
		let filteredFrames = this._capturedFrames;
		if (frameFilter) {
			filteredFrames = filteredFrames.filter((f) =>
				// Always include Zniffer-protocol frames
				f.parsedFrame == undefined
				// Apply the filter to all other frames
				|| frameFilter({
					frameData: f.frameData,
					parsedFrame: f.parsedFrame,
					timestamp: f.timestamp,
				})
			);
		}
		return Buffer.concat([
			header,
			...filteredFrames.map(captureToZLFEntry),
		]);
	}

	/**
	 * Saves the captured frames in a `.zlf` file that can be read by the official Zniffer application.
	 * @param frameFilter Optional predicate function to filter the frames included in the capture
	 */
	public async saveCaptureToFile(
		filePath: string,
		frameFilter?: (frame: CapturedFrame) => boolean,
	): Promise<void> {
		await fs.writeFile(filePath, this.getCaptureAsZLFBuffer(frameFilter));
	}

	/**
	 * Terminates the Zniffer instance and closes the underlying serial connection.
	 * Must be called under any circumstances.
	 */
	public async destroy(): Promise<void> {
		// Ensure this is only called once and all subsequent calls block
		if (this._destroyPromise) return this._destroyPromise;
		this._destroyPromise = createDeferredPromise();

		this.znifferLog.print("Destroying Zniffer instance...");

		if (this._active) {
			await this.stop().catch(noop);
		}

		if (this.serial != undefined) {
			// Avoid spewing errors if the port was in the middle of receiving something
			this.serial.removeAllListeners();
			if (this.serial.isOpen) await this.serial.close();
			this.serial = undefined;
		}

		this.znifferLog.print("Zniffer instance destroyed");

		// destroy loggers as the very last thing
		this._logContainer.destroy();

		this._destroyPromise.resolve();
	}
}

function captureToZLFEntry(
	capture: CapturedData,
): Buffer {
	const buffer = Buffer.alloc(14 + capture.rawData.length, 0);
	// Convert the date to a .NET datetime
	let ticks = BigInt(capture.timestamp.getTime()) * 10000n
		+ 621355968000000000n;
	ticks = ticks | 4000000000000000n; // marks the time as .NET DateTimeKind.Local

	buffer.writeBigUInt64LE(ticks, 0);
	const direction = 0b0000_0000; // inbound, outbound would be 0b1000_0000

	buffer[8] = direction | 0x01; // dir + session ID
	buffer[9] = capture.rawData.length;
	// bytes 10-12 are empty
	capture.rawData.copy(buffer, 13);
	buffer[buffer.length - 1] = 0xfe; // end of frame
	return buffer;
}
