import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { type UnderlyingSink, type UnderlyingSource } from "node:stream/web";
import { SerialPort } from "serialport";
import { type DisconnectError } from "./DisconnectError.js";
import { type ZWaveSerialBinding } from "./ZWaveSerialStream.js";

/** The default version of the Z-Wave serial binding that works using node-serialport */
export function createNodeSerialPortBinding(
	port: string,
	Binding: typeof SerialPort = SerialPort,
): ZWaveSerialBinding {
	const serial = new Binding({
		path: port,
		autoOpen: false,
		baudRate: 115200,
		dataBits: 8,
		stopBits: 1,
		parity: "none",
	});

	let removeListeners: (removeOnClose: boolean) => void;
	let isOpen = serial.isOpen;

	async function close(): Promise<void> {
		if (!isOpen) return;
		isOpen = false;

		return new Promise((resolve) => {
			removeListeners(true);
			serial.once("close", resolve);
			serial.close();
		});
	}

	// The sink is opened first, so we set up the serial port there
	const sink: UnderlyingSink<Uint8Array> = {
		async start(controller) {
			await close();

			return new Promise<void>((resolve, reject) => {
				const onClose = (err?: DisconnectError) => {
					// detect serial disconnection errors
					if (err?.disconnected === true) {
						removeListeners(true);
						const error = new ZWaveError(
							`The serial port closed unexpectedly!`,
							ZWaveErrorCodes.Driver_Failed,
						);
						if (isOpen) {
							controller.error(error);
						} else {
							reject(error);
						}
					}
				};
				const onError = (err: Error) => {
					removeListeners(true);
					// controller.error(err);
					reject(err);
				};
				const onOpen = () => {
					removeListeners(false);
					isOpen = true;
					resolve();
				};

				// We need to remove the listeners again no matter which of the handlers is called
				// Otherwise this would cause an EventEmitter leak.
				// Hence this somewhat ugly construct
				removeListeners = (removeOnClose: boolean) => {
					if (removeOnClose) {
						serial.removeListener("close", onClose);
					}
					serial.removeListener("error", onError);
					serial.removeListener("open", onOpen);
				};

				serial.once("close", onClose);
				serial.once("error", onError);
				serial.once("open", onOpen);

				serial.open();
			});
		},
		write(data, controller) {
			if (!isOpen) {
				controller.error(new Error("The serial port is not open!"));
			}

			return new Promise((resolve, reject) => {
				serial.write(data, (err) => {
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
			serial.on("data", (data) => controller.enqueue(data));
		},
		cancel() {
			serial.removeAllListeners("data");
		},
	};

	return { source, sink };
}
