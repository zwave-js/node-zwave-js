import type { Message } from "./Message";
/** Should be implemented by Serial API responses and callbacks which indicate success of the operation */
export interface SuccessIndicator {
    /** Whether the operation was successful */
    isOK(): boolean;
}
export declare function isSuccessIndicator<T extends Message>(msg: T): msg is T & SuccessIndicator;
/**
 * Should be implemented by Serial API callbacks which are received multiple times to indicate whether further callbacks are expected
 */
export interface MultiStageCallback {
    /** Whether this callback is the final one */
    isFinal(): boolean;
}
export declare function isMultiStageCallback<T extends Message>(msg: T): msg is T & MultiStageCallback;
//# sourceMappingURL=SuccessIndicator.d.ts.map