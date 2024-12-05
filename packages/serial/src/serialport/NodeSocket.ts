import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import net from "node:net";
import { type UnderlyingSink, type UnderlyingSource } from "node:stream/web";
import { type ZWaveSerialBindingFactory } from "./ZWaveSerialStream.js";
import { type ZWaveSocketOptions } from "./ZWaveSocketOptions.js";

export function createNodeSocketFactory(
	socketOptions: ZWaveSocketOptions,
): ZWaveSerialBindingFactory {
	return async function() {
		const socket = new net.Socket();

		function removeListeners() {
			socket.removeAllListeners("close");
			socket.removeAllListeners("error");
			socket.removeAllListeners("open");
		}

		function open(): Promise<void> {
			return new Promise((resolve, reject) => {
				const onClose = () => {
					// detect socket disconnection errors
					reject(
						new ZWaveError(
							`The socket closed unexpectedly!`,
							ZWaveErrorCodes.Driver_Failed,
						),
					);
				};

				const onError = (err: Error) => {
					removeListeners();
					reject(err);
				};
				const onConnect = () => {
					socket.setKeepAlive(true, 2500);
					removeListeners();
					resolve();
				};

				socket.once("close", onClose);
				socket.once("error", onError);
				socket.once("connect", onConnect);

				socket.connect(socketOptions);
			});
		}

		function close(): Promise<void> {
			return new Promise((resolve) => {
				removeListeners();
				if (socket.destroyed) {
					resolve();
				} else {
					socket.once("close", () => resolve()).destroy();
				}
			});
		}

		await open();
		let isOpen = true;

		// Once the socket is opened, wrap it as web streams.
		// This could be done in the start method of the sink, but handling async errors is a pain there.

		const sink: UnderlyingSink<Uint8Array> = {
			start(controller) {
				socket.on("error", (err) => controller.error(err));
			},
			write(data, controller) {
				if (!isOpen) {
					controller.error(new Error("The serial port is not open!"));
				}

				return new Promise((resolve, reject) => {
					socket.write(data, (err) => {
						if (err) reject(err);
						else resolve();
					});
				});
			},
			close() {
				return close();
			},
			abort(_reason) {
				return close();
			},
		};

		const source: UnderlyingSource<Uint8Array> = {
			start(controller) {
				socket.on("data", (data) => controller.enqueue(data));
				// Abort source controller too if the serial port closes
				socket.on("close", () => {
					isOpen = false;
					controller.error(
						new ZWaveError(
							`The serial port closed unexpectedly!`,
							ZWaveErrorCodes.Driver_Failed,
						),
					);
				});
			},
			cancel() {
				socket.removeAllListeners();
			},
		};

		return { source, sink };
	};
}
