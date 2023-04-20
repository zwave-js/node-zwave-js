"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManufacturerProprietaryCC = exports.ManufacturerProprietaryCCAPI = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    return _number($o);
};
const __assertType__optional_Buffer = $o => {
    function _buffer($o) {
        return !Buffer.isBuffer($o) ? {} : null;
    }
    function optional__buffer($o) {
        if ($o !== undefined) {
            const error = _buffer($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__buffer($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Decorators_1 = require("./manufacturerProprietary/Decorators");
const ManufacturerSpecificCC_1 = require("./ManufacturerSpecificCC");
let ManufacturerProprietaryCCAPI = class ManufacturerProprietaryCCAPI extends API_1.CCAPI {
    constructor(applHost, endpoint) {
        super(applHost, endpoint);
        // Read the manufacturer ID from Manufacturer Specific CC
        const manufacturerId = this.getValueDB().getValue(ManufacturerSpecificCC_1.ManufacturerSpecificCCValues.manufacturerId.id);
        // If possible, try to defer to a specific subclass of this API
        if (manufacturerId != undefined) {
            const SpecificAPIConstructor = (0, Decorators_1.getManufacturerProprietaryAPI)(manufacturerId);
            if (SpecificAPIConstructor != undefined &&
                new.target !== SpecificAPIConstructor) {
                return new SpecificAPIConstructor(applHost, endpoint);
            }
        }
    }
    async sendData(manufacturerId, data) {
        __assertType("manufacturerId", "number", __assertType__number.bind(void 0, manufacturerId));
        __assertType("data", "(optional) Buffer", __assertType__optional_Buffer.bind(void 0, data));
        const cc = new ManufacturerProprietaryCC(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            manufacturerId,
        });
        cc.payload = data ?? Buffer.allocUnsafe(0);
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    async sendAndReceiveData(manufacturerId, data) {
        __assertType("manufacturerId", "number", __assertType__number.bind(void 0, manufacturerId));
        __assertType("data", "(optional) Buffer", __assertType__optional_Buffer.bind(void 0, data));
        const cc = new ManufacturerProprietaryCC(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            manufacturerId,
            unspecifiedExpectsResponse: true,
        });
        cc.payload = data ?? Buffer.allocUnsafe(0);
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return {
                manufacturerId: response.manufacturerId,
                data: response.payload,
            };
        }
    }
};
ManufacturerProprietaryCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Manufacturer Proprietary"])
], ManufacturerProprietaryCCAPI);
exports.ManufacturerProprietaryCCAPI = ManufacturerProprietaryCCAPI;
function getReponseForManufacturerProprietary(cc) {
    return cc.unspecifiedExpectsResponse
        ? ManufacturerProprietaryCC
        : undefined;
}
function testResponseForManufacturerProprietaryRequest(sent, received) {
    // We expect a Manufacturer Proprietary response that has the same manufacturer ID as the request
    return sent.manufacturerId === received.manufacturerId;
}
let ManufacturerProprietaryCC = class ManufacturerProprietaryCC extends CommandClass_1.CommandClass {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            // ManufacturerProprietaryCC has no CC command, so the first byte is stored in ccCommand.
            this.manufacturerId =
                (this.ccCommand << 8) + this.payload[0];
            // Try to parse the proprietary command
            const PCConstructor = (0, Decorators_1.getManufacturerProprietaryCCConstructor)(this.manufacturerId);
            if (PCConstructor &&
                new.target !== PCConstructor &&
                !(0, safe_2.staticExtends)(new.target, PCConstructor)) {
                return new PCConstructor(host, options);
            }
            // If the constructor is correct, update the payload for subclass deserialization
            this.payload = this.payload.slice(1);
        }
        else {
            this.manufacturerId =
                options.manufacturerId ?? (0, Decorators_1.getManufacturerId)(this);
            this.unspecifiedExpectsResponse =
                options.unspecifiedExpectsResponse;
            // To use this CC, a manufacturer ID must exist in the value DB
            // If it doesn't, the interview procedure will throw.
        }
    }
    getManufacturerIdOrThrow() {
        if (this.manufacturerId == undefined) {
            throw new safe_1.ZWaveError(`To use an instance of ManufacturerProprietaryCC, the manufacturer ID must be stored in the value DB`, safe_1.ZWaveErrorCodes.ManufacturerProprietaryCC_NoManufacturerId);
        }
        return this.manufacturerId;
    }
    serialize() {
        const manufacturerId = this.getManufacturerIdOrThrow();
        // ManufacturerProprietaryCC has no CC command, so the first byte
        // is stored in ccCommand
        super.ccCommand = (manufacturerId >>> 8) & 0xff;
        // The 2nd byte is in the payload
        this.payload = Buffer.concat([
            Buffer.from([
                // 2nd byte of manufacturerId
                manufacturerId & 0xff,
            ]),
            this.payload,
        ]);
        return super.serialize();
    }
    createSpecificInstance() {
        // Try to defer to the correct subclass
        if (this.manufacturerId != undefined) {
            const PCConstructor = (0, Decorators_1.getManufacturerProprietaryCCConstructor)(this.manufacturerId);
            if (PCConstructor) {
                return new PCConstructor(this.host, {
                    nodeId: this.nodeId,
                    endpoint: this.endpointIndex,
                });
            }
        }
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        // Read the manufacturer ID from Manufacturer Specific CC
        this.manufacturerId = this.getValue(applHost, ManufacturerSpecificCC_1.ManufacturerSpecificCCValues.manufacturerId);
        const pcInstance = this.createSpecificInstance();
        if (pcInstance) {
            await pcInstance.interview(applHost);
        }
        else {
            applHost.controllerLog.logNode(node.id, {
                message: `${this.constructor.name}: skipping interview refresh because the matching proprietary CC is not implemented...`,
                direction: "none",
            });
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        if (this.manufacturerId == undefined) {
            // Read the manufacturer ID from Manufacturer Specific CC
            this.manufacturerId = this.getValue(applHost, ManufacturerSpecificCC_1.ManufacturerSpecificCCValues.manufacturerId);
        }
        const pcInstance = this.createSpecificInstance();
        if (pcInstance) {
            await pcInstance.refreshValues(applHost);
        }
        else {
            applHost.controllerLog.logNode(node.id, {
                message: `${this.constructor.name}: skipping value refresh because the matching proprietary CC is not implemented...`,
                direction: "none",
            });
        }
    }
};
ManufacturerProprietaryCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Manufacturer Proprietary"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.expectedCCResponse)(getReponseForManufacturerProprietary, testResponseForManufacturerProprietaryRequest)
], ManufacturerProprietaryCC);
exports.ManufacturerProprietaryCC = ManufacturerProprietaryCC;
//# sourceMappingURL=ManufacturerProprietaryCC.js.map