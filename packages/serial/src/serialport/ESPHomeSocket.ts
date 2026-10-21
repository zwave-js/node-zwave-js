import net from "node:net";
import type { UnderlyingSink, UnderlyingSource } from "node:stream/web";

import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";

import { DisconnectRequest } from "../esphome/ConnectionMessages.js";
import {
	DeviceInfoRequest,
	DeviceInfoResponse,
} from "../esphome/DeviceInfoMessages.js";
import { type ESPHomeMessage } from "../esphome/ESPHomeMessage.js";
import { HelloRequest, HelloResponse } from "../esphome/HelloMessages.js";
import {
	ESPHomeZWaveProxyRequestType,
	ZWaveProxyFrame,
	ZWaveProxyRequest,
} from "../esphome/ZWaveProxyMessages.js";
import {
	type NoiseCipherState,
	NoiseHandshakeState,
	encodeNoiseFrame,
	parseServerHello,
} from "../esphome/noise/NoiseProtocol.js";
import { ESPHomeMessageParser } from "../esphome/parsers/ESPHomeMessageParser.js";
import { NoiseDecryptTransform } from "../esphome/parsers/NoiseDecryptTransform.js";
import { NoiseFrameParser } from "../esphome/parsers/NoiseFrameParser.js";

import type { ZWaveSerialBindingFactory } from "./ZWaveSerialStream.js";

export interface ESPHomeSocketOptions {
	/** The hostname or IP address of the ESPHome device */
	host: string;
	/** The port number (default: 6053) */
	port?: number;
	/** Base64-encoded 32-byte encryption key. If provided, Noise encryption is used. */
	encryptionKey?: string;
}

