/* eslint-disable @typescript-eslint/no-deprecated */
import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { type UnderlyingSink, type UnderlyingSource } from "node:stream/web";
import { type ZWaveSerialPortImplementation } from "./ZWaveSerialPortImplementation.js";
import { type ZWaveSerialBindingFactory } from "./ZWaveSerialStream.js";

export function wrapLegacySerialBinding(
	legacy: ZWaveSerialPortImplementation,
): ZWaveSerialBindingFactory {
	return async function() {
		const instance = legacy.create();

		await legacy.open(instance);
		let isOpen = true;

		async function close(): Promise<void> {
			if (isOpen) {
				await legacy.close(instance);
			}
		}

		const sink: UnderlyingSink<Uint8Array> = {
			start(controller) {
				instance.on("error", (err) => controller.error(err));
			},
			write(data, controller) {
				if (!isOpen) {
					controller.error(new Error("The serial port is not open!"));
				}

				return new Promise((resolve, reject) => {
					instance.write(data, (err) => {
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
				instance.on("data", (data) => controller.enqueue(data));
				// Abort source controller too if the serial port closes
				instance.on("close", () => {
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
				instance.removeAllListeners();
			},
		};

		return { source, sink };
	};
}
