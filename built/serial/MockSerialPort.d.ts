/// <reference types="node" />
import { ZWaveLogContainer } from "@zwave-js/core";
import sinon from "sinon";
import { MockPortBinding as SerialPortMockPortBinding } from "./SerialPortBindingMock";
import { ZWaveSerialPort } from "./ZWaveSerialPort";
import type { ZWaveSerialPortEventCallbacks } from "./ZWaveSerialPortBase";
interface MockSerialPortEventCallbacks extends ZWaveSerialPortEventCallbacks {
    write: (data: Buffer) => void;
}
type MockSerialPortEvents = Extract<keyof MockSerialPortEventCallbacks, string>;
export interface MockSerialPort {
    on<TEvent extends MockSerialPortEvents>(event: TEvent, callback: MockSerialPortEventCallbacks[TEvent]): this;
    addListener<TEvent extends MockSerialPortEvents>(event: TEvent, callback: MockSerialPortEventCallbacks[TEvent]): this;
    once<TEvent extends MockSerialPortEvents>(event: TEvent, callback: MockSerialPortEventCallbacks[TEvent]): this;
    off<TEvent extends MockSerialPortEvents>(event: TEvent, callback: MockSerialPortEventCallbacks[TEvent]): this;
    removeListener<TEvent extends MockSerialPortEvents>(event: TEvent, callback: MockSerialPortEventCallbacks[TEvent]): this;
    removeAllListeners(event?: MockSerialPortEvents): this;
    emit<TEvent extends MockSerialPortEvents>(event: TEvent, ...args: Parameters<MockSerialPortEventCallbacks[TEvent]>): boolean;
}
export declare class MockSerialPort extends ZWaveSerialPort {
    constructor(port: string, loggers: ZWaveLogContainer);
    static getInstance(port: string): MockSerialPort | undefined;
    private __isOpen;
    get isOpen(): boolean;
    open(): Promise<void>;
    readonly openStub: sinon.SinonStub<any[], any>;
    close(): Promise<void>;
    readonly closeStub: sinon.SinonStub<any[], any>;
    receiveData(data: Buffer): void;
    raiseError(err: Error): void;
    writeAsync(data: Buffer): Promise<void>;
    readonly writeStub: sinon.SinonStub<any[], any>;
    private _lastWrite;
    get lastWrite(): string | number[] | Buffer | undefined;
}
export declare function createAndOpenMockedZWaveSerialPort(path: string): Promise<{
    port: ZWaveSerialPort;
    binding: SerialPortMockPortBinding;
}>;
export {};
//# sourceMappingURL=MockSerialPort.d.ts.map