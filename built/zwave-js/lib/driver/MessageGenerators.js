"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessageGenerator = exports.secureMessageGeneratorS2Multicast = exports.secureMessageGeneratorS2 = exports.secureMessageGeneratorS0 = exports.maybeTransportServiceGenerator = exports.simpleMessageGenerator = exports.waitForNodeUpdate = void 0;
const cc_1 = require("@zwave-js/cc");
const SecurityCC_1 = require("@zwave-js/cc/SecurityCC");
const TransportServiceCC_1 = require("@zwave-js/cc/TransportServiceCC");
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const async_1 = require("alcalzone-shared/async");
const deferred_promise_1 = require("alcalzone-shared/deferred-promise");
const SendDataShared_1 = require("../serialapi/transport/SendDataShared");
const StateMachineShared_1 = require("./StateMachineShared");
async function waitForNodeUpdate(driver, msg, timeoutMs) {
    try {
        return await driver.waitForMessage((received) => {
            return msg.isExpectedNodeUpdate(received);
        }, timeoutMs);
    }
    catch (e) {
        throw new core_1.ZWaveError(`Timed out while waiting for a response from the node`, core_1.ZWaveErrorCodes.Controller_NodeTimeout);
    }
}
exports.waitForNodeUpdate = waitForNodeUpdate;
function getNodeUpdateTimeout(driver, msg, additionalCommandTimeoutMs = 0) {
    const commandTimeMs = Math.ceil((msg.rtt ?? 0) / 1e6);
    return (commandTimeMs +
        driver.getReportTimeout(msg) +
        additionalCommandTimeoutMs);
}
/** A simple message generator that simply sends a message, waits for the ACK (and the response if one is expected) */
const simpleMessageGenerator = async function* (driver, msg, onMessageSent, additionalCommandTimeoutMs = 0) {
    // Make sure we can send this message
    if ((0, SendDataShared_1.isSendData)(msg) && (0, SendDataShared_1.exceedsMaxPayloadLength)(msg)) {
        throw new core_1.ZWaveError("Cannot send this message because it would exceed the maximum payload length!", core_1.ZWaveErrorCodes.Controller_MessageTooLarge);
    }
    // Pass this message to the send thread and wait for it to be sent
    let result;
    // At this point we can't have received a premature update
    msg.prematureNodeUpdate = undefined;
    try {
        // The yield can throw and must be handled here
        result = yield msg;
        // Figure out how long the message took to be handled
        msg.markAsCompleted();
        onMessageSent(msg, result);
    }
    catch (e) {
        msg.markAsCompleted();
        throw e;
    }
    // If the message was sent to a node and came back with a NOK callback,
    // we want to inspect the callback, for example to look at TX statistics
    // or update the node status.
    //
    // We now need to throw because the callback was passed through so we could inspect it.
    if ((0, SendDataShared_1.isTransmitReport)(result) && !result.isOK()) {
        // Throw the message in order to short-circuit all possible generators
        throw result;
    }
    // If the sent message expects an update from the node, wait for it
    if (msg.expectsNodeUpdate()) {
        // We might have received the update prematurely. In that case, return it.
        if (msg.prematureNodeUpdate)
            return msg.prematureNodeUpdate;
        // CommandTime is measured by the application
        // ReportTime timeout SHOULD be set to CommandTime + 1 second.
        const timeout = getNodeUpdateTimeout(driver, msg, additionalCommandTimeoutMs);
        return waitForNodeUpdate(driver, msg, timeout);
    }
    return result;
};
exports.simpleMessageGenerator = simpleMessageGenerator;
/** A generator for singlecast SendData messages that automatically uses Transport Service when necessary */
const maybeTransportServiceGenerator = async function* (driver, msg, onMessageSent, additionalCommandTimeoutMs) {
    // Make sure we can send this message
    if (!(0, SendDataShared_1.isSendData)(msg)) {
        throw new core_1.ZWaveError("Cannot use the Transport Service message generator for messages that are not SendData!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    else if (typeof msg.command.nodeId !== "number") {
        throw new core_1.ZWaveError("Cannot use the Transport Service message generator for multicast commands!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    const node = msg.getNodeUnsafe(driver);
    const mayUseTransportService = node?.supportsCC(core_1.CommandClasses["Transport Service"]) &&
        node.getCCVersion(core_1.CommandClasses["Transport Service"]) >= 2;
    if (!mayUseTransportService || !(0, SendDataShared_1.exceedsMaxPayloadLength)(msg)) {
        // Transport Service isn't needed for this message
        return yield* (0, exports.simpleMessageGenerator)(driver, msg, onMessageSent, additionalCommandTimeoutMs);
    }
    // Send the command split into multiple segments
    const payload = msg.serializeCC();
    const numSegments = Math.ceil(payload.length / TransportServiceCC_1.MAX_SEGMENT_SIZE);
    const segmentDelay = numSegments > TransportServiceCC_1.RELAXED_TIMING_THRESHOLD
        ? TransportServiceCC_1.TransportServiceTimeouts.relaxedTimingDelayR2
        : 0;
    const sessionId = driver.getNextTransportServiceSessionId();
    const nodeId = msg.command.nodeId;
    // Since the command is never logged, we do it here
    driver.driverLog.print("The following message is too large, using Transport Service to transmit it:");
    driver.driverLog.logMessage(msg, {
        direction: "outbound",
    });
    // I don't see an elegant way to wait for possible responses, so we just register a handler in the driver
    // and remember the received commands
    let unhandledResponses = [];
    const { unregister: unregisterHandler } = driver.registerCommandHandler((cc) => cc.nodeId === nodeId &&
        (cc instanceof TransportServiceCC_1.TransportServiceCCSegmentWait ||
            (cc instanceof TransportServiceCC_1.TransportServiceCCSegmentRequest &&
                cc.sessionId === sessionId)), (cc) => {
        unhandledResponses.push(cc);
    });
    const receivedSegmentWait = () => {
        const index = unhandledResponses.findIndex((cc) => cc instanceof TransportServiceCC_1.TransportServiceCCSegmentWait);
        if (index >= 0) {
            const cc = unhandledResponses[index];
            unhandledResponses.splice(index, 1);
            return cc;
        }
    };
    const receivedSegmentRequest = () => {
        const index = unhandledResponses.findIndex((cc) => cc instanceof TransportServiceCC_1.TransportServiceCCSegmentRequest);
        if (index >= 0) {
            const cc = unhandledResponses[index];
            unhandledResponses.splice(index, 1);
            return cc;
        }
    };
    // We have to deal with multiple messages, but can only return a single result.
    // Therefore we use the last one as the result.
    let result;
    try {
        attempts: for (let attempt = 1; attempt <= 2; attempt++) {
            driver.controllerLog.logNode(nodeId, {
                message: `Beginning Transport Service TX session #${sessionId}...`,
                level: "debug",
                direction: "outbound",
            });
            // Clear the list of unhandled responses
            unhandledResponses = [];
            // Fill the list of unsent segments
            const unsentSegments = new Array(numSegments)
                .fill(0)
                .map((_, i) => i);
            let didRetryLastSegment = false;
            let isFirstTransferredSegment = true;
            while (unsentSegments.length > 0) {
                // Wait if necessary
                if (isFirstTransferredSegment) {
                    isFirstTransferredSegment = false;
                }
                else if (segmentDelay) {
                    await (0, async_1.wait)(segmentDelay, true);
                }
                const segment = unsentSegments.shift();
                const chunk = payload.slice(segment * TransportServiceCC_1.MAX_SEGMENT_SIZE, (segment + 1) * TransportServiceCC_1.MAX_SEGMENT_SIZE);
                let cc;
                if (segment === 0) {
                    cc = new TransportServiceCC_1.TransportServiceCCFirstSegment(driver, {
                        nodeId,
                        sessionId,
                        datagramSize: payload.length,
                        partialDatagram: chunk,
                    });
                }
                else {
                    cc = new TransportServiceCC_1.TransportServiceCCSubsequentSegment(driver, {
                        nodeId,
                        sessionId,
                        datagramSize: payload.length,
                        datagramOffset: segment * TransportServiceCC_1.MAX_SEGMENT_SIZE,
                        partialDatagram: chunk,
                    });
                }
                const tmsg = driver.createSendDataMessage(cc, {
                    autoEncapsulate: false,
                    maxSendAttempts: msg.maxSendAttempts,
                    transmitOptions: msg.transmitOptions,
                });
                result = yield* (0, exports.simpleMessageGenerator)(driver, tmsg, onMessageSent);
                let segmentComplete = undefined;
                // After sending the last segment, wait for a SegmentComplete response, at the same time
                // give the node a chance to send a SegmentWait or SegmentRequest(s)
                if (segment === numSegments - 1) {
                    segmentComplete = await driver
                        .waitForCommand((cc) => cc.nodeId === nodeId &&
                        cc instanceof
                            TransportServiceCC_1.TransportServiceCCSegmentComplete &&
                        cc.sessionId === sessionId, TransportServiceCC_1.TransportServiceTimeouts.segmentCompleteR2)
                        .catch(() => undefined);
                }
                if (segmentComplete) {
                    // We're done!
                    driver.controllerLog.logNode(nodeId, {
                        message: `Transport Service TX session #${sessionId} complete`,
                        level: "debug",
                        direction: "outbound",
                    });
                    break attempts;
                }
                // If we received a SegmentWait, we need to wait and restart
                const segmentWait = receivedSegmentWait();
                if (segmentWait) {
                    const waitTime = segmentWait.pendingSegments * 100;
                    driver.controllerLog.logNode(nodeId, {
                        message: `Restarting Transport Service TX session #${sessionId} in ${waitTime} ms...`,
                        level: "debug",
                    });
                    await (0, async_1.wait)(waitTime, true);
                    continue attempts;
                }
                // If the node requested missing segments, add them to the list of unsent segments and continue transmitting
                let segmentRequest = undefined;
                let readdedSegments = false;
                while ((segmentRequest = receivedSegmentRequest())) {
                    unsentSegments.push(segmentRequest.datagramOffset / TransportServiceCC_1.MAX_SEGMENT_SIZE);
                    readdedSegments = true;
                }
                if (readdedSegments)
                    continue;
                // If we didn't receive anything after sending the last segment, retry the last segment
                if (segment === numSegments - 1) {
                    if (didRetryLastSegment) {
                        driver.controllerLog.logNode(nodeId, {
                            message: `Transport Service TX session #${sessionId} failed`,
                            level: "debug",
                            direction: "outbound",
                        });
                        break attempts;
                    }
                    else {
                        // Try the last segment again
                        driver.controllerLog.logNode(nodeId, {
                            message: `Transport Service TX session #${sessionId}: Segment Complete missing - re-transmitting last segment...`,
                            level: "debug",
                            direction: "outbound",
                        });
                        didRetryLastSegment = true;
                        unsentSegments.unshift(segment);
                        continue;
                    }
                }
            }
        }
    }
    finally {
        // We're done, unregister the handler
        unregisterHandler();
    }
    // Transport Service CCs do not expect a node update and have no knowledge about the encapsulated CC.
    // Therefore we need to replicate the waiting from simpleMessageGenerator here
    // If the sent message expects an update from the node, wait for it
    if (msg.expectsNodeUpdate()) {
        // TODO: Figure out if we can handle premature updates with Transport Service CC
        const timeout = getNodeUpdateTimeout(driver, msg, additionalCommandTimeoutMs);
        return waitForNodeUpdate(driver, msg, timeout);
    }
    return result;
};
exports.maybeTransportServiceGenerator = maybeTransportServiceGenerator;
/** A simple (internal) generator that simply sends a command, and optionally returns the response command */
async function* sendCommandGenerator(driver, command, onMessageSent, options) {
    const msg = driver.createSendDataMessage(command, options);
    const resp = yield* (0, exports.maybeTransportServiceGenerator)(driver, msg, onMessageSent);
    if (resp && (0, cc_1.isCommandClassContainer)(resp)) {
        driver.unwrapCommands(resp);
        return resp.command;
    }
}
/** A message generator for security encapsulated messages (S0) */
const secureMessageGeneratorS0 = async function* (driver, msg, onMessageSent) {
    if (!(0, SendDataShared_1.isSendData)(msg)) {
        throw new core_1.ZWaveError("Cannot use the S0 message generator for a command that's not a SendData message!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    else if (typeof msg.command.nodeId !== "number") {
        throw new core_1.ZWaveError("Cannot use the S0 message generator for multicast commands!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    else if (!(msg.command instanceof SecurityCC_1.SecurityCCCommandEncapsulation)) {
        throw new core_1.ZWaveError("The S0 message generator can only be used for Security S0 command encapsulation!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    // Step 1: Acquire a nonce
    const secMan = driver.securityManager;
    const nodeId = msg.command.nodeId;
    let additionalTimeoutMs;
    // Try to get a free nonce before requesting a new one
    let nonce = secMan.getFreeNonce(nodeId);
    if (!nonce) {
        // No free nonce, request a new one
        const cc = new SecurityCC_1.SecurityCCNonceGet(driver, {
            nodeId: nodeId,
            endpoint: msg.command.endpointIndex,
        });
        const nonceResp = yield* sendCommandGenerator(driver, cc, (msg, result) => {
            additionalTimeoutMs = Math.ceil(msg.rtt / 1e6);
            onMessageSent(msg, result);
        }, {
            // Only try getting a nonce once
            maxSendAttempts: 1,
        });
        if (!nonceResp) {
            throw new core_1.ZWaveError("No nonce received from the node, cannot send secure command!", core_1.ZWaveErrorCodes.SecurityCC_NoNonce);
        }
        nonce = nonceResp.nonce;
    }
    msg.command.nonce = nonce;
    // Now send the actual secure command
    return yield* (0, exports.simpleMessageGenerator)(driver, msg, onMessageSent, additionalTimeoutMs);
};
exports.secureMessageGeneratorS0 = secureMessageGeneratorS0;
/** A message generator for security encapsulated messages (S2) */
const secureMessageGeneratorS2 = async function* (driver, msg, onMessageSent) {
    if (!(0, SendDataShared_1.isSendData)(msg)) {
        throw new core_1.ZWaveError("Cannot use the S2 message generator for a command that's not a SendData message!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    else if (typeof msg.command.nodeId !== "number") {
        throw new core_1.ZWaveError("Cannot use the S2 message generator for multicast commands!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    else if (!(msg.command instanceof cc_1.Security2CCMessageEncapsulation)) {
        throw new core_1.ZWaveError("The S2 message generator can only be used for Security S2 command encapsulation!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    const secMan = driver.securityManager2;
    const nodeId = msg.command.nodeId;
    const spanState = secMan.getSPANState(nodeId);
    let additionalTimeoutMs;
    if (spanState.type === core_1.SPANState.None ||
        spanState.type === core_1.SPANState.LocalEI) {
        // Request a new nonce
        // No free nonce, request a new one
        const cc = new cc_1.Security2CCNonceGet(driver, {
            nodeId: nodeId,
            endpoint: msg.command.endpointIndex,
        });
        const nonceResp = yield* sendCommandGenerator(driver, cc, (msg, result) => {
            additionalTimeoutMs = Math.ceil(msg.rtt / 1e6);
            onMessageSent(msg, result);
        }, {
            // Only try getting a nonce once
            maxSendAttempts: 1,
        });
        if (!nonceResp) {
            throw new core_1.ZWaveError("No nonce received from the node, cannot send secure command!", core_1.ZWaveErrorCodes.Security2CC_NoSPAN);
        }
        // Storing the nonce is not necessary, this will be done automatically when the nonce is received
    }
    // Now send the actual secure command
    let response = yield* (0, exports.maybeTransportServiceGenerator)(driver, msg, onMessageSent, additionalTimeoutMs);
    // If we want to make sure that a node understood a SET-type S2-encapsulated message, we either need to use
    // Supervision and wait for the Supervision Report (handled by the simpleMessageGenerator), or we need to add a
    // short delay between commands and wait if a NonceReport is received.
    // However, we MUST NOT do this if the encapsulated command is also a Security S2 command, because this means
    // we're in the middle of S2 bootstrapping, where timing is critical.
    let nonceReport;
    if ((0, SendDataShared_1.isTransmitReport)(response) &&
        !(msg.command.encapsulated instanceof cc_1.Security2CC) &&
        !msg.command.expectsCCResponse() &&
        !msg.command.getEncapsulatedCC(core_1.CommandClasses.Supervision, cc_1.SupervisionCommand.Get)) {
        nonceReport = await driver
            .waitForCommand((cc) => cc.nodeId === nodeId &&
            cc instanceof cc_1.Security2CCNonceReport, 500)
            .catch(() => undefined);
    }
    else if ((0, cc_1.isCommandClassContainer)(response) &&
        response.command instanceof cc_1.Security2CCNonceReport) {
        nonceReport = response.command;
    }
    if (nonceReport) {
        if (nonceReport.SOS && nonceReport.receiverEI) {
            // The node couldn't decrypt the last command we sent it. Invalidate
            // the shared SPAN, since it did the same
            secMan.storeRemoteEI(nodeId, nonceReport.receiverEI);
        }
        if (nonceReport.MOS) {
            const multicastGroupId = msg.command.getMulticastGroupId();
            if (multicastGroupId != undefined) {
                // The node couldn't decrypt the previous S2 multicast. Tell it the MPAN (again)
                const mpan = secMan.getInnerMPANState(multicastGroupId);
                if (mpan) {
                    // Replace the MGRP extension with an MPAN extension
                    msg.command.extensions = msg.command.extensions.filter((e) => !(e instanceof cc_1.MGRPExtension));
                    msg.command.extensions.push(new cc_1.MPANExtension({
                        groupId: multicastGroupId,
                        innerMPANState: mpan,
                    }));
                }
            }
        }
        driver.controllerLog.logNode(nodeId, {
            message: `failed to decode the message, retrying with SPAN extension...`,
            direction: "none",
        });
        // Send the message again
        msg.prepareRetransmission();
        response = yield* (0, exports.maybeTransportServiceGenerator)(driver, msg, onMessageSent, additionalTimeoutMs);
        if ((0, cc_1.isCommandClassContainer)(response) &&
            response.command instanceof cc_1.Security2CCNonceReport) {
            // No dice
            driver.controllerLog.logNode(nodeId, {
                message: `failed to decode the message after re-transmission with SPAN extension, dropping the message.`,
                direction: "none",
                level: "warn",
            });
            throw new core_1.ZWaveError("The node failed to decode the message.", core_1.ZWaveErrorCodes.Security2CC_CannotDecode);
        }
    }
    return response;
};
exports.secureMessageGeneratorS2 = secureMessageGeneratorS2;
/** A message generator for security encapsulated messages (S2 Multicast) */
const secureMessageGeneratorS2Multicast = async function* (driver, msg, onMessageSent) {
    if (!(0, SendDataShared_1.isSendData)(msg)) {
        throw new core_1.ZWaveError("Cannot use the S2 multicast message generator for a command that's not a SendData message!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    else if (msg.command.isSinglecast()) {
        throw new core_1.ZWaveError("Cannot use the S2 multicast message generator for singlecast commands!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    else if (!(msg.command instanceof cc_1.Security2CCMessageEncapsulation)) {
        throw new core_1.ZWaveError("The S2 multicast message generator can only be used for Security S2 command encapsulation!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    const groupId = msg.command.getMulticastGroupId();
    if (groupId == undefined) {
        throw new core_1.ZWaveError("Cannot use the S2 multicast message generator without a multicast group ID!", core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    const secMan = driver.securityManager2;
    const group = secMan.getMulticastGroup(groupId);
    if (!group) {
        throw new core_1.ZWaveError(`Multicast group ${groupId} does not exist!`, core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    // Send the multicast command. We remember the transmit report and treat it as the result of the multicast command
    const response = yield* (0, exports.simpleMessageGenerator)(driver, msg, onMessageSent);
    // If a node in the group is out of sync, we need to transfer the MPAN state we're going to use for the next command.
    // Therefore increment the MPAN state now and not after the followups like the specs mention
    secMan.tryIncrementMPAN(groupId);
    // Unwrap the command again, so we can make the following encapsulation depend on the target node
    driver.unwrapCommands(msg);
    const command = msg.command;
    // Remember the original encapsulation flags
    const encapsulationFlags = command.encapsulationFlags;
    // In case someone sneaked a node ID into the group multiple times, remove duplicates for the singlecast followups
    // Otherwise, the node will increase its MPAN multiple times, going out of sync.
    const distinctNodeIDs = [...new Set(group.nodeIDs)];
    // Now do singlecast followups with every node in the group
    for (const nodeId of distinctNodeIDs) {
        // Point the CC at the target node
        command.nodeId = nodeId;
        // Figure out if supervision should be used
        command.encapsulationFlags = encapsulationFlags;
        command.toggleEncapsulationFlag(core_1.EncapsulationFlags.Supervision, cc_1.SupervisionCC.mayUseSupervision(driver, command));
        const scMsg = driver.createSendDataMessage(command, {
            transmitOptions: msg.transmitOptions,
            maxSendAttempts: msg.maxSendAttempts,
        });
        // The outermost command is a Security2CCMessageEncapsulation, we need to set the MGRP extension on this again
        scMsg.command.extensions.push(new cc_1.MGRPExtension({ groupId }));
        // Reuse the S2 singlecast message generator for sending this new message
        try {
            const scResponse = yield* (0, exports.secureMessageGeneratorS2)(driver, scMsg, onMessageSent);
            if ((0, cc_1.isCommandClassContainer)(scResponse) &&
                scResponse.command instanceof
                    cc_1.Security2CCMessageEncapsulation &&
                scResponse.command.hasMOSExtension()) {
                // The node understood the S2 singlecast followup, but told us that its MPAN is out of sync
                const innerMPANState = secMan.getInnerMPANState(groupId);
                // This should always be defined, but better not throw unnecessarily here
                if (innerMPANState) {
                    const cc = new cc_1.Security2CCMessageEncapsulation(driver, {
                        nodeId,
                        extensions: [
                            new cc_1.MPANExtension({
                                groupId,
                                innerMPANState,
                            }),
                        ],
                    });
                    // Send it the MPAN
                    yield* sendCommandGenerator(driver, cc, onMessageSent, {
                        // Seems we need these options or some nodes won't accept the nonce
                        transmitOptions: core_1.TransmitOptions.ACK | core_1.TransmitOptions.AutoRoute,
                        // Only try sending a nonce once
                        maxSendAttempts: 1,
                        // Nonce requests must be handled immediately
                        priority: core_1.MessagePriority.Nonce,
                        // We don't want failures causing us to treat the node as asleep or dead
                        changeNodeStatusOnMissingACK: false,
                    });
                }
            }
        }
        catch (e) {
            driver.driverLog.print((0, shared_1.getErrorMessage)(e), "error");
            // TODO: Figure out how we got here, and what to do now.
            // In any case, keep going with the next nodes
            // TODO: We should probably respond that there was a failure
        }
    }
    return response;
};
exports.secureMessageGeneratorS2Multicast = secureMessageGeneratorS2Multicast;
function createMessageGenerator(driver, msg, onMessageSent) {
    const resultPromise = (0, deferred_promise_1.createDeferredPromise)();
    const generator = {
        parent: undefined,
        current: undefined,
        self: undefined,
        start: () => {
            const resetGenerator = () => {
                generator.current = undefined;
                generator.self = undefined;
            };
            async function* gen() {
                // Determine which message generator implementation should be used
                let implementation = exports.simpleMessageGenerator;
                if ((0, SendDataShared_1.isSendData)(msg)) {
                    if (msg.command instanceof cc_1.Security2CCMessageEncapsulation) {
                        implementation = msg.command.isSinglecast()
                            ? exports.secureMessageGeneratorS2
                            : exports.secureMessageGeneratorS2Multicast;
                    }
                    else if (msg.command instanceof SecurityCC_1.SecurityCCCommandEncapsulation) {
                        implementation = exports.secureMessageGeneratorS0;
                    }
                    else if (msg.command.isSinglecast()) {
                        implementation = exports.maybeTransportServiceGenerator;
                    }
                }
                // Step through the generator so we can easily cancel it and don't
                // accidentally forget to unset this.current at the end
                const gen = implementation(driver, msg, onMessageSent);
                let sendResult;
                let result;
                while (true) {
                    // This call passes the previous send result (if it exists already) to the generator and saves the
                    // generated or returned message in `value`. When `done` is true, `value` contains the returned result of the message generator
                    try {
                        const { value, done } = await gen.next(sendResult);
                        if (done) {
                            result = value;
                            break;
                        }
                        // Pass the generated message to the transaction machine and remember the result for the next iteration
                        generator.current = value;
                        sendResult = yield generator.current;
                    }
                    catch (e) {
                        if (e instanceof Error) {
                            // There was an actual error, reject the transaction
                            resultPromise.reject(e);
                        }
                        else if ((0, SendDataShared_1.isTransmitReport)(e) && !e.isOK()) {
                            // The generator was prematurely ended by throwing a NOK transmit report.
                            // If this cannot be handled (e.g. by moving the messages to the wakeup queue), we need
                            // to treat this as an error
                            if (driver.handleMissingNodeACK(generator.parent)) {
                                resetGenerator();
                                return;
                            }
                            else {
                                resultPromise.reject((0, StateMachineShared_1.sendDataErrorToZWaveError)("callback NOK", generator.parent, e));
                            }
                        }
                        else {
                            // The generator was prematurely ended by throwing a Message
                            resultPromise.resolve(e);
                        }
                        break;
                    }
                }
                resultPromise.resolve(result);
                resetGenerator();
                return;
            }
            generator.self = gen();
            return generator.self;
        },
    };
    return { resultPromise, generator };
}
exports.createMessageGenerator = createMessageGenerator;
//# sourceMappingURL=MessageGenerators.js.map