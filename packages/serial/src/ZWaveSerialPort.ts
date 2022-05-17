import { ZWaveError, ZWaveErrorCodes, ZWaveLogContainer } from "@zwave-js/core";
import { SerialPort } from "serialport";
import { ZWaveSerialPortBase } from "./ZWaveSerialPortBase";

interface DisconnectError extends Error {
	disconnected: boolean;
}

/** The default version of the Z-Wave serial binding that works using node-serialport */
export class ZWaveSerialPort extends ZWaveSerialPortBase {
	constructor(
		port: string,
		loggers: ZWaveLogContainer,
		Binding: typeof SerialPort = SerialPort,
	) {
		let removeListeners: (removeOnClose: boolean) => void;

		super(
			{
				create: () =>
					new Binding({
						path: port,
						autoOpen: false,
						baudRate: 115200,
						dataBits: 8,
						stopBits: 1,
						parity: "none",
					}),
				open: (serial: SerialPort) =>
					new Promise((resolve, reject) => {
						const onClose = (err?: DisconnectError) => {
							// detect serial disconnection errors
							if (err?.disconnected === true) {
								removeListeners(true);
								this.emit(
									"error",
									new ZWaveError(
										`The serial port closed unexpectedly!`,
										ZWaveErrorCodes.Driver_Failed,
									),
								);
							}
						};
						const onError = (err: Error) => {
							removeListeners(true);
							reject(err);
						};
						const onOpen = () => {
							removeListeners(false);
							resolve();
						};

						// We need to remove the listeners again no matter which of the handlers is called
						// Otherwise this would cause an EventEmitter leak.
						// Hence this somewhat ugly construct
						removeListeners = (removeOnClose: boolean) => {
							if (removeOnClose)
								serial.removeListener("close", onClose);
							serial.removeListener("error", onError);
							serial.removeListener("open", onOpen);
						};

						serial.once("close", onClose);
						serial.once("error", onError);
						serial.once("open", onOpen).open();
					}),
				close: (serial: SerialPort) =>
					new Promise((resolve) => {
						removeListeners(true);
						serial.once("close", resolve).close();
					}),
			},
			loggers,
		);
	}

	public get isOpen(): boolean {
		return (this.serial as SerialPort).isOpen;
	}
}
