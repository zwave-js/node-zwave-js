import type { Message } from "@zwave-js/serial";
import { SortedList } from "alcalzone-shared/sorted-list";
import { ActorRefFrom, Interpreter, StateMachine } from "xstate";
import { SerialAPICommandDoneData, SerialAPICommandMachine, SerialAPICommandMachineParams } from "./SerialAPICommandMachine";
import { ServiceImplementations } from "./StateMachineShared";
import type { Transaction } from "./Transaction";
export interface CommandQueueStateSchema {
    states: {
        idle: {};
        execute: {};
        abortSendData: {};
        executeDone: {};
    };
}
export interface CommandQueueContext {
    queue: SortedList<Transaction>;
    callbackIDs: WeakMap<Transaction, string>;
    currentTransaction?: Transaction;
    abortActor?: ActorRefFrom<SerialAPICommandMachine>;
}
export type CommandQueueEvent = {
    type: "trigger";
} | {
    type: "add";
    transaction: Transaction;
    from: string;
} | {
    type: "ACK";
} | {
    type: "CAN";
} | {
    type: "NAK";
} | {
    type: "message";
    message: Message;
} | {
    type: "unsolicited";
    message: Message;
} | {
    type: "remove";
    transaction: Transaction;
} | {
    type: "command_error";
    error: Error;
} | ({
    type: "command_success";
} & Omit<CommandQueueDoneData & {
    type: "success";
}, "type">) | ({
    type: "command_failure";
} & Omit<CommandQueueDoneData & {
    type: "failure";
}, "type">);
export type CommandQueueDoneData = SerialAPICommandDoneData & {
    transaction: Transaction;
};
export type CommandQueueMachine = StateMachine<CommandQueueContext, CommandQueueStateSchema, CommandQueueEvent, any, any, any, any>;
export type CommandQueueInterpreter = Interpreter<CommandQueueContext, CommandQueueStateSchema, CommandQueueEvent>;
export declare function createCommandQueueMachine(implementations: ServiceImplementations, params: SerialAPICommandMachineParams): CommandQueueMachine;
//# sourceMappingURL=CommandQueueMachine.d.ts.map