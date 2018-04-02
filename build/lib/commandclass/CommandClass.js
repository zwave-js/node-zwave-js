"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../util/logger");
const object_polyfill_1 = require("../util/object-polyfill");
const strings_1 = require("../util/strings");
class CommandClass {
    // implementation
    constructor(nodeId, command, payload = Buffer.from([])) {
        this.nodeId = nodeId;
        this.command = command;
        this.payload = payload;
        // Extract the cc from declared metadata if not provided
        this.command = command != null ? command : getCommandClass(this);
    }
    // tslint:enable:unified-signatures
    serialize() {
        const payloadLength = this.payload != null ? this.payload.length : 0;
        const ret = Buffer.allocUnsafe(payloadLength + 3);
        ret[0] = this.nodeId;
        // the serialized length includes the command class itself
        ret[1] = payloadLength + 1;
        ret[2] = this.command;
        if (this.payload != null)
            this.payload.copy(ret, 3);
        return ret;
    }
    deserialize(data) {
        this.nodeId = data[0];
        // the serialized length includes the command class itself
        const dataLength = data[1] - 1;
        this.command = data[2];
        this.payload = Buffer.allocUnsafe(dataLength);
        data.copy(this.payload, 0, 3, 3 + dataLength);
    }
    /**
     * Retrieves the correct constructor for the CommandClass in the given Buffer.
     * It is assumed that the buffer only contains the serialized CC.
     */
    static getConstructor(ccData) {
        const cc = ccData[2];
        return getCCConstructor(cc) || CommandClass;
    }
    static from(serializedCC) {
        // tslint:disable-next-line:variable-name
        const Constructor = CommandClass.getConstructor(serializedCC);
        const ret = new Constructor();
        ret.deserialize(serializedCC);
        return ret;
    }
    toJSON() {
        return this.toJSONInternal();
    }
    toJSONInternal() {
        const ret = {
            nodeId: this.nodeId,
            command: CommandClasses[this.command] || strings_1.num2hex(this.command),
        };
        if (this.payload != null)
            ret.payload = "0x" + this.payload.toString("hex");
        return ret;
    }
    toJSONInherited(props) {
        const ret = this.toJSONInternal();
        delete ret.payload;
        for (const [key, value] of object_polyfill_1.entries(props)) {
            if (value !== undefined)
                ret[key] = value;
        }
        return ret;
    }
}
exports.CommandClass = CommandClass;
// =======================
// use decorators to link command class values to actual command classes
// tslint:disable:variable-name
exports.METADATA_commandClass = Symbol("commandClass");
exports.METADATA_commandClassMap = Symbol("commandClassMap");
/**
 * Defines the command class associated with a Z-Wave message
 */
function commandClass(cc) {
    return (messageClass) => {
        logger_1.log("protocol", `${messageClass.name}: defining command class ${CommandClasses[cc]} (${cc})`, "silly");
        // and store the metadata
        Reflect.defineMetadata(exports.METADATA_commandClass, cc, messageClass);
        // also store a map in the Message metadata for lookup.
        const map = Reflect.getMetadata(exports.METADATA_commandClassMap, CommandClass) || new Map();
        map.set(cc, messageClass);
        Reflect.defineMetadata(exports.METADATA_commandClassMap, map, CommandClass);
    };
}
exports.commandClass = commandClass;
/**
 * Retrieves the command class defined for a Z-Wave message class
 */
function getCommandClass(cc) {
    // get the class constructor
    const constr = cc.constructor;
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_commandClass, constr);
    logger_1.log("protocol", `${constr.name}: retrieving command class => ${CommandClasses[ret]} (${ret})`, "silly");
    return ret;
}
exports.getCommandClass = getCommandClass;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getCommandClassStatic(classConstructor) {
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_commandClass, classConstructor);
    logger_1.log("protocol", `${classConstructor.name}: retrieving command class => ${CommandClasses[ret]} (${ret})`, "silly");
    return ret;
}
exports.getCommandClassStatic = getCommandClassStatic;
/**
 * Looks up the command class constructor for a given command class type and function type
 */
