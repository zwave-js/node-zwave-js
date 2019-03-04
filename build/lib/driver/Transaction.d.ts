import { Comparable, CompareResult } from "alcalzone-shared/comparable";
import { DeferredPromise } from "alcalzone-shared/deferred-promise";
import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import { Driver } from "./Driver";
export declare class Transaction implements Comparable<Transaction> {
    private readonly driver;
    readonly message: Message;
    readonly promise: DeferredPromise<Message | void>;
    priority: MessagePriority;
    timestamp: number;
    ackPending: boolean;
    response?: Message;
    retries: number;
    constructor(driver: Driver, message: Message, promise: DeferredPromise<Message | void>, priority: MessagePriority);
    compareTo(other: Transaction): CompareResult;
}
