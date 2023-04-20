/**
 * @publicAPI
 * A dictionary of all command classes as of 2018-03-30
 */
export declare enum CommandClasses {
    "Alarm Sensor" = 156,
    "Alarm Silence" = 157,
    "All Switch" = 39,
    "Anti-Theft" = 93,
    "Anti-Theft Unlock" = 126,
    "Application Capability" = 87,
    "Application Status" = 34,
    "Association" = 133,
    "Association Command Configuration" = 155,
    "Association Group Information" = 89,
    "Authentication" = 161,
    "Authentication Media Write" = 162,
    "Barrier Operator" = 102,
    "Basic" = 32,
    "Basic Tariff Information" = 54,
    "Basic Window Covering" = 80,
    "Battery" = 128,
    "Binary Sensor" = 48,
    "Binary Switch" = 37,
    "Binary Toggle Switch" = 40,
    "Climate Control Schedule" = 70,
    "Central Scene" = 91,
    "Clock" = 129,
    "Color Switch" = 51,
    "Configuration" = 112,
    "Controller Replication" = 33,
    "CRC-16 Encapsulation" = 86,
    "Demand Control Plan Configuration" = 58,
    "Demand Control Plan Monitor" = 59,
    "Device Reset Locally" = 90,
    "Door Lock" = 98,
    "Door Lock Logging" = 76,
    "Energy Production" = 144,
    "Entry Control" = 111,
    "Firmware Update Meta Data" = 122,
    "Generic Schedule" = 163,
    "Geographic Location" = 140,
    "Grouping Name" = 123,
    "Hail" = 130,
    "HRV Status" = 55,
    "HRV Control" = 57,
    "Humidity Control Mode" = 109,
    "Humidity Control Operating State" = 110,
    "Humidity Control Setpoint" = 100,
    "Inclusion Controller" = 116,
    "Indicator" = 135,
    "IP Association" = 92,
    "IP Configuration" = 154,
    "IR Repeater" = 160,
    "Irrigation" = 107,
    "Language" = 137,
    "Lock" = 118,
    "Mailbox" = 105,
    "Manufacturer Proprietary" = 145,
    "Manufacturer Specific" = 114,
    "Support/Control Mark" = 239,
    "Meter" = 50,
    "Meter Table Configuration" = 60,
    "Meter Table Monitor" = 61,
    "Meter Table Push Configuration" = 62,
    "Move To Position Window Covering" = 81,
    "Multi Channel" = 96,
    "Multi Channel Association" = 142,
    "Multi Command" = 143,
    "Multilevel Sensor" = 49,
    "Multilevel Switch" = 38,
    "Multilevel Toggle Switch" = 41,
    "Network Management Basic Node" = 77,
    "Network Management Inclusion" = 52,
    "Network Management Installation and Maintenance" = 103,
    "Network Management Primary" = 84,
    "Network Management Proxy" = 82,
    "No Operation" = 0,
    "Node Naming and Location" = 119,
    "Node Provisioning" = 120,
    "Notification" = 113,
    "Powerlevel" = 115,
    "Prepayment" = 63,
    "Prepayment Encapsulation" = 65,
    "Proprietary" = 136,
    "Protection" = 117,
    "Pulse Meter" = 53,
    "Rate Table Configuration" = 72,
    "Rate Table Monitor" = 73,
    "Remote Association Activation" = 124,
    "Remote Association Configuration" = 125,
    "Scene Activation" = 43,
    "Scene Actuator Configuration" = 44,
    "Scene Controller Configuration" = 45,
    "Schedule" = 83,
    "Schedule Entry Lock" = 78,
    "Screen Attributes" = 147,
    "Screen Meta Data" = 146,
    "Security" = 152,
    "Security 2" = 159,
    "Security Mark" = 61696,
    "Sensor Configuration" = 158,
    "Simple AV Control" = 148,
    "Sound Switch" = 121,
    "Supervision" = 108,
    "Tariff Table Configuration" = 74,
    "Tariff Table Monitor" = 75,
    "Thermostat Fan Mode" = 68,
    "Thermostat Fan State" = 69,
    "Thermostat Mode" = 64,
    "Thermostat Operating State" = 66,
    "Thermostat Setback" = 71,
    "Thermostat Setpoint" = 67,
    "Time" = 138,
    "Time Parameters" = 139,
    "Transport Service" = 85,
    "User Code" = 99,
    "Version" = 134,
    "Wake Up" = 132,
    "Window Covering" = 106,
    "Z/IP" = 35,
    "Z/IP 6LoWPAN" = 79,
    "Z/IP Gateway" = 95,
    "Z/IP Naming and Location" = 104,
    "Z/IP ND" = 88,
    "Z/IP Portal" = 97,
    "Z-Wave Plus Info" = 94,
    "Z-Wave Protocol" = 1
}
export declare function getCCName(cc: number): string;
/**
 * An array of all defined CCs
 */
export declare const allCCs: readonly CommandClasses[];
/**
 * Defines which CCs are considered Actuator CCs
 */
export declare const actuatorCCs: readonly CommandClasses[];
/**
 * Defines which CCs are considered Sensor CCs
 */
export declare const sensorCCs: readonly CommandClasses[];
/**
 * Defines which CCs are considered Application CCs
 */
export declare const applicationCCs: readonly CommandClasses[];
/**
 * Defines which CCs are considered Encapsulation CCs
 */
export declare const encapsulationCCs: readonly CommandClasses[];
/**
 * Defines which CCs are considered Management CCs
 */
export declare const managementCCs: readonly CommandClasses[];
/**
 * An array of all defined CCs that are not application CCs
 */
export declare const nonApplicationCCs: readonly CommandClasses[];
export interface CommandClassInfo {
    /** Whether the endpoint or node can react to this CC */
    isSupported: boolean;
    /** Whether the endpoint or node can control other nodes with this CC */
    isControlled: boolean;
    /** Whether this CC is ONLY supported securely */
    secure: boolean;
    /** The maximum version of the CC that is supported or controlled */
    version: number;
}
//# sourceMappingURL=CommandClasses.d.ts.map