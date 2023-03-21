/// <reference types="node" />
import { ZWaveError } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { DefaultContext, EventObject, Interpreter, InterpreterOptions, StateMachine, StateSchema, Typestate } from "xstate";
import type { DriverLogger } from "../log/Driver";
import { SendDataAbort } from "../serialapi/transport/SendDataMessages";
import type { SendDataErrorData } from "./SendThreadMachine";
import type { SerialAPICommandError } from "./SerialAPICommandMachine";
import type { Transaction } from "./Transaction";
export interface ServiceImplementations {
    timestamp: () => number;
    sendData: (data: Buffer) => Promise<void>;
    createSendDataAbort: () => SendDataAbort;
    notifyRetry?: (command: "SendData" | "SerialAPI", lastError: SerialAPICommandError | undefined, message: Message, attempts: number, maxAttempts: number, delay: number) => void;
    notifyUnsolicited: (message: Message) => void;
    rejectTransaction: (transaction: Transaction, error: ZWaveError) => void;
    resolveTransaction: (transaction: Transaction, result?: Message) => void;
    logOutgoingMessage: (message: Message) => void;
    log: DriverLogger["print"];
    logQueue: DriverLogger["sendQueue"];
}
export declare function sendDataErrorToZWaveError(error: SendDataErrorData["reason"], transaction: Transaction, receivedMessage: Message | undefined): ZWaveError;
export declare function createMessageDroppedUnexpectedError(original: Error): ZWaveError;
/** Tests whether the given error is one that was caused by the serial API execution */
export declare function isSerialCommandError(error: unknown): boolean;
export declare const respondUnsolicited: import("xstate").SendAction<any, {
    type: "message";
    message: Message;
} & {
    type: "message";
}, import("xstate").AnyEventObject>;
export declare const notifyUnsolicited: import("xstate").SendAction<any, ({
    type: "message";
    message: Message;
} & {
    type: "message" | "unsolicited";
}) | ({
    type: "unsolicited";
    message: Message;
} & {
    type: "message" | "unsolicited";
}), {
    type: string;
    message: Message;
}>;
/** Creates an auto-forwarding wrapper state machine that can be used to test machines that use sendParent */
export declare function createWrapperMachine(testMachine: StateMachine<any, any, any>): StateMachine<any, any, any, any, any, any, any>;
export type ExtendedInterpreter<TContext = DefaultContext, TStateSchema extends StateSchema = any, TEvent extends EventObject = EventObject, TTypestate extends Typestate<TContext> = {
    value: any;
    context: TContext;
}> = Interpreter<TContext, TStateSchema, TEvent, TTypestate> & {
    restart(): Interpreter<TContext, TStateSchema, TEvent, TTypestate>;
};
export type Extended<TInterpreter extends Interpreter<any, any, any, any>> = TInterpreter extends Interpreter<infer A, infer B, infer C, infer D> ? ExtendedInterpreter<A, B, C, D> : never;
/** Extends the default xstate interpreter with a restart function that re-attaches all event handlers */
export declare function interpretEx<TContext = DefaultContext, TStateSchema extends StateSchema = any, TEvent extends EventObject = EventObject, TTypestate extends Typestate<TContext> = {
    value: any;
    context: TContext;
}>(machine: StateMachine<TContext, TStateSchema, TEvent, TTypestate>, options?: Partial<InterpreterOptions>): ExtendedInterpreter<TContext, TStateSchema, TEvent, TTypestate>;
//# sourceMappingURL=StateMachineShared.d.ts.map