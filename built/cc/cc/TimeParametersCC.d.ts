/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { TimeParametersCommand } from "../lib/_Types";
export declare const TimeParametersCCValues: Readonly<{
    dateAndTime: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Time Parameters"];
            property: "dateAndTime";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Time Parameters"];
            readonly endpoint: number;
            readonly property: "dateAndTime";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Date and Time";
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
}>;
export declare class TimeParametersCCAPI extends CCAPI {
    supportsCommand(cmd: TimeParametersCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<Date | undefined>;
    set(dateAndTime: Date): Promise<SupervisionResult | undefined>;
}
export declare class TimeParametersCC extends CommandClass {
    ccCommand: TimeParametersCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class TimeParametersCCReport extends TimeParametersCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _dateAndTime;
    get dateAndTime(): Date;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class TimeParametersCCGet extends TimeParametersCC {
}
interface TimeParametersCCSetOptions extends CCCommandOptions {
    dateAndTime: Date;
    useLocalTime?: boolean;
}
export declare class TimeParametersCCSet extends TimeParametersCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | TimeParametersCCSetOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    dateAndTime: Date;
    private useLocalTime?;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=TimeParametersCC.d.ts.map