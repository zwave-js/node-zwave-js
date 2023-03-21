"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockNode = exports.MockEndpoint = void 0;
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const util_1 = require("util");
const MockNodeCapabilities_1 = require("./MockNodeCapabilities");
const MockZWaveFrame_1 = require("./MockZWaveFrame");
const defaultCCInfo = {
    isSupported: true,
    isControlled: false,
    secure: false,
    version: 1,
};
class MockEndpoint {
    constructor(options) {
        this.implementedCCs = new Map();
        this.index = options.index;
        this.node = options.node;
        const { commandClasses = [], ...capabilities } = options.capabilities ?? {};
        this.capabilities = {
            ...(0, MockNodeCapabilities_1.getDefaultMockEndpointCapabilities)(this.node.capabilities),
            ...capabilities,
        };
        for (const cc of commandClasses) {
            if (typeof cc === "number") {
                this.addCC(cc, {});
            }
            else {
                const { ccId, ...ccInfo } = cc;
                this.addCC(ccId, ccInfo);
            }
        }
    }
    /** Adds information about a CC to this mock endpoint */
    addCC(cc, info) {
        const original = this.implementedCCs.get(cc);
        const updated = Object.assign({}, original ?? defaultCCInfo, info);
        if (!(0, util_1.isDeepStrictEqual)(original, updated)) {
            this.implementedCCs.set(cc, updated);
        }
    }
    /** Removes information about a CC from this mock node */
    removeCC(cc) {
        this.implementedCCs.delete(cc);
    }
}
exports.MockEndpoint = MockEndpoint;
/** A mock node that can be used to test the driver as if it were speaking to an actual network */
class MockNode {
    constructor(options) {
        this.behaviors = [];
        this.implementedCCs = new Map();
        this.endpoints = new Map();
        /** Can be used by behaviors to store controller related state */
        this.state = new Map();
        /** Controls whether the controller automatically ACKs node frames before handling them */
        this.autoAckControllerFrames = true;
        this.expectedControllerFrames = [];
        /** Records the frames received from the controller to perform assertions on them */
        this.receivedControllerFrames = [];
        /** Records the frames sent to the controller to perform assertions on them */
        this.sentControllerFrames = [];
        this.id = options.id;
        this.controller = options.controller;
        // A node's host is a bit more specialized than the controller's host.
        const securityClasses = new Map();
        this.host = {
            ...this.controller.host,
            ownNodeId: this.id,
            __internalIsMockNode: true,
            // Mimic the behavior of ZWaveNode, but for arbitrary node IDs
            hasSecurityClass(nodeId, securityClass) {
                return (securityClasses.get(nodeId)?.get(securityClass) ??
                    core_1.unknownBoolean);
            },
            setSecurityClass(nodeId, securityClass, granted) {
                if (!securityClasses.has(nodeId)) {
                    securityClasses.set(nodeId, new Map());
                }
                securityClasses.get(nodeId).set(securityClass, granted);
            },
            getHighestSecurityClass(nodeId) {
                const map = securityClasses.get(nodeId);
                if (!map?.size)
                    return undefined;
                let missingSome = false;
                for (const secClass of core_1.securityClassOrder) {
                    if (map.get(secClass) === true)
                        return secClass;
                    if (!map.has(secClass)) {
                        missingSome = true;
                    }
                }
                // If we don't have the info for every security class, we don't know the highest one yet
                return missingSome ? undefined : core_1.SecurityClass.None;
            },
        };
        const { commandClasses = [], endpoints = [], ...capabilities } = options.capabilities ?? {};
        this.capabilities = {
            ...(0, MockNodeCapabilities_1.getDefaultMockNodeCapabilities)(),
            ...capabilities,
        };
        for (const cc of commandClasses) {
            if (typeof cc === "number") {
                this.addCC(cc, {});
            }
            else {
                const { ccId, ...ccInfo } = cc;
                this.addCC(ccId, ccInfo);
            }
        }
        let index = 0;
        for (const endpoint of endpoints) {
            index++;
            this.endpoints.set(index, new MockEndpoint({
                index,
                node: this,
                capabilities: endpoint,
            }));
        }
    }
    /**
     * Waits until the controller sends a frame matching the given predicate or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    async expectControllerFrame(timeout, predicate) {
        const expectation = new shared_1.TimedExpectation(timeout, predicate, "The controller did not send the expected frame within the provided timeout!");
        try {
            this.expectedControllerFrames.push(expectation);
            return (await expectation);
        }
        finally {
            const index = this.expectedControllerFrames.indexOf(expectation);
            if (index !== -1)
                this.expectedControllerFrames.splice(index, 1);
        }
    }
    /**
     * Waits until the controller sends an ACK frame or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    expectControllerACK(timeout) {
        return this.expectControllerFrame(timeout, (msg) => msg.type === MockZWaveFrame_1.MockZWaveFrameType.ACK);
    }
    /**
     * Sends a {@link MockZWaveFrame} to the {@link MockController}
     */
    async sendToController(frame) {
        let ret;
        if (frame.type === MockZWaveFrame_1.MockZWaveFrameType.Request && frame.ackRequested) {
            ret = this.expectControllerACK(MockZWaveFrame_1.MOCK_FRAME_ACK_TIMEOUT);
        }
        this.sentControllerFrames.push(frame);
        process.nextTick(() => {
            void this.controller.onNodeFrame(this, frame);
        });
        if (ret)
            return await ret;
    }
    /** Gets called when a {@link MockZWaveFrame} is received from the {@link MockController} */
    async onControllerFrame(frame) {
        this.receivedControllerFrames.push(frame);
        // Ack the frame if desired
        if (this.autoAckControllerFrames &&
            frame.type === MockZWaveFrame_1.MockZWaveFrameType.Request) {
            await this.ackControllerRequestFrame(frame);
        }
        // Handle message buffer. Check for pending expectations first.
        const handler = this.expectedControllerFrames.find((e) => !e.predicate || e.predicate(frame));
        if (handler) {
            handler.resolve(frame);
        }
        else {
            for (const behavior of this.behaviors) {
                if (await behavior.onControllerFrame?.(this.controller, this, frame)) {
                    return;
                }
            }
        }
    }
    /**
     * Sends an ACK frame to the {@link MockController}
     */
    async ackControllerRequestFrame(frame) {
        await this.sendToController((0, MockZWaveFrame_1.createMockZWaveAckFrame)({
            repeaters: frame?.repeaters,
        }));
    }
    /** Adds information about a CC to this mock node */
    addCC(cc, info) {
        const original = this.implementedCCs.get(cc);
        const updated = Object.assign({}, original ?? defaultCCInfo, info);
        if (!(0, util_1.isDeepStrictEqual)(original, updated)) {
            this.implementedCCs.set(cc, updated);
        }
    }
    /** Removes information about a CC from this mock node */
    removeCC(cc) {
        this.implementedCCs.delete(cc);
    }
    defineBehavior(...behaviors) {
        // New behaviors must override existing ones, so we insert at the front of the array
        this.behaviors.unshift(...behaviors);
    }
    /** Asserts that a frame matching the given predicate was received from the controller */
    assertReceivedControllerFrame(predicate, options) {
        const { errorMessage, noMatch } = options ?? {};
        const index = this.receivedControllerFrames.findIndex(predicate);
        if (index === -1 && !noMatch) {
            throw new Error(`Node ${this.id} did not receive a Z-Wave frame matching the predicate!${errorMessage ? ` ${errorMessage}` : ""}`);
        }
        else if (index > -1 && noMatch) {
            throw new Error(`Node ${this.id} received a Z-Wave frame matching the predicate, but this was not expected!${errorMessage ? ` ${errorMessage}` : ""}`);
        }
    }
    /** Forgets all recorded frames received from the controller */
    clearReceivedControllerFrames() {
        this.receivedControllerFrames = [];
    }
    /** Asserts that a frame matching the given predicate was sent to the controller */
    assertSentControllerFrame(predicate, options) {
        const { errorMessage, noMatch } = options ?? {};
        const index = this.sentControllerFrames.findIndex(predicate);
        if (index === -1 && !noMatch) {
            throw new Error(`Node ${this.id} did not send a Z-Wave frame matching the predicate!${errorMessage ? ` ${errorMessage}` : ""}`);
        }
        else if (index > -1 && noMatch) {
            throw new Error(`Node ${this.id} sent a Z-Wave frame matching the predicate, but this was not expected!${errorMessage ? ` ${errorMessage}` : ""}`);
        }
    }
    /** Forgets all recorded frames sent to the controller */
    clearSentControllerFrames() {
        this.sentControllerFrames = [];
    }
}
exports.MockNode = MockNode;
//# sourceMappingURL=MockNode.js.map