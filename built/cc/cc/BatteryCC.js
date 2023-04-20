"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatteryCCHealthGet = exports.BatteryCCHealthReport = exports.BatteryCCGet = exports.BatteryCCReport = exports.BatteryCC = exports.BatteryCCAPI = exports.BatteryCCValues = void 0;
const core_1 = require("@zwave-js/core");
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.BatteryCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Battery, {
        ...Values_1.V.staticProperty("level", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            max: 100,
            unit: "%",
            label: "Battery level",
        }),
        ...Values_1.V.staticProperty("isLow", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Low battery level",
        }),
        ...Values_1.V.staticProperty("maximumCapacity", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            max: 100,
            unit: "%",
            label: "Maximum capacity",
        }, {
            minVersion: 2,
        }),
        ...Values_1.V.staticProperty("temperature", {
            ...safe_1.ValueMetadata.ReadOnlyInt8,
            label: "Temperature",
        }, {
            minVersion: 2,
        }),
        ...Values_1.V.staticProperty("chargingStatus", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Charging status",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.BatteryChargingStatus),
        }, {
            minVersion: 2,
        }),
        ...Values_1.V.staticProperty("rechargeable", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Rechargeable",
        }, {
            minVersion: 2,
        }),
        ...Values_1.V.staticProperty("backup", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Used as backup",
        }, {
            minVersion: 2,
        }),
        ...Values_1.V.staticProperty("overheating", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Overheating",
        }, {
            minVersion: 2,
        }),
        ...Values_1.V.staticProperty("lowFluid", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Fluid is low",
        }, {
            minVersion: 2,
        }),
        ...Values_1.V.staticProperty("rechargeOrReplace", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Recharge or replace",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.BatteryReplacementStatus),
        }, {
            minVersion: 2,
        }),
        ...Values_1.V.staticProperty("disconnected", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Battery is disconnected",
        }, {
            minVersion: 2,
        }),
        ...Values_1.V.staticProperty("lowTemperatureStatus", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Battery temperature is low",
        }, {
            minVersion: 3,
        }),
    }),
});
// @noSetValueAPI This CC is read-only
let BatteryCCAPI = class BatteryCCAPI extends API_1.PhysicalCCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, }) => {
            switch (property) {
                case "level":
                case "isLow":
                case "chargingStatus":
                case "rechargeable":
                case "backup":
                case "overheating":
                case "lowFluid":
                case "rechargeOrReplace":
                case "lowTemperatureStatus":
                case "disconnected":
                    return (await this.get())?.[property];
                case "maximumCapacity":
                case "temperature":
                    return (await this.getHealth())?.[property];
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.BatteryCommand.Get:
                return true; // This is mandatory
            case _Types_1.BatteryCommand.HealthGet:
                return this.version >= 2;
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.BatteryCommand, _Types_1.BatteryCommand.Get);
        const cc = new BatteryCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "level",
                "isLow",
                "chargingStatus",
                "rechargeable",
                "backup",
                "overheating",
                "lowFluid",
                "rechargeOrReplace",
                "lowTemperatureStatus",
                "disconnected",
            ]);
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getHealth() {
        this.assertSupportsCommand(_Types_1.BatteryCommand, _Types_1.BatteryCommand.HealthGet);
        const cc = new BatteryCCHealthGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["maximumCapacity", "temperature"]);
        }
    }
};
_a = API_1.POLL_VALUE;
BatteryCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Battery)
], BatteryCCAPI);
exports.BatteryCCAPI = BatteryCCAPI;
let BatteryCC = class BatteryCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // Query the Battery status
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Battery, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying battery status...",
            direction: "outbound",
        });
        const batteryStatus = await api.get();
        if (batteryStatus) {
            let logMessage = `received response for battery information:
level:                           ${batteryStatus.level}${batteryStatus.isLow ? " (low)" : ""}`;
            if (this.version >= 2) {
                logMessage += `
status:                          ${_Types_1.BatteryChargingStatus[batteryStatus.chargingStatus]}
rechargeable:                    ${batteryStatus.rechargeable}
is backup:                       ${batteryStatus.backup}
is overheating:                  ${batteryStatus.overheating}
fluid is low:                    ${batteryStatus.lowFluid}
needs to be replaced or charged: ${_Types_1.BatteryReplacementStatus[batteryStatus.rechargeOrReplace]}
is low temperature               ${batteryStatus.lowTemperatureStatus}
is disconnected:                 ${batteryStatus.disconnected}`;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
        if (this.version >= 2) {
            // always query the health
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "querying battery health...",
                direction: "outbound",
            });
            const batteryHealth = await api.getHealth();
            if (batteryHealth) {
                const logMessage = `received response for battery health:
max. capacity: ${batteryHealth.maximumCapacity} %
temperature:   ${batteryHealth.temperature} °C`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
        }
    }
    shouldRefreshValues(applHost) {
        // Check when the battery state was last updated
        const valueDB = applHost.tryGetValueDB(this.nodeId);
        if (!valueDB)
            return true;
        const lastUpdated = valueDB.getTimestamp(exports.BatteryCCValues.level.endpoint(this.endpointIndex));
        return (lastUpdated == undefined ||
            // The specs say once per month, but that's a bit too unfrequent IMO
            // Also the maximum that setInterval supports is ~24.85 days
            Date.now() - lastUpdated > core_1.timespan.days(7));
    }
};
BatteryCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Battery),
    (0, CommandClassDecorators_1.implementedVersion)(3),
    (0, CommandClassDecorators_1.ccValues)(exports.BatteryCCValues)
], BatteryCC);
exports.BatteryCC = BatteryCC;
let BatteryCCReport = class BatteryCCReport extends BatteryCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.level = this.payload[0];
            if (this.level === 0xff) {
                this.level = 0;
                this.isLow = true;
            }
            else {
                this.isLow = false;
            }
            if (this.payload.length >= 3) {
                // Starting with V2
                this.chargingStatus = this.payload[1] >>> 6;
                this.rechargeable = !!(this.payload[1] & 32);
                this.backup = !!(this.payload[1] & 16);
                this.overheating = !!(this.payload[1] & 0b1000);
                this.lowFluid = !!(this.payload[1] & 0b0100);
                this.rechargeOrReplace = !!(this.payload[1] & 0b10)
                    ? _Types_1.BatteryReplacementStatus.Now
                    : !!(this.payload[1] & 0b1)
                        ? _Types_1.BatteryReplacementStatus.Soon
                        : _Types_1.BatteryReplacementStatus.No;
                this.lowTemperatureStatus = !!(this.payload[2] & 0b10);
                this.disconnected = !!(this.payload[2] & 0b1);
            }
        }
        else {
            this.level = options.isLow ? 0 : options.level;
            this.isLow = !!options.isLow;
            this.chargingStatus = options.chargingStatus;
            this.rechargeable = options.rechargeable;
            this.backup = options.backup;
            this.overheating = options.overheating;
            this.lowFluid = options.lowFluid;
            this.rechargeOrReplace = options.rechargeOrReplace;
            this.disconnected = options.disconnected;
            this.lowTemperatureStatus = options.lowTemperatureStatus;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.isLow ? 0xff : this.level]);
        if (this.chargingStatus != undefined) {
            this.payload = Buffer.concat([
                this.payload,
                Buffer.from([
                    (this.chargingStatus << 6) +
                        (this.rechargeable ? 32 : 0) +
                        (this.backup ? 16 : 0) +
                        (this.overheating ? 0b1000 : 0) +
                        (this.lowFluid ? 0b0100 : 0) +
                        (this.rechargeOrReplace === _Types_1.BatteryReplacementStatus.Now
                            ? 0b10
                            : this.rechargeOrReplace ===
                                _Types_1.BatteryReplacementStatus.Soon
                                ? 0b1
                                : 0),
                    (this.lowTemperatureStatus ? 0b10 : 0) +
                        (this.disconnected ? 0b1 : 0),
                ]),
            ]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            level: this.level,
            "is low": this.isLow,
        };
        if (this.chargingStatus != undefined) {
            message["charging status"] = (0, safe_2.getEnumMemberName)(_Types_1.BatteryChargingStatus, this.chargingStatus);
        }
        if (this.rechargeable != undefined) {
            message.rechargeable = this.rechargeable;
        }
        if (this.backup != undefined) {
            message.backup = this.backup;
        }
        if (this.overheating != undefined) {
            message.overheating = this.overheating;
        }
        if (this.lowFluid != undefined) {
            message["low fluid"] = this.lowFluid;
        }
        if (this.rechargeOrReplace != undefined) {
            message["recharge or replace"] = (0, safe_2.getEnumMemberName)(_Types_1.BatteryReplacementStatus, this.rechargeOrReplace);
        }
        if (this.lowTemperatureStatus != undefined) {
            message.lowTemperatureStatus = this.lowTemperatureStatus;
        }
        if (this.disconnected != undefined) {
            message.disconnected = this.disconnected;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.level)
], BatteryCCReport.prototype, "level", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.isLow)
], BatteryCCReport.prototype, "isLow", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.chargingStatus)
], BatteryCCReport.prototype, "chargingStatus", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.rechargeable)
], BatteryCCReport.prototype, "rechargeable", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.backup)
], BatteryCCReport.prototype, "backup", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.overheating)
], BatteryCCReport.prototype, "overheating", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.lowFluid)
], BatteryCCReport.prototype, "lowFluid", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.rechargeOrReplace)
], BatteryCCReport.prototype, "rechargeOrReplace", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.disconnected)
], BatteryCCReport.prototype, "disconnected", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.lowTemperatureStatus)
], BatteryCCReport.prototype, "lowTemperatureStatus", void 0);
BatteryCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BatteryCommand.Report)
], BatteryCCReport);
exports.BatteryCCReport = BatteryCCReport;
let BatteryCCGet = class BatteryCCGet extends BatteryCC {
};
BatteryCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BatteryCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(BatteryCCReport)
], BatteryCCGet);
exports.BatteryCCGet = BatteryCCGet;
let BatteryCCHealthReport = class BatteryCCHealthReport extends BatteryCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        // Parse maximum capacity. 0xff means unknown
        this.maximumCapacity = this.payload[0];
        if (this.maximumCapacity === 0xff)
            this.maximumCapacity = undefined;
        const { value: temperature, scale } = (0, safe_1.parseFloatWithScale)(this.payload.slice(1), true);
        this.temperature = temperature;
        this.temperatureScale = scale;
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Update the temperature unit in the value DB
        const temperatureValue = exports.BatteryCCValues.temperature;
        this.setMetadata(applHost, temperatureValue, {
            ...temperatureValue.meta,
            unit: this.temperatureScale === 0x00 ? "°C" : undefined,
        });
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                temperature: this.temperature != undefined
                    ? this.temperature
                    : "unknown",
                "max capacity": this.maximumCapacity != undefined
                    ? `${this.maximumCapacity} %`
                    : "unknown",
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.maximumCapacity)
], BatteryCCHealthReport.prototype, "maximumCapacity", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BatteryCCValues.temperature)
], BatteryCCHealthReport.prototype, "temperature", void 0);
BatteryCCHealthReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BatteryCommand.HealthReport)
], BatteryCCHealthReport);
exports.BatteryCCHealthReport = BatteryCCHealthReport;
let BatteryCCHealthGet = class BatteryCCHealthGet extends BatteryCC {
};
BatteryCCHealthGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BatteryCommand.HealthGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(BatteryCCHealthReport)
], BatteryCCHealthGet);
exports.BatteryCCHealthGet = BatteryCCHealthGet;
//# sourceMappingURL=BatteryCC.js.map