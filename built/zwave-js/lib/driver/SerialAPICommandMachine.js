"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSerialAPICommandMachine = exports.getSerialAPICommandMachineOptions = exports.getSerialAPICommandMachineConfig = void 0;
const serial_1 = require("@zwave-js/serial");
const xstate_1 = require("xstate");
const actions_1 = require("xstate/lib/actions");
const StateMachineShared_1 = require("./StateMachineShared");
function computeRetryDelay(ctx) {
    return 100 + 1000 * (ctx.attempts - 1);
}
const forwardMessage = (0, actions_1.send)((_, evt) => {
    const msg = evt.message;
    return {
        type: msg.type === serial_1.MessageType.Response ? "response" : "callback",
        message: msg,
    };
});
function getSerialAPICommandMachineConfig(message, { timestamp, logOutgoingMessage, }, attemptsConfig) {
    return {
        id: "serialAPICommand",
        initial: "sending",
        context: {
            msg: message,
            data: message.serialize(),
            attempts: 0,
            maxAttempts: attemptsConfig.controller,
        },
        on: {
            // The state machine accepts any message. If it is expected
            // it will be forwarded to the correct states. If not, it
            // will be returned with the "unsolicited" event.
            message: [
                {
                    cond: "isExpectedMessage",
                    actions: forwardMessage,
                },
                {
                    actions: StateMachineShared_1.respondUnsolicited,
                },
            ],
        },
        states: {
            sending: {
                // Every send attempt should increase the attempts by one
                // and remember the timestamp of transmission
                entry: [
                    (0, xstate_1.assign)({
                        attempts: (ctx) => ctx.attempts + 1,
                        txTimestamp: (_) => timestamp(),
                    }),
                    (ctx) => logOutgoingMessage(ctx.msg),
                ],
                invoke: {
                    id: "sendMessage",
                    src: "send",
                    onDone: "waitForACK",
                    onError: {
                        target: "retry",
                        actions: (0, xstate_1.assign)({
                            lastError: (_) => "send failure",
                        }),
                    },
                },
            },
            waitForACK: {
                on: {
                    CAN: {
                        target: "retry",
                        actions: (0, xstate_1.assign)({
                            lastError: (_) => "CAN",
                        }),
                    },
                    NAK: {
                        target: "retry",
                        actions: (0, xstate_1.assign)({
                            lastError: (_) => "NAK",
                        }),
                    },
                    ACK: "waitForResponse",
                },
                after: {
                    ACK_TIMEOUT: {
                        target: "retry",
                        actions: (0, xstate_1.assign)({
                            lastError: (_) => "ACK timeout",
                        }),
                    },
                },
            },
            waitForResponse: {
                always: [
                    {
                        target: "waitForCallback",
                        cond: "expectsNoResponse",
                    },
                ],
                on: {
                    response: [
                        {
                            target: "retry",
                            cond: "responseIsNOK",
                            actions: (0, xstate_1.assign)({
                                lastError: (_) => "response NOK",
                                result: (_, evt) => evt.message,
                            }),
                        },
                        {
                            target: "waitForCallback",
                            actions: (0, xstate_1.assign)({
                                result: (_, evt) => evt.message,
                            }),
                        },
                    ],
                },
                after: {
                    RESPONSE_TIMEOUT: {
                        target: "retry",
                        actions: (0, xstate_1.assign)({
                            lastError: (_) => "response timeout",
                        }),
                    },
                },
            },
            waitForCallback: {
                always: [{ target: "success", cond: "expectsNoCallback" }],
                on: {
                    callback: [
                        {
                            target: "failure",
                            cond: "callbackIsNOK",
                            actions: (0, xstate_1.assign)({
                                lastError: (_) => "callback NOK",
                                result: (_, evt) => evt.message,
                            }),
                        },
                        {
                            target: "success",
                            cond: "callbackIsFinal",
                            actions: (0, xstate_1.assign)({
                                result: (_, evt) => evt.message,
                            }),
                        },
                        { target: "waitForCallback" },
                    ],
                },
                after: {
                    CALLBACK_TIMEOUT: {
                        target: "failure",
                        actions: (0, xstate_1.assign)({
                            lastError: (_) => "callback timeout",
                        }),
                    },
                },
            },
            retry: {
                always: [
                    { target: "retryWait", cond: "mayRetry" },
                    { target: "failure" },
                ],
            },
            retryWait: {
                invoke: {
                    id: "notify",
                    src: "notifyRetry",
                },
                after: {
                    RETRY_DELAY: "sending",
                },
            },
            success: {
                type: "final",
                data: {
                    type: "success",
                    txTimestamp: (ctx) => ctx.txTimestamp,
                    result: (ctx) => ctx.result,
                },
            },
            failure: {
                type: "final",
                data: {
                    type: "failure",
                    reason: (ctx) => ctx.lastError,
                    result: (ctx) => ctx.result,
                },
            },
        },
    };
}
exports.getSerialAPICommandMachineConfig = getSerialAPICommandMachineConfig;
function getSerialAPICommandMachineOptions({ sendData, notifyRetry, }, timeoutConfig) {
    return {
        services: {
            send: (ctx) => {
                // Mark the message as sent immediately before actually sending
                ctx.msg.markAsSent();
                return sendData(ctx.data);
            },
            notifyRetry: (ctx) => {
                notifyRetry?.("SerialAPI", ctx.lastError, ctx.msg, ctx.attempts, ctx.maxAttempts, computeRetryDelay(ctx));
                return Promise.resolve();
            },
        },
        guards: {
            mayRetry: (ctx) => ctx.attempts < ctx.maxAttempts,
            expectsNoResponse: (ctx) => !ctx.msg.expectsResponse(),
            expectsNoCallback: (ctx) => !ctx.msg.expectsCallback(),
            isExpectedMessage: (ctx, evt, meta) => meta.state.matches("waitForResponse")
                ? ctx.msg.isExpectedResponse(evt.message)
                : meta.state.matches("waitForCallback")
                    ? ctx.msg.isExpectedCallback(evt.message)
                    : false,
            responseIsNOK: (ctx, evt) => evt.type === "response" &&
                // assume responses without success indication to be OK
                (0, serial_1.isSuccessIndicator)(evt.message) &&
                !evt.message.isOK(),
            callbackIsNOK: (ctx, evt) => evt.type === "callback" &&
                // assume callbacks without success indication to be OK
                (0, serial_1.isSuccessIndicator)(evt.message) &&
                !evt.message.isOK(),
            callbackIsFinal: (ctx, evt) => evt.type === "callback" &&
                // assume callbacks without success indication to be OK
                (!(0, serial_1.isSuccessIndicator)(evt.message) || evt.message.isOK()) &&
                // assume callbacks without isFinal method to be final
                (!(0, serial_1.isMultiStageCallback)(evt.message) || evt.message.isFinal()),
        },
        delays: {
            RETRY_DELAY: (ctx) => computeRetryDelay(ctx),
            RESPONSE_TIMEOUT: (ctx) => {
                return (
                // Ask the message for its callback timeout
                ctx.msg.getResponseTimeout() ||
                    // and fall back to default values
                    timeoutConfig.response);
            },
            CALLBACK_TIMEOUT: (ctx) => {
                return (
                // Ask the message for its callback timeout
                ctx.msg.getCallbackTimeout() ||
                    // and fall back to default values
                    timeoutConfig.sendDataCallback);
            },
            ACK_TIMEOUT: timeoutConfig.ack,
        },
    };
}
exports.getSerialAPICommandMachineOptions = getSerialAPICommandMachineOptions;
function createSerialAPICommandMachine(message, implementations, params) {
    return (0, xstate_1.createMachine)(getSerialAPICommandMachineConfig(message, implementations, params.attempts), getSerialAPICommandMachineOptions(implementations, params.timeouts));
}
exports.createSerialAPICommandMachine = createSerialAPICommandMachine;
//# sourceMappingURL=SerialAPICommandMachine.js.map