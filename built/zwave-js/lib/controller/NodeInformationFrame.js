"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineNIF = void 0;
const cc_1 = require("@zwave-js/cc");
const safe_1 = require("@zwave-js/core/safe");
function determineNIF() {
    const basicDeviceClass = 0x02; // Static Controller
    const genericDeviceClass = 0x02; // Static Controller
    const specificDeviceClass = 0x07; // Gateway
    const implementedCCs = safe_1.allCCs.filter((cc) => (0, cc_1.getImplementedVersion)(cc) > 0);
    // Encapsulation CCs are always supported
    const implementedEncapsulationCCs = safe_1.encapsulationCCs.filter((cc) => implementedCCs.includes(cc));
    const implementedActuatorCCs = safe_1.actuatorCCs.filter((cc) => implementedCCs.includes(cc));
    const implementedSensorCCs = safe_1.sensorCCs.filter((cc) => implementedCCs.includes(cc));
    const supportedCCs = [
        // Z-Wave Plus Info must be listed first
        safe_1.CommandClasses["Z-Wave Plus Info"],
        // Z-Wave Plus v2 Device Type Specification
        // -> Gateway device type MUST support Inclusion Controller and Time CC
        safe_1.CommandClasses["Inclusion Controller"],
        safe_1.CommandClasses.Time,
        ...implementedEncapsulationCCs,
    ];
    const controlledCCs = [
        // Non-actuator CCs that MUST be supported by the gateway DT:
        safe_1.CommandClasses.Association,
        safe_1.CommandClasses["Association Group Information"],
        safe_1.CommandClasses.Basic,
        safe_1.CommandClasses["Central Scene"],
        safe_1.CommandClasses["CRC-16 Encapsulation"],
        safe_1.CommandClasses["Firmware Update Meta Data"],
        safe_1.CommandClasses.Indicator,
        safe_1.CommandClasses.Meter,
        safe_1.CommandClasses["Multi Channel"],
        safe_1.CommandClasses["Multi Channel Association"],
        safe_1.CommandClasses["Multilevel Sensor"],
        safe_1.CommandClasses.Notification,
        safe_1.CommandClasses.Security,
        safe_1.CommandClasses["Security 2"],
        safe_1.CommandClasses.Version,
        safe_1.CommandClasses["Wake Up"],
    ];
    // Add implemented actuator and sensor CCs to fill up the space. These might get cut off
    controlledCCs.push(...[...implementedActuatorCCs, ...implementedSensorCCs].filter((cc) => !controlledCCs.includes(cc)));
    // TODO: Consider if the CCs should follow a certain order
    return {
        basicDeviceClass,
        genericDeviceClass,
        specificDeviceClass,
        supportedCCs,
        controlledCCs,
    };
}
exports.determineNIF = determineNIF;
//# sourceMappingURL=NodeInformationFrame.js.map