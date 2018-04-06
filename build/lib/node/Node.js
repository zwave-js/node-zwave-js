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
const ICommandClassContainer_1 = require("../commandclass/ICommandClassContainer");
const NoOperationCC_1 = require("../commandclass/NoOperationCC");
const SendDataMessages_1 = require("../commandclass/SendDataMessages");
const ApplicationUpdateRequest_1 = require("../controller/ApplicationUpdateRequest");
const Constants_1 = require("../message/Constants");
const logger_1 = require("../util/logger");
const strings_1 = require("../util/strings");
const DeviceClass_1 = require("./DeviceClass");
const GetNodeProtocolInfoMessages_1 = require("./GetNodeProtocolInfoMessages");
const INodeQuery_1 = require("./INodeQuery");
const RequestNodeInfoMessages_1 = require("./RequestNodeInfoMessages");
/** Finds the ID of the target or source node in a message, if it contains that information */
function getNodeId(msg) {
    if (INodeQuery_1.isNodeQuery(msg))
        return msg.nodeId;
    if (ICommandClassContainer_1.isCommandClassContainer(msg))
        return msg.command.nodeId;
}
exports.getNodeId = getNodeId;
class ZWaveNode {
    constructor(id, driver, deviceClass, supportedCCs = [], controlledCCs = []) {
        this.id = id;
        this.driver = driver;
        //#region --- properties ---
        this.logPrefix = `[Node ${strings_1.padStart(this.id.toString(), 3, "0")}] `;
        /** This tells us which interview stage was last completed */
        this.interviewStage = InterviewStage.None;
        // TODO restore from cache
        this._deviceClass = deviceClass;
        this._supportedCCs = supportedCCs;
        this._controlledCCs = controlledCCs;
    }
    get deviceClass() {
        return this._deviceClass;
    }
    get isListening() {
        return this._isListening;
    }
    get isFrequentListening() {
        return this._isFrequentListening;
    }
    get isRouting() {
        return this._isRouting;
    }
    get maxBaudRate() {
        return this._maxBaudRate;
    }
    get isSecure() {
        return this._isSecure;
    }
    get version() {
        return this._version;
    }
    get isBeaming() {
        return this._isBeaming;
    }
    get supportedCCs() {
        return this._supportedCCs;
    }
    get controlledCCs() {
        return this._controlledCCs;
    }
    //#endregion
    isControllerNode() {
        return this.id === this.driver.controller.ownNodeId;
    }
    /** Tests if this node supports the given CommandClass */
    supportsCC(cc) {
        return this._supportedCCs.indexOf(cc) !== -1;
    }
    /** Tests if this node controls the given CommandClass */
    controlsCC(cc) {
        return this._controlledCCs.indexOf(cc) !== -1;
    }
    //#region --- interview ---
    interview() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log("controller", `${this.logPrefix}beginning interview... last completed step: ${InterviewStage[this.interviewStage]}`, "debug");
            // before each step check if it is necessary
            if (this.interviewStage === InterviewStage.None) {
                // do a full interview starting with the protocol info
                logger_1.log("controller", `${this.logPrefix}new Node, doing a full interview...`, "debug");
                yield this.queryProtocolInfo();
            }
            // TODO: delay pinging of nodes that are not listening or sleeping
            if (this.interviewStage === InterviewStage.ProtocolInfo) {
                // after getting the protocol info, ping the nodes
                yield this.ping();
            }
            // TODO: WakeUp
            // TODO: ManufacturerSpecific1
            if (this.interviewStage === InterviewStage.Ping) {
                yield this.getNodeInfo();
            }
            // for testing purposes we skip to the end
            this.interviewStage = InterviewStage.Complete;
            logger_1.log("controller", `${this.logPrefix}interview completed`, "debug");
        });
    }
    /** Step #1 of the node interview */
    queryProtocolInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log("controller", `${this.logPrefix}querying protocol info`, "debug");
            const resp = yield this.driver.sendMessage(new GetNodeProtocolInfoMessages_1.GetNodeProtocolInfoRequest(this.id));
            this._deviceClass = resp.deviceClass;
            this._isListening = resp.isListening;
            this._isFrequentListening = resp.isFrequentListening;
            this._isRouting = resp.isRouting;
            this._maxBaudRate = resp.maxBaudRate;
            this._isSecure = resp.isSecure;
            this._version = resp.version;
            this._isBeaming = resp.isBeaming;
            logger_1.log("controller", `${this.logPrefix}received response for protocol info:`, "debug");
            logger_1.log("controller", `${this.logPrefix}  basic device class:    ${DeviceClass_1.BasicDeviceClasses[this.deviceClass.basic]} (${strings_1.num2hex(this.deviceClass.basic)})`, "debug");
            logger_1.log("controller", `${this.logPrefix}  generic device class:  ${this.deviceClass.generic.name} (${strings_1.num2hex(this.deviceClass.generic.key)})`, "debug");
            logger_1.log("controller", `${this.logPrefix}  specific device class: ${this.deviceClass.specific.name} (${strings_1.num2hex(this.deviceClass.specific.key)})`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is a listening device: ${this.isListening}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is frequent listening: ${this.isFrequentListening}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is a routing device:   ${this.isRouting}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is a secure device:    ${this.isSecure}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is a beaming device:   ${this.isBeaming}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is a listening device: ${this.isListening}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  maximum baud rate:     ${this.maxBaudRate} kbps`, "debug");
            logger_1.log("controller", `${this.logPrefix}  version:               ${this.version}`, "debug");
            this.interviewStage = InterviewStage.ProtocolInfo;
        });
    }
    /** Step #2 of the node interview */
    ping() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isControllerNode()) {
                logger_1.log("controller", `${this.logPrefix}not pinging the controller...`, "debug");
            }
            else {
                logger_1.log("controller", `${this.logPrefix}pinging the node...`, "debug");
                try {
                    const request = new SendDataMessages_1.SendDataRequest(new NoOperationCC_1.NoOperationCC(this.id));
                    // set the priority manually, as SendData can be Application level too
                    const response = yield this.driver.sendMessage(request, Constants_1.MessagePriority.NodeQuery);
                    logger_1.log("controller", `${this.logPrefix}  ping succeeded`, "debug");
                    // TODO: time out the ping
                }
                catch (e) {
                    logger_1.log("controller", `${this.logPrefix}  ping failed: ${e.message}`, "debug");
                }
            }
            this.interviewStage = InterviewStage.Ping;
        });
    }
    /** Step #5 of the node interview */
    getNodeInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log("controller", `${this.logPrefix}querying node info`, "debug");
            const resp = yield this.driver.sendMessage(new RequestNodeInfoMessages_1.RequestNodeInfoRequest(this.id));
            if (resp instanceof RequestNodeInfoMessages_1.RequestNodeInfoResponse && !resp.wasSent
                || resp instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequest && resp.updateType === ApplicationUpdateRequest_1.ApplicationUpdateTypes.NodeInfo_RequestFailed) {
                logger_1.log("controller", `${this.logPrefix}  querying the node info failed`, "debug");
            }
            else if (resp instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequest) {
                // TODO: log the received values
                logger_1.log("controller", `${this.logPrefix}  received the node info`, "debug");
                this._supportedCCs = resp.nodeInformation.supportedCCs;
                this._controlledCCs = resp.nodeInformation.controlledCCs;
            }
            this.interviewStage = InterviewStage.NodeInfo;
        });
    }
    //#endregion
    /** Handles an ApplicationCommandRequest sent from a node */
    handleCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log("controller", `${this.logPrefix}handling application command ${strings_1.stringify(command)} - TODO`, "debug");
            // TODO
        });
    }
}
exports.ZWaveNode = ZWaveNode;
// TODO: This order is not optimal, check how OpenHAB does it
var InterviewStage;
(function (InterviewStage) {
    InterviewStage[InterviewStage["None"] = 0] = "None";
    InterviewStage[InterviewStage["ProtocolInfo"] = 1] = "ProtocolInfo";
    InterviewStage[InterviewStage["Ping"] = 2] = "Ping";
    InterviewStage[InterviewStage["WakeUp"] = 3] = "WakeUp";
    InterviewStage[InterviewStage["ManufacturerSpecific1"] = 4] = "ManufacturerSpecific1";
    InterviewStage[InterviewStage["NodeInfo"] = 5] = "NodeInfo";
    InterviewStage[InterviewStage["NodePlusInfo"] = 6] = "NodePlusInfo";
    InterviewStage[InterviewStage["SecurityReport"] = 7] = "SecurityReport";
    InterviewStage[InterviewStage["ManufacturerSpecific2"] = 8] = "ManufacturerSpecific2";
    InterviewStage[InterviewStage["Versions"] = 9] = "Versions";
    InterviewStage[InterviewStage["Instances"] = 10] = "Instances";
    InterviewStage[InterviewStage["Static"] = 11] = "Static";
    // ===== the stuff above should never change =====
    // ===== the stuff below changes frequently, so it has to be redone on every start =====
    InterviewStage[InterviewStage["CacheLoad"] = 12] = "CacheLoad";
    InterviewStage[InterviewStage["Associations"] = 13] = "Associations";
    InterviewStage[InterviewStage["Neighbors"] = 14] = "Neighbors";
    InterviewStage[InterviewStage["Session"] = 15] = "Session";
    InterviewStage[InterviewStage["Dynamic"] = 16] = "Dynamic";
    InterviewStage[InterviewStage["Configuration"] = 17] = "Configuration";
    InterviewStage[InterviewStage["Complete"] = 18] = "Complete";
})(InterviewStage = exports.InterviewStage || (exports.InterviewStage = {}));
