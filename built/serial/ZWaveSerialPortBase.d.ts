/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { ZWaveLogContainer } from "@zwave-js/core";
import { EventEmitter } from "events";
import { Duplex, PassThrough } from "stream";
import { SerialLogger } from "./Logger";
import { MessageHeaders } from "./MessageHeaders";
import { BootloaderChunk } from "./parsers/BootloaderParsers";
export type ZWaveSerialChunk = MessageHeaders.ACK | MessageHeaders.NAK | MessageHeaders.CAN | Buffer;
export declare enum ZWaveSerialMode {
    SerialAPI = 0,
    Bootloader = 1
}
export interface ZWaveSerialPortEventCallbacks {
    error: (e: Error) => void;
    data: (data: ZWaveSerialChunk) => void;
    discardedData: (data: Buffer) => void;
    bootloaderData: (data: BootloaderChunk) => void;
}
export type ZWaveSerialPortEvents = Extract<keyof ZWaveSerialPortEventCallbacks, string>;
export interface ZWaveSerialPortBase {
    on<TEvent extends ZWaveSerialPortEvents>(event: TEvent, callback: ZWaveSerialPortEventCallbacks[TEvent]): this;
    addListener<TEvent extends ZWaveSerialPortEvents>(event: TEvent, callback: ZWaveSerialPortEventCallbacks[TEvent]): this;
    once<TEvent extends ZWaveSerialPortEvents>(event: TEvent, callback: ZWaveSerialPortEventCallbacks[TEvent]): this;
    off<TEvent extends ZWaveSerialPortEvents>(event: TEvent, callback: ZWaveSerialPortEventCallbacks[TEvent]): this;
    removeListener<TEvent extends ZWaveSerialPortEvents>(event: TEvent, callback: ZWaveSerialPortEventCallbacks[TEvent]): this;
    removeAllListeners(event?: ZWaveSerialPortEvents): this;
    emit<TEvent extends ZWaveSerialPortEvents>(event: TEvent, ...args: Parameters<ZWaveSerialPortEventCallbacks[TEvent]>): boolean;
}
export declare function isZWaveSerialPortImplementation(obj: unknown): obj is ZWaveSerialPortImplementation;
export interface ZWaveSerialPortImplementation {
    create(): Duplex & EventEmitter;
    open(port: ReturnType<ZWaveSerialPortImplementation["create"]>): Promise<void>;
    close(port: ReturnType<ZWaveSerialPortImplementation["create"]>): Promise<void>;
}
export declare class ZWaveSerialPortBase extends PassThrough {
    private implementation;
    protected serial: ReturnType<ZWaveSerialPortImplementation["create"]>;
    protected logger: SerialLogger;
    private parser;
    private bootloaderScreenParser;
    private bootloaderParser;
    mode: ZWaveSerialMode | undefined;
    [Symbol.asyncIterator]: () => AsyncIterableIterator<ZWaveSerialChunk>;
    constructor(implementation: ZWaveSerialPortImplementation, loggers: ZWaveLogContainer);
    open(): Promise<void>;
    close(): Promise<void>;
    private _isOpen;
    get isOpen(): boolean;
    writeAsync(data: Buffer): Promise<void>;
}
//# sourceMappingURL=ZWaveSerialPortBase.d.ts.map