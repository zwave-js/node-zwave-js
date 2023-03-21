/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { AllOrNone } from "@zwave-js/shared/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { FirmwareDownloadStatus, FirmwareUpdateActivationStatus, FirmwareUpdateMetaData, FirmwareUpdateMetaDataCommand, FirmwareUpdateRequestStatus, FirmwareUpdateStatus } from "../lib/_Types";
export declare const FirmwareUpdateMetaDataCCValues: Readonly<{
    continuesToFunction: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Firmware Update Meta Data"];
            property: "continuesToFunction";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Firmware Update Meta Data"];
            readonly endpoint: number;
            readonly property: "continuesToFunction";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    additionalFirmwareIDs: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Firmware Update Meta Data"];
            property: "additionalFirmwareIDs";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Firmware Update Meta Data"];
            readonly endpoint: number;
            readonly property: "additionalFirmwareIDs";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    firmwareUpgradable: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Firmware Update Meta Data"];
            property: "firmwareUpgradable";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Firmware Update Meta Data"];
            readonly endpoint: number;
            readonly property: "firmwareUpgradable";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    supportsActivation: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Firmware Update Meta Data"];
            property: "supportsActivation";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Firmware Update Meta Data"];
            readonly endpoint: number;
            readonly property: "supportsActivation";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
}>;
export declare class FirmwareUpdateMetaDataCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: FirmwareUpdateMetaDataCommand): Maybe<boolean>;
    /**
     * Requests information about the current firmware on the device
     */
    getMetaData(): Promise<FirmwareUpdateMetaData | undefined>;
    /**
     * Requests the device to start the firmware update process.
     * WARNING: This method may wait up to 60 seconds for a reply.
     */
    requestUpdate(options: FirmwareUpdateMetaDataCCRequestGetOptions): Promise<FirmwareUpdateRequestStatus>;
    /**
     * Sends a fragment of the new firmware to the device
     */
    sendFirmwareFragment(fragmentNumber: number, isLastFragment: boolean, data: Buffer): Promise<void>;
    /** Activates a previously transferred firmware image */
    activateFirmware(options: FirmwareUpdateMetaDataCCActivationSetOptions): Promise<FirmwareUpdateActivationStatus | undefined>;
}
export declare class FirmwareUpdateMetaDataCC extends CommandClass {
    ccCommand: FirmwareUpdateMetaDataCommand;
    skipEndpointInterview(): boolean;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class FirmwareUpdateMetaDataCCMetaDataReport extends FirmwareUpdateMetaDataCC implements FirmwareUpdateMetaData {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly manufacturerId: number;
    readonly firmwareId: number;
    readonly checksum: number;
    readonly firmwareUpgradable: boolean;
    readonly maxFragmentSize?: number;
    readonly additionalFirmwareIDs: readonly number[];
    readonly hardwareVersion?: number;
    readonly continuesToFunction: Maybe<boolean>;
    readonly supportsActivation: Maybe<boolean>;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateMetaDataCCMetaDataGet extends FirmwareUpdateMetaDataCC {
}
export declare class FirmwareUpdateMetaDataCCRequestReport extends FirmwareUpdateMetaDataCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly status: FirmwareUpdateRequestStatus;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type FirmwareUpdateMetaDataCCRequestGetOptions = {
    manufacturerId: number;
    firmwareId: number;
    checksum: number;
} & AllOrNone<{
    firmwareTarget: number;
    fragmentSize: number;
    activation?: boolean;
    hardwareVersion?: number;
}>;
export declare class FirmwareUpdateMetaDataCCRequestGet extends FirmwareUpdateMetaDataCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (FirmwareUpdateMetaDataCCRequestGetOptions & CCCommandOptions));
    manufacturerId: number;
    firmwareId: number;
    checksum: number;
    firmwareTarget?: number;
    fragmentSize?: number;
    activation?: boolean;
    hardwareVersion?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateMetaDataCCGet extends FirmwareUpdateMetaDataCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly numReports: number;
    readonly reportNumber: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface FirmwareUpdateMetaDataCCReportOptions extends CCCommandOptions {
    isLast: boolean;
    reportNumber: number;
    firmwareData: Buffer;
}
export declare class FirmwareUpdateMetaDataCCReport extends FirmwareUpdateMetaDataCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | FirmwareUpdateMetaDataCCReportOptions);
    isLast: boolean;
    reportNumber: number;
    firmwareData: Buffer;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateMetaDataCCStatusReport extends FirmwareUpdateMetaDataCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly status: FirmwareUpdateStatus;
    /** The wait time in seconds before the node becomes available for communication after the update */
    readonly waitTime?: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateMetaDataCCActivationReport extends FirmwareUpdateMetaDataCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly manufacturerId: number;
    readonly firmwareId: number;
    readonly checksum: number;
    readonly firmwareTarget: number;
    readonly activationStatus: FirmwareUpdateActivationStatus;
    readonly hardwareVersion?: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface FirmwareUpdateMetaDataCCActivationSetOptions {
    manufacturerId: number;
    firmwareId: number;
    checksum: number;
    firmwareTarget: number;
    hardwareVersion?: number;
}
export declare class FirmwareUpdateMetaDataCCActivationSet extends FirmwareUpdateMetaDataCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (FirmwareUpdateMetaDataCCActivationSetOptions & CCCommandOptions));
    manufacturerId: number;
    firmwareId: number;
    checksum: number;
    firmwareTarget: number;
    hardwareVersion?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateMetaDataCCPrepareReport extends FirmwareUpdateMetaDataCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly status: FirmwareDownloadStatus;
    readonly checksum: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface FirmwareUpdateMetaDataCCPrepareGetOptions extends CCCommandOptions {
    manufacturerId: number;
    firmwareId: number;
    firmwareTarget: number;
    fragmentSize: number;
    hardwareVersion: number;
}
export declare class FirmwareUpdateMetaDataCCPrepareGet extends FirmwareUpdateMetaDataCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | FirmwareUpdateMetaDataCCPrepareGetOptions);
    manufacturerId: number;
    firmwareId: number;
    firmwareTarget: number;
    fragmentSize: number;
    hardwareVersion: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=FirmwareUpdateMetaDataCC.d.ts.map