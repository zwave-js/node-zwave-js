/// <reference types="node" />
import { ZWaveLogContainer } from "@zwave-js/core";
import * as net from "net";
import { ZWaveSerialPortBase } from "./ZWaveSerialPortBase";
export type ZWaveSocketOptions = Omit<net.TcpSocketConnectOpts, "onread"> | Omit<net.IpcSocketConnectOpts, "onread">;
/** A version of the Z-Wave serial binding that works using a socket (TCP or IPC) */
export declare class ZWaveSocket extends ZWaveSerialPortBase {
    private socketOptions;
    constructor(socketOptions: ZWaveSocketOptions, loggers: ZWaveLogContainer);
}
//# sourceMappingURL=ZWaveSocket.d.ts.map