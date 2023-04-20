/// <reference types="node" />
export declare enum BootloaderState {
    Menu = 0,
    UploadingFirmware = 1
}
/** Encapsulates information about the currently active bootloader */
export declare class Bootloader {
    private writeSerial;
    readonly version: string;
    constructor(writeSerial: (data: Buffer) => Promise<void>, version: string, options: {
        num: number;
        option: string;
    }[]);
    readonly uploadOption: number;
    readonly runOption: number;
    state: BootloaderState;
    beginUpload(): Promise<void>;
    runApplication(): Promise<void>;
    uploadFragment(fragmentNumber: number, data: Buffer): Promise<void>;
    finishUpload(): Promise<void>;
}
//# sourceMappingURL=Bootloader.d.ts.map