/// <reference types="node" />
import { CommandClasses, Duration, EncapsulationFlags, IZWaveEndpoint, Maybe, MessageOrCCLogEntry, SinglecastCC, SupervisionStatus } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { SupervisionCommand } from "../lib/_Types";
export declare const SupervisionCCValues: Readonly<{
    ccSupported: ((ccId: CommandClasses) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Supervision;
            readonly endpoint: number;
            readonly property: "ccSupported";
            readonly propertyKey: CommandClasses;
        };
        readonly id: {
            commandClass: CommandClasses.Supervision;
            property: "ccSupported";
            propertyKey: CommandClasses;
        };
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly internal: true;
            readonly supportsEndpoints: false;
        };
    };
}>;
export declare class SupervisionCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: SupervisionCommand): Maybe<boolean>;
    sendReport(options: SupervisionCCReportOptions & {
        encapsulationFlags?: EncapsulationFlags;
    }): Promise<void>;
}
export declare class SupervisionCC extends CommandClass {
    ccCommand: SupervisionCommand;
    nodeId: number;
    /** Tests if a command should be supervised and thus requires encapsulation */
    static requiresEncapsulation(cc: CommandClass): boolean;
    /** Encapsulates a command that targets a specific endpoint */
    static encapsulate(host: ZWaveHost, cc: CommandClass, requestStatusUpdates?: boolean): SupervisionCCGet;
    /**
     * Given a CC instance, this returns the Supervision session ID which is used for this command.
     * Returns `undefined` when there is no session ID or the command was sent as multicast.
     */
    static getSessionId(command: CommandClass): number | undefined;
    /**
     * Returns whether a node supports the given CC with Supervision encapsulation.
     */
    static getCCSupportedWithSupervision(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint, ccId: CommandClasses): boolean;
    /**
     * Remembers whether a node supports the given CC with Supervision encapsulation.
     */
    static setCCSupportedWithSupervision(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint, ccId: CommandClasses, supported: boolean): void;
    /** Returns whether this is a valid command to send supervised */
    static mayUseSupervision<T extends CommandClass>(applHost: ZWaveApplicationHost, command: T): command is SinglecastCC<T>;
}
export type SupervisionCCReportOptions = {
    moreUpdatesFollow: boolean;
    requestWakeUpOnDemand?: boolean;
    sessionId: number;
} & ({
    status: SupervisionStatus.Working;
    duration: Duration;
} | {
    status: SupervisionStatus.NoSupport | SupervisionStatus.Fail | SupervisionStatus.Success;
});
export declare class SupervisionCCReport extends SupervisionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & SupervisionCCReportOptions));
    readonly moreUpdatesFollow: boolean;
    readonly requestWakeUpOnDemand: boolean;
    readonly sessionId: number;
    readonly status: SupervisionStatus;
    readonly duration: Duration | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface SupervisionCCGetOptions extends CCCommandOptions {
    requestStatusUpdates: boolean;
    encapsulated: CommandClass;
}
export declare class SupervisionCCGet extends SupervisionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SupervisionCCGetOptions);
    requestStatusUpdates: boolean;
    sessionId: number;
    encapsulated: CommandClass;
    serialize(): Buffer;
    protected computeEncapsulationOverhead(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=SupervisionCC.d.ts.map