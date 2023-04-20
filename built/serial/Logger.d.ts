/// <reference types="node" />
import { DataDirection, ZWaveLogContainer, ZWaveLoggerBase } from "@zwave-js/core";
import { SerialLogContext } from "./Logger_safe";
export declare class SerialLogger extends ZWaveLoggerBase<SerialLogContext> {
    constructor(loggers: ZWaveLogContainer);
    private isVisible;
    /**
     * Logs transmission or receipt of an ACK frame
     * @param direction The direction this ACK was sent
     */
    ACK(direction: DataDirection): void;
    /**
     * Logs transmission or receipt of an NAK frame
     * @param direction The direction this NAK was sent
     */
    NAK(direction: DataDirection): void;
    /**
     * Logs transmission or receipt of an CAN frame
     * @param direction The direction this CAN was sent
     */
    CAN(direction: DataDirection): void;
    /**
     * Logs receipt of unexpected data while waiting for an ACK, NAK, CAN, or data frame
     */
    discarded(data: Buffer): void;
    private logMessageHeader;
    /**
     * Logs transmission or receipt of a data chunk
     * @param direction The direction the data was sent
     * @param data The data that was transmitted or received
     */
    data(direction: DataDirection, data: Buffer): void;
    /**
     * Logs a message
     * @param message The message to output
     */
    message(message: string): void;
    /**
     * Prints output from the bootloader
     * @param screen The "screen" to output
     */
    bootloaderScreen(screen: string): void;
}
//# sourceMappingURL=Logger.d.ts.map