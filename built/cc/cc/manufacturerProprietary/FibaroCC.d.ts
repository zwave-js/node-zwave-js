/// <reference types="node" />
import { Maybe, MessageOrCCLogEntry, ValueID, ValueMetadata } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { POLL_VALUE, SET_VALUE, type PollValueImplementation, type SetValueImplementation } from "../../lib/API";
import { type CCCommandOptions, type CommandClassDeserializationOptions } from "../../lib/CommandClass";
import { ManufacturerProprietaryCC, ManufacturerProprietaryCCAPI } from "../ManufacturerProprietaryCC";
export declare const MANUFACTURERID_FIBARO = 271;
/** Returns the ValueID used to store the current venetian blind position */
export declare function getFibaroVenetianBlindPositionValueId(endpoint: number): ValueID;
/** Returns the value metadata for venetian blind position */
export declare function getFibaroVenetianBlindPositionMetadata(): ValueMetadata;
/** Returns the ValueID used to store the current venetian blind tilt */
export declare function getFibaroVenetianBlindTiltValueId(endpoint: number): ValueID;
/** Returns the value metadata for venetian blind tilt */
export declare function getFibaroVenetianBlindTiltMetadata(): ValueMetadata;
export declare enum FibaroCCIDs {
    VenetianBlind = 38
}
export declare class FibaroCCAPI extends ManufacturerProprietaryCCAPI {
    fibaroVenetianBlindsGet(): Promise<Pick<FibaroVenetianBlindCCReport, "position" | "tilt"> | undefined>;
    fibaroVenetianBlindsSetPosition(value: number): Promise<void>;
    fibaroVenetianBlindsSetTilt(value: number): Promise<void>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
}
export declare class FibaroCC extends ManufacturerProprietaryCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | CCCommandOptions);
    fibaroCCId?: number;
    fibaroCCCommand?: number;
    private getSupportedFibaroCCIDs;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    serialize(): Buffer;
}
export declare enum FibaroVenetianBlindCCCommand {
    Set = 1,
    Get = 2,
    Report = 3
}
export declare class FibaroVenetianBlindCC extends FibaroCC {
    fibaroCCId: FibaroCCIDs.VenetianBlind;
    fibaroCCCommand: FibaroVenetianBlindCCCommand;
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | CCCommandOptions);
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
export type FibaroVenetianBlindCCSetOptions = CCCommandOptions & ({
    position: number;
} | {
    tilt: number;
} | {
    position: number;
    tilt: number;
});
export declare class FibaroVenetianBlindCCSet extends FibaroVenetianBlindCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | FibaroVenetianBlindCCSetOptions);
    position: number | undefined;
    tilt: number | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class FibaroVenetianBlindCCReport extends FibaroVenetianBlindCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _position;
    get position(): Maybe<number> | undefined;
    private _tilt;
    get tilt(): Maybe<number> | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class FibaroVenetianBlindCCGet extends FibaroVenetianBlindCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | CCCommandOptions);
}
//# sourceMappingURL=FibaroCC.d.ts.map