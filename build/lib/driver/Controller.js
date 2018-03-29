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
const logger_1 = require("../util/logger");
const GetControllerCapabilitiesMessages_1 = require("./GetControllerCapabilitiesMessages");
const GetControllerIdMessages_1 = require("./GetControllerIdMessages");
const GetControllerVersionMessages_1 = require("./GetControllerVersionMessages");
const GetSerialApiCapabilitiesMessages_1 = require("./GetSerialApiCapabilitiesMessages");
const GetSUCNodeIdMessages_1 = require("./GetSUCNodeIdMessages");
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
            logger_1.log("interviewing controller", "debug");
            // get basic controller version info
            const version = yield driver.sendMessage(new GetControllerVersionMessages_1.GetControllerVersionRequest(), true);
            logger_1.log(`got version info: ${JSON.stringify(version)}`, "debug");
            this._libraryVersion = version.libraryVersion;
            this._type = version.controllerType;
            // get the home and node id of the controller
            const ids = yield driver.sendMessage(new GetControllerIdMessages_1.GetControllerIdRequest(), true);
            logger_1.log(`got IDs: ${JSON.stringify(ids)}`, "debug");
            this._homeId = ids.homeId;
            this._ownNodeId = ids.ownNodeId;
            // find out what the controller can do
            const ctrlCaps = yield driver.sendMessage(new GetControllerCapabilitiesMessages_1.GetControllerCapabilitiesRequest(), true);
            logger_1.log(`got controller capabilities: ${JSON.stringify(ctrlCaps)}`, "debug");
            this._isSecondary = ctrlCaps.isSecondary;
            this._isUsingHomeIdFromOtherNetwork = ctrlCaps.isUsingHomeIdFromOtherNetwork;
            this._isSISPresent = ctrlCaps.isSISPresent;
            this._wasRealPrimary = ctrlCaps.wasRealPrimary;
            this._isStaticUpdateController = ctrlCaps.isStaticUpdateController;
            // find out which part of the API is supported
            const apiCaps = yield driver.sendMessage(new GetSerialApiCapabilitiesMessages_1.GetSerialApiCapabilitiesRequest(), true);
            logger_1.log(`got api capabilities: ${JSON.stringify(apiCaps)}`, "debug");
            this._serialApiVersion = apiCaps.serialApiVersion;
            this._manufacturerId = apiCaps.manufacturerId;
            this._productType = apiCaps.productType;
            this._productId = apiCaps.productId;
            this._functionBitMask = apiCaps.functionBitMask;
            // find the SUC
            const suc = yield driver.sendMessage(new GetSUCNodeIdMessages_1.GetSUCNodeIdRequest(), true);
            logger_1.log(`got suc info: ${JSON.stringify(suc)}`, "debug");
            this._sucNodeId = suc.sucNodeId;
        });
    }
}
exports.ZWaveController = ZWaveController;
