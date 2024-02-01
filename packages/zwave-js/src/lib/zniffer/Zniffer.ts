import {
	CommandClass,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
	SecurityCCNonceReport,
} from "@zwave-js/cc";
import {
	CommandClasses,
	type LogConfig,
	SPANState,
	SecurityClass,
	SecurityManager,
	SecurityManager2,
	type UnknownZWaveChipType,
	ZWaveError,
	ZWaveErrorCodes,
	ZWaveLogContainer,
	ZnifferRegion,
	getChipTypeAndVersion,
	isLongRangeNodeId,
	securityClassIsS2,
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
import {
	TypedEventEmitter,
	getEnumMemberName,
	num2hex,
	pick,
} from "@zwave-js/shared";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { type ZWaveOptions } from "../driver/ZWaveOptions";
import { ZnifferLogger } from "../log/Zniffer";
import { ZnifferCCParsingContext } from "./CCParsingContext";
import { type Frame, MPDUHeaderType, mpduToFrame, parseMPDU } from "./MPDU";

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
	frame: (frame: Frame) => void;
}

export type ZnifferEvents = Extract<keyof ZnifferEventCallbacks, string>;

interface AwaitedThing<T> {
	handler: (thing: T) => void;
	timeout?: NodeJS.Timeout;
	predicate: (msg: T) => boolean;
}

type AwaitedMessageEntry = AwaitedThing<ZnifferMessage>;

export interface ZnifferOptions {
	logConfig?: Partial<LogConfig>;
	securityKeys?: ZWaveOptions["securityKeys"];
	securityKeysLongRange?: ZWaveOptions["securityKeysLongRange"];
	/**
	 * The RSSI values reported by the Zniffer are not actual RSSI values.
	 * They can be converted to dBm, but the conversion is chip dependent and not documented for 700/800 series Zniffers.
	 *
	 * Set this option to `true` enable the conversion. Otherwise the raw values from the Zniffer will be used.
	 */
	convertRSSI?: boolean;
}

function tryConvertRSSI(
	rssi: number,
	chipType: string | UnknownZWaveChipType,
): number {
	if (typeof chipType !== "string") return rssi; // no idea how to convert
	const chipTypeNumeric = getChipTypeAndVersion(chipType);
	if (!chipTypeNumeric) return rssi; // no idea how to convert

	switch (chipTypeNumeric.type) {
		// For 400/500 series, the conversion is documented in the Zniffer user guide
		case 0x04:
		case 0x05:
			return rssi * 1.5 - 153.5;
		case 0x07:
		case 0x08:
			// Reverse-engineered from the Zniffer firmware
			return rssi * 4 - 256;
	}

	return rssi;
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
	}

	private _options: ZnifferOptions;

	/** The serial port instance */
	private serial: ZnifferSerialPortBase | undefined;

	private _chipType: string | UnknownZWaveChipType | undefined;

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

	public async init(): Promise<void> {
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
		if (freqs.currentFrequency !== ZnifferRegion["USA (Long Range)"]) {
			await this.setFrequency(ZnifferRegion["USA (Long Range)"]);
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
			this.handleDataMessage(msg as ZnifferDataMessage);
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
	private handleDataMessage(msg: ZnifferDataMessage): void {
		try {
			const mpdu = parseMPDU(msg);

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

				const ctx = new ZnifferCCParsingContext(
					destNodeId,
					mpdu.homeId,
					destSecurityManager,
					destSecurityManager2,
					destSecurityManagerLR,
				);
				try {
					cc = CommandClass.from(ctx, {
						data: mpdu.payload,
						fromEncapsulation: false,
						nodeId: mpdu.sourceNodeId,
					});
				} catch (e: any) {
					// Ignore
					console.error(e.stack);
				}
			}

			if (this._options.convertRSSI && this._chipType) {
				mpdu.frameInfo.rssi = tryConvertRSSI(
					mpdu.frameInfo.rssiRaw,
					this._chipType,
				);
			}

			this.znifferLog.mpdu(mpdu, cc);

			// Emit the captured frame in a format that's easier to work with for applications.
			const frame = mpduToFrame(mpdu, cc);
			this.emit("frame", frame);

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
}
