import { Comparable, CompareResult } from "alcalzone-shared/comparable";
import { DeferredPromise } from "alcalzone-shared/deferred-promise";
import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import { Driver } from "./Driver";
export declare const MAX_SEND_ATTEMPTS = 3;
export declare class Transaction implements Comparable<Transaction> {
    private readonly driver;
    readonly message: Message;
    readonly promise: DeferredPromise<Message | void>;
    priority: MessagePriority;
    timestamp: number;
    ackPending: boolean;
    response?: Message;
    /** The number of times the driver may try to send this message */
    maxSendAttempts: number;
    /** The number of times the driver has tried to send this message */
    sendAttempts: number;
    constructor(driver: Driver, message: Message, promise: DeferredPromise<Message | void>, priority: MessagePriority);
    compareTo(other: Transaction): CompareResult;
}
