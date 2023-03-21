import { Interpreter, StateMachine } from "xstate";
export interface TransportServiceRXStateSchema {
    states: {
        waitingForSegment: {};
        segmentTimeout: {};
        waitingForRequestedSegment: {};
        segmentsComplete: {};
        success: {};
        failure: {};
    };
}
export interface TransportServiceRXContext {
    receivedSegments: boolean[];
}
export type TransportServiceRXEvent = {
    type: "segment";
    index: number;
};
export type TransportServiceRXMachine = StateMachine<TransportServiceRXContext, TransportServiceRXStateSchema, TransportServiceRXEvent, any, any, any, any>;
export type TransportServiceRXInterpreter = Interpreter<TransportServiceRXContext, TransportServiceRXStateSchema, TransportServiceRXEvent>;
export type TransportServiceRXMachineParams = {
    numSegments: number;
    missingSegmentTimeout: number;
};
export interface TransportServiceRXServiceImplementations {
    requestMissingSegment(index: number): Promise<void>;
    sendSegmentsComplete(): Promise<void>;
}
export declare function createTransportServiceRXMachine(implementations: TransportServiceRXServiceImplementations, params: TransportServiceRXMachineParams): TransportServiceRXMachine;
//# sourceMappingURL=TransportServiceMachine.d.ts.map