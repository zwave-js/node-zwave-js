"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeStatusMachine = exports.nodeStatusMachineStateToNodeStatus = void 0;
const xstate_1 = require("xstate");
const _Types_1 = require("./_Types");
/* eslint-enable @typescript-eslint/ban-types */
const statusDict = {
    unknown: _Types_1.NodeStatus.Unknown,
    dead: _Types_1.NodeStatus.Dead,
    alive: _Types_1.NodeStatus.Alive,
    asleep: _Types_1.NodeStatus.Asleep,
    awake: _Types_1.NodeStatus.Awake,
};
function nodeStatusMachineStateToNodeStatus(state) {
    return statusDict[state] ?? _Types_1.NodeStatus.Unknown;
}
exports.nodeStatusMachineStateToNodeStatus = nodeStatusMachineStateToNodeStatus;
function createNodeStatusMachine(node) {
    return (0, xstate_1.Machine)({
        id: "nodeStatus",
        initial: "unknown",
        states: {
            unknown: {
                on: {
                    DEAD: {
                        target: "dead",
                        cond: "cannotSleep",
                    },
                    ALIVE: {
                        target: "alive",
                        cond: "cannotSleep",
                    },
                    ASLEEP: {
                        target: "asleep",
                        cond: "canSleep",
                    },
                    AWAKE: {
                        target: "awake",
                        cond: "canSleep",
                    },
                },
            },
            dead: {
                on: {
                    ALIVE: "alive",
                },
            },
            alive: {
                on: {
                    DEAD: "dead",
                    // GH#1054 we must have a way to send a node to sleep even if
                    // it was previously detected as a non-sleeping device
                    ASLEEP: {
                        target: "asleep",
                        cond: "canSleep",
                    },
                    AWAKE: {
                        target: "awake",
                        cond: "canSleep",
                    },
                },
            },
            asleep: {
                on: {
                    AWAKE: "awake",
                },
            },
            awake: {
                on: {
                    ASLEEP: "asleep",
                },
            },
        },
    }, {
        guards: {
            canSleep: () => !!node.canSleep,
            cannotSleep: () => !node.canSleep,
        },
    });
}
exports.createNodeStatusMachine = createNodeStatusMachine;
//# sourceMappingURL=NodeStatusMachine.js.map