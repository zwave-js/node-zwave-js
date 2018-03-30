/// <reference types="node" />
import { EventEmitter } from "events";
import { Message } from "../message/Message";
import { ZWaveController } from "./Controller";
export interface ZWaveOptions {
    timeouts: {
        /** how long to wait for an ACK */
        ack: number;
        /** not sure */
        byte: number;
    };
}
export declare type DeepPartial<T> = {
    [P in keyof T]: Partial<T[P]>;
};
export declare class Driver extends EventEmitter {
    private port;
    /** @internal */
    options: DeepPartial<ZWaveOptions>;
    /** The serial port instance */
    private serial;
    /** A buffer of received but unprocessed data */
    private receiveBuffer;
    /** The currently pending request */
    private currentTransaction;
    private sendQueue;
    private _controller;
    readonly controller: ZWaveController;
    constructor(port: string, 
        /** @internal */
        options?: DeepPartial<ZWaveOptions>);
    private _wasStarted;
    private _isOpen;
    /** Start the driver */
    start(): Promise<void>;
    private beginInterview();
    private reset();
    private _wasDestroyed;
    private ensureReady();
    private _cleanupHandler;
    /**
     * Terminates the driver instance and closes the underlying serial connection.
     * Must be called under any circumstances.
     */
    destroy(): void;
    private serialport_onError(err);
    private onInvalidData();
    private serialport_onData(data);
    private handleResponse(msg);
    private handleRequest(msg);
    private handleACK();
    private handleNAK();
    private handleCAN();
    /** Sends a message to the Z-Wave stick */
    sendMessage<TResponse extends Message = Message>(msg: Message, supportCheck?: "loud" | "silent" | "none"): Promise<TResponse>;
    /**
     * Queues a message for sending
     * @param message The message to send
     * @param highPriority Whether the message should be prioritized
     */
    private send(data, priority?);
    private sendQueueTimer;
    private workOffSendQueue();
    private doSend(data);
}
