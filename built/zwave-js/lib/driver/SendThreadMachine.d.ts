import { MessagePriority, ZWaveErrorCodes } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { SortedList } from "alcalzone-shared/sorted-list";
import { ActorRef, ActorRefFrom, Interpreter, StateMachine } from "xstate";
import { CommandQueueEvent } from "./CommandQueueMachine";
import type { SerialAPICommandDoneData, SerialAPICommandMachineParams } from "./SerialAPICommandMachine";
import type { ServiceImplementations } from "./StateMachineShared";
import type { Transaction } from "./Transaction";
import { TransactionMachine } from "./TransactionMachine";
import type { ZWaveOptions } from "./ZWaveOptions";
export type SendDataErrorData = (SerialAPICommandDoneData & {
    type: "failure";
}) | {
    type: "failure";
    reason: "node timeout";
    result?: undefined;
};
export interface ActiveTransaction {
    transaction: Transaction;
    machine: ActorRefFrom<TransactionMachine>;
}
export interface SendThreadContext {
    queue: SortedList<Transaction>;
    commandQueue: ActorRef<any, any>;
    activeTransactions: Map<string, ActiveTransaction>;
    counter: number;
    paused: boolean;
}
export type SendThreadEvent = {
    type: "add";
    transaction: Transaction;
} | {
    type: "trigger";
} | {
    type: "unsolicited";
    message: Message;
} | {
    type: "sortQueue";
} | {
    type: "NIF";
    nodeId: number;
} | {
    type: "reduce";
    reducer: TransactionReducer;
} | {
    type: "resend";
} | {
    type: "ACK";
} | {
    type: "CAN";
} | {
    type: "NAK";
} | {
    type: "message";
    message: Message;
} | (CommandQueueEvent & ({
    type: "command_success";
} | {
    type: "command_failure";
} | {
    type: "command_error";
})) | {
    type: "pause" | "unpause";
} | {
    type: "forward";
    from: string;
    to: string;
    payload: any;
} | {
    type: "transaction_done";
    id: string;
};
export type SendThreadMachine = StateMachine<SendThreadContext, any, SendThreadEvent, any, any, any, any>;
export type SendThreadInterpreter = Interpreter<SendThreadContext, any, SendThreadEvent>;
export type TransactionReducerResult = {
    type: "drop";
} | {
    type: "keep";
} | {
    type: "reject";
    message: string;
    code: ZWaveErrorCodes;
} | {
    type: "resolve";
    message?: Message;
} | {
    type: "requeue";
    priority?: MessagePriority;
    tag?: any;
};
export type TransactionReducer = (transaction: Transaction, source: "queue" | "active") => TransactionReducerResult;
export type SendThreadMachineParams = {
    timeouts: SerialAPICommandMachineParams["timeouts"] & Pick<ZWaveOptions["timeouts"], "report">;
    attempts: SerialAPICommandMachineParams["attempts"];
};
export declare function createSendThreadMachine(implementations: ServiceImplementations, params: SendThreadMachineParams): SendThreadMachine;
//# sourceMappingURL=SendThreadMachine.d.ts.map