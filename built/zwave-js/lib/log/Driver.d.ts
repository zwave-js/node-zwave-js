import { DataDirection, LogContext, ZWaveLogContainer, ZWaveLoggerBase } from "@zwave-js/core";
import type { Message, ResponseRole } from "@zwave-js/serial";
import type { SortedList } from "alcalzone-shared/sorted-list";
import type { Driver } from "../driver/Driver";
import type { Transaction } from "../driver/Transaction";
export declare const DRIVER_LABEL = "DRIVER";
export interface DriverLogContext extends LogContext<"driver"> {
    direction?: DataDirection;
}
export declare class DriverLogger extends ZWaveLoggerBase<DriverLogContext> {
    private readonly driver;
    constructor(driver: Driver, loggers: ZWaveLogContainer);
    private isDriverLogVisible;
    private isSendQueueLogVisible;
    /**
     * Logs a message
     * @param msg The message to output
     */
    print(message: string, level?: "debug" | "verbose" | "warn" | "error" | "info"): void;
    /**
     * Serializes a message that starts a transaction, i.e. a message that is sent and may expect a response
     */
    transaction(transaction: Transaction): void;
    /** Logs information about a message that is received as a response to a transaction */
    transactionResponse(message: Message, originalTransaction: Transaction | undefined, role: ResponseRole): void;
    logMessage(message: Message, { nodeId, secondaryTags, direction, }?: {
        nodeId?: number;
        secondaryTags?: string[];
        direction?: DataDirection;
    }): void;
    /** Logs what's currently in the driver's send queue */
    sendQueue(queue: SortedList<Transaction>): void;
}
//# sourceMappingURL=Driver.d.ts.map