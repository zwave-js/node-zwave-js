import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import { Comparable, CompareResult } from "../util/comparable";
import { DeferredPromise } from "../util/defer-promise";
export declare class Transaction implements Comparable<Transaction> {
    readonly message: Message;
    readonly promise: DeferredPromise<Message | void>;
    readonly priority: MessagePriority;
    timestamp: number;
    ackPending: boolean;
    response: Message;
    constructor(message: Message, promise: DeferredPromise<Message | void>, priority: MessagePriority);
    compareTo(other: Transaction): CompareResult;
}
