"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CommandClasses_1 = require("../commandclass/CommandClasses");
const strings_1 = require("../util/strings");
var BasicDeviceClasses;
(function (BasicDeviceClasses) {
    BasicDeviceClasses[BasicDeviceClasses["Controller"] = 1] = "Controller";
    BasicDeviceClasses[BasicDeviceClasses["Routing Slave"] = 2] = "Routing Slave";
    BasicDeviceClasses[BasicDeviceClasses["Slave"] = 3] = "Slave";
    BasicDeviceClasses[BasicDeviceClasses["Static Controller"] = 4] = "Static Controller";
})(BasicDeviceClasses = exports.BasicDeviceClasses || (exports.BasicDeviceClasses = {}));
var GenericDeviceClasses;
(function (GenericDeviceClasses) {
    GenericDeviceClasses[GenericDeviceClasses["Appliance"] = 6] = "Appliance";
    GenericDeviceClasses[GenericDeviceClasses["AV Control Point"] = 3] = "AV Control Point";
    GenericDeviceClasses[GenericDeviceClasses["Display"] = 4] = "Display";
    GenericDeviceClasses[GenericDeviceClasses["Entry Control"] = 64] = "Entry Control";
    GenericDeviceClasses[GenericDeviceClasses["Remote Controller"] = 1] = "Remote Controller";
    GenericDeviceClasses[GenericDeviceClasses["Meter"] = 49] = "Meter";
    GenericDeviceClasses[GenericDeviceClasses["Pulse Meter"] = 48] = "Pulse Meter";
    GenericDeviceClasses[GenericDeviceClasses["Network Extender"] = 5] = "Network Extender";
    GenericDeviceClasses[GenericDeviceClasses["Non-Interoperable"] = 255] = "Non-Interoperable";
    GenericDeviceClasses[GenericDeviceClasses["Repeater Slave"] = 15] = "Repeater Slave";
    GenericDeviceClasses[GenericDeviceClasses["Security Panel"] = 23] = "Security Panel";
    GenericDeviceClasses[GenericDeviceClasses["Semi-Interoperable"] = 80] = "Semi-Interoperable";
    GenericDeviceClasses[GenericDeviceClasses["Alarm Sensor"] = 161] = "Alarm Sensor";
    GenericDeviceClasses[GenericDeviceClasses["Binary Sensor"] = 32] = "Binary Sensor";
    GenericDeviceClasses[GenericDeviceClasses["Multilevel Sensor"] = 33] = "Multilevel Sensor";
    GenericDeviceClasses[GenericDeviceClasses["Notification Sensor"] = 7] = "Notification Sensor";
    GenericDeviceClasses[GenericDeviceClasses["Static Controller"] = 2] = "Static Controller";
    GenericDeviceClasses[GenericDeviceClasses["Binary Switch"] = 16] = "Binary Switch";
    GenericDeviceClasses[GenericDeviceClasses["Multilevel Switch"] = 17] = "Multilevel Switch";
    GenericDeviceClasses[GenericDeviceClasses["Remote Switch"] = 18] = "Remote Switch";
    GenericDeviceClasses[GenericDeviceClasses["Toggle Switch"] = 19] = "Toggle Switch";
    GenericDeviceClasses[GenericDeviceClasses["Thermostat"] = 8] = "Thermostat";
    GenericDeviceClasses[GenericDeviceClasses["Ventilation"] = 22] = "Ventilation";
    GenericDeviceClasses[GenericDeviceClasses["Wall Controller"] = 24] = "Wall Controller";
    GenericDeviceClasses[GenericDeviceClasses["Window Covering"] = 9] = "Window Covering";
    GenericDeviceClasses[GenericDeviceClasses["ZIP Node"] = 21] = "ZIP Node";
})(GenericDeviceClasses = exports.GenericDeviceClasses || (exports.GenericDeviceClasses = {}));
const genericDeviceClassDB = new Map();
class GenericDeviceClass {
    constructor(name, key, mandatorySupportedCCs, mandatoryControlCCs, specificDeviceClasses) {
        this.name = name;
        this.key = key;
        this.mandatorySupportedCCs = mandatorySupportedCCs;
        this.mandatoryControlCCs = mandatoryControlCCs;
        this.specificDeviceClasses = new Map();
        for (const specific of specificDeviceClasses) {
            this.specificDeviceClasses.set(specific.key, specific);
        }
    }
    static get(key) {
        if (genericDeviceClassDB.has(key))
            return genericDeviceClassDB.get(key);
        // Fallback if there's no known device class for this key
        return new GenericDeviceClass(`UNKNOWN (${strings_1.num2hex(key)})`, key, [], [], []);
    }
}
exports.GenericDeviceClass = GenericDeviceClass;
class SpecificDeviceClass {
    constructor(name, key, mandatorySupportedCCs = [], mandatoryControlCCs = [], basicCCForbidden = false) {
        this.name = name;
        this.key = key;
        this.mandatorySupportedCCs = mandatorySupportedCCs;
        this.mandatoryControlCCs = mandatoryControlCCs;
        this.basicCCForbidden = basicCCForbidden;
    }
    static get(generic, specific) {
        const specificClasses = GenericDeviceClass.get(generic)
            .specificDeviceClasses;
        if (specificClasses.has(specific))
            return specificClasses.get(specific);
        // Fallback if there's no known device class for this key
        return new SpecificDeviceClass(`UNKNOWN (${strings_1.num2hex(specific)})`, specific, [], []);
    }
}
SpecificDeviceClass.NOT_USED = Object.freeze(new SpecificDeviceClass("not used", 0x00));
exports.SpecificDeviceClass = SpecificDeviceClass;
function defineGeneric(name, mandatorySupportedCCs, mandatoryControlCCs, ...specificDeviceClasses) {
    if (mandatorySupportedCCs == null)
        mandatorySupportedCCs = [];
    if (mandatoryControlCCs == null)
        mandatoryControlCCs = [];
    // All devices must support the BASIC command class
    if (mandatorySupportedCCs.indexOf(CommandClasses_1.CommandClasses.Basic) === -1)
        mandatorySupportedCCs.unshift(CommandClasses_1.CommandClasses.Basic);
    // All devices have a non-specific version
    if (!specificDeviceClasses.some(spec => spec.key === SpecificDeviceClass.NOT_USED.key)) {
        specificDeviceClasses.unshift(SpecificDeviceClass.NOT_USED);
    }
    // remember the generic device class in the DB
    genericDeviceClassDB.set(GenericDeviceClasses[name], new GenericDeviceClass(name, GenericDeviceClasses[name], mandatorySupportedCCs, mandatoryControlCCs, specificDeviceClasses));
}
class DeviceClass {
    constructor(basic, generic, specific) {
        this.basic = basic;
        this.generic = generic;
        this.specific = specific;
        this._mandatorySupportedCCs = generic.mandatorySupportedCCs
            .concat(...specific.mandatorySupportedCCs)
            .reduce((acc, cc) => {
            if (acc.indexOf(cc) === -1)
                acc.push(cc);
            return acc;
        }, []);
        // remove basic CC if it's forbidden by the specific class
        if (specific.basicCCForbidden) {
            const basicIndex = this._mandatorySupportedCCs.indexOf(CommandClasses_1.CommandClasses.Basic);
            if (basicIndex > -1)
                this._mandatorySupportedCCs.splice(basicIndex, 1);
        }
        this._mandatoryControlCCs = generic.mandatoryControlCCs
            .concat(...specific.mandatoryControlCCs)
            .reduce((acc, cc) => {
            if (acc.indexOf(cc) === -1)
                acc.push(cc);
            return acc;
        }, []);
    }
    get mandatorySupportedCCs() {
        return this._mandatorySupportedCCs;
    }
    get mandatoryControlCCs() {
        return this._mandatoryControlCCs;
    }
    toJSON() {
        return {
            basic: BasicDeviceClasses[this.basic],
            generic: this.generic.name,
            specific: this.specific.name,
            mandatorySupportedCCs: this._mandatorySupportedCCs.map(cc => CommandClasses_1.CommandClasses[cc]),
            mandatoryControlCCs: this._mandatoryControlCCs.map(cc => CommandClasses_1.CommandClasses[cc]),
        };
    }
}
exports.DeviceClass = DeviceClass;
// =================================================
// Here the definitions for all device classes begin
defineGeneric("Alarm Sensor", null, null, new SpecificDeviceClass("Basic Routing Alarm Sensor", 0x01, [
    CommandClasses_1.CommandClasses["Alarm Sensor"],
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses["Alarm Sensor"]]), new SpecificDeviceClass("Routing Alarm Sensor", 0x02, [
    CommandClasses_1.CommandClasses["Alarm Sensor"],
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses.Battery,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses["Alarm Sensor"]]), new SpecificDeviceClass("Basic Zensor Net Alarm Sensor", 0x03, [
    CommandClasses_1.CommandClasses["Alarm Sensor"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses["Alarm Sensor"]]), new SpecificDeviceClass("Zensor Net Alarm Sensor", 0x04, [
    CommandClasses_1.CommandClasses["Alarm Sensor"],
    CommandClasses_1.CommandClasses.Battery,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses["Alarm Sensor"]]), new SpecificDeviceClass("Advanced Zensor Net Alarm Sensor", 0x05, [
    CommandClasses_1.CommandClasses["Alarm Sensor"],
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses.Battery,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses["Alarm Sensor"]]), new SpecificDeviceClass("Basic Routing Smoke Sensor", 0x06, [
    CommandClasses_1.CommandClasses["Alarm Sensor"],
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses["Alarm Sensor"]]), new SpecificDeviceClass("Routing Smoke Sensor", 0x07, [
    CommandClasses_1.CommandClasses["Alarm Sensor"],
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses.Battery,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses["Alarm Sensor"]]), new SpecificDeviceClass("Basic Zensor Net Smoke Sensor", 0x08, [
    CommandClasses_1.CommandClasses["Alarm Sensor"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses["Alarm Sensor"]]), new SpecificDeviceClass("Zensor Net Smoke Sensor", 0x09, [
    CommandClasses_1.CommandClasses["Alarm Sensor"],
    CommandClasses_1.CommandClasses.Battery,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses["Alarm Sensor"]]), new SpecificDeviceClass("Advanced Zensor Net Smoke Sensor", 0x0a, [
    CommandClasses_1.CommandClasses["Alarm Sensor"],
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses.Battery,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses["Alarm Sensor"]]));
defineGeneric("AV Control Point", null, null, new SpecificDeviceClass("Doorbell", 0x12, [
    CommandClasses_1.CommandClasses["Binary Sensor"],
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]), new SpecificDeviceClass("Satellite Receiver", 0x04, [
    CommandClasses_1.CommandClasses["Simple AV Control"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]), new SpecificDeviceClass("Satellite Receiver V2", 0x11, [
    // Basic is automatically included
    CommandClasses_1.CommandClasses["Simple AV Control"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]));
defineGeneric("Binary Sensor", [CommandClasses_1.CommandClasses["Binary Sensor"]], null, new SpecificDeviceClass("Routing Binary Sensor", 0x01));
defineGeneric("Binary Switch", [CommandClasses_1.CommandClasses["Binary Switch"]], null, new SpecificDeviceClass("Binary Power Switch", 0x01, [
    CommandClasses_1.CommandClasses["All Switch"],
]), new SpecificDeviceClass("Binary Scene Switch", 0x03, [
    CommandClasses_1.CommandClasses["All Switch"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses["Scene Activation"],
    CommandClasses_1.CommandClasses["Scene Actuator Configuration"],
]), new SpecificDeviceClass("Binary Tunable Color Light", 0x02, [
    CommandClasses_1.CommandClasses["All Switch"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses["Color Switch"],
]), new SpecificDeviceClass("Irrigation Control", 0x07));
defineGeneric("Display", null, null, new SpecificDeviceClass("Simple Display", 0x01, [
    CommandClasses_1.CommandClasses["Screen Attributes"],
    CommandClasses_1.CommandClasses["Screen Meta Data"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]));
defineGeneric("Entry Control", null, null, new SpecificDeviceClass("Door Lock", 0x01, [CommandClasses_1.CommandClasses.Lock]), new SpecificDeviceClass("Advanced Door Lock", 0x02, [
    CommandClasses_1.CommandClasses["Door Lock"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]), new SpecificDeviceClass("Secure Keypad Door Lock", 0x03, [
    CommandClasses_1.CommandClasses["Door Lock"],
    CommandClasses_1.CommandClasses["User Code"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Security,
    CommandClasses_1.CommandClasses.Version,
]), new SpecificDeviceClass("Secure Lockbox", 0x0a, [
    CommandClasses_1.CommandClasses.Notification,
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses["Door Lock"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Security,
    CommandClasses_1.CommandClasses.Version,
], null, true /* No BASIC CC */), new SpecificDeviceClass("Secure Keypad", 0x0b, [
    CommandClasses_1.CommandClasses["Device Reset Locally"],
    CommandClasses_1.CommandClasses["Entry Control"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Security,
    CommandClasses_1.CommandClasses.Version,
]));
defineGeneric("Meter", null, null, new SpecificDeviceClass("Simple Meter", 0x01, [
    CommandClasses_1.CommandClasses.Meter,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]), new SpecificDeviceClass("Advanced Energy Control", 0x02, [
    CommandClasses_1.CommandClasses["Meter Table Monitor"],
    CommandClasses_1.CommandClasses["Meter Table Configuration"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]));
defineGeneric("Multilevel Sensor", [CommandClasses_1.CommandClasses["Multilevel Sensor"]], null, new SpecificDeviceClass("Routing Multilevel Sensor", 0x01));
defineGeneric("Multilevel Switch", [CommandClasses_1.CommandClasses["Multilevel Switch"]], null, new SpecificDeviceClass("Multilevel Power Switch", 0x01, [
    CommandClasses_1.CommandClasses["All Switch"],
]), new SpecificDeviceClass("Multilevel Scene Switch", 0x04, [
    CommandClasses_1.CommandClasses["All Switch"],
    CommandClasses_1.CommandClasses["Scene Activation"],
    CommandClasses_1.CommandClasses["Scene Actuator Configuration"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
]), new SpecificDeviceClass("Multiposition Motor", 0x03, [
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]), new SpecificDeviceClass("Motor Control Class A", 0x05, [
    CommandClasses_1.CommandClasses["Binary Switch"],
    CommandClasses_1.CommandClasses["Multilevel Switch"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]), new SpecificDeviceClass("Motor Control Class B", 0x06, [
    CommandClasses_1.CommandClasses["Binary Switch"],
    CommandClasses_1.CommandClasses["Multilevel Switch"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]), new SpecificDeviceClass("Motor Control Class C", 0x07, [
    CommandClasses_1.CommandClasses["Binary Switch"],
    CommandClasses_1.CommandClasses["Multilevel Switch"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]));
defineGeneric("Pulse Meter", [CommandClasses_1.CommandClasses["Pulse Meter"]], null);
defineGeneric("Remote Controller", null, null, new SpecificDeviceClass("Portable Remote Controller", 0x01), new SpecificDeviceClass("Portable Scene Controller", 0x02, [
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses["Scene Controller Configuration"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
], [CommandClasses_1.CommandClasses["Scene Activation"]]), new SpecificDeviceClass("Portable Installer Tool", 0x03, [
    CommandClasses_1.CommandClasses["Controller Replication"],
    CommandClasses_1.CommandClasses["Multi Command"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses.Configuration,
    CommandClasses_1.CommandClasses["Controller Replication"],
    CommandClasses_1.CommandClasses["Multi Channel"],
    CommandClasses_1.CommandClasses["Multi Channel Association"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
    CommandClasses_1.CommandClasses["Wake Up"],
]));
defineGeneric("Remote Switch", null, null, new SpecificDeviceClass("Binary Remote Switch", 0x01, null, [
    CommandClasses_1.CommandClasses["Binary Switch"],
]), new SpecificDeviceClass("Multilevel Remote Switch", 0x02, null, [
    CommandClasses_1.CommandClasses["Multilevel Switch"],
]), new SpecificDeviceClass("Binary Toggle Remote Switch", 0x03, null, [
    CommandClasses_1.CommandClasses["Binary Toggle Switch"],
]), new SpecificDeviceClass("Multilevel Toggle Remote Switch", 0x04, null, [
    CommandClasses_1.CommandClasses["Multilevel Toggle Switch"],
]));
defineGeneric("Repeater Slave", null, null, new SpecificDeviceClass("Basic Repeater Slave", 0x01));
defineGeneric("Semi-Interoperable", [
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
    CommandClasses_1.CommandClasses.Proprietary,
], null, new SpecificDeviceClass("Energy Production", 0x01, [
    CommandClasses_1.CommandClasses["Energy Production"],
]));
defineGeneric("Static Controller", null, [CommandClasses_1.CommandClasses.Basic], new SpecificDeviceClass("PC Controller", 0x01), new SpecificDeviceClass("Scene Controller", 0x02, [
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses["Scene Controller Configuration"],
], [CommandClasses_1.CommandClasses["Scene Activation"]]), new SpecificDeviceClass("Static Installer Tool", 0x03, [
    CommandClasses_1.CommandClasses["Controller Replication"],
    CommandClasses_1.CommandClasses["Multi Command"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
], [
    CommandClasses_1.CommandClasses.Association,
    CommandClasses_1.CommandClasses.Configuration,
    CommandClasses_1.CommandClasses["Controller Replication"],
    CommandClasses_1.CommandClasses["Multi Channel"],
    CommandClasses_1.CommandClasses["Multi Channel Association"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
    CommandClasses_1.CommandClasses["Wake Up"],
]), new SpecificDeviceClass("Gateway", 0x07, [
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Security,
    CommandClasses_1.CommandClasses.Version,
], [CommandClasses_1.CommandClasses.Security, CommandClasses_1.CommandClasses["Multi Channel"]]));
defineGeneric("Thermostat", null, null, new SpecificDeviceClass("Thermostat Heating", 0x01), new SpecificDeviceClass("Thermostat General", 0x02, [
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses["Thermostat Mode"],
    CommandClasses_1.CommandClasses["Thermostat Setpoint"],
]), new SpecificDeviceClass("Thermostat General V2", 0x06, [
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses["Thermostat Mode"],
    CommandClasses_1.CommandClasses["Thermostat Setpoint"],
    CommandClasses_1.CommandClasses.Version,
]), new SpecificDeviceClass("Setback Schedule Thermostat", 0x03, [
    CommandClasses_1.CommandClasses["Climate Control Schedule"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses["Multi Command"],
    CommandClasses_1.CommandClasses.Version,
], [
    CommandClasses_1.CommandClasses["Climate Control Schedule"],
    CommandClasses_1.CommandClasses["Multi Command"],
    CommandClasses_1.CommandClasses.Clock,
]), new SpecificDeviceClass("Setback Thermostat", 0x05, [
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses["Thermostat Mode"],
    CommandClasses_1.CommandClasses["Thermostat Setpoint"],
    CommandClasses_1.CommandClasses["Thermostat Setback"],
    CommandClasses_1.CommandClasses.Version,
]), new SpecificDeviceClass("Setpoint Thermostat", 0x04, [
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses["Multi Command"],
    CommandClasses_1.CommandClasses["Thermostat Setpoint"],
    CommandClasses_1.CommandClasses.Version,
], [
    CommandClasses_1.CommandClasses["Multi Command"],
    CommandClasses_1.CommandClasses["Thermostat Setpoint"],
]));
defineGeneric("Toggle Switch", null, null, new SpecificDeviceClass("Binary Toggle Switch", 0x01, [
    CommandClasses_1.CommandClasses["Binary Switch"],
    CommandClasses_1.CommandClasses["Binary Toggle Switch"],
]), new SpecificDeviceClass("Multilevel Toggle Switch", 0x02, [
    CommandClasses_1.CommandClasses["Multilevel Switch"],
    CommandClasses_1.CommandClasses["Multilevel Toggle Switch"],
]));
defineGeneric("Ventilation", null, null, new SpecificDeviceClass("Residential Heat Recovery Ventilation", 0x01, [
    CommandClasses_1.CommandClasses["HRV Control"],
    CommandClasses_1.CommandClasses["HRV Status"],
    CommandClasses_1.CommandClasses["Manufacturer Specific"],
    CommandClasses_1.CommandClasses.Version,
]));
defineGeneric("Window Covering", null, null, new SpecificDeviceClass("Simple Window Covering Control", 0x01, [
    CommandClasses_1.CommandClasses["Basic Window Covering"],
]));
// /* Device class Entry Control */
// #define GENERIC_TYPE_ENTRY_CONTROL                                                       0x40 /*Entry Control*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_DOOR_LOCK                                                          0x01 /*Door Lock*/
// #define SPECIFIC_TYPE_ADVANCED_DOOR_LOCK                                                 0x02 /*Advanced Door Lock*/
// #define SPECIFIC_TYPE_SECURE_KEYPAD_DOOR_LOCK                                            0x03 /*Door Lock (keypad –lever) Device Type*/
// #define SPECIFIC_TYPE_SECURE_KEYPAD_DOOR_LOCK_DEADBOLT                                   0x04 /*Door Lock (keypad –deadbolt) Device Type*/
// #define SPECIFIC_TYPE_SECURE_DOOR                                                        0x05 /*Barrier Operator Specific Device Class*/
// #define SPECIFIC_TYPE_SECURE_GATE                                                        0x06 /*Barrier Operator Specific Device Class*/
// #define SPECIFIC_TYPE_SECURE_BARRIER_ADDON                                               0x07 /*Barrier Operator Specific Device Class*/
// #define SPECIFIC_TYPE_SECURE_BARRIER_OPEN_ONLY                                           0x08 /*Barrier Operator Specific Device Class*/
// #define SPECIFIC_TYPE_SECURE_BARRIER_CLOSE_ONLY                                          0x09 /*Barrier Operator Specific Device Class*/
// #define SPECIFIC_TYPE_SECURE_LOCKBOX                                                     0x0A /*SDS12724*/
// #define SPECIFIC_TYPE_SECURE_KEYPAD                                                      0x0B /* Device class Generic Controller */
// #define GENERIC_TYPE_GENERIC_CONTROLLER                                                  0x01 /*Remote Controller*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_PORTABLE_REMOTE_CONTROLLER                                         0x01 /*Remote Control (Multi Purpose) Device Type*/
// #define SPECIFIC_TYPE_PORTABLE_SCENE_CONTROLLER                                          0x02 /*Portable Scene Controller*/
// #define SPECIFIC_TYPE_PORTABLE_INSTALLER_TOOL                                            0x03
// #define SPECIFIC_TYPE_REMOTE_CONTROL_AV                                                  0x04 /*Remote Control (AV) Device Type*/
// #define SPECIFIC_TYPE_REMOTE_CONTROL_SIMPLE                                              0x06 /*Remote Control (Simple) Device Type*/
// /* Device class Meter */
// #define GENERIC_TYPE_METER                                                               0x31 /*Meter*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SIMPLE_METER                                                       0x01 /*Sub Energy Meter Device Type*/
// #define SPECIFIC_TYPE_ADV_ENERGY_CONTROL                                                 0x02 /*Whole Home Energy Meter (Advanced) DeviceType*/
// #define SPECIFIC_TYPE_WHOLE_HOME_METER_SIMPLE                                            0x03 /*Whole Home Meter (Simple) Device Type*/
// /* Device class Meter Pulse */
// #define GENERIC_TYPE_METER_PULSE                                                         0x30 /*Pulse Meter*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// /* Device class Non Interoperable */
// #define GENERIC_TYPE_NON_INTEROPERABLE                                                   0xFF /*Non interoperable*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// /* Device class Repeater Slave */
// #define GENERIC_TYPE_REPEATER_SLAVE                                                      0x0F /*Repeater Slave*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_REPEATER_SLAVE                                                     0x01 /*Basic Repeater Slave*/
// #define SPECIFIC_TYPE_VIRTUAL_NODE                                                       0x02 /* Device class Security Panel */
// #define GENERIC_TYPE_SECURITY_PANEL                                                      0x17
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_ZONED_SECURITY_PANEL                                               0x01
// /* Device class Semi Interoperable */
// #define GENERIC_TYPE_SEMI_INTEROPERABLE                                                  0x50 /*Semi Interoperable*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_ENERGY_PRODUCTION                                                  0x01 /*Energy Production*/
// /* Device class Sensor Binary */
// #define GENERIC_TYPE_SENSOR_BINARY                                                       0x20 /*Binary Sensor*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_ROUTING_SENSOR_BINARY                                              0x01 /*Routing Binary Sensor*/
// /* Device class Sensor Multilevel */
// #define GENERIC_TYPE_SENSOR_MULTILEVEL                                                   0x21 /*Multilevel Sensor*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_ROUTING_SENSOR_MULTILEVEL                                          0x01 /*Sensor (Multilevel) Device Type*/
// #define SPECIFIC_TYPE_CHIMNEY_FAN                                                        0x02 /* Device class Static Controller */
// #define GENERIC_TYPE_STATIC_CONTROLLER                                                   0x02 /*Static Controller*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_PC_CONTROLLER                                                      0x01 /*Central Controller Device Type*/
// #define SPECIFIC_TYPE_SCENE_CONTROLLER                                                   0x02 /*Scene Controller*/
// #define SPECIFIC_TYPE_STATIC_INSTALLER_TOOL                                              0x03
// #define SPECIFIC_TYPE_SET_TOP_BOX                                                        0x04 /*Set Top Box Device Type*/
// #define SPECIFIC_TYPE_SUB_SYSTEM_CONTROLLER                                              0x05 /*Sub System Controller Device Type*/
// #define SPECIFIC_TYPE_TV                                                                 0x06 /*TV Device Type*/
// #define SPECIFIC_TYPE_GATEWAY                                                            0x07 /*Gateway Device Type*/
// /* Device class Switch Binary */
// #define GENERIC_TYPE_SWITCH_BINARY                                                       0x10 /*Binary Switch*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_POWER_SWITCH_BINARY                                                0x01 /*On/Off Power Switch Device Type*/
// #define SPECIFIC_TYPE_SCENE_SWITCH_BINARY                                                0x03 /*Binary Scene Switch*/
// #define SPECIFIC_TYPE_POWER_STRIP                                                        0x04 /*Power Strip Device Type*/
// #define SPECIFIC_TYPE_SIREN                                                              0x05 /*Siren Device Type*/
// #define SPECIFIC_TYPE_VALVE_OPEN_CLOSE                                                   0x06 /*Valve (open/close) Device Type*/
// #define SPECIFIC_TYPE_COLOR_TUNABLE_BINARY                                               0x02
// #define SPECIFIC_TYPE_IRRIGATION_CONTROLLER                                              0x07
// /* Device class Switch Multilevel */
// #define GENERIC_TYPE_SWITCH_MULTILEVEL                                                   0x11 /*Multilevel Switch*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_CLASS_A_MOTOR_CONTROL                                              0x05 /*Window Covering No Position/Endpoint Device Type*/
// #define SPECIFIC_TYPE_CLASS_B_MOTOR_CONTROL                                              0x06 /*Window Covering Endpoint Aware Device Type*/
// #define SPECIFIC_TYPE_CLASS_C_MOTOR_CONTROL                                              0x07 /*Window Covering Position/Endpoint Aware Device Type*/
// #define SPECIFIC_TYPE_MOTOR_MULTIPOSITION                                                0x03 /*Multiposition Motor*/
// #define SPECIFIC_TYPE_POWER_SWITCH_MULTILEVEL                                            0x01 /*Light Dimmer Switch Device Type*/
// #define SPECIFIC_TYPE_SCENE_SWITCH_MULTILEVEL                                            0x04 /*Multilevel Scene Switch*/
// #define SPECIFIC_TYPE_FAN_SWITCH                                                         0x08 /*Fan Switch Device Type*/
// #define SPECIFIC_TYPE_COLOR_TUNABLE_MULTILEVEL                                           0x02 /* Device class Switch Remote */
// #define GENERIC_TYPE_SWITCH_REMOTE                                                       0x12 /*Remote Switch*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SWITCH_REMOTE_BINARY                                               0x01 /*Binary Remote Switch*/
// #define SPECIFIC_TYPE_SWITCH_REMOTE_MULTILEVEL                                           0x02 /*Multilevel Remote Switch*/
// #define SPECIFIC_TYPE_SWITCH_REMOTE_TOGGLE_BINARY                                        0x03 /*Binary Toggle Remote Switch*/
// #define SPECIFIC_TYPE_SWITCH_REMOTE_TOGGLE_MULTILEVEL                                    0x04 /*Multilevel Toggle Remote Switch*/
// /* Device class Switch Toggle */
// #define GENERIC_TYPE_SWITCH_TOGGLE                                                       0x13 /*Toggle Switch*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SWITCH_TOGGLE_BINARY                                               0x01 /*Binary Toggle Switch*/
// #define SPECIFIC_TYPE_SWITCH_TOGGLE_MULTILEVEL                                           0x02 /*Multilevel Toggle Switch*/
// /* Device class Thermostat */
// #define GENERIC_TYPE_THERMOSTAT                                                          0x08 /*Thermostat*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SETBACK_SCHEDULE_THERMOSTAT                                        0x03 /*Setback Schedule Thermostat*/
// #define SPECIFIC_TYPE_SETBACK_THERMOSTAT                                                 0x05 /*Thermostat (Setback) Device Type*/
// #define SPECIFIC_TYPE_SETPOINT_THERMOSTAT                                                0x04
// #define SPECIFIC_TYPE_THERMOSTAT_GENERAL                                                 0x02 /*Thermostat General*/
// #define SPECIFIC_TYPE_THERMOSTAT_GENERAL_V2                                              0x06 /*Thermostat (HVAC) Device Type*/
// #define SPECIFIC_TYPE_THERMOSTAT_HEATING                                                 0x01 /*Thermostat Heating*/
// /* Device class Ventilation */
// #define GENERIC_TYPE_VENTILATION                                                         0x16
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_RESIDENTIAL_HRV                                                    0x01 /* Device class Window Covering */
// #define GENERIC_TYPE_WINDOW_COVERING                                                     0x09 /*Window Covering*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SIMPLE_WINDOW_COVERING                                             0x01 /*Simple Window Covering Control*/
// /* Device class Zip Node */
// #define GENERIC_TYPE_ZIP_NODE                                                            0x15
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_ZIP_ADV_NODE                                                       0x02
// #define SPECIFIC_TYPE_ZIP_TUN_NODE                                                       0x01 /* Device class Wall Controller */
// #define GENERIC_TYPE_WALL_CONTROLLER                                                     0x18
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_BASIC_WALL_CONTROLLER                                              0x01 /*Wall Controller Device Type*/
// /* Device class Network Extender */
// #define GENERIC_TYPE_NETWORK_EXTENDER                                                    0x05 /*Network Extender Generic Device Class*/
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_SECURE_EXTENDER                                                    0x01 /*Specific Device Secure Extender*/
// /* Device class Appliance */
// #define GENERIC_TYPE_APPLIANCE                                                           0x06
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class Not Used*/
// #define SPECIFIC_TYPE_GENERAL_APPLIANCE                                                  0x01
// #define SPECIFIC_TYPE_KITCHEN_APPLIANCE                                                  0x02
// #define SPECIFIC_TYPE_LAUNDRY_APPLIANCE                                                  0x03
// /* Device class Sensor Notification */
// #define GENERIC_TYPE_SENSOR_NOTIFICATION                                                 0x07
// #define SPECIFIC_TYPE_NOT_USED                                                           0x00 /*Specific Device Class not used*/
// #define SPECIFIC_TYPE_NOTIFICATION_SENSOR                                                0x01
