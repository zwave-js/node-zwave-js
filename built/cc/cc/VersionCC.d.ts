/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, ZWaveLibraryTypes } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { VersionCommand } from "../lib/_Types";
export declare const VersionCCValues: Readonly<{
    applicationBuildNumber: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "applicationBuildNumber";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "applicationBuildNumber";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Application build number";
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly autoCreate: true;
            readonly minVersion: 3;
            readonly supportsEndpoints: false;
        };
    };
    applicationVersion: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "applicationVersion";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "applicationVersion";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Application version";
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly autoCreate: true;
            readonly minVersion: 3;
            readonly supportsEndpoints: false;
        };
    };
    zWaveProtocolBuildNumber: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "zWaveProtocolBuildNumber";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "zWaveProtocolBuildNumber";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Z-Wave protocol build number";
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly autoCreate: true;
            readonly minVersion: 3;
            readonly supportsEndpoints: false;
        };
    };
    zWaveProtocolVersion: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "zWaveProtocolVersion";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "zWaveProtocolVersion";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Z-Wave protocol version";
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly autoCreate: true;
            readonly minVersion: 3;
            readonly supportsEndpoints: false;
        };
    };
    serialAPIBuildNumber: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "hostInterfaceBuildNumber";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "hostInterfaceBuildNumber";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Serial API build number";
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly autoCreate: true;
            readonly minVersion: 3;
            readonly supportsEndpoints: false;
        };
    };
    serialAPIVersion: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "hostInterfaceVersion";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "hostInterfaceVersion";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Serial API version";
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly autoCreate: true;
            readonly minVersion: 3;
            readonly supportsEndpoints: false;
        };
    };
    applicationFrameworkBuildNumber: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "applicationFrameworkBuildNumber";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "applicationFrameworkBuildNumber";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Z-Wave application framework API build number";
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly autoCreate: true;
            readonly minVersion: 3;
            readonly supportsEndpoints: false;
        };
    };
    applicationFrameworkAPIVersion: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "applicationFrameworkAPIVersion";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "applicationFrameworkAPIVersion";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Z-Wave application framework API version";
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly autoCreate: true;
            readonly minVersion: 3;
            readonly supportsEndpoints: false;
        };
    };
    sdkVersion: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "sdkVersion";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "sdkVersion";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "SDK version";
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly autoCreate: true;
            readonly minVersion: 3;
            readonly supportsEndpoints: false;
        };
    };
    supportsZWaveSoftwareGet: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "supportsZWaveSoftwareGet";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "supportsZWaveSoftwareGet";
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
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 3;
            readonly internal: true;
        };
    };
    hardwareVersion: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "hardwareVersion";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "hardwareVersion";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Z-Wave chip hardware version";
            readonly writeable: false;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly autoCreate: true;
            readonly minVersion: 2;
            readonly supportsEndpoints: false;
        };
    };
    protocolVersion: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "protocolVersion";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "protocolVersion";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Z-Wave protocol version";
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
    libraryType: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "libraryType";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "libraryType";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Library type";
            readonly states: {
                [x: number]: string;
            };
            readonly writeable: false;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
    firmwareVersions: {
        readonly id: {
            commandClass: CommandClasses.Version;
            property: "firmwareVersions";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Version;
            readonly endpoint: number;
            readonly property: "firmwareVersions";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly type: "string[]";
            readonly label: "Z-Wave chip firmware versions";
            readonly writeable: false;
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
}>;
export declare class VersionCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: VersionCommand): Maybe<boolean>;
    get(): Promise<Pick<VersionCCReport, "protocolVersion" | "hardwareVersion" | "firmwareVersions" | "libraryType"> | undefined>;
    getCCVersion(requestedCC: CommandClasses): Promise<number | undefined>;
    getCapabilities(): Promise<Pick<VersionCCCapabilitiesReport, "supportsZWaveSoftwareGet"> | undefined>;
    getZWaveSoftware(): Promise<Pick<VersionCCZWaveSoftwareReport, "sdkVersion" | "applicationFrameworkAPIVersion" | "applicationFrameworkBuildNumber" | "hostInterfaceVersion" | "hostInterfaceBuildNumber" | "zWaveProtocolVersion" | "zWaveProtocolBuildNumber" | "applicationVersion" | "applicationBuildNumber"> | undefined>;
}
export declare class VersionCC extends CommandClass {
    ccCommand: VersionCommand;
    determineRequiredCCInterviews(): readonly CommandClasses[];
    interview(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class VersionCCReport extends VersionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly libraryType: ZWaveLibraryTypes;
    readonly protocolVersion: string;
    readonly firmwareVersions: string[];
    readonly hardwareVersion: number | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class VersionCCGet extends VersionCC {
}
interface VersionCCCommandClassReportOptions extends CCCommandOptions {
    requestedCC: CommandClasses;
    ccVersion: number;
}
export declare class VersionCCCommandClassReport extends VersionCC {
    constructor(host: ZWaveHost, options: VersionCCCommandClassReportOptions | CommandClassDeserializationOptions);
    ccVersion: number;
    requestedCC: CommandClasses;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface VersionCCCommandClassGetOptions extends CCCommandOptions {
    requestedCC: CommandClasses;
}
export declare class VersionCCCommandClassGet extends VersionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | VersionCCCommandClassGetOptions);
    requestedCC: CommandClasses;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class VersionCCCapabilitiesReport extends VersionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportsZWaveSoftwareGet: boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class VersionCCCapabilitiesGet extends VersionCC {
}
export declare class VersionCCZWaveSoftwareReport extends VersionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly sdkVersion: string;
    readonly applicationFrameworkAPIVersion: string;
    readonly applicationFrameworkBuildNumber: number;
    readonly hostInterfaceVersion: string;
    readonly hostInterfaceBuildNumber: number;
    readonly zWaveProtocolVersion: string;
    readonly zWaveProtocolBuildNumber: number;
    readonly applicationVersion: string;
    readonly applicationBuildNumber: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class VersionCCZWaveSoftwareGet extends VersionCC {
}
export {};
//# sourceMappingURL=VersionCC.d.ts.map