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
const logger_1 = require("../util/logger");
const strings_1 = require("../util/strings");
const GetControllerCapabilitiesMessages_1 = require("./GetControllerCapabilitiesMessages");
const GetControllerIdMessages_1 = require("./GetControllerIdMessages");
const GetControllerVersionMessages_1 = require("./GetControllerVersionMessages");
const GetSerialApiCapabilitiesMessages_1 = require("./GetSerialApiCapabilitiesMessages");
const GetSUCNodeIdMessages_1 = require("./GetSUCNodeIdMessages");
const SetSerialApiTimeoutsMessages_1 = require("./SetSerialApiTimeoutsMessages");
class ZWaveController {
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
    isFunctionSupported(functionType) {
        const byteNum = (functionType - 1) >>> 3; // type / 8
        const bitNum = (functionType - 1) % 8;
        return (this._functionBitMask[byteNum] & (1 << bitNum)) !== 0;
    }
    get sucNodeId() {
        return this._sucNodeId;
    }
    interview(driver) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log("controller", "interviewing controller", "debug");
            // get basic controller version info
            const version = yield driver.sendMessage(new GetControllerVersionMessages_1.GetControllerVersionRequest(), "none");
            logger_1.log("controller", `got version info: ${strings_1.stringify(version)}`, "debug");
            this._libraryVersion = version.libraryVersion;
            this._type = version.controllerType;
            // get the home and node id of the controller
            const ids = yield driver.sendMessage(new GetControllerIdMessages_1.GetControllerIdRequest(), "none");
            logger_1.log("controller", `got IDs: ${strings_1.stringify(ids)}`, "debug");
            this._homeId = ids.homeId;
            this._ownNodeId = ids.ownNodeId;
            // find out what the controller can do
            const ctrlCaps = yield driver.sendMessage(new GetControllerCapabilitiesMessages_1.GetControllerCapabilitiesRequest(), "none");
            logger_1.log("controller", `got controller capabilities: ${strings_1.stringify(ctrlCaps)}`, "debug");
            this._isSecondary = ctrlCaps.isSecondary;
            this._isUsingHomeIdFromOtherNetwork = ctrlCaps.isUsingHomeIdFromOtherNetwork;
            this._isSISPresent = ctrlCaps.isSISPresent;
            this._wasRealPrimary = ctrlCaps.wasRealPrimary;
            this._isStaticUpdateController = ctrlCaps.isStaticUpdateController;
            // find out which part of the API is supported
            const apiCaps = yield driver.sendMessage(new GetSerialApiCapabilitiesMessages_1.GetSerialApiCapabilitiesRequest(), "none");
            logger_1.log("controller", `got api capabilities: ${strings_1.stringify(apiCaps)}`, "debug");
            this._serialApiVersion = apiCaps.serialApiVersion;
            this._manufacturerId = apiCaps.manufacturerId;
            this._productType = apiCaps.productType;
            this._productId = apiCaps.productId;
            this._functionBitMask = apiCaps.functionBitMask;
            // now we can check if a function is supported
            // find the SUC
            const suc = yield driver.sendMessage(new GetSUCNodeIdMessages_1.GetSUCNodeIdRequest(), "none");
            logger_1.log("controller", `got suc info: ${strings_1.stringify(suc)}`, "debug");
            this._sucNodeId = suc.sucNodeId;
            // TODO: enable SIS if no SUC
            // https://github.com/OpenZWave/open-zwave/blob/a46f3f36271f88eed5aea58899a6cb118ad312a2/cpp/src/Driver.cpp#L2586
            // if it's a bridge controller, request the virtual nodes
            if (this.type === GetControllerVersionMessages_1.ControllerTypes["Bridge Controller"] && this.isFunctionSupported(Message_1.FunctionType.FUNC_ID_ZW_GET_VIRTUAL_NODES)) {
                // TODO: send FUNC_ID_ZW_GET_VIRTUAL_NODES message
            }
            // TODO: Request information about all nodes with the GetInitData message
            // https://github.com/OpenZWave/open-zwave/blob/a46f3f36271f88eed5aea58899a6cb118ad312a2/cpp/src/Driver.cpp#L2632
            if (this.type !== GetControllerVersionMessages_1.ControllerTypes["Bridge Controller"] && this.isFunctionSupported(Message_1.FunctionType.SetSerialApiTimeouts)) {
                const { ack, byte } = driver.options.timeouts;
                logger_1.log("controller", `setting serial API timeouts: ack = ${ack} ms, byte = ${byte} ms`, "debug");
                const resp = yield driver.sendMessage(new SetSerialApiTimeoutsMessages_1.SetSerialApiTimeoutsRequest(ack, byte));
                logger_1.log("controller", `serial API timeouts overwritten. The old values were: ack = ${resp.oldAckTimeout} ms, byte = ${resp.oldByteTimeout} ms`, "debug");
            }
            // send application info (not sure why tho)
            if (this.isFunctionSupported(Message_1.FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION)) {
                logger_1.log("controller", `sending application info`, "debug");
                const appInfoMsg = new Message_1.Message(Message_1.MessageType.Request, Message_1.FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION, null, Buffer.from([
                    0x01,
                    0x02,
                    0x01,
                    0x00,
                ]));
                yield driver.sendMessage(appInfoMsg, "none");
            }
            logger_1.log("controller", "interview done!", "debug");
        });
    }
}
exports.ZWaveController = ZWaveController;
