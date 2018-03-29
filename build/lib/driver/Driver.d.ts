/// <reference types="node" />
import { EventEmitter } from "events";
import { Message } from "../message/Message";
export declare type ZWaveOptions = Partial<{
    empty: never;
}>;
export declare class Driver extends EventEmitter {
    private port;
    private options;
    /** The serial port instance */
    private serial;
    /** A buffer of received but unprocessed data */
    private receiveBuffer;
    /** The currently pending request */
    private currentTransaction;
    private sendQueue;
    constructor(port: string, options?: ZWaveOptions);
    private _wasStarted;
    private _isOpen;
    /** Start the driver */
    start(): Promise<void>;
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
    sendMessage(msg: Message): Promise<Message>;
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
