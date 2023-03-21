/// <reference types="node" />
import type { Message } from "@zwave-js/serial";
import { Interpreter, MachineConfig, MachineOptions, StateMachine } from "xstate";
import { ServiceImplementations } from "./StateMachineShared";
import type { ZWaveOptions } from "./ZWaveOptions";
export interface SerialAPICommandStateSchema {
    states: {
        sending: {};
        waitForACK: {};
        waitForResponse: {};
        waitForCallback: {};
        retry: {};
        retryWait: {};
        failure: {};
        success: {};
    };
}
export type SerialAPICommandError = "send failure" | "CAN" | "NAK" | "ACK timeout" | "response timeout" | "callback timeout" | "response NOK" | "callback NOK";
export interface SerialAPICommandContext {
    msg: Message;
    data: Buffer;
    attempts: number;
    maxAttempts: number;
    lastError?: SerialAPICommandError;
    result?: Message;
    txTimestamp?: number;
}
export type SerialAPICommandEvent = {
    type: "ACK";
} | {
    type: "CAN";
} | {
    type: "NAK";
} | {
    type: "message";
    message: Message;
} | {
    type: "response";
    message: Message;
} | {
    type: "callback";
    message: Message;
} | {
    type: "unsolicited";
    message: Message;
};
export type SerialAPICommandDoneData = {
    type: "success";
    txTimestamp: number;
    result?: Message;
} | ({
    type: "failure";
} & ({
    reason: "send failure" | "CAN" | "NAK" | "ACK timeout" | "response timeout" | "callback timeout";
    result?: undefined;
} | {
    reason: "response NOK" | "callback NOK";
    result: Message;
}));
export type SerialAPICommandMachineConfig = MachineConfig<SerialAPICommandContext, SerialAPICommandStateSchema, SerialAPICommandEvent>;
export type SerialAPICommandMachine = StateMachine<SerialAPICommandContext, SerialAPICommandStateSchema, SerialAPICommandEvent, any, any, any, any>;
export type SerialAPICommandInterpreter = Interpreter<SerialAPICommandContext, SerialAPICommandStateSchema, SerialAPICommandEvent>;
export type SerialAPICommandMachineOptions = Partial<MachineOptions<SerialAPICommandContext, SerialAPICommandEvent>>;
export type SerialAPICommandMachineParams = {
    timeouts: Pick<ZWaveOptions["timeouts"], "ack" | "response" | "sendDataCallback">;
    attempts: Pick<ZWaveOptions["attempts"], "controller">;
};
export declare function getSerialAPICommandMachineConfig(message: Message, { timestamp, logOutgoingMessage, }: Pick<ServiceImplementations, "timestamp" | "logOutgoingMessage">, attemptsConfig: SerialAPICommandMachineParams["attempts"]): SerialAPICommandMachineConfig;
export declare function getSerialAPICommandMachineOptions({ sendData, notifyRetry, }: Pick<ServiceImplementations, "sendData" | "notifyRetry">, timeoutConfig: SerialAPICommandMachineParams["timeouts"]): SerialAPICommandMachineOptions;
export declare function createSerialAPICommandMachine(message: Message, implementations: ServiceImplementations, params: SerialAPICommandMachineParams): SerialAPICommandMachine;
//# sourceMappingURL=SerialAPICommandMachine.d.ts.map