import { ZWaveError, ZWaveErrorCodes, ZWaveLogContainer } from "@zwave-js/core";
import * as net from "net";
import { ZWaveSerialPortBase } from "./ZWaveSerialPortBase";

export type ZWaveSocketOptions =
	| Omit<net.TcpSocketConnectOpts, "onread">
	| Omit<net.IpcSocketConnectOpts, "onread">;

/** A version of the Z-Wave serial binding that works using a socket (TCP or IPC) */
export class ZWaveSocket extends ZWaveSerialPortBase {
	constructor(
		private socketOptions: ZWaveSocketOptions,
		loggers: ZWaveLogContainer,
	) {
		super(
			{
				create: () => new net.Socket(),
				open: (serial: net.Socket) =>
					new Promise((resolve) => {
						serial.on("close", () => {
							if (this.isOpen) {
								this.emit(
									"error",
									new ZWaveError(
										`The socket closed unexpectedly!`,
										ZWaveErrorCodes.Driver_Failed,
									),
								);
							}
						});
						serial.connect(this.socketOptions, () => {
							serial.setKeepAlive(true, 2500);
							resolve();
						});
					}),
				close: (serial: net.Socket) =>
					new Promise((resolve) => {
						if (serial.destroyed) {
							resolve();
						} else {
							serial.once("close", () => resolve()).destroy();
						}
					}),
			},
			loggers,
		);
	}
}
