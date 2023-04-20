import type { ZWaveHost } from "@zwave-js/host/safe";
import { CommandClass, CommandClassOptions } from "../lib/CommandClass";
import { DeviceResetLocallyCommand } from "../lib/_Types";
export declare class DeviceResetLocallyCC extends CommandClass {
    ccCommand: DeviceResetLocallyCommand;
    nodeId: number;
}
export declare class DeviceResetLocallyCCNotification extends DeviceResetLocallyCC {
    constructor(host: ZWaveHost, options: CommandClassOptions);
}
//# sourceMappingURL=DeviceResetLocallyCC.d.ts.map