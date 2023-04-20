/// <reference types="node" />
import { IVirtualEndpoint, IZWaveEndpoint } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
export type ManufacturerProprietaryCCConstructor<T extends typeof ManufacturerProprietaryCC = typeof ManufacturerProprietaryCC> = T & {
    new (host: ZWaveHost, options: any): InstanceType<T>;
};
export declare class ManufacturerProprietaryCCAPI extends CCAPI {
    constructor(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint | IVirtualEndpoint);
    sendData(manufacturerId: number, data?: Buffer): Promise<void>;
    sendAndReceiveData(manufacturerId: number, data?: Buffer): Promise<{
        manufacturerId: number | undefined;
        data: Buffer;
    } | undefined>;
}
export interface ManufacturerProprietaryCCOptions extends CCCommandOptions {
    manufacturerId?: number;
    unspecifiedExpectsResponse?: boolean;
}
export declare class ManufacturerProprietaryCC extends CommandClass {
    ccCommand: undefined;
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ManufacturerProprietaryCCOptions);
    manufacturerId?: number;
    private getManufacturerIdOrThrow;
    serialize(): Buffer;
    createSpecificInstance(): ManufacturerProprietaryCC | undefined;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
//# sourceMappingURL=ManufacturerProprietaryCC.d.ts.map