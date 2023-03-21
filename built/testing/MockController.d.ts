/// <reference types="node" />
import { ICommandClass } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message } from "@zwave-js/serial";
import type { MockPortBinding } from "@zwave-js/serial/mock";
import { MockControllerCapabilities } from "./MockControllerCapabilities";
import type { MockNode } from "./MockNode";
import { MockZWaveAckFrame, MockZWaveFrame, MockZWaveRequestFrame } from "./MockZWaveFrame";
export interface MockControllerOptions {
    serial: MockPortBinding;
    ownNodeId?: number;
    homeId?: number;
    capabilities?: Partial<MockControllerCapabilities>;
}
/** A mock Z-Wave controller which interacts with {@link MockNode}s and can be controlled via a {@link MockSerialPort} */
export declare class MockController {
    constructor(options: MockControllerOptions);
    readonly serial: MockPortBinding;
    private readonly serialParser;
    private expectedHostACKs;
    private expectedHostMessages;
    private expectedNodeFrames;
    private behaviors;
    /** Records the messages received from the host to perform assertions on them */
    private receivedHostMessages;
    private _nodes;
    get nodes(): ReadonlyMap<number, MockNode>;
    addNode(node: MockNode): void;
    removeNode(node: MockNode): void;
    readonly host: ZWaveHost;
    readonly capabilities: MockControllerCapabilities;
    /** Can be used by behaviors to store controller related state */
    readonly state: Map<string, unknown>;
    /** Controls whether the controller automatically ACKs node frames before handling them */
    autoAckNodeFrames: boolean;
    /** Gets called when parsed/chunked data is received from the serial port */
    private serialOnData;
    /**
     * Waits until the host sends an ACK or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    expectHostACK(timeout: number): Promise<void>;
    /**
     * Waits until the host sends a message matching the given predicate or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    expectHostMessage(timeout: number, predicate: (msg: Message) => boolean): Promise<Message>;
    /**
     * Waits until the node sends a message matching the given predicate or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    expectNodeFrame<T extends MockZWaveFrame = MockZWaveFrame>(node: MockNode, timeout: number, predicate: (msg: MockZWaveFrame) => msg is T): Promise<T>;
    /**
     * Waits until the node sends a message matching the given predicate or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    expectNodeCC<T extends ICommandClass = ICommandClass>(node: MockNode, timeout: number, predicate: (cc: ICommandClass) => cc is T): Promise<T>;
    /**
     * Waits until the controller sends an ACK frame or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    expectNodeACK(node: MockNode, timeout: number): Promise<MockZWaveAckFrame>;
    /** Sends a message header (ACK/NAK/CAN) to the host/driver */
    private sendHeaderToHost;
    /** Sends a raw buffer to the host/driver and expect an ACK */
    sendToHost(data: Buffer): Promise<void>;
    /** Gets called when a {@link MockZWaveFrame} is received from a {@link MockNode} */
    onNodeFrame(node: MockNode, frame: MockZWaveFrame): Promise<void>;
    /**
     * Sends an ACK frame to a {@link MockNode}
     */
    ackNodeRequestFrame(node: MockNode, frame?: MockZWaveRequestFrame): Promise<void>;
    /**
     * Sends a {@link MockZWaveFrame} to a {@link MockNode}
     */
    sendToNode(node: MockNode, frame: MockZWaveFrame): Promise<MockZWaveAckFrame | undefined>;
    defineBehavior(...behaviors: MockControllerBehavior[]): void;
    /** Asserts that a message matching the given predicate was received from the host */
    assertReceivedHostMessage(predicate: (msg: Message) => boolean, options?: {
        errorMessage?: string;
    }): void;
    /** Forgets all recorded messages received from the host */
    clearReceivedHostMessages(): void;
}
export interface MockControllerBehavior {
    /** Gets called when a message from the host is received. Return `true` to indicate that the message has been handled. */
    onHostMessage?: (host: ZWaveHost, controller: MockController, msg: Message) => Promise<boolean | undefined> | boolean | undefined;
    /** Gets called when a message from a node is received. Return `true` to indicate that the message has been handled. */
    onNodeFrame?: (host: ZWaveHost, controller: MockController, node: MockNode, frame: MockZWaveFrame) => Promise<boolean | undefined> | boolean | undefined;
}
//# sourceMappingURL=MockController.d.ts.map