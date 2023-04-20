/// <reference types="node" />
import { CommandClasses, IZWaveEndpoint, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import type { NotificationEventPayload } from "../lib/NotificationEventPayload";
import { KeypadMode, UserCodeCommand, UserIDStatus } from "../lib/_Types";
export declare const UserCodeCCValues: Readonly<{
    userCode: ((userId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "userCode";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "userCode";
            propertyKey: number;
        };
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly secret: true;
        };
    };
    userIdStatus: ((userId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "userIdStatus";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "userIdStatus";
            propertyKey: number;
        };
        readonly meta: {
            readonly label: `User ID status (${number})`;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    masterCode: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "masterCode";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "masterCode";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Master Code";
            readonly minLength: 4;
            readonly maxLength: 10;
            readonly type: "string";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
            readonly secret: true;
        };
    };
    keypadMode: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "keypadMode";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "keypadMode";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Keypad Mode";
            readonly writeable: false;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    userCodeChecksum: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "userCodeChecksum";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "userCodeChecksum";
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
    supportedASCIIChars: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "supportedASCIIChars";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "supportedASCIIChars";
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
    supportedKeypadModes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "supportedKeypadModes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "supportedKeypadModes";
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
    supportedUserIDStatuses: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "supportedUserIDStatuses";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "supportedUserIDStatuses";
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
    supportsMultipleUserCodeSet: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "supportsMultipleUserCodeSet";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "supportsMultipleUserCodeSet";
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
    supportsMultipleUserCodeReport: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "supportsMultipleUserCodeReport";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "supportsMultipleUserCodeReport";
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
    supportsUserCodeChecksum: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "supportsUserCodeChecksum";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "supportsUserCodeChecksum";
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
    supportsMasterCodeDeactivation: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "supportsMasterCodeDeactivation";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "supportsMasterCodeDeactivation";
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
    supportsMasterCode: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "supportsMasterCode";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "supportsMasterCode";
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
    supportedUsers: {
        readonly id: {
            commandClass: (typeof CommandClasses)["User Code"];
            property: "supportedUsers";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["User Code"];
            readonly endpoint: number;
            readonly property: "supportedUsers";
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
/** Formats a user code in a way that's safe to print in public logs */
export declare function userCodeToLogString(userCode: string | Buffer): string;
export declare class UserCodeCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: UserCodeCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    getUsersCount(): Promise<number | undefined>;
    get(userId: number, multiple?: false): Promise<Pick<UserCode, "userIdStatus" | "userCode"> | undefined>;
    get(userId: number, multiple: true): Promise<{
        userCodes: readonly UserCode[];
        nextUserId: number;
    } | undefined>;
    /** Configures a single user code */
    set(userId: number, userIdStatus: Exclude<UserIDStatus, UserIDStatus.Available | UserIDStatus.StatusNotAvailable>, userCode: string | Buffer): Promise<SupervisionResult | undefined>;
    /** Configures multiple user codes */
    setMany(codes: UserCodeCCSetOptions[]): Promise<SupervisionResult | undefined>;
    /**
     * Clears one or all user code
     * @param userId The user code to clear. If none or 0 is given, all codes are cleared
     */
    clear(userId?: number): Promise<SupervisionResult | undefined>;
    getCapabilities(): Promise<Pick<UserCodeCCCapabilitiesReport, "supportsMasterCode" | "supportsMasterCodeDeactivation" | "supportsUserCodeChecksum" | "supportsMultipleUserCodeReport" | "supportsMultipleUserCodeSet" | "supportedUserIDStatuses" | "supportedKeypadModes" | "supportedASCIIChars"> | undefined>;
    getKeypadMode(): Promise<KeypadMode | undefined>;
    setKeypadMode(keypadMode: KeypadMode): Promise<SupervisionResult | undefined>;
    getMasterCode(): Promise<string | undefined>;
    setMasterCode(masterCode: string): Promise<SupervisionResult | undefined>;
    getUserCodeChecksum(): Promise<number | undefined>;
}
export declare class UserCodeCC extends CommandClass {
    ccCommand: UserCodeCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    /**
     * Returns the number of supported users.
     * This only works AFTER the interview process
     */
    static getSupportedUsersCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): number | undefined;
    /**
     * Returns the supported keypad modes.
     * This only works AFTER the interview process
     */
    static getSupportedKeypadModesCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): KeypadMode[] | undefined;
    /**
     * Returns the supported user ID statuses.
     * This only works AFTER the interview process
     */
    static getSupportedUserIDStatusesCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): UserIDStatus[] | undefined;
    /**
     * Returns the supported ASCII characters.
     * This only works AFTER the interview process
     */
    static getSupportedASCIICharsCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): string | undefined;
    /**
     * Returns whether deactivating the master code is supported.
     * This only works AFTER the interview process
     */
    static supportsMasterCodeDeactivationCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): boolean;
    /**
     * Returns whether setting multiple user codes at once is supported.
     * This only works AFTER the interview process
     */
    static supportsMultipleUserCodeSetCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): boolean;
}
type UserCodeCCSetOptions = {
    userId: 0;
    userIdStatus: UserIDStatus.Available;
    userCode?: undefined;
} | {
    userId: number;
    userIdStatus: UserIDStatus.Available;
    userCode?: undefined;
} | {
    userId: number;
    userIdStatus: Exclude<UserIDStatus, UserIDStatus.Available | UserIDStatus.StatusNotAvailable>;
    userCode: string | Buffer;
};
export declare class UserCodeCCSet extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & UserCodeCCSetOptions));
    userId: number;
    userIdStatus: UserIDStatus;
    userCode: string | Buffer;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class UserCodeCCReport extends UserCodeCC implements NotificationEventPayload {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly userId: number;
    readonly userIdStatus: UserIDStatus;
    readonly userCode: string | Buffer;
    persistValues(applHost: ZWaveApplicationHost): boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
    toNotificationEventParameters(): {
        userId: number;
    };
}
interface UserCodeCCGetOptions extends CCCommandOptions {
    userId: number;
}
export declare class UserCodeCCGet extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | UserCodeCCGetOptions);
    userId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class UserCodeCCUsersNumberReport extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportedUsers: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class UserCodeCCUsersNumberGet extends UserCodeCC {
}
export declare class UserCodeCCCapabilitiesReport extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportsMasterCode: boolean;
    readonly supportsMasterCodeDeactivation: boolean;
    readonly supportsUserCodeChecksum: boolean;
    readonly supportsMultipleUserCodeReport: boolean;
    readonly supportsMultipleUserCodeSet: boolean;
    readonly supportedUserIDStatuses: readonly UserIDStatus[];
    readonly supportedKeypadModes: readonly KeypadMode[];
    readonly supportedASCIIChars: string;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class UserCodeCCCapabilitiesGet extends UserCodeCC {
}
interface UserCodeCCKeypadModeSetOptions extends CCCommandOptions {
    keypadMode: KeypadMode;
}
export declare class UserCodeCCKeypadModeSet extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | UserCodeCCKeypadModeSetOptions);
    keypadMode: KeypadMode;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class UserCodeCCKeypadModeReport extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly keypadMode: KeypadMode;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class UserCodeCCKeypadModeGet extends UserCodeCC {
}
interface UserCodeCCMasterCodeSetOptions extends CCCommandOptions {
    masterCode: string;
}
export declare class UserCodeCCMasterCodeSet extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | UserCodeCCMasterCodeSetOptions);
    masterCode: string;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class UserCodeCCMasterCodeReport extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly masterCode: string;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class UserCodeCCMasterCodeGet extends UserCodeCC {
}
export declare class UserCodeCCUserCodeChecksumReport extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly userCodeChecksum: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class UserCodeCCUserCodeChecksumGet extends UserCodeCC {
}
export interface UserCodeCCExtendedUserCodeSetOptions extends CCCommandOptions {
    userCodes: UserCodeCCSetOptions[];
}
export interface UserCode {
    userId: number;
    userIdStatus: UserIDStatus;
    userCode: string;
}
export declare class UserCodeCCExtendedUserCodeSet extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | UserCodeCCExtendedUserCodeSetOptions);
    userCodes: UserCodeCCSetOptions[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class UserCodeCCExtendedUserCodeReport extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly userCodes: readonly UserCode[];
    readonly nextUserId: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface UserCodeCCExtendedUserCodeGetOptions extends CCCommandOptions {
    userId: number;
    reportMore?: boolean;
}
export declare class UserCodeCCExtendedUserCodeGet extends UserCodeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | UserCodeCCExtendedUserCodeGetOptions);
    userId: number;
    reportMore: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=UserCodeCC.d.ts.map