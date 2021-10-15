import { ZWaveError, ZWaveErrorCodes, ZWaveLogContainer } from "@zwave-js/core";
import type SerialPort from "serialport";
import { ZWaveSerialPortBase } from "./ZWaveSerialPortBase";

interface DisconnectError extends Error {
	disconnected: boolean;
}

/** The default version of the Z-Wave serial binding that works using node-serialport */
export class ZWaveSerialPort extends ZWaveSerialPortBase {
	constructor(port: string, loggers: ZWaveLogContainer);
	/** @internal */ constructor(
		port: string,
		loggers: ZWaveLogContainer,
		Binding: typeof SerialPort,
	);
	constructor(
		port: string,
		loggers: ZWaveLogContainer,
		Binding: typeof SerialPort = require("serialport"),
	) {
		super(
			{
				create: () =>
					new Binding(port, {
						autoOpen: false,
						baudRate: 115200,
						dataBits: 8,
						stopBits: 1,
						parity: "none",
					}),
				open: (serial: SerialPort) =>
					new Promise((resolve, reject) => {
						// detect serial disconnection errors
						serial.once("close", (err?: DisconnectError) => {
							if (err?.disconnected === true) {
								this.emit(
									"error",
									new ZWaveError(
										`The serial port closed unexpectedly!`,
										ZWaveErrorCodes.Driver_Failed,
									),
								);
							}
						});
						serial.once("error", reject);
						serial.once("open", resolve).open();
					}),
				close: (serial: SerialPort) =>
					new Promise((resolve) => {
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
