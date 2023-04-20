/// <reference types="node" />
import type { BindingInterface, BindingPortInterface, OpenOptions, PortInfo, PortStatus, SetOptions, UpdateOptions } from "@serialport/bindings-interface";
import { TypedEventEmitter } from "@zwave-js/shared";
export interface MockPortInternal {
    data: Buffer;
    info: PortInfo;
    maxReadSize: number;
    readyData?: Buffer;
    openOpt?: OpenOptions;
    instance?: MockPortBinding;
}
export interface CreatePortOptions {
    echo?: boolean;
    record?: boolean;
    readyData?: Buffer;
    maxReadSize?: number;
    manufacturer?: string;
    vendorId?: string;
    productId?: string;
}
export declare class CanceledError extends Error {
    canceled: true;
    constructor(message: string);
}
export interface MockBindingInterface extends BindingInterface<MockPortBinding> {
    reset(): void;
    createPort(path: string, opt?: CreatePortOptions): void;
    getInstance(path: string): MockPortBinding | undefined;
}
export declare const MockBinding: MockBindingInterface;
interface MockPortBindingEvents {
    write: (data: Buffer) => void;
}
/**
 * Mock bindings for pretend serialport access
 */
export declare class MockPortBinding extends TypedEventEmitter<MockPortBindingEvents> implements BindingPortInterface {
    readonly openOptions: Required<OpenOptions>;
    readonly port: MockPortInternal;
    private pendingRead;
    lastWrite: null | Buffer;
    recording: Buffer;
    writeOperation: null | Promise<void>;
    isOpen: boolean;
    serialNumber?: string;
    constructor(port: MockPortInternal, openOptions: Required<OpenOptions>);
    emitData(data: Buffer | string): void;
    close(): Promise<void>;
    read(buffer: Buffer, offset: number, length: number): Promise<{
        buffer: Buffer;
        bytesRead: number;
    }>;
    write(buffer: Buffer): Promise<void>;
    update(options: UpdateOptions): Promise<void>;
    set(options: SetOptions): Promise<void>;
    get(): Promise<PortStatus>;
    getBaudRate(): Promise<{
        baudRate: number;
    }>;
    flush(): Promise<void>;
    drain(): Promise<void>;
}
export {};
//# sourceMappingURL=SerialPortBindingMock.d.ts.map