import * as net from "net";
import { ZWaveSerialPortBase } from "./ZWaveSerialPortBase";

export type ZWaveSocketOptions =
	| Omit<net.TcpSocketConnectOpts, "onread">
	| Omit<net.IpcSocketConnectOpts, "onread">;

/** A version of the Z-Wave serial binding that works using a socket (TCP or IPC) */
export class ZWaveSocket extends ZWaveSerialPortBase {
	constructor(private socketOptions: ZWaveSocketOptions) {
		super({
			create: () => new net.Socket(),
			open: (serial: net.Socket) =>
				new Promise((resolve) => {
					serial.connect(this.socketOptions, () => resolve());
				}),
			close: (serial: net.Socket) =>
				new Promise((resolve) => {
					serial.once("close", () => resolve()).destroy();
				}),
		});
	}
}
