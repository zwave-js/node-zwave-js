"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockController = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const safe_1 = require("@zwave-js/shared/safe");
const MockControllerCapabilities_1 = require("./MockControllerCapabilities");
const MockZWaveFrame_1 = require("./MockZWaveFrame");
/** A mock Z-Wave controller which interacts with {@link MockNode}s and can be controlled via a {@link MockSerialPort} */
class MockController {
    constructor(options) {
        this.expectedHostACKs = [];
        this.expectedHostMessages = [];
        this.expectedNodeFrames = new Map();
        this.behaviors = [];
        /** Records the messages received from the host to perform assertions on them */
        this.receivedHostMessages = [];
        this._nodes = new Map();
        /** Can be used by behaviors to store controller related state */
        this.state = new Map();
        /** Controls whether the controller automatically ACKs node frames before handling them */
        this.autoAckNodeFrames = true;
        this.serial = options.serial;
        // Pipe the serial data through a parser, so we get complete message buffers or headers out the other end
        this.serialParser = new serial_1.SerialAPIParser();
        this.serial.on("write", (data) => {
            this.serialParser.write(data);
        });
        this.serialParser.on("data", (data) => this.serialOnData(data));
        // Set up the fake host
        // const valuesStorage = new Map();
        // const metadataStorage = new Map();
        // const valueDBCache = new Map<number, ValueDB>();
        this.host = {
            ownNodeId: options.ownNodeId ?? 1,
            homeId: options.homeId ?? 0x7e571000,
            securityManager: undefined,
            securityManager2: undefined,
            // nodes: this.nodes as any,
            getNextCallbackId: () => 1,
            getNextSupervisionSessionId: (0, safe_1.createWrappingCounter)(core_1.MAX_SUPERVISION_SESSION_ID),
            getSafeCCVersionForNode: () => 100,
            getSupportedCCVersionForEndpoint: (cc, nodeId, endpointIndex = 0) => {
                if (!this.nodes.has(nodeId)) {
                    return 0;
                }
                const node = this.nodes.get(nodeId);
                const endpoint = node.endpoints.get(endpointIndex);
                return (endpoint ?? node).implementedCCs.get(cc)?.version ?? 0;
            },
            isCCSecure: () => false,
            // TODO: We don't care about security classes on the controller
            // This is handled by the nodes hosts
            getHighestSecurityClass: () => undefined,
            hasSecurityClass: () => false,
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            setSecurityClass: () => { },
            // getValueDB: (nodeId) => {
            // 	if (!valueDBCache.has(nodeId)) {
            // 		valueDBCache.set(
            // 			nodeId,
            // 			new ValueDB(
            // 				nodeId,
            // 				valuesStorage as any,
            // 				metadataStorage as any,
            // 			),
            // 		);
            // 	}
            // 	return valueDBCache.get(nodeId)!;
            // },
        };
        this.capabilities = {
            ...(0, MockControllerCapabilities_1.getDefaultMockControllerCapabilities)(),
            ...options.capabilities,
        };
    }
    get nodes() {
        return this._nodes;
    }
    addNode(node) {
        this._nodes.set(node.id, node);
    }
    removeNode(node) {
        this._nodes.delete(node.id);
    }
    /** Gets called when parsed/chunked data is received from the serial port */
    async serialOnData(data) {
        if (typeof data === "number") {
            switch (data) {
                case serial_1.MessageHeaders.ACK: {
                    // If we were waiting for this ACK, resolve the expectation
                    this.expectedHostACKs?.shift()?.resolve();
                    return;
                }
                case serial_1.MessageHeaders.NAK: {
                    // Not sure if we actually need to do anything here
                    return;
                }
                case serial_1.MessageHeaders.CAN: {
                    // The driver should NEVER send this
                    throw new Error("Mock controller received a CAN from the host. This is illegal!");
                }
            }
        }
        let msg;
        try {
            msg = serial_1.Message.from(this.host, {
                data,
                origin: serial_1.MessageOrigin.Host,
                parseCCs: false,
            });
            this.receivedHostMessages.push(msg);
            // all good, respond with ACK
            this.sendHeaderToHost(serial_1.MessageHeaders.ACK);
        }
        catch (e) {
            throw new Error(`Mock controller received an invalid message from the host: ${e.stack}`);
        }
        // Handle message buffer. Check for pending expectations first.
        const handler = this.expectedHostMessages.find((e) => !e.predicate || e.predicate(msg));
        if (handler) {
            handler.resolve(msg);
        }
        else {
            for (const behavior of this.behaviors) {
                if (await behavior.onHostMessage?.(this.host, this, msg))
                    return;
            }
        }
    }
    /**
     * Waits until the host sends an ACK or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    async expectHostACK(timeout) {
        const ack = new safe_1.TimedExpectation(timeout, undefined, "Host did not respond with an ACK within the provided timeout!");
        try {
            this.expectedHostACKs.push(ack);
            return await ack;
        }
        finally {
            const index = this.expectedHostACKs.indexOf(ack);
            if (index !== -1)
                this.expectedHostACKs.splice(index, 1);
        }
    }
    /**
     * Waits until the host sends a message matching the given predicate or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    async expectHostMessage(timeout, predicate) {
        const expectation = new safe_1.TimedExpectation(timeout, predicate, "Host did not send the expected message within the provided timeout!");
        try {
            this.expectedHostMessages.push(expectation);
            return await expectation;
        }
        finally {
            const index = this.expectedHostMessages.indexOf(expectation);
            if (index !== -1)
                this.expectedHostMessages.splice(index, 1);
        }
    }
    /**
     * Waits until the node sends a message matching the given predicate or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    async expectNodeFrame(node, timeout, predicate) {
        const expectation = new safe_1.TimedExpectation(timeout, predicate, `Node ${node.id} did not send the expected frame within the provided timeout!`);
        try {
            if (!this.expectedNodeFrames.has(node.id)) {
                this.expectedNodeFrames.set(node.id, []);
            }
            this.expectedNodeFrames.get(node.id).push(expectation);
            return (await expectation);
        }
        finally {
            const array = this.expectedNodeFrames.get(node.id);
            if (array) {
                const index = array.indexOf(expectation);
                if (index !== -1)
                    array.splice(index, 1);
            }
        }
    }
    /**
     * Waits until the node sends a message matching the given predicate or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    async expectNodeCC(node, timeout, predicate) {
        const ret = await this.expectNodeFrame(node, timeout, (msg) => msg.type === MockZWaveFrame_1.MockZWaveFrameType.Request &&
            predicate(msg.payload));
        return ret.payload;
    }
    /**
     * Waits until the controller sends an ACK frame or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    expectNodeACK(node, timeout) {
        return this.expectNodeFrame(node, timeout, (msg) => msg.type === MockZWaveFrame_1.MockZWaveFrameType.ACK);
    }
    /** Sends a message header (ACK/NAK/CAN) to the host/driver */
    sendHeaderToHost(data) {
        this.serial.emitData(Buffer.from([data]));
    }
    /** Sends a raw buffer to the host/driver and expect an ACK */
    async sendToHost(data) {
        this.serial.emitData(data);
        // TODO: make the timeout match the configured ACK timeout
        await this.expectHostACK(1000);
    }
    /** Gets called when a {@link MockZWaveFrame} is received from a {@link MockNode} */
    async onNodeFrame(node, frame) {
        // Ack the frame if desired
        if (this.autoAckNodeFrames &&
            frame.type === MockZWaveFrame_1.MockZWaveFrameType.Request) {
            await this.ackNodeRequestFrame(node, frame);
        }
        // Handle message buffer. Check for pending expectations first.
        const handler = this.expectedNodeFrames
            .get(node.id)
            ?.find((e) => !e.predicate || e.predicate(frame));
        if (handler) {
            handler.resolve(frame);
        }
        else {
            // Then apply generic predefined behavior
            for (const behavior of this.behaviors) {
                if (await behavior.onNodeFrame?.(this.host, this, node, frame))
                    return;
            }
        }
    }
    /**
     * Sends an ACK frame to a {@link MockNode}
     */
    async ackNodeRequestFrame(node, frame) {
        await this.sendToNode(node, (0, MockZWaveFrame_1.createMockZWaveAckFrame)({
            repeaters: frame?.repeaters,
        }));
    }
    /**
     * Sends a {@link MockZWaveFrame} to a {@link MockNode}
     */
    async sendToNode(node, frame) {
        let ret;
        if (frame.type === MockZWaveFrame_1.MockZWaveFrameType.Request && frame.ackRequested) {
            ret = this.expectNodeACK(node, MockZWaveFrame_1.MOCK_FRAME_ACK_TIMEOUT);
        }
        process.nextTick(() => {
            void node.onControllerFrame(frame);
        });
        if (ret)
            return await ret;
    }
    defineBehavior(...behaviors) {
        // New behaviors must override existing ones, so we insert at the front of the array
        this.behaviors.unshift(...behaviors);
    }
    /** Asserts that a message matching the given predicate was received from the host */
    assertReceivedHostMessage(predicate, options) {
        const { errorMessage } = options ?? {};
        const index = this.receivedHostMessages.findIndex(predicate);
        if (index === -1) {
            throw new Error(`Did not receive a host message matching the predicate!${errorMessage ? ` ${errorMessage}` : ""}`);
        }
    }
    /** Forgets all recorded messages received from the host */
    clearReceivedHostMessages() {
        this.receivedHostMessages = [];
    }
}
exports.MockController = MockController;
//# sourceMappingURL=MockController.js.map