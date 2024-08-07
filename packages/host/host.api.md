## API Report File for "@zwave-js/host"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import type { CommandClasses } from '@zwave-js/core';
import type { ConfigManager } from '@zwave-js/config';
import type { ControllerLogger } from '@zwave-js/core';
import type { DeviceConfig } from '@zwave-js/config';
import type { ICommandClass } from '@zwave-js/core';
import { IZWaveNode } from '@zwave-js/core';
import type { MaybeNotKnown } from '@zwave-js/core';
import type { NodeIDType } from '@zwave-js/core';
import type { Overwrite } from 'alcalzone-shared/types';
import type { ReadonlyThrowingMap } from '@zwave-js/shared';
import type { SecurityClass } from '@zwave-js/core';
import type { SecurityManager } from '@zwave-js/core';
import type { SecurityManager2 } from '@zwave-js/core';
import type { SendCommandOptions } from '@zwave-js/core';
import type { SendCommandReturnType } from '@zwave-js/core';
import { ThrowingMap } from '@zwave-js/shared';
import type { ValueDB } from '@zwave-js/core';
import type { ValueID } from '@zwave-js/core';

// Warning: (ae-missing-release-tag) "createTestingHost" is part of the package's API, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export function createTestingHost(options?: Partial<CreateTestingHostOptions>): TestingHost;

// Warning: (ae-missing-release-tag) "CreateTestingHostOptions" is part of the package's API, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public (undocumented)
export interface CreateTestingHostOptions {
    // (undocumented)
    getSafeCCVersion: ZWaveHost["getSafeCCVersion"];
    // (undocumented)
    getSupportedCCVersion?: ZWaveHost["getSupportedCCVersion"];
    // (undocumented)
    homeId: ZWaveHost["homeId"];
    // (undocumented)
    ownNodeId: ZWaveHost["ownNodeId"];
}

// Warning: (ae-missing-release-tag) "FileSystem" is part of the package's API, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export interface FileSystem {
    // (undocumented)
    ensureDir(path: string): Promise<void>;
    // (undocumented)
    pathExists(path: string): Promise<boolean>;
    // (undocumented)
    readFile(file: string, encoding: BufferEncoding): Promise<string>;
    // (undocumented)
    writeFile(file: string, data: string | Buffer, options?: {
        encoding: BufferEncoding;
    } | BufferEncoding): Promise<void>;
}

// Warning: (ae-missing-release-tag) "NodeSchedulePollOptions" is part of the package's API, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public (undocumented)
export interface NodeSchedulePollOptions {
    expectedValue?: unknown;
    timeoutMs?: number;
}

// Warning: (ae-missing-release-tag) "TestingHost" is part of the package's API, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public (undocumented)
export type TestingHost = Overwrite<Omit<ZWaveApplicationHost, "__internalIsMockNode">, {
    nodes: ThrowingMap<number, IZWaveNode>;
}>;

// Warning: (ae-missing-release-tag) "ZWaveApplicationHost" is part of the package's API, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export interface ZWaveApplicationHost extends ZWaveValueHost, ZWaveHost {
    configManager: ConfigManager;
    // (undocumented)
    controllerLog: ControllerLogger;
    isControllerNode(nodeId: number): boolean;
    nodes: ReadonlyThrowingMap<number, IZWaveNode>;
    // (undocumented)
    options: ZWaveHostOptions;
    // (undocumented)
    schedulePoll(nodeId: number, valueId: ValueID, options: NodeSchedulePollOptions): boolean;
    // (undocumented)
    sendCommand<TResponse extends ICommandClass | undefined = undefined>(command: ICommandClass, options?: SendCommandOptions): Promise<SendCommandReturnType<TResponse>>;
    // (undocumented)
    waitForCommand<T extends ICommandClass>(predicate: (cc: ICommandClass) => boolean, timeout: number): Promise<T>;
}

// Warning: (ae-missing-release-tag) "ZWaveHost" is part of the package's API, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export interface ZWaveHost {
    // (undocumented)
    __internalIsMockNode?: boolean;
    // (undocumented)
    getDeviceConfig?: (nodeId: number) => DeviceConfig | undefined;
    // (undocumented)
    getHighestSecurityClass(nodeId: number): MaybeNotKnown<SecurityClass>;
    getNextCallbackId(): number;
    getNextSupervisionSessionId(nodeId: number): number;
    getSafeCCVersion(cc: CommandClasses, nodeId: number, endpointIndex?: number): number;
    getSupportedCCVersion(cc: CommandClasses, nodeId: number, endpointIndex?: number): number;
    // (undocumented)
    hasSecurityClass(nodeId: number, securityClass: SecurityClass): MaybeNotKnown<boolean>;
    homeId: number;
    isCCSecure(cc: CommandClasses, nodeId: number, endpointIndex?: number): boolean;
    readonly nodeIdType?: NodeIDType;
    ownNodeId: number;
    securityManager: SecurityManager | undefined;
    securityManager2: SecurityManager2 | undefined;
    securityManagerLR: SecurityManager2 | undefined;
    // (undocumented)
    setSecurityClass(nodeId: number, securityClass: SecurityClass, granted: boolean): void;
}

// Warning: (ae-missing-release-tag) "ZWaveHostOptions" is part of the package's API, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public (undocumented)
export interface ZWaveHostOptions {
    // (undocumented)
    attempts: {
        controller: number;
        sendData: number;
        nodeInterview: number;
    };
    disableOptimisticValueUpdate?: boolean;
    // (undocumented)
    interview?: {
        queryAllUserCodes?: boolean;
    };
    // (undocumented)
    preferences?: {
        scales: Partial<Record<string | number, string | number>>;
    };
    timeouts: {
        refreshValue: number;
        refreshValueAfterTransition: number;
    };
}

// Warning: (ae-missing-release-tag) "ZWaveValueHost" is part of the package's API, but it is missing a release tag (@alpha, @beta, @public, or @internal)
//
// @public
export interface ZWaveValueHost {
    getValueDB(nodeId: number): ValueDB;
    tryGetValueDB(nodeId: number): ValueDB | undefined;
}

// (No @packageDocumentation comment for this package)

```