export function createESPHomeFactory(
	options: ESPHomeSocketOptions,
): ZWaveSerialBindingFactory {
	return async function () {
		const socket = new net.Socket();
		const host = options.host;
		const port = options.port ?? 6053;
		const timeout = 5000;

		// Determine if we're using encryption
		const useEncryption = !!options.encryptionKey;
		let psk: Bytes | undefined;

		if (useEncryption) {
			psk = Bytes.from(options.encryptionKey!, "base64");
			if (psk.length !== 32) {
				throw new ZWaveError(
					`Invalid encryption key length: expected 32 bytes, got ${psk.length}`,
					ZWaveErrorCodes.Driver_InvalidOptions,
				);
			}
		}

		let deviceInfo: DeviceInfoResponse | undefined;
		let sourceController:
			| ReadableStreamDefaultController<BytesView>
			| undefined;
		let isOpen = false;

		// Noise protocol state (only used when encryption is enabled)
		let sendCipher: NoiseCipherState | undefined;

		function removeListeners() {
			socket.removeAllListeners("close");
			socket.removeAllListeners("error");
			socket.removeAllListeners("connect");
			socket.removeAllListeners("timeout");
			socket.removeAllListeners("data");
		}

		/**
		 * Send a raw Noise frame (during handshake)
		 */
		function sendNoiseFrame(payload: BytesView): Promise<void> {
			const frame = encodeNoiseFrame(payload);
			return new Promise((resolve, reject) => {
				socket.write(frame, (err) => {
					if (err) reject(err);
					else resolve();
				});
			});
		}

		/**
		 * Send an ESPHome message (encrypted or plaintext depending on mode)
		 */
		async function sendMessage(
			message:
				| HelloRequest
				| DeviceInfoRequest
				| DisconnectRequest
				| ZWaveProxyFrame
				| ZWaveProxyRequest,
		): Promise<void> {
			if (useEncryption) {
				if (!sendCipher) {
					throw new ZWaveError(
						"Cannot send encrypted message: handshake not complete",
						ZWaveErrorCodes.Driver_NotReady,
					);
				}

				// Subclasses populate `this.payload` in their serialize() override,
				// so we must call it before serializeForNoise() which reads `this.payload`.
				message.serialize();

				// Serialize for Noise transport and encrypt
				const messageData = message.serializeForNoise();
				const encrypted = await sendCipher.encryptWithAd(
					new Bytes(0),
					messageData,
				);

				await sendNoiseFrame(encrypted);
			} else {
				// Plaintext mode
				const frame = message.serialize();
				return new Promise((resolve, reject) => {
					socket.write(frame, (err) => {
						if (err) reject(err);
						else resolve();
					});
				});
			}
		}

		/**
		 * Perform the Noise protocol handshake using the provided frame reader
		 */
		async function performNoiseHandshake(
			frameReader: ReadableStreamDefaultReader<Bytes>,
		): Promise<NoiseCipherState> {
			// Helper to read a noise frame with timeout
			const readNoiseFrame = (timeoutMs: number) =>
				readWithTimeout(frameReader, timeoutMs);

			// Send empty ClientHello
			await sendNoiseFrame(new Bytes(0));

			// Wait for ServerHello
			const serverHelloPayload = await readNoiseFrame(timeout);
			const serverHello = parseServerHello(serverHelloPayload);
			if (serverHello.protocolVersion !== 0x01) {
				throw new ZWaveError(
					`Unsupported Noise protocol version: ${serverHello.protocolVersion}`,
					ZWaveErrorCodes.Driver_InvalidOptions,
				);
			}

			// Send handshake message 1 (prefixed with 0x00 success byte)
			const handshakeState = new NoiseHandshakeState(psk!);
			const handshakeMsg1 = await handshakeState.writeMessage(
				new Bytes(0),
			);
			await sendNoiseFrame(Bytes.concat([[0x00], handshakeMsg1]));

			// Wait for handshake message 2
			const handshakeMsg2Payload = await readNoiseFrame(timeout);

			if (handshakeMsg2Payload.length === 0) {
				throw new ZWaveError(
					"Noise handshake failed: empty response",
					ZWaveErrorCodes.Driver_SerialPortClosed,
				);
			}

			// Check status byte: 0x00 = success, 0x01 = error
			const statusByte = handshakeMsg2Payload[0];
			if (statusByte === 0x01) {
				const errorMessage = new TextDecoder().decode(
					handshakeMsg2Payload.subarray(1),
				);
				throw new ZWaveError(
					`Noise handshake failed: ${errorMessage}`,
					ZWaveErrorCodes.Driver_SerialPortClosed,
				);
			} else if (statusByte !== 0x00) {
				throw new ZWaveError(
					`Noise handshake failed: unexpected status byte 0x${statusByte
						.toString(16)
						.padStart(2, "0")}`,
					ZWaveErrorCodes.Driver_SerialPortClosed,
				);
			}

			// Process handshake message 2
			await handshakeState.readMessage(handshakeMsg2Payload.subarray(1));

			// Derive transport keys
			const { sendCipher: sc, receiveCipher: rc } =
				await handshakeState.split();
			sendCipher = sc;
			return rc;
		}

		async function performESPHomeHandshake(
			reader: ReadableStreamDefaultReader<ESPHomeMessage>,
		): Promise<void> {
			// Helper to read until we get a message of the expected type,
			// skipping any other messages that may arrive during handshake
			async function readExpected<T extends ESPHomeMessage>(
				expectedType: abstract new (...args: any[]) => T,
			): Promise<T> {
				while (true) {
					const message = await readWithTimeout(reader, timeout);
					if (message instanceof expectedType) {
						return message;
					}
					// Skip unexpected messages during handshake
				}
			}

			// Send HelloRequest
			const helloRequest = new HelloRequest({
				clientInfo: "zwave-js",
				apiVersionMajor: 1,
				apiVersionMinor: 0,
			});
			await sendMessage(helloRequest);

			// Wait for HelloResponse
			await readExpected(HelloResponse);

			// Send DeviceInfoRequest to check Z-Wave support
			const deviceInfoRequest = new DeviceInfoRequest();
			await sendMessage(deviceInfoRequest);

			// Wait for DeviceInfoResponse
			deviceInfo = await readExpected(DeviceInfoResponse);

			// Check if device supports Z-Wave proxy
			if (!deviceInfo.hasZWaveProxySupport) {
				throw new ZWaveError(
					"ESPHome device does not support Z-Wave proxy functionality",
					ZWaveErrorCodes.Driver_SerialPortClosed,
				);
			}

			// Subscribe to Z-Wave traffic
			const subscribeRequest = new ZWaveProxyRequest({
				type: ESPHomeZWaveProxyRequestType.Subscribe,
			});
			await sendMessage(subscribeRequest);
		}

		async function readWithTimeout<T>(
			reader: ReadableStreamDefaultReader<T>,
			timeoutMs: number,
		): Promise<T> {
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(
					() =>
						reject(
							new ZWaveError(
								`Timeout waiting for message`,
								ZWaveErrorCodes.Driver_SerialPortClosed,
							),
						),
					timeoutMs,
				);
			});

			const readPromise = reader.read().then(({ value, done }) => {
				if (done || value === undefined) {
					throw new ZWaveError(
						"Stream closed unexpectedly",
						ZWaveErrorCodes.Driver_SerialPortClosed,
					);
				}
				return value;
			});

			return Promise.race([readPromise, timeoutPromise]);
		}

		function processMessages(
			reader: ReadableStreamDefaultReader<ESPHomeMessage>,
		): void {
			// Start reading messages in the background
			void (async () => {
				try {
					// oxlint-disable-next-line no-unmodified-loop-condition
					while (isOpen) {
						const { value: message, done } = await reader.read();
						if (done) break;

						if (message instanceof ZWaveProxyFrame) {
							// Handle Z-Wave proxy frames returned from the device
							// This message may include full payloads or simple ACK/NAK/CAN responses
							if (sourceController) {
								sourceController.enqueue(message.data);
							}
						}
						// Other message types are ignored after handshake
					}
				} catch {
					// Stream closed or error - handled by socket events
				}
				// The receive pipeline also stops when a frame cannot be decrypted or its framing is invalid.
				// The connection is unusable then, so close it to surface the error to the driver.
				if (isOpen) socket.destroy();
			})();
		}

		// Connect and perform handshake
		await new Promise<void>((resolve, reject) => {
			const onClose = () => {
				removeListeners();
				socket.destroy();
				reject(
					new ZWaveError(
						`ESPHome connection closed unexpectedly!`,
						ZWaveErrorCodes.Driver_SerialPortClosed,
					),
				);
			};

			const onError = (err: Error) => {
				removeListeners();
				socket.destroy();
				reject(err);
			};

			const onTimeout = () => {
				removeListeners();
				socket.destroy();
				reject(
					new ZWaveError(
						`Connection timed out after ${timeout}ms`,
						ZWaveErrorCodes.Driver_SerialPortClosed,
					),
				);
			};

			const onConnect = async () => {
				removeListeners();

				// During testing, values below 1000 caused the keep alive functionality to silently fail
				socket.setKeepAlive(true, 1000);
				// Prevent communication delays
				socket.setNoDelay();

				// FIXME: We should set the SO_RCVBUF to 2 MB or so
				// like aioesphome does, but Node.js does not expose
				// a way to do that natively.
				// https://github.com/derhuerst/node-sockopt might help.

				try {
					// Create a ReadableStream from socket data
					const socketReadable = new ReadableStream<BytesView>({
						start(controller) {
							socket.on("data", (data: Buffer) => {
								controller.enqueue(new Bytes(data));
							});
							socket.on("close", () => {
								try {
									controller.close();
								} catch {
									// Controller may already be closed
								}
							});
							socket.on("error", (e) => {
								try {
									controller.error(e);
								} catch {
									// Controller may already be errored
								}
							});
						},
					});

					// Build the appropriate pipeline based on encryption mode
					let parserReadable: ReadableStream<ESPHomeMessage>;
					let receiveCipher: NoiseCipherState | undefined;

					if (useEncryption) {
						// Encrypted: socket → NoiseFrameParser → [handshake] → NoiseDecryptTransform → ESPHomeMessageParser
						const frameParser = new NoiseFrameParser();
						const noiseFramesStream =
							socketReadable.pipeThrough(frameParser);

						// Get a reader for the Noise handshake
						const frameReader = noiseFramesStream.getReader();

						// Perform Noise handshake using the stream
						receiveCipher =
							await performNoiseHandshake(frameReader);

						// Release the reader so we can continue piping
						frameReader.releaseLock();

						// Continue the pipeline with decryption and message parsing
						const decryptTransform = new NoiseDecryptTransform(
							receiveCipher,
						);
						const messageParser = new ESPHomeMessageParser({
							noiseMode: true,
						});

						parserReadable = noiseFramesStream
							.pipeThrough(decryptTransform)
							.pipeThrough(messageParser);
					} else {
						// Plaintext: socket → ESPHomeMessageParser
						const messageParser = new ESPHomeMessageParser();
						parserReadable =
							socketReadable.pipeThrough(messageParser);
					}

					const reader = parserReadable.getReader();

					// Perform ESPHome handshake
					await performESPHomeHandshake(reader);
					isOpen = true;

					// Start processing messages in the background
					processMessages(reader);

					resolve();
				} catch (error) {
					socket.destroy();
					reject(
						error instanceof Error
							? error
							: new Error(String(error)),
					);
				}
			};

			socket.setTimeout(timeout);
			socket.once("close", onClose);
			socket.once("error", onError);
			socket.once("timeout", onTimeout);
			socket.once("connect", onConnect);

			socket.connect(port, host);
		});

		async function close(): Promise<void> {
			try {
				// Send disconnect request if connected
				if (isOpen) {
					const disconnectRequest = new DisconnectRequest();
					await sendMessage(disconnectRequest);
				}
			} catch {
				// Ignore errors during disconnect
			}

			return new Promise((resolve) => {
				removeListeners();
				isOpen = false;
				if (socket.destroyed) {
					resolve();
				} else {
					socket.once("close", () => resolve()).destroy();
				}
			});
		}

		const sink: UnderlyingSink<BytesView> = {
			async write(data, controller) {
				if (!isOpen) {
					controller.error(
						new Error("ESPHome connection is not ready!"),
					);
					return;
				}

				if (!deviceInfo?.hasZWaveProxySupport) {
					controller.error(
						new Error("Z-Wave proxy support not available!"),
					);
					return;
				}

				try {
					// Create Z-Wave proxy write request with Bytes data
					const writeRequest = new ZWaveProxyFrame({
						data: new Bytes(data),
					});

					// Send the Z-Wave proxy write request
					await sendMessage(writeRequest);
				} catch (error) {
					controller.error(error);
				}
			},
			close() {
				return close();
			},
			abort(_reason) {
				return close();
			},
		};

		const source: UnderlyingSource<BytesView> = {
			start(controller) {
				// Store the controller so we can enqueue data when needed
				sourceController = controller;

				// Handle ESPHome connection events
				socket.on("close", () => {
					isOpen = false;
					controller.error(
						new ZWaveError(
							`ESPHome connection closed unexpectedly!`,
							ZWaveErrorCodes.Driver_SerialPortClosed,
						),
					);
				});

				socket.on("error", (_e) => {
					isOpen = false;
					controller.error(
						new ZWaveError(
							`ESPHome connection error!`,
							ZWaveErrorCodes.Driver_SerialPortClosed,
						),
					);
				});
			},
			cancel() {
				sourceController = undefined;
				socket.removeAllListeners();
			},
		};

		return { source, sink };
	};
}
