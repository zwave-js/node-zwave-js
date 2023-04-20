import { CommandClasses, CommandClassInfo } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { MockController } from "./MockController";
import { MockEndpointCapabilities, PartialCCCapabilities, type MockNodeCapabilities } from "./MockNodeCapabilities";
import { MockZWaveAckFrame, MockZWaveFrame, MockZWaveRequestFrame } from "./MockZWaveFrame";
export interface MockNodeOptions {
    id: number;
    controller: MockController;
    capabilities?: Partial<MockNodeCapabilities> & {
        /** The CCs implemented by the root device of this node */
        commandClasses?: PartialCCCapabilities[];
        /** Additional, consecutive endpoints. The first one defined will be available at index 1. */
        endpoints?: (Partial<MockEndpointCapabilities> & {
            commandClasses?: PartialCCCapabilities[];
        })[];
    };
}
export interface MockEndpointOptions {
    index: number;
    node: MockNode;
    capabilities?: Partial<MockEndpointCapabilities> & {
        /** The CCs implemented by this endpoint */
        commandClasses?: PartialCCCapabilities[];
    };
}
export declare class MockEndpoint {
    constructor(options: MockEndpointOptions);
    readonly index: number;
    readonly node: MockNode;
    readonly capabilities: MockEndpointCapabilities;
    readonly implementedCCs: Map<CommandClasses, CommandClassInfo>;
    /** Adds information about a CC to this mock endpoint */
    addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void;
    /** Removes information about a CC from this mock node */
    removeCC(cc: CommandClasses): void;
}
/** A mock node that can be used to test the driver as if it were speaking to an actual network */
export declare class MockNode {
    constructor(options: MockNodeOptions);
    readonly host: ZWaveHost;
    readonly id: number;
    readonly controller: MockController;
    readonly capabilities: MockNodeCapabilities;
    private behaviors;
    readonly implementedCCs: Map<CommandClasses, CommandClassInfo>;
    readonly endpoints: Map<number, MockEndpoint>;
    /** Can be used by behaviors to store controller related state */
    readonly state: Map<string, unknown>;
    /** Controls whether the controller automatically ACKs node frames before handling them */
    autoAckControllerFrames: boolean;
    private expectedControllerFrames;
    /** Records the frames received from the controller to perform assertions on them */
    private receivedControllerFrames;
    /** Records the frames sent to the controller to perform assertions on them */
    private sentControllerFrames;
    /**
     * Waits until the controller sends a frame matching the given predicate or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    expectControllerFrame<T extends MockZWaveFrame = MockZWaveFrame>(timeout: number, predicate: (msg: MockZWaveFrame) => msg is T): Promise<T>;
    /**
     * Waits until the controller sends an ACK frame or a timeout has elapsed.
     *
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     */
    expectControllerACK(timeout: number): Promise<MockZWaveAckFrame>;
    /**
     * Sends a {@link MockZWaveFrame} to the {@link MockController}
     */
    sendToController(frame: MockZWaveFrame): Promise<MockZWaveAckFrame | undefined>;
    /** Gets called when a {@link MockZWaveFrame} is received from the {@link MockController} */
    onControllerFrame(frame: MockZWaveFrame): Promise<void>;
    /**
     * Sends an ACK frame to the {@link MockController}
     */
    ackControllerRequestFrame(frame?: MockZWaveRequestFrame): Promise<void>;
    /** Adds information about a CC to this mock node */
    addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void;
    /** Removes information about a CC from this mock node */
    removeCC(cc: CommandClasses): void;
    defineBehavior(...behaviors: MockNodeBehavior[]): void;
    /** Asserts that a frame matching the given predicate was received from the controller */
    assertReceivedControllerFrame(predicate: (frame: MockZWaveFrame) => boolean, options?: {
        noMatch?: boolean;
        errorMessage?: string;
    }): void;
    /** Forgets all recorded frames received from the controller */
    clearReceivedControllerFrames(): void;
    /** Asserts that a frame matching the given predicate was sent to the controller */
    assertSentControllerFrame(predicate: (frame: MockZWaveFrame) => boolean, options?: {
        noMatch?: boolean;
        errorMessage?: string;
    }): void;
    /** Forgets all recorded frames sent to the controller */
    clearSentControllerFrames(): void;
}
export interface MockNodeBehavior {
    /** Gets called when a message from the controller is received. Return `true` to indicate that the message has been handled. */
    onControllerFrame?: (controller: MockController, self: MockNode, frame: MockZWaveFrame) => Promise<boolean | undefined> | boolean | undefined;
}
//# sourceMappingURL=MockNode.d.ts.map