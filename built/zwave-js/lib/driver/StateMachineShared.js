"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpretEx = exports.createWrapperMachine = exports.notifyUnsolicited = exports.respondUnsolicited = exports.isSerialCommandError = exports.createMessageDroppedUnexpectedError = exports.sendDataErrorToZWaveError = void 0;
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const xstate_1 = require("xstate");
const actions_1 = require("xstate/lib/actions");
const SendDataBridgeMessages_1 = require("../serialapi/transport/SendDataBridgeMessages");
const SendDataMessages_1 = require("../serialapi/transport/SendDataMessages");
const SendDataShared_1 = require("../serialapi/transport/SendDataShared");
function sendDataErrorToZWaveError(error, transaction, receivedMessage) {
    switch (error) {
        case "send failure":
        case "CAN":
        case "NAK":
            return new core_1.ZWaveError(`Failed to send the message after 3 attempts`, core_1.ZWaveErrorCodes.Controller_MessageDropped, undefined, transaction.stack);
        case "ACK timeout":
            return new core_1.ZWaveError(`Timeout while waiting for an ACK from the controller`, core_1.ZWaveErrorCodes.Controller_Timeout, undefined, transaction.stack);
        case "response timeout":
            return new core_1.ZWaveError(`Timeout while waiting for a response from the controller`, core_1.ZWaveErrorCodes.Controller_Timeout, undefined, transaction.stack);
        case "callback timeout":
            return new core_1.ZWaveError(`Timeout while waiting for a callback from the controller`, core_1.ZWaveErrorCodes.Controller_Timeout, undefined, transaction.stack);
        case "response NOK": {
            const sentMessage = transaction.getCurrentMessage();
            if ((0, SendDataShared_1.isSendData)(sentMessage)) {
                return new core_1.ZWaveError(`Failed to send the command after ${sentMessage.maxSendAttempts} attempts. Transmission queue full`, core_1.ZWaveErrorCodes.Controller_MessageDropped, receivedMessage, transaction.stack);
            }
            else {
                return new core_1.ZWaveError(`The controller response indicated failure`, core_1.ZWaveErrorCodes.Controller_ResponseNOK, receivedMessage, transaction.stack);
            }
        }
        case "callback NOK": {
            const sentMessage = transaction.getCurrentMessage();
            if (sentMessage instanceof SendDataMessages_1.SendDataRequest ||
                sentMessage instanceof SendDataBridgeMessages_1.SendDataBridgeRequest) {
                const status = receivedMessage.transmitStatus;
                return new core_1.ZWaveError(`Failed to send the command after ${sentMessage.maxSendAttempts} attempts (Status ${(0, shared_1.getEnumMemberName)(core_1.TransmitStatus, status)})`, status === core_1.TransmitStatus.NoAck
                    ? core_1.ZWaveErrorCodes.Controller_CallbackNOK
                    : core_1.ZWaveErrorCodes.Controller_MessageDropped, receivedMessage, transaction.stack);
            }
            else if (sentMessage instanceof SendDataMessages_1.SendDataMulticastRequest ||
                sentMessage instanceof SendDataBridgeMessages_1.SendDataMulticastBridgeRequest) {
                const status = receivedMessage.transmitStatus;
                return new core_1.ZWaveError(`One or more nodes did not respond to the multicast request (Status ${(0, shared_1.getEnumMemberName)(core_1.TransmitStatus, status)})`, status === core_1.TransmitStatus.NoAck
                    ? core_1.ZWaveErrorCodes.Controller_CallbackNOK
                    : core_1.ZWaveErrorCodes.Controller_MessageDropped, receivedMessage, transaction.stack);
            }
            else {
                return new core_1.ZWaveError(`The controller callback indicated failure`, core_1.ZWaveErrorCodes.Controller_CallbackNOK, receivedMessage, transaction.stack);
            }
        }
        case "node timeout":
            return new core_1.ZWaveError(`Timed out while waiting for a response from the node`, core_1.ZWaveErrorCodes.Controller_NodeTimeout, undefined, transaction.stack);
    }
}
exports.sendDataErrorToZWaveError = sendDataErrorToZWaveError;
function createMessageDroppedUnexpectedError(original) {
    const ret = new core_1.ZWaveError(`Message dropped because of an unexpected error: ${original.message}`, core_1.ZWaveErrorCodes.Controller_MessageDropped);
    if (original.stack)
        ret.stack = original.stack;
    return ret;
}
exports.createMessageDroppedUnexpectedError = createMessageDroppedUnexpectedError;
/** Tests whether the given error is one that was caused by the serial API execution */
function isSerialCommandError(error) {
    if (!(0, core_1.isZWaveError)(error))
        return false;
    switch (error.code) {
        case core_1.ZWaveErrorCodes.Controller_Timeout:
        case core_1.ZWaveErrorCodes.Controller_ResponseNOK:
        case core_1.ZWaveErrorCodes.Controller_CallbackNOK:
        case core_1.ZWaveErrorCodes.Controller_MessageDropped:
            return true;
    }
    return false;
}
exports.isSerialCommandError = isSerialCommandError;
// respondUnsolicited and notifyUnsolicited are extremely similar, but we need both.
// Ideally we'd only use notifyUnsolicited, but then the state machine tests are failing.
exports.respondUnsolicited = (0, actions_1.respond)((_, evt) => ({
    type: "unsolicited",
    message: evt.message,
}));
exports.notifyUnsolicited = (0, actions_1.sendParent)((_ctx, evt) => ({
    type: "unsolicited",
    message: evt.message,
}));
/** Creates an auto-forwarding wrapper state machine that can be used to test machines that use sendParent */
function createWrapperMachine(testMachine) {
    return (0, xstate_1.Machine)({
        context: {
            child: undefined,
        },
        initial: "main",
        states: {
            main: {
                entry: (0, xstate_1.assign)({
                    child: () => (0, xstate_1.spawn)(testMachine, {
                        name: "child",
                        autoForward: true,
                    }),
                }),
            },
        },
    });
}
exports.createWrapperMachine = createWrapperMachine;
/** Extends the default xstate interpreter with a restart function that re-attaches all event handlers */
function interpretEx(machine, options) {
    const interpreter = new xstate_1.Interpreter(machine, options);
    return new Proxy(interpreter, {
        get(target, key) {
            if (key === "restart") {
                return () => {
                    const listeners = [...target["listeners"]];
                    const contextListeners = [
                        ...target["contextListeners"],
                    ];
                    const stopListeners = [
                        ...target["stopListeners"],
                    ];
                    const doneListeners = [
                        ...target["doneListeners"],
                    ];
                    const eventListeners = [
                        ...target["eventListeners"],
                    ];
                    const sendListeners = [
                        ...target["sendListeners"],
                    ];
                    target.stop();
                    for (const listener of listeners)
                        target.onTransition(listener);
                    for (const listener of contextListeners)
                        target.onChange(listener);
                    for (const listener of stopListeners)
                        target.onStop(listener);
                    for (const listener of doneListeners)
                        target.onDone(listener);
                    for (const listener of eventListeners)
                        target.onEvent(listener);
                    for (const listener of sendListeners)
                        target.onSend(listener);
                    return target.start();
                };
            }
            else {
                return target[key];
            }
        },
    });
}
exports.interpretEx = interpretEx;
//# sourceMappingURL=StateMachineShared.js.map