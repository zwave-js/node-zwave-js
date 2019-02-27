import { CommandClasses } from "../commandclass/CommandClass";
export declare enum BasicDeviceClasses {
    "Controller" = 1,
    "Routing Slave" = 2,
    "Slave" = 3,
    "Static Controller" = 4
}
export declare enum GenericDeviceClasses {
    "Appliance" = 6,
    "AV Control Point" = 3,
    "Display" = 4,
    "Entry Control" = 64,
    "Remote Controller" = 1,
    "Meter" = 49,
    "Pulse Meter" = 48,
    "Network Extender" = 5,
    "Non-Interoperable" = 255,
    "Repeater Slave" = 15,
    "Security Panel" = 23,
    "Semi-Interoperable" = 80,
    "Alarm Sensor" = 161,
    "Binary Sensor" = 32,
    "Multilevel Sensor" = 33,
    "Notification Sensor" = 7,
    "Static Controller" = 2,
    "Binary Switch" = 16,
    "Multilevel Switch" = 17,
    "Remote Switch" = 18,
    "Toggle Switch" = 19,
    "Thermostat" = 8,
    "Ventilation" = 22,
    "Wall Controller" = 24,
    "Window Covering" = 9,
    "ZIP Node" = 21
}
export declare class GenericDeviceClass {
    readonly name: string;
    readonly key: GenericDeviceClasses;
    readonly mandatorySupportedCCs: CommandClasses[];
    readonly mandatoryControlCCs: CommandClasses[];
    constructor(name: string, key: GenericDeviceClasses, mandatorySupportedCCs: CommandClasses[], mandatoryControlCCs: CommandClasses[], specificDeviceClasses: SpecificDeviceClass[]);
    readonly specificDeviceClasses: Map<number, SpecificDeviceClass>;
    static get(key: GenericDeviceClasses): GenericDeviceClass;
}
export declare class SpecificDeviceClass {
    readonly name: string;
    readonly key: number;
    readonly mandatorySupportedCCs: CommandClasses[];
    readonly mandatoryControlCCs: CommandClasses[];
    readonly basicCCForbidden: boolean;
    constructor(name: string, key: number, mandatorySupportedCCs?: CommandClasses[], mandatoryControlCCs?: CommandClasses[], basicCCForbidden?: boolean);
    static readonly NOT_USED: Readonly<SpecificDeviceClass>;
    static get(generic: GenericDeviceClasses, specific: number): SpecificDeviceClass;
}
export declare class DeviceClass {
    readonly basic: BasicDeviceClasses;
    readonly generic: GenericDeviceClass;
    readonly specific: SpecificDeviceClass;
    constructor(basic: BasicDeviceClasses, generic: GenericDeviceClass, specific: SpecificDeviceClass);
    private _mandatorySupportedCCs;
    readonly mandatorySupportedCCs: CommandClasses[];
    private _mandatoryControlCCs;
    readonly mandatoryControlCCs: CommandClasses[];
    toJSON(): {
        basic: string;
        generic: string;
        specific: string;
        mandatorySupportedCCs: string[];
        mandatoryControlCCs: string[];
    };
}
