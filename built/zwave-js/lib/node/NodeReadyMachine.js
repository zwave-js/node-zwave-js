"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeReadyMachine = void 0;
const xstate_1 = require("xstate");
function createNodeReadyMachine(initialContext = {}) {
    return (0, xstate_1.Machine)({
        id: "nodeReady",
        initial: "notReady",
        context: {
            isMaybeDead: true,
            ...initialContext,
        },
        on: {
            MAYBE_DEAD: {
                actions: (0, xstate_1.assign)({ isMaybeDead: true }),
            },
            NOT_DEAD: {
                actions: (0, xstate_1.assign)({ isMaybeDead: false }),
            },
            INTERVIEW_DONE: {
                target: "ready",
                actions: (0, xstate_1.assign)({ isMaybeDead: false }),
            },
        },
        states: {
            notReady: {
                entry: (0, xstate_1.assign)({ isMaybeDead: true }),
                on: {
                    RESTART_FROM_CACHE: [{ target: "readyIfNotDead" }],
                },
            },
            readyIfNotDead: {
                always: [{ cond: "isDefinitelyNotDead", target: "ready" }],
                on: {
                    NOT_DEAD: {
                        target: "ready",
                        actions: (0, xstate_1.assign)({ isMaybeDead: false }),
                    },
                },
            },
            ready: {
            // If this is final, we will get warnings in the log
            // So don't :)
            },
        },
    }, {
        guards: {
            isDefinitelyNotDead: (ctx) => !ctx.isMaybeDead,
        },
    });
}
exports.createNodeReadyMachine = createNodeReadyMachine;
//# sourceMappingURL=NodeReadyMachine.js.map