function getCCConstructor(cc) {
    // Retrieve the constructor map from the CommandClass class
    const map = Reflect.getMetadata(exports.METADATA_commandClassMap, CommandClass);
    if (map != null)
        return map.get(cc);
}
exports.getCCConstructor = getCCConstructor;
/* A dictionary of all command classes as of 2018-03-30 */
var CommandClasses;
(function (CommandClasses) {
    CommandClasses[CommandClasses["Alarm"] = 113] = "Alarm";
    CommandClasses[CommandClasses["Alarm Sensor"] = 156] = "Alarm Sensor";
    CommandClasses[CommandClasses["Alarm Silence"] = 157] = "Alarm Silence";
    CommandClasses[CommandClasses["All Switch"] = 39] = "All Switch";
    CommandClasses[CommandClasses["Anti-theft"] = 93] = "Anti-theft";
    CommandClasses[CommandClasses["Application Capability"] = 87] = "Application Capability";
    CommandClasses[CommandClasses["Application Status"] = 34] = "Application Status";
    CommandClasses[CommandClasses["Association"] = 133] = "Association";
    CommandClasses[CommandClasses["Association Command Configuration"] = 155] = "Association Command Configuration";
    CommandClasses[CommandClasses["Association Group Information (AGI)"] = 89] = "Association Group Information (AGI)";
    CommandClasses[CommandClasses["Barrier Operator"] = 102] = "Barrier Operator";
    CommandClasses[CommandClasses["Basic"] = 32] = "Basic";
    CommandClasses[CommandClasses["Basic Tariff Information"] = 54] = "Basic Tariff Information";
    CommandClasses[CommandClasses["Basic Window Covering"] = 80] = "Basic Window Covering";
    CommandClasses[CommandClasses["Battery"] = 128] = "Battery";
    CommandClasses[CommandClasses["Binary Sensor"] = 48] = "Binary Sensor";
    CommandClasses[CommandClasses["Binary Switch"] = 37] = "Binary Switch";
    CommandClasses[CommandClasses["Binary Toggle Switch"] = 40] = "Binary Toggle Switch";
    CommandClasses[CommandClasses["Climate Control Schedule"] = 70] = "Climate Control Schedule";
    CommandClasses[CommandClasses["Central Scene"] = 91] = "Central Scene";
    CommandClasses[CommandClasses["Clock"] = 129] = "Clock";
    CommandClasses[CommandClasses["Color Switch"] = 51] = "Color Switch";
    CommandClasses[CommandClasses["Configuration"] = 112] = "Configuration";
    CommandClasses[CommandClasses["Controller Replication"] = 33] = "Controller Replication";
    CommandClasses[CommandClasses["CRC-16 Encapsulation"] = 86] = "CRC-16 Encapsulation";
    CommandClasses[CommandClasses["Demand Control Plan Configuration"] = 58] = "Demand Control Plan Configuration";
    CommandClasses[CommandClasses["Demand Control Plan Monitor"] = 59] = "Demand Control Plan Monitor";
    CommandClasses[CommandClasses["Device Reset Locally"] = 90] = "Device Reset Locally";
    CommandClasses[CommandClasses["Door Lock"] = 98] = "Door Lock";
    CommandClasses[CommandClasses["Door Lock Logging"] = 76] = "Door Lock Logging";
    CommandClasses[CommandClasses["Energy Production"] = 144] = "Energy Production";
    CommandClasses[CommandClasses["Entry Control"] = 111] = "Entry Control";
    CommandClasses[CommandClasses["Firmware Update Meta Data"] = 122] = "Firmware Update Meta Data";
    CommandClasses[CommandClasses["Geographic Location"] = 140] = "Geographic Location";
    CommandClasses[CommandClasses["Grouping Name"] = 123] = "Grouping Name";
    CommandClasses[CommandClasses["Hail"] = 130] = "Hail";
    CommandClasses[CommandClasses["HRV Status"] = 55] = "HRV Status";
    CommandClasses[CommandClasses["HRV Control"] = 57] = "HRV Control";
    CommandClasses[CommandClasses["Humidity Control Mode"] = 109] = "Humidity Control Mode";
    CommandClasses[CommandClasses["Humidity Control Operating State"] = 110] = "Humidity Control Operating State";
    CommandClasses[CommandClasses["Humidity Control Setpoint"] = 100] = "Humidity Control Setpoint";
    CommandClasses[CommandClasses["Inclusion Controller"] = 116] = "Inclusion Controller";
    CommandClasses[CommandClasses["Indicator"] = 135] = "Indicator";
    CommandClasses[CommandClasses["IP Association"] = 92] = "IP Association";
    CommandClasses[CommandClasses["IP Configuration"] = 154] = "IP Configuration";
    CommandClasses[CommandClasses["Irrigation"] = 107] = "Irrigation";
    CommandClasses[CommandClasses["Language"] = 137] = "Language";
    CommandClasses[CommandClasses["Lock"] = 118] = "Lock";
    CommandClasses[CommandClasses["Mailbox"] = 105] = "Mailbox";
    CommandClasses[CommandClasses["Manufacturer Proprietary"] = 145] = "Manufacturer Proprietary";
    CommandClasses[CommandClasses["Manufacturer Specific"] = 114] = "Manufacturer Specific";
    CommandClasses[CommandClasses["Support/Control Mark"] = 239] = "Support/Control Mark";
    CommandClasses[CommandClasses["Meter"] = 50] = "Meter";
    CommandClasses[CommandClasses["Meter Table Configuration"] = 60] = "Meter Table Configuration";
    CommandClasses[CommandClasses["Meter Table Monitor"] = 61] = "Meter Table Monitor";
    CommandClasses[CommandClasses["Meter Table Push Configuration"] = 62] = "Meter Table Push Configuration";
    CommandClasses[CommandClasses["Move To Position Window Covering"] = 81] = "Move To Position Window Covering";
    CommandClasses[CommandClasses["Multi Channel"] = 96] = "Multi Channel";
    CommandClasses[CommandClasses["Multi Channel Association"] = 142] = "Multi Channel Association";
    CommandClasses[CommandClasses["Multi Command"] = 143] = "Multi Command";
    CommandClasses[CommandClasses["Multilevel Sensor"] = 49] = "Multilevel Sensor";
    CommandClasses[CommandClasses["Multilevel Switch"] = 38] = "Multilevel Switch";
    CommandClasses[CommandClasses["Multilevel Toggle Switch"] = 41] = "Multilevel Toggle Switch";
    CommandClasses[CommandClasses["Network Management Basic Node"] = 77] = "Network Management Basic Node";
    CommandClasses[CommandClasses["Network Management Inclusion"] = 52] = "Network Management Inclusion";
    CommandClasses[CommandClasses["Network Management Installation and Maintenance"] = 103] = "Network Management Installation and Maintenance";
    CommandClasses[CommandClasses["Network Management Primary"] = 84] = "Network Management Primary";
    CommandClasses[CommandClasses["Network Management Proxy"] = 82] = "Network Management Proxy";
    CommandClasses[CommandClasses["No Operation"] = 0] = "No Operation";
    CommandClasses[CommandClasses["Node Naming and Location"] = 119] = "Node Naming and Location";
    CommandClasses[CommandClasses["Node Provisioning"] = 120] = "Node Provisioning";
    CommandClasses[CommandClasses["Notification"] = 113] = "Notification";
    CommandClasses[CommandClasses["Powerlevel"] = 115] = "Powerlevel";
    CommandClasses[CommandClasses["Prepayment"] = 63] = "Prepayment";
    CommandClasses[CommandClasses["Prepayment Encapsulation"] = 65] = "Prepayment Encapsulation";
    CommandClasses[CommandClasses["Proprietary"] = 136] = "Proprietary";
    CommandClasses[CommandClasses["Protection"] = 117] = "Protection";
    CommandClasses[CommandClasses["Pulse Meter"] = 53] = "Pulse Meter";
    CommandClasses[CommandClasses["Rate Table Configuration"] = 72] = "Rate Table Configuration";
    CommandClasses[CommandClasses["Rate Table Monitor"] = 73] = "Rate Table Monitor";
    CommandClasses[CommandClasses["Remote Association Activation"] = 124] = "Remote Association Activation";
    CommandClasses[CommandClasses["Remote Association Configuration"] = 125] = "Remote Association Configuration";
    CommandClasses[CommandClasses["Scene Activation"] = 43] = "Scene Activation";
    CommandClasses[CommandClasses["Scene Actuator Configuration"] = 44] = "Scene Actuator Configuration";
    CommandClasses[CommandClasses["Scene Controller Configuration"] = 45] = "Scene Controller Configuration";
    CommandClasses[CommandClasses["Schedule"] = 83] = "Schedule";
    CommandClasses[CommandClasses["Schedule Entry Lock"] = 78] = "Schedule Entry Lock";
    CommandClasses[CommandClasses["Screen Attributes"] = 147] = "Screen Attributes";
    CommandClasses[CommandClasses["Screen Meta Data"] = 146] = "Screen Meta Data";
    CommandClasses[CommandClasses["Security"] = 152] = "Security";
    CommandClasses[CommandClasses["Security 2"] = 159] = "Security 2";
    CommandClasses[CommandClasses["Security Mark"] = 61696] = "Security Mark";
    CommandClasses[CommandClasses["Sensor Configuration"] = 158] = "Sensor Configuration";
    CommandClasses[CommandClasses["Simple AV Control"] = 148] = "Simple AV Control";
    CommandClasses[CommandClasses["Sound Switch"] = 121] = "Sound Switch";
    CommandClasses[CommandClasses["Supervision"] = 108] = "Supervision";
    CommandClasses[CommandClasses["Tariff Table Configuration"] = 74] = "Tariff Table Configuration";
    CommandClasses[CommandClasses["Tariff Table Monitor"] = 75] = "Tariff Table Monitor";
    CommandClasses[CommandClasses["Thermostat Fan Mode"] = 68] = "Thermostat Fan Mode";
    CommandClasses[CommandClasses["Thermostat Fan State"] = 69] = "Thermostat Fan State";
    CommandClasses[CommandClasses["Thermostat Mode"] = 64] = "Thermostat Mode";
    CommandClasses[CommandClasses["Thermostat Operating State"] = 66] = "Thermostat Operating State";
    CommandClasses[CommandClasses["Thermostat Setback"] = 71] = "Thermostat Setback";
    CommandClasses[CommandClasses["Thermostat Setpoint"] = 67] = "Thermostat Setpoint";
    CommandClasses[CommandClasses["Time"] = 138] = "Time";
    CommandClasses[CommandClasses["Time Parameters"] = 139] = "Time Parameters";
    CommandClasses[CommandClasses["Transport Service"] = 85] = "Transport Service";
    CommandClasses[CommandClasses["User Code"] = 99] = "User Code";
    CommandClasses[CommandClasses["Version"] = 134] = "Version";
    CommandClasses[CommandClasses["Wake Up"] = 132] = "Wake Up";
    CommandClasses[CommandClasses["Window Covering"] = 106] = "Window Covering";
    CommandClasses[CommandClasses["Z/IP"] = 35] = "Z/IP";
    CommandClasses[CommandClasses["Z/IP 6LoWPAN"] = 79] = "Z/IP 6LoWPAN";
    CommandClasses[CommandClasses["Z/IP Gateway"] = 95] = "Z/IP Gateway";
    CommandClasses[CommandClasses["Z/IP Naming and Location"] = 104] = "Z/IP Naming and Location";
    CommandClasses[CommandClasses["Z/IP ND"] = 88] = "Z/IP ND";
    CommandClasses[CommandClasses["Z/IP Portal"] = 97] = "Z/IP Portal";
    CommandClasses[CommandClasses["Z-Wave Plus Info"] = 94] = "Z-Wave Plus Info";
})(CommandClasses = exports.CommandClasses || (exports.CommandClasses = {}));
