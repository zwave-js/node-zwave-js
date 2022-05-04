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
					new Promise((resolve, reject) => {
						// eslint-disable-next-line prefer-const
						let removeListeners: () => void;

						const onClose = (hadError: boolean) => {
							// detect socket disconnection errors
							if (hadError) {
								removeListeners();
								this.emit(
									"error",
									new ZWaveError(
										`The socket closed unexpectedly!`,
										ZWaveErrorCodes.Driver_Failed,
									),
								);
							}
						};

						const onError = (err: Error) => {
							removeListeners();
							reject(err);
						};
						const onConnect = () => {
							serial.setKeepAlive(true, 2500);
							removeListeners();
							resolve();
						};

						// We need to remove the listeners again no matter which of the handlers is called
						// Otherwise this would cause an EventEmitter leak.
						// Hence this somewhat ugly construct
						removeListeners = () => {
							serial.removeListener("close", onClose);
							serial.removeListener("error", onError);
							serial.removeListener("connect", onConnect);
						};

						serial.once("close", onClose);
						serial.once("error", onError);
						serial.once("connect", onConnect);

						serial.connect(this.socketOptions);
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
