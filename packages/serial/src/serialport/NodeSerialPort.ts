import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { type UnderlyingSink, type UnderlyingSource } from "node:stream/web";
import { SerialPort } from "serialport";
import { type DisconnectError } from "./DisconnectError.js";
import { type ZWaveSerialBindingFactory } from "./ZWaveSerialStream.js";

/** The default version of the Z-Wave serial binding factory that works using node-serialport */
export function createNodeSerialPortFactory(
	port: string,
	Binding: typeof SerialPort = SerialPort,
): ZWaveSerialBindingFactory {
	return async function() {
		const serial = new Binding({
			path: port,
			autoOpen: false,
			baudRate: 115200,
			dataBits: 8,
			stopBits: 1,
			parity: "none",
		});

		let isOpen = serial.isOpen;

		function removeListeners() {
			serial.removeAllListeners("close");
			serial.removeAllListeners("error");
			serial.removeAllListeners("open");
		}

		async function close(): Promise<void> {
			if (!isOpen) return;
			isOpen = false;

			return new Promise((resolve) => {
				removeListeners();
				serial.once("close", resolve);
				serial.close();
			});
		}

		function open(): Promise<void> {
			return new Promise<void>((resolve, reject) => {
				const onClose = () => {
					removeListeners();
					reject(
						new ZWaveError(
							`The serial port closed unexpectedly!`,
							ZWaveErrorCodes.Driver_Failed,
						),
					);
				};
				const onError = (err: Error) => {
					removeListeners();
					reject(err);
				};
				const onOpen = () => {
					removeListeners();
					isOpen = true;
					resolve();
				};

				serial.once("close", onClose);
				serial.once("error", onError);
				serial.once("open", onOpen);

				serial.open();
			});
		}

		await close();
		await open();

		// Once the serialport is opened, wrap it as web streams.
		// This could be done in the start method of the sink, but handling async errors is a pain there.

		const sink: UnderlyingSink<Uint8Array> = {
			start(controller) {
				serial.on("error", (err) => controller.error(err));
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
				// Abort source controller too if the serial port closes
				serial.on("close", (err?: DisconnectError) => {
					if (err?.disconnected === true) {
						isOpen = false;
						controller.error(
							new ZWaveError(
								`The serial port closed unexpectedly!`,
								ZWaveErrorCodes.Driver_Failed,
							),
						);
					}
				});
			},
			cancel() {
				serial.removeAllListeners();
			},
		};

		return { source, sink };
	};
}
