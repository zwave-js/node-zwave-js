/// <reference types="node" />
import { EventEmitter } from "events";
import { CommandClasses } from "../commandclass/CommandClasses";
import { ZWaveController } from "../controller/Controller";
import { SendDataRequest } from "../controller/SendDataMessages";
import { FunctionType, MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import { IDriver } from "./IDriver";
export interface ZWaveOptions {
    timeouts: {
        /** how long to wait for an ACK */
        ack: number;
        /** not sure */
        byte: number;
    };
}
export declare type DeepPartial<T> = {
    [P in keyof T]+?: DeepPartial<T[P]>;
};
export declare type MessageSupportCheck = "loud" | "silent" | "none";
export declare type RequestHandler<T extends Message = Message> = (msg: T) => boolean;
export declare class Driver extends EventEmitter implements IDriver {
    private port;
    /** The serial port instance */
    private serial;
    /** A buffer of received but unprocessed data */
    private receiveBuffer;
    /** The currently pending request */
    private currentTransaction;
    private sendQueue;
    /** A map of handlers for all sorts of requests */
    private requestHandlers;
    /** A map of handlers specifically for send data requests */
    private sendDataRequestHandlers;
    private cacheDir;
    private _controller;
    readonly controller: ZWaveController;
    constructor(port: string, 
    /** @internal */
    options?: DeepPartial<ZWaveOptions>);
    private _wasStarted;
    private _isOpen;
    /** Start the driver */
    start(): Promise<void>;
    private _controllerInterviewed;
    private initializeControllerAndNodes;
    private addNodeEventHandlers;
    private onNodeWakeUp;
    private onNodeSleep;
    private onNodeInterviewCompleted;
    private hasPendingMessages;
    /**
     * Finds the version of a given CC the given node supports. Returns 0 when the CC is not supported.
     */
    getSupportedCCVersionForNode(nodeId: number, cc: CommandClasses): number;
    getSafeCCVersionForNode(nodeId: number, cc: CommandClasses): number;
    /**
     * Performs a hard reset on the controller. This wipes out all configuration!
     */
    hardReset(): Promise<void>;
    /** Resets the IO layer */
    private resetIO;
    private _wasDestroyed;
    private ensureReady;
    private _cleanupHandler;
    /**
     * Terminates the driver instance and closes the underlying serial connection.
     * Must be called under any circumstances.
     */
    destroy(): void;
    private serialport_onError;
    private onInvalidData;
    private serialport_onData;
    private handleMessage;
    /**
     * Registers a handler for all kinds of request messages
     * @param fnType The function type to register the handler for
     * @param handler The request handler callback
     * @param oneTime Whether the handler should be removed after its first successful invocation
     */
    registerRequestHandler(fnType: FunctionType, handler: RequestHandler, oneTime?: boolean): void;
    /**
     * Unregisters a handler for all kinds of request messages
     * @param fnType The function type to unregister the handler for
     * @param handler The previously registered request handler callback
     */
    unregisterRequestHandler(fnType: FunctionType, handler: RequestHandler): void;
    /**
     * Registers a handler for SendData request messages
     * @param cc The command class to register the handler for
     * @param handler The request handler callback
     */
    registerSendDataRequestHandler(cc: CommandClasses, handler: RequestHandler<SendDataRequest>, oneTime?: boolean): void;
    /**
     * Unregisters a handler for SendData request messages
     * @param cc The command class to unregister the handler for
     * @param handler The previously registered request handler callback
     */
    unregisterSendDataRequestHandler(cc: CommandClasses, handler: RequestHandler<SendDataRequest>): void;
    private handleRequest;
    private handleACK;
    private handleNAK;
    private handleCAN;
    private mayRetryCurrentTransaction;
    /** Retries the current transaction and returns the calculated timeout */
    private retryCurrentTransaction;
    /**
     * Resolves the current transaction with the given value
     * and resumes the queue handling
     */
    private resolveCurrentTransaction;
    /**
     * Rejects the current transaction with the given value
     * and resumes the queue handling
     */
    private rejectCurrentTransaction;
    /**
     * Sends a message with default priority to the Z-Wave stick
     * @param msg The message to send
     * @param supportCheck How to check for the support of the message to send. If the message is not supported:
     * * "loud" means the call will throw
     * * "silent" means the call will resolve with `undefined`
     * * "none" means the message will be sent anyways. This is useful if the capabilities haven't been determined yet.
     * @param priority The priority of the message to send. If none is given, the defined default priority of the message
     * class will be used.
     */
    sendMessage<TResponse extends Message = Message>(msg: Message, priority?: MessagePriority): Promise<TResponse>;
    sendMessage<TResponse extends Message = Message>(msg: Message, supportCheck?: MessageSupportCheck): Promise<TResponse>;
    sendMessage<TResponse extends Message = Message>(msg: Message, priority: MessagePriority, supportCheck: MessageSupportCheck): Promise<TResponse>;
    /**
     * Sends a low-level message like ACK, NAK or CAN immediately
     * @param message The low-level message to send
     */
    private send;
    private sendQueueTimer;
    private workOffSendQueue;
    private retransmit;
    private doSend;
    /** Moves all messages for a given node into the wakeup queue */
    private moveMessagesToWakeupQueue;
    private sortSendQueue;
    private lastSaveToCache;
    private readonly saveToCacheInterval;
    private saveToCacheTimer;
    /**
     * Saves the current configuration and collected data about the controller and all nodes to a cache file.
     * For performance reasons, these calls may be throttled
     */
    saveNetworkToCache(): Promise<void>;
    /**
     * Restores a previously stored zwave network state from cache to speed up the startup process
     */
    restoreNetworkFromCache(): Promise<void>;
}
