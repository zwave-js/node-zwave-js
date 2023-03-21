import { Interpreter, StateMachine } from "xstate";
import type { ZWaveNode } from "./Node";
import { NodeStatus } from "./_Types";
export interface NodeStatusStateSchema {
    states: {
        unknown: {};
        dead: {};
        alive: {};
        asleep: {};
        awake: {};
    };
}
export declare function nodeStatusMachineStateToNodeStatus(state: keyof NodeStatusStateSchema["states"]): NodeStatus;
export type NodeStatusEvent = {
    type: "DEAD";
} | {
    type: "ALIVE";
} | {
    type: "ASLEEP";
} | {
    type: "AWAKE";
};
export type NodeStatusMachine = StateMachine<any, NodeStatusStateSchema, NodeStatusEvent, any, any, any, any>;
export type NodeStatusInterpreter = Interpreter<any, NodeStatusStateSchema, NodeStatusEvent>;
export declare function createNodeStatusMachine(node: ZWaveNode): NodeStatusMachine;
//# sourceMappingURL=NodeStatusMachine.d.ts.map