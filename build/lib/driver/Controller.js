"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Message_1 = require("../message/Message");
const Node_1 = require("../node/Node");
const logger_1 = require("../util/logger");
const strings_1 = require("../util/strings");
const GetControllerCapabilitiesMessages_1 = require("./GetControllerCapabilitiesMessages");
const GetControllerIdMessages_1 = require("./GetControllerIdMessages");
const GetControllerVersionMessages_1 = require("./GetControllerVersionMessages");
const GetSerialApiCapabilitiesMessages_1 = require("./GetSerialApiCapabilitiesMessages");
const GetSerialApiInitDataMessages_1 = require("./GetSerialApiInitDataMessages");
const GetSUCNodeIdMessages_1 = require("./GetSUCNodeIdMessages");
const SetSerialApiTimeoutsMessages_1 = require("./SetSerialApiTimeoutsMessages");
class ZWaveController {
    constructor(driver) {
        this.driver = driver;
        this.nodes = new Map();
    }
    get libraryVersion() {
        return this._libraryVersion;
    }
    get type() {
        return this._type;
    }
    get homeId() {
        return this._homeId;
    }
    get ownNodeId() {
        return this._ownNodeId;
    }
    get isSecondary() {
        return this._isSecondary;
    }
    get isUsingHomeIdFromOtherNetwork() {
        return this._isUsingHomeIdFromOtherNetwork;
    }
    get isSISPresent() {
        return this._isSISPresent;
    }
    get wasRealPrimary() {
        return this._wasRealPrimary;
    }
    get isStaticUpdateController() {
        return this._isStaticUpdateController;
    }
    get isSlave() {
        return this._isSlave;
    }
    get serialApiVersion() {
        return this._serialApiVersion;
    }
    get manufacturerId() {
        return this._manufacturerId;
    }
    get productType() {
        return this._productType;
    }
    get productId() {
        return this._productId;
    }
    get supportedFunctionTypes() {
        return this._supportedFunctionTypes;
    }
    isFunctionSupported(functionType) {
        return this._supportedFunctionTypes.indexOf(functionType) > -1;
    }
    get sucNodeId() {
        return this._sucNodeId;
    }
    get supportsTimers() {
        return this._supportsTimers;
    }
    //#endregion
    interview() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log("controller", "beginning interview...", "debug");
            // get basic controller version info
            logger_1.log("controller", `querying version info...`, "debug");
            const version = yield this.driver.sendMessage(new GetControllerVersionMessages_1.GetControllerVersionRequest(), "none");
            this._libraryVersion = version.libraryVersion;
            this._type = version.controllerType;
            logger_1.log("controller", `received version info:`, "debug");
            logger_1.log("controller", `  controller type: ${GetControllerVersionMessages_1.ControllerTypes[this._type]}`, "debug");
            logger_1.log("controller", `  library version: ${this._libraryVersion}`, "debug");
            // get the home and node id of the controller
            logger_1.log("controller", `querying controller IDs...`, "debug");
            const ids = yield this.driver.sendMessage(new GetControllerIdMessages_1.GetControllerIdRequest(), "none");
            this._homeId = ids.homeId;
            this._ownNodeId = ids.ownNodeId;
            logger_1.log("controller", `received controller IDs:`, "debug");
            logger_1.log("controller", `  home ID:     ${strings_1.num2hex(this._homeId)}`, "debug");
            logger_1.log("controller", `  own node ID: ${this._ownNodeId}`, "debug");
            // find out what the controller can do
            logger_1.log("controller", `querying controller capabilities...`, "debug");
            const ctrlCaps = yield this.driver.sendMessage(new GetControllerCapabilitiesMessages_1.GetControllerCapabilitiesRequest(), "none");
            this._isSecondary = ctrlCaps.isSecondary;
            this._isUsingHomeIdFromOtherNetwork = ctrlCaps.isUsingHomeIdFromOtherNetwork;
            this._isSISPresent = ctrlCaps.isSISPresent;
            this._wasRealPrimary = ctrlCaps.wasRealPrimary;
            this._isStaticUpdateController = ctrlCaps.isStaticUpdateController;
            logger_1.log("controller", `received controller capabilities:`, "debug");
            logger_1.log("controller", `  controller role:     ${this._isSecondary ? "secondary" : "primary"}`, "debug");
            logger_1.log("controller", `  is in other network: ${this._isUsingHomeIdFromOtherNetwork}`, "debug");
            logger_1.log("controller", `  is SIS present:      ${this._isSISPresent}`, "debug");
            logger_1.log("controller", `  was real primary:    ${this._wasRealPrimary}`, "debug");
            logger_1.log("controller", `  is a SUC:            ${this._isStaticUpdateController}`, "debug");
            // find out which part of the API is supported
            logger_1.log("controller", `querying API capabilities...`, "debug");
            const apiCaps = yield this.driver.sendMessage(new GetSerialApiCapabilitiesMessages_1.GetSerialApiCapabilitiesRequest(), "none");
            this._serialApiVersion = apiCaps.serialApiVersion;
            this._manufacturerId = apiCaps.manufacturerId;
            this._productType = apiCaps.productType;
            this._productId = apiCaps.productId;
            this._supportedFunctionTypes = apiCaps.supportedFunctionTypes;
            logger_1.log("controller", `received API capabilities:`, "debug");
            logger_1.log("controller", `  serial API version:  ${this._serialApiVersion}`, "debug");
            logger_1.log("controller", `  manufacturer ID:     ${strings_1.num2hex(this._manufacturerId)}`, "debug");
            logger_1.log("controller", `  product type:        ${strings_1.num2hex(this._productType)}`, "debug");
            logger_1.log("controller", `  product ID:          ${strings_1.num2hex(this._productId)}`, "debug");
            logger_1.log("controller", `  supported functions:`, "debug");
            for (const fn of this._supportedFunctionTypes) {
                logger_1.log("controller", `    ${Message_1.FunctionType[fn]} (${strings_1.num2hex(fn)})`, "debug");
            }
            // now we can check if a function is supported
            // find the SUC
            logger_1.log("controller", `finding SUC...`, "debug");
            const suc = yield this.driver.sendMessage(new GetSUCNodeIdMessages_1.GetSUCNodeIdRequest(), "none");
            this._sucNodeId = suc.sucNodeId;
            if (this._sucNodeId === 0) {
                logger_1.log("controller", `no SUC present`, "debug");
            }
            else {
                logger_1.log("controller", `SUC has node ID ${this.sucNodeId}`, "debug");
            }
            // TODO: if configured, enable this controller as SIS if there's no SUC
            // https://github.com/OpenZWave/open-zwave/blob/a46f3f36271f88eed5aea58899a6cb118ad312a2/cpp/src/Driver.cpp#L2586
            // if it's a bridge controller, request the virtual nodes
            if (this.type === GetControllerVersionMessages_1.ControllerTypes["Bridge Controller"] && this.isFunctionSupported(Message_1.FunctionType.FUNC_ID_ZW_GET_VIRTUAL_NODES)) {
                // TODO: send FUNC_ID_ZW_GET_VIRTUAL_NODES message
            }
            // Request information about all nodes with the GetInitData message
            logger_1.log("controller", `querying node information...`, "debug");
            const initData = yield this.driver.sendMessage(new GetSerialApiInitDataMessages_1.GetSerialApiInitDataRequest());
            // override the information we might already have
            this._isSecondary = initData.isSecondary;
            this._isStaticUpdateController = initData.isStaticUpdateController;
            // and remember the new info
            this._isSlave = initData.isSlave;
            this._supportsTimers = initData.supportsTimers;
            // ignore the initVersion, no clue what to do with it
            logger_1.log("controller", `received node information:`, "debug");
            logger_1.log("controller", `  controller role:            ${this._isSecondary ? "secondary" : "primary"}`, "debug");
            logger_1.log("controller", `  controller is a SUC:        ${this._isStaticUpdateController}`, "debug");
            logger_1.log("controller", `  controller is a slave:      ${this._isSlave}`, "debug");
            logger_1.log("controller", `  controller supports timers: ${this._supportsTimers}`, "debug");
            logger_1.log("controller", `  nodes in the network:       ${initData.nodeIds.join(", ")}`, "debug");
            // create an empty entry in the nodes map so we can initialize them afterwards
            for (const nodeId of initData.nodeIds) {
                this.nodes.set(nodeId, new Node_1.Node(nodeId, this.driver));
            }
            if (this.type !== GetControllerVersionMessages_1.ControllerTypes["Bridge Controller"] && this.isFunctionSupported(Message_1.FunctionType.SetSerialApiTimeouts)) {
                const { ack, byte } = this.driver.options.timeouts;
                logger_1.log("controller", `setting serial API timeouts: ack = ${ack} ms, byte = ${byte} ms`, "debug");
                const resp = yield this.driver.sendMessage(new SetSerialApiTimeoutsMessages_1.SetSerialApiTimeoutsRequest(ack, byte));
                logger_1.log("controller", `serial API timeouts overwritten. The old values were: ack = ${resp.oldAckTimeout} ms, byte = ${resp.oldByteTimeout} ms`, "debug");
            }
            // send application info (not sure why tho)
            if (this.isFunctionSupported(Message_1.FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION)) {
                logger_1.log("controller", `sending application info...`, "debug");
                const appInfoMsg = new Message_1.Message(Message_1.MessageType.Request, Message_1.FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION, null, Buffer.from([
                    0x01,
                    0x02,
                    0x01,
                    0x00,
                ]));
                yield this.driver.sendMessage(appInfoMsg, Message_1.MessagePriority.Controller, "none");
            }
            logger_1.log("controller", "interview completed", "debug");
        });
    }
}
exports.ZWaveController = ZWaveController;
