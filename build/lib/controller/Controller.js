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
const events_1 = require("events");
const CommandClass_1 = require("../commandclass/CommandClass");
const VersionCC_1 = require("../commandclass/VersionCC");
const ZWaveError_1 = require("../error/ZWaveError");
const Constants_1 = require("../message/Constants");
const Message_1 = require("../message/Message");
const DeviceClass_1 = require("../node/DeviceClass");
const Node_1 = require("../node/Node");
const defer_promise_1 = require("../util/defer-promise");
const logger_1 = require("../util/logger");
const strings_1 = require("../util/strings");
const AddNodeToNetworkRequest_1 = require("./AddNodeToNetworkRequest");
const GetControllerCapabilitiesMessages_1 = require("./GetControllerCapabilitiesMessages");
const GetControllerIdMessages_1 = require("./GetControllerIdMessages");
const GetControllerVersionMessages_1 = require("./GetControllerVersionMessages");
const GetSerialApiCapabilitiesMessages_1 = require("./GetSerialApiCapabilitiesMessages");
const GetSerialApiInitDataMessages_1 = require("./GetSerialApiInitDataMessages");
const GetSUCNodeIdMessages_1 = require("./GetSUCNodeIdMessages");
const HardResetRequest_1 = require("./HardResetRequest");
const SetSerialApiTimeoutsMessages_1 = require("./SetSerialApiTimeoutsMessages");
// TODO: interface the exposed events
class ZWaveController extends events_1.EventEmitter {
    /** @internal */
    constructor(driver) {
        super();
        this.driver = driver;
        this.nodes = new Map();
        this._inclusionActive = false;
        // register message handlers
        driver.registerRequestHandler(Constants_1.FunctionType.AddNodeToNetwork, this.handleAddNodeRequest.bind(this));
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
        if (this._supportedFunctionTypes == null) {
            throw new ZWaveError_1.ZWaveError("Cannot check yet if a function is supported by the controller. The interview process has not been completed.", ZWaveError_1.ZWaveErrorCodes.Driver_NotReady);
        }
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
            logger_1.log("controller", `  controller type: ${VersionCC_1.ZWaveLibraryTypes[this._type]}`, "debug");
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
                logger_1.log("controller", `    ${Constants_1.FunctionType[fn]} (${strings_1.num2hex(fn)})`, "debug");
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
            if (this.type === VersionCC_1.ZWaveLibraryTypes["Bridge Controller"] && this.isFunctionSupported(Constants_1.FunctionType.FUNC_ID_ZW_GET_VIRTUAL_NODES)) {
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
                this.nodes.set(nodeId, new Node_1.ZWaveNode(nodeId, this.driver));
            }
            if (this.type !== VersionCC_1.ZWaveLibraryTypes["Bridge Controller"] && this.isFunctionSupported(Constants_1.FunctionType.SetSerialApiTimeouts)) {
                const { ack, byte } = this.driver.options.timeouts;
                logger_1.log("controller", `setting serial API timeouts: ack = ${ack} ms, byte = ${byte} ms`, "debug");
                const resp = yield this.driver.sendMessage(new SetSerialApiTimeoutsMessages_1.SetSerialApiTimeoutsRequest(ack, byte));
                logger_1.log("controller", `serial API timeouts overwritten. The old values were: ack = ${resp.oldAckTimeout} ms, byte = ${resp.oldByteTimeout} ms`, "debug");
            }
            // send application info (not sure why tho)
            if (this.isFunctionSupported(Constants_1.FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION)) {
                logger_1.log("controller", `sending application info...`, "debug");
                const appInfoMsg = new Message_1.Message(Constants_1.MessageType.Request, Constants_1.FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION, null, Buffer.from([
                    0x01,
                    0x02,
                    0x01,
                    0x00,
                ]));
                yield this.driver.sendMessage(appInfoMsg, Constants_1.MessagePriority.Controller, "none");
            }
            logger_1.log("controller", "interview completed", "debug");
        });
    }
    /**
     * Performs a hard reset on the controller. This wipes out all configuration!
     * Warning: The driver needs to re-interview the controller, so don't call this directly
     * @internal
     */
    hardReset() {
        logger_1.log("controller", "performing hard reset...", "debug");
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            // handle the incoming message
            const handler = (msg) => {
                logger_1.log("controller", `  hard reset succeeded`, "debug");
                resolve();
                return true;
            };
            this.driver.registerRequestHandler(Constants_1.FunctionType.HardReset, handler, true);
            // begin the reset process
            try {
                yield this.driver.sendMessage(new HardResetRequest_1.HardResetRequest());
            }
            catch (e) {
                // in any case unregister the handler
                logger_1.log("controller", `  hard reset failed: ${e.message}`, "debug");
                this.driver.unregisterRequestHandler(Constants_1.FunctionType.HardReset, handler);
                reject(e);
            }
        }));
    }
    beginInclusion() {
        return __awaiter(this, void 0, void 0, function* () {
            // don't start it twice
            if (this._inclusionActive)
                return false;
            this._inclusionActive = true;
            logger_1.log("controller", `starting inclusion process...`, "debug");
            // create the promise we're going to return
            this._beginInclusionPromise = defer_promise_1.createDeferredPromise();
            // kick off the inclusion process
            yield this.driver.sendMessage(new AddNodeToNetworkRequest_1.AddNodeToNetworkRequest(AddNodeToNetworkRequest_1.AddNodeType.Any, true, true));
            yield this._beginInclusionPromise;
        });
    }
    stopInclusion() {
        return __awaiter(this, void 0, void 0, function* () {
            // don't stop it twice
            if (!this._inclusionActive)
                return false;
            this._inclusionActive = false;
            logger_1.log("controller", `stopping inclusion process...`, "debug");
            // create the promise we're going to return
            this._stopInclusionPromise = defer_promise_1.createDeferredPromise();
            // kick off the inclusion process
            yield this.driver.sendMessage(new AddNodeToNetworkRequest_1.AddNodeToNetworkRequest(AddNodeToNetworkRequest_1.AddNodeType.Stop, true, true));
            yield this._stopInclusionPromise;
            logger_1.log("controller", `the inclusion process was stopped`, "debug");
        });
    }
    handleAddNodeRequest(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log("controller", `handling add node request (status = ${AddNodeToNetworkRequest_1.AddNodeStatus[msg.status]})`, "debug");
            if (!this._inclusionActive && msg.status !== AddNodeToNetworkRequest_1.AddNodeStatus.Done) {
                logger_1.log("controller", `  inclusion is NOT active, ignoring it...`, "debug");
                return;
            }
            switch (msg.status) {
                case AddNodeToNetworkRequest_1.AddNodeStatus.Ready:
                    // this is called when inclusion was started successfully
                    logger_1.log("controller", `  the controller is now ready to add nodes`, "debug");
                    if (this._beginInclusionPromise != null)
                        this._beginInclusionPromise.resolve(true);
                    return;
                case AddNodeToNetworkRequest_1.AddNodeStatus.Failed:
                    // this is called when inclusion could not be started...
                    if (this._beginInclusionPromise != null) {
                        logger_1.log("controller", `  starting the inclusion failed`, "debug");
                        this._beginInclusionPromise.reject(new ZWaveError_1.ZWaveError("The inclusion could not be started.", ZWaveError_1.ZWaveErrorCodes.Controller_InclusionFailed));
                    }
                    else {
                        // ...or adding a node failed
                        logger_1.log("controller", `  adding the node failed`, "debug");
                        this.emit("inclusion failed");
                    }
                    // in any case, stop the inclusion process so we don't accidentally add another node
                    try {
                        yield this.stopInclusion();
                    }
                    catch (e) { /* ok */ }
                    return;
                case AddNodeToNetworkRequest_1.AddNodeStatus.AddingSlave: {
                    // this is called when a new node is added
                    this._nodePendingInclusion = new Node_1.ZWaveNode(msg.statusContext.nodeId, this.driver, new DeviceClass_1.DeviceClass(msg.statusContext.basic, msg.statusContext.generic, msg.statusContext.specific), msg.statusContext.supportedCCs, msg.statusContext.controlledCCs);
                    return;
                }
                case AddNodeToNetworkRequest_1.AddNodeStatus.ProtocolDone: {
                    // this is called after a new node is added
                    // stop the inclusion process so we don't accidentally add another node
                    try {
                        yield this.stopInclusion();
                    }
                    catch (e) { /* ok */ }
                    return;
                }
                case AddNodeToNetworkRequest_1.AddNodeStatus.Done: {
                    // this is called when the inclusion was completed
                    logger_1.log("controller", `done called for ${msg.statusContext.nodeId}`, "debug");
                    // stopping the inclusion was acknowledged by the controller
                    if (this._stopInclusionPromise != null)
                        this._stopInclusionPromise.resolve();
                    if (this._nodePendingInclusion != null) {
                        const newNode = this._nodePendingInclusion;
                        logger_1.log("controller", `finished adding node ${newNode.id}:`, "debug");
                        logger_1.log("controller", `  basic device class:    ${DeviceClass_1.BasicDeviceClasses[newNode.deviceClass.basic]} (${strings_1.num2hex(newNode.deviceClass.basic)})`, "debug");
                        logger_1.log("controller", `  generic device class:  ${newNode.deviceClass.generic.name} (${strings_1.num2hex(newNode.deviceClass.generic.key)})`, "debug");
                        logger_1.log("controller", `  specific device class: ${newNode.deviceClass.specific.name} (${strings_1.num2hex(newNode.deviceClass.specific.key)})`, "debug");
                        logger_1.log("controller", `  supported CCs:`, "debug");
                        for (const [cc, info] of newNode.commandClasses.entries()) {
                            if (info.isSupported)
                                logger_1.log("controller", `    ${CommandClass_1.CommandClasses[cc]} (${strings_1.num2hex(cc)})`, "debug");
                        }
                        logger_1.log("controller", `  controlled CCs:`, "debug");
                        for (const [cc, info] of newNode.commandClasses.entries()) {
                            if (info.isControlled)
                                logger_1.log("controller", `    ${CommandClass_1.CommandClasses[cc]} (${strings_1.num2hex(cc)})`, "debug");
                        }
                        // remember the node
                        this.nodes.set(newNode.id, newNode);
                        delete this._nodePendingInclusion;
                        // and notify listeners
                        this.emit("node added", newNode);
                    }
                }
            }
        });
    }
}
exports.ZWaveController = ZWaveController;
