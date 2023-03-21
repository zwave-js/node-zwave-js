import { MessagePriority } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { Comparable, CompareResult } from "alcalzone-shared/comparable";
import type { DeferredPromise } from "alcalzone-shared/deferred-promise";
import type { Driver } from "./Driver";
export interface MessageGenerator {
    parent: Transaction;
    /** Start a new copy of this message generator */
    start: () => AsyncGenerator<Message, void, Message>;
    /** A reference to the currently running message generator if it was already started */
    self?: ReturnType<MessageGenerator["start"]>;
    /** A reference to the last generated message, or undefined if the generator wasn't started or has finished */
    current?: Message;
}
export interface TransactionOptions {
    /** The "primary" message this transaction contains, e.g. the un-encapsulated version of a SendData request */
    message: Message;
    /**
     * The actual messages that will be sent when handling this transaction,
     * defined as a message generator to dynamically create the messages.
     */
    parts: MessageGenerator;
    /** The priority of this transaction */
    priority: MessagePriority;
    /** Will be resolved/rejected by the Send Thread Machine when the entire transaction is handled */
    promise: DeferredPromise<Message | void>;
}
/**
 * Transactions are used to track and correlate messages with their responses.
 */
export declare class Transaction implements Comparable<Transaction> {
    readonly driver: Driver;
    private readonly options;
    constructor(driver: Driver, options: TransactionOptions);
    clone(): Transaction;
    /** Will be resolved/rejected by the Send Thread Machine when the entire transaction is handled */
    readonly promise: DeferredPromise<Message | void>;
    /** The "primary" message this transaction contains, e.g. the un-encapsulated version of a SendData request */
    readonly message: Message;
    /** The message generator to create the actual messages for this transaction */
    readonly parts: MessageGenerator;
    /**
     * Returns the current message of this transaction. This is either the currently active partial message
     * or the primary message if the generator hasn't been started yet.
     */
    getCurrentMessage(): Message | undefined;
    /** The priority of this transaction */
    priority: MessagePriority;
    /** The timestamp at which the transaction was created */
    creationTimestamp: number;
    /** Whether the node status should be updated when this transaction times out */
    changeNodeStatusOnTimeout: boolean;
    /** Whether the send thread MUST be paused after this transaction was handled */
    pauseSendThread: boolean;
    /** If a Wake Up On Demand should be requested for the target node. */
    requestWakeUpOnDemand: boolean;
    /** Internal information used to identify or mark this transaction */
    tag?: any;
    /** The stack trace where the transaction was created */
    private _stack;
    get stack(): string;
    /** Compares two transactions in order to plan their transmission sequence */
    compareTo(other: Transaction): CompareResult;
}
//# sourceMappingURL=Transaction.d.ts.map