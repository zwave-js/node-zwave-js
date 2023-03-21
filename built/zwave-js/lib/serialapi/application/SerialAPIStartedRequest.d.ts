/// <reference types="node" />
import { CommandClasses, MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export declare enum SerialAPIWakeUpReason {
    /** The Z-Wave API Module has been woken up by reset or external interrupt. */
    Reset = 0,
    /** The Z-Wave API Module has been woken up by a timer. */
    WakeUpTimer = 1,
    /** The Z-Wave API Module has been woken up by a Wake Up Beam. */
    WakeUpBeam = 2,
    /** The Z-Wave API Module has been woken up by a reset triggered by the watchdog. */
    WatchdogReset = 3,
    /** The Z-Wave API Module has been woken up by an external interrupt. */
    ExternalInterrupt = 4,
    /** The Z-Wave API Module has been woken up by a powering up. */
    PowerUp = 5,
    /** The Z-Wave API Module has been woken up by USB Suspend. */
    USBSuspend = 6,
    /** The Z-Wave API Module has been woken up by a reset triggered by software. */
    SoftwareReset = 7,
    /** The Z-Wave API Module has been woken up by an emergency watchdog reset. */
    EmergencyWatchdogReset = 8,
    /** The Z-Wave API Module has been woken up by a reset triggered by brownout circuit. */
    BrownoutCircuit = 9,
    /** The Z-Wave API Module has been woken up by an unknown reason. */
    Unknown = 255
}
export interface SerialAPIStartedRequestOptions extends MessageBaseOptions {
    wakeUpReason: SerialAPIWakeUpReason;
    watchdogEnabled: boolean;
    genericDeviceClass: number;
    specificDeviceClass: number;
    isListening: boolean;
    supportedCCs: CommandClasses[];
    controlledCCs: CommandClasses[];
    supportsLongRange: boolean;
}
export declare class SerialAPIStartedRequest extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SerialAPIStartedRequestOptions);
    wakeUpReason: SerialAPIWakeUpReason;
    watchdogEnabled: boolean;
    genericDeviceClass: number;
    specificDeviceClass: number;
    /** Whether this node is always listening or not */
    isListening: boolean;
    supportedCCs: CommandClasses[];
    controlledCCs: CommandClasses[];
    supportsLongRange: boolean;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=SerialAPIStartedRequest.d.ts.map