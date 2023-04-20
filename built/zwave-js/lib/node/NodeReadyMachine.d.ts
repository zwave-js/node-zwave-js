import { Interpreter, StateMachine } from "xstate";
export interface NodeReadyStateSchema {
    states: {
        notReady: {};
        readyIfNotDead: {};
        ready: {};
    };
}
export interface NodeReadyContext {
    isMaybeDead: boolean;
}
export type NodeReadyEvent = {
    type: "NOT_DEAD";
} | {
    type: "MAYBE_DEAD";
} | {
    type: "RESTART_FROM_CACHE";
} | {
    type: "INTERVIEW_DONE";
};
export type NodeReadyMachine = StateMachine<NodeReadyContext, NodeReadyStateSchema, NodeReadyEvent, any, any, any, any>;
export type NodeReadyInterpreter = Interpreter<NodeReadyContext, NodeReadyStateSchema, NodeReadyEvent>;
export declare function createNodeReadyMachine(initialContext?: Partial<NodeReadyContext>): NodeReadyMachine;
//# sourceMappingURL=NodeReadyMachine.d.ts.map