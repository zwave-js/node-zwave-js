/// <reference types="node" />
import { CommandClasses } from "@zwave-js/core/safe";
import type { NVM3Object } from "../nvm3/object";
import { NVMFile, NVMFileCreationOptions, NVMFileDeserializationOptions } from "./NVMFile";
export declare const SUC_UPDATES_PER_FILE_V5 = 8;
export interface SUCUpdateEntriesFileOptions extends NVMFileCreationOptions {
    updateEntries: SUCUpdateEntry[];
}
export interface SUCUpdateEntry {
    nodeId: number;
    changeType: number;
    supportedCCs: CommandClasses[];
    controlledCCs: CommandClasses[];
}
export declare function parseSUCUpdateEntry(buffer: Buffer, offset: number): SUCUpdateEntry | undefined;
export declare function encodeSUCUpdateEntry(entry: SUCUpdateEntry | undefined): Buffer;
export declare class SUCUpdateEntriesFileV0 extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | SUCUpdateEntriesFileOptions);
    updateEntries: SUCUpdateEntry[];
    serialize(): NVM3Object;
    toJSON(): {
        "SUC update entries": SUCUpdateEntry[];
    };
}
export declare const SUCUpdateEntriesFileIDV0: number | ((id: number) => boolean);
export declare const SUCUpdateEntriesFileV5IDBase = 344064;
export declare function sucUpdateIndexToSUCUpdateEntriesFileIDV5(index: number): number;
export declare class SUCUpdateEntriesFileV5 extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | SUCUpdateEntriesFileOptions);
    updateEntries: SUCUpdateEntry[];
    serialize(): NVM3Object;
    toJSON(): {
        "SUC update entries": SUCUpdateEntry[];
    };
}
//# sourceMappingURL=SUCUpdateEntriesFile.d.ts.map