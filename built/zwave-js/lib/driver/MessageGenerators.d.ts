import type { Message } from "@zwave-js/serial";
import { DeferredPromise } from "alcalzone-shared/deferred-promise";
import type { Driver } from "./Driver";
import type { MessageGenerator } from "./Transaction";
export type MessageGeneratorImplementation = (
/** A reference to the driver */
driver: Driver, 
/** The "primary" message */
message: Message, 
/**
 * A hook to get notified about each sent message and the result of the Serial API call
 * without waiting for the message generator to finish completely.
 */
onMessageSent: (msg: Message, result: Message | undefined) => void, 
/** Can be used to extend the timeout waiting for a response from a node to the sent message */
additionalCommandTimeoutMs?: number) => AsyncGenerator<Message, Message, Message>;
export declare function waitForNodeUpdate<T extends Message>(driver: Driver, msg: Message, timeoutMs: number): Promise<T>;
/** A simple message generator that simply sends a message, waits for the ACK (and the response if one is expected) */
export declare const simpleMessageGenerator: MessageGeneratorImplementation;
/** A generator for singlecast SendData messages that automatically uses Transport Service when necessary */
export declare const maybeTransportServiceGenerator: MessageGeneratorImplementation;
/** A message generator for security encapsulated messages (S0) */
export declare const secureMessageGeneratorS0: MessageGeneratorImplementation;
/** A message generator for security encapsulated messages (S2) */
export declare const secureMessageGeneratorS2: MessageGeneratorImplementation;
/** A message generator for security encapsulated messages (S2 Multicast) */
export declare const secureMessageGeneratorS2Multicast: MessageGeneratorImplementation;
export declare function createMessageGenerator<TResponse extends Message = Message>(driver: Driver, msg: Message, onMessageSent: (msg: Message, result: Message | undefined) => void): {
    generator: MessageGenerator;
    resultPromise: DeferredPromise<TResponse>;
};
//# sourceMappingURL=MessageGenerators.d.ts.map