import type { BasicDeviceClass, ConfigManager, GenericDeviceClass, SpecificDeviceClass } from "@zwave-js/config";
import { CommandClasses } from "@zwave-js/core/safe";
import type { JSONObject } from "@zwave-js/shared";
export declare class DeviceClass {
    constructor(configManager: ConfigManager, basic: number, generic: number, specific: number);
    readonly basic: BasicDeviceClass;
    readonly generic: GenericDeviceClass;
    readonly specific: SpecificDeviceClass;
    private _mandatorySupportedCCs;
    get mandatorySupportedCCs(): readonly CommandClasses[];
    private _mandatoryControlledCCs;
    get mandatoryControlledCCs(): readonly CommandClasses[];
    toJSON(): JSONObject;
}
//# sourceMappingURL=DeviceClass.d.ts.map