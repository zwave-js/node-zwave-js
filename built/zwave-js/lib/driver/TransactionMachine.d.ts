import type { ZWaveError } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { Interpreter, StateMachine } from "xstate";
import type { CommandQueueEvent } from "./CommandQueueMachine";
import { ServiceImplementations } from "./StateMachineShared";
import type { Transaction } from "./Transaction";
export interface TransactionMachineContext {
    transaction: Transaction;
    sendDataAttempts: number;
    result?: Message;
    error?: ZWaveError;
}
export type TransactionMachineEvent = (CommandQueueEvent & {
    type: "command_success";
}) | (CommandQueueEvent & {
    type: "command_failure";
}) | (CommandQueueEvent & {
    type: "command_error";
}) | {
    type: "NIF";
    nodeId: number;
} | {
    type: "resend";
} | {
    type: "stop";
};
export type TransactionMachine = StateMachine<TransactionMachineContext, any, TransactionMachineEvent, any, any, any, any>;
export type TransactionMachineInterpreter = Interpreter<TransactionMachineContext, any, TransactionMachineEvent>;
export declare function createTransactionMachine(id: string, transaction: Transaction, implementations: ServiceImplementations): TransactionMachine;
//# sourceMappingURL=TransactionMachine.d.ts.map