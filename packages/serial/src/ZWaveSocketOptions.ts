import type * as net from "node:net";

export type ZWaveSocketOptions =
	| Omit<net.TcpSocketConnectOpts, "onread">
	| Omit<net.IpcSocketConnectOpts, "onread">;
