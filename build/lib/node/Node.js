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
const async_1 = require("alcalzone-shared/async");
const objects_1 = require("alcalzone-shared/objects");
const strings_1 = require("alcalzone-shared/strings");
const events_1 = require("events");
const util_1 = require("util");
const CommandClass_1 = require("../commandclass/CommandClass");
const ICommandClassContainer_1 = require("../commandclass/ICommandClassContainer");
const ManufacturerSpecificCC_1 = require("../commandclass/ManufacturerSpecificCC");
const MultiChannelCC_1 = require("../commandclass/MultiChannelCC");
const NoOperationCC_1 = require("../commandclass/NoOperationCC");
const VersionCC_1 = require("../commandclass/VersionCC");
const WakeUpCC_1 = require("../commandclass/WakeUpCC");
const ApplicationUpdateRequest_1 = require("../controller/ApplicationUpdateRequest");
const GetNodeProtocolInfoMessages_1 = require("../controller/GetNodeProtocolInfoMessages");
const SendDataMessages_1 = require("../controller/SendDataMessages");
const ZWaveError_1 = require("../error/ZWaveError");
const Constants_1 = require("../message/Constants");
const logger_1 = require("../util/logger");
const strings_2 = require("../util/strings");
const DeviceClass_1 = require("./DeviceClass");
const RequestNodeInfoMessages_1 = require("./RequestNodeInfoMessages");
const ValueDB_1 = require("./ValueDB");
class ZWaveNode extends events_1.EventEmitter {
    constructor(id, driver, deviceClass, supportedCCs = [], controlledCCs = []) {
        super();
        this.id = id;
        this.driver = driver;
        //#region --- properties ---
        this.logPrefix = `[Node ${strings_1.padStart(this.id.toString(), 3, "0")}] `;
        this._implementedCommandClasses = new Map();
        this._valueDB = new ValueDB_1.ValueDB();
        /** This tells us which interview stage was last completed */
        this.interviewStage = InterviewStage.None;
        this._valueDB = new ValueDB_1.ValueDB();
        this.on("value updated", (args) => this.emit("value updated", args));
        // TODO restore from cache
        this._deviceClass = deviceClass;
        for (const cc of supportedCCs)
            this.addCC(cc, { isSupported: true });
        for (const cc of controlledCCs)
            this.addCC(cc, { isControlled: true });
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
    get implementedCommandClasses() {
        return this._implementedCommandClasses;
    }
    get valueDB() {
        return this._valueDB;
    }
    //#endregion
    isControllerNode() {
        return this.id === this.driver.controller.ownNodeId;
    }
    addCC(cc, info) {
        let ccInfo = this._implementedCommandClasses.has(cc)
            ? this._implementedCommandClasses.get(cc)
            : {
                isSupported: false,
                isControlled: false,
                version: 0,
            };
        ccInfo = Object.assign(ccInfo, info);
        this._implementedCommandClasses.set(cc, ccInfo);
    }
    /** Tests if this node supports the given CommandClass */
    supportsCC(cc) {
        return this._implementedCommandClasses.has(cc) && this._implementedCommandClasses.get(cc).isSupported;
    }
    /** Tests if this node controls the given CommandClass */
    controlsCC(cc) {
        return this._implementedCommandClasses.has(cc) && this._implementedCommandClasses.get(cc).isControlled;
    }
    /** Checks the supported version of a given CommandClass */
    getCCVersion(cc) {
        return this._implementedCommandClasses.has(cc) ? this._implementedCommandClasses.get(cc).version : 0;
    }
    /** Creates an instance of the given CC linked to this node */
    createCCInstance(cc) {
        if (!this.supportsCC(cc)) {
            throw new ZWaveError_1.ZWaveError(`Cannot create an instance of the unsupported CC ${CommandClass_1.CommandClasses[cc]} (${strings_2.num2hex(cc)})`, ZWaveError_1.ZWaveErrorCodes.CC_NotSupported);
        }
        // tslint:disable-next-line: variable-name
        const Constructor = CommandClass_1.getCCConstructor(cc);
        return new Constructor(this.driver, this.id);
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
            if (this.interviewStage === InterviewStage.ProtocolInfo) {
                // Wait until we can communicate with the device
                yield this.waitForWakeup();
            }
            if (this.interviewStage === InterviewStage.WakeUp) {
                // Make sure the device answers
                yield this.ping();
            }
            if (this.interviewStage === InterviewStage.Ping) {
                // Request Manufacturer specific data
                yield this.queryManufacturerSpecific();
            }
            if (this.interviewStage === InterviewStage.ManufacturerSpecific1) {
                yield this.queryNodeInfo();
            }
            // TODO:
            // NodePlusInfo,			// [ ] Retrieve ZWave+ info and update device classes
            // SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security
            // ManufacturerSpecific2,	// [ ] Retrieve manufacturer name and product ids
            if (this.interviewStage === InterviewStage.NodeInfo /* TODO: change .NodeInfo to .ManufacturerSpecific2 */) {
                yield this.queryCCVersions();
            }
            if (this.interviewStage === InterviewStage.Versions) {
                yield this.queryEndpoints();
            }
            if (this.interviewStage === InterviewStage.Endpoints) {
                yield this.requestStaticValues();
            }
            // TODO: Save the current state
            // for testing purposes we skip to the end
            yield this.setInterviewStage(InterviewStage.Complete);
            logger_1.log("controller", `${this.logPrefix}interview completed`, "debug");
        });
    }
    setInterviewStage(completedStage) {
        return __awaiter(this, void 0, void 0, function* () {
            this.interviewStage = completedStage;
            // Also save to the cache after certain stages
            switch (completedStage) {
                case InterviewStage.ProtocolInfo:
                case InterviewStage.ManufacturerSpecific1:
                case InterviewStage.NodeInfo:
                case InterviewStage.Versions:
                case InterviewStage.Endpoints:
                case InterviewStage.Static:
                case InterviewStage.Complete:
                    yield this.driver.saveNetworkToCache();
            }
        });
    }
    /** Step #1 of the node interview */
    queryProtocolInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log("controller", `${this.logPrefix}querying protocol info`, "debug");
            const resp = yield this.driver.sendMessage(new GetNodeProtocolInfoMessages_1.GetNodeProtocolInfoRequest(this.driver, this.id));
            this._deviceClass = resp.deviceClass;
            this._isListening = resp.isListening;
            this._isFrequentListening = resp.isFrequentListening;
            this._isRouting = resp.isRouting;
            this._maxBaudRate = resp.maxBaudRate;
            this._isSecure = resp.isSecure;
            this._version = resp.version;
            this._isBeaming = resp.isBeaming;
            logger_1.log("controller", `${this.logPrefix}received response for protocol info:`, "debug");
            logger_1.log("controller", `${this.logPrefix}  basic device class:    ${DeviceClass_1.BasicDeviceClasses[this.deviceClass.basic]} (${strings_2.num2hex(this.deviceClass.basic)})`, "debug");
            logger_1.log("controller", `${this.logPrefix}  generic device class:  ${this.deviceClass.generic.name} (${strings_2.num2hex(this.deviceClass.generic.key)})`, "debug");
            logger_1.log("controller", `${this.logPrefix}  specific device class: ${this.deviceClass.specific.name} (${strings_2.num2hex(this.deviceClass.specific.key)})`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is a listening device: ${this.isListening}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is frequent listening: ${this.isFrequentListening}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is a routing device:   ${this.isRouting}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is a secure device:    ${this.isSecure}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is a beaming device:   ${this.isBeaming}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  is a listening device: ${this.isListening}`, "debug");
            logger_1.log("controller", `${this.logPrefix}  maximum baud rate:     ${this.maxBaudRate} kbps`, "debug");
            logger_1.log("controller", `${this.logPrefix}  version:               ${this.version}`, "debug");
            if (!this.isListening && !this.isFrequentListening) {
                // This is a "sleeping" device which must support the WakeUp CC.
                // We are requesting the supported CCs later, but those commands may need to go into the
                // wakeup queue. Thus we need to mark WakeUp as supported
                this.addCC(CommandClass_1.CommandClasses["Wake Up"], {
                    isSupported: true,
                });
                // Assume the node is awake, after all we're communicating with it.
                this.createCCInstance(CommandClass_1.CommandClasses["Wake Up"]).setAwake(true);
            }
            yield this.setInterviewStage(InterviewStage.ProtocolInfo);
        });
    }
    /** Step #2 of the node interview */
    waitForWakeup() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.supportsCC(CommandClass_1.CommandClasses["Wake Up"])) {
                if (this.isControllerNode()) {
                    logger_1.log("controller", `${this.logPrefix}skipping wakeup for the controller`, "debug");
                }
                else if (this.isFrequentListening) {
                    logger_1.log("controller", `${this.logPrefix}skipping wakeup for frequent listening device`, "debug");
                }
                else {
                    logger_1.log("controller", `${this.logPrefix}waiting for device to wake up`, "debug");
                    const wakeupCC = new WakeUpCC_1.WakeUpCC(this.driver, this.id, WakeUpCC_1.WakeUpCommand.IntervalGet);
                    const request = new SendDataMessages_1.SendDataRequest(this.driver, wakeupCC);
                    try {
                        const _response = yield this.driver.sendMessage(request, Constants_1.MessagePriority.WakeUp);
                        logger_1.log("controller", `${this.logPrefix}  device is awake`, "debug");
                    }
                    catch (e) {
                        logger_1.log("controller", `${this.logPrefix}  device wakeup failed: ${e.message}`, "debug");
                    }
                }
            }
            else {
                logger_1.log("controller", `${this.logPrefix}skipping wakeup for non-sleeping device`, "debug");
            }
            yield this.setInterviewStage(InterviewStage.WakeUp);
        });
    }
    /** Step #3 of the node interview */
    ping() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isControllerNode()) {
                logger_1.log("controller", `${this.logPrefix}not pinging the controller...`, "debug");
            }
            else {
                logger_1.log("controller", `${this.logPrefix}pinging the node...`, "debug");
                try {
                    const request = new SendDataMessages_1.SendDataRequest(this.driver, new NoOperationCC_1.NoOperationCC(this.driver, this.id));
                    // set the priority manually, as SendData can be Application level too
                    const response = yield this.driver.sendMessage(request, Constants_1.MessagePriority.NodeQuery);
                    logger_1.log("controller", `${this.logPrefix}  ping succeeded`, "debug");
                    // TODO: time out the ping
                }
                catch (e) {
                    logger_1.log("controller", `${this.logPrefix}  ping failed: ${e.message}`, "debug");
                }
            }
            yield this.setInterviewStage(InterviewStage.Ping);
        });
    }
    /** Step #5 of the node interview */
    queryNodeInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isControllerNode()) {
                logger_1.log("controller", `${this.logPrefix}not querying node info from the controller...`, "debug");
            }
            else {
                logger_1.log("controller", `${this.logPrefix}querying node info`, "debug");
                const resp = yield this.driver.sendMessage(new RequestNodeInfoMessages_1.RequestNodeInfoRequest(this.driver, this.id));
                if (resp instanceof RequestNodeInfoMessages_1.RequestNodeInfoResponse && !resp.wasSent
                    || resp instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequest && resp.updateType === ApplicationUpdateRequest_1.ApplicationUpdateTypes.NodeInfo_RequestFailed) {
                    logger_1.log("controller", `${this.logPrefix}  querying the node info failed`, "debug");
                }
                else if (resp instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequest) {
                    logger_1.log("controller", `${this.logPrefix}  received the node info`, "debug");
                    for (const cc of resp.nodeInformation.supportedCCs)
                        this.addCC(cc, { isSupported: true });
                    for (const cc of resp.nodeInformation.controlledCCs)
                        this.addCC(cc, { isControlled: true });
                    // TODO: Save the received values
                }
            }
            yield this.setInterviewStage(InterviewStage.NodeInfo);
        });
    }
    queryManufacturerSpecific() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isControllerNode()) {
                logger_1.log("controller", `${this.logPrefix}not querying manufacturer information from the controller...`, "debug");
            }
            else {
                logger_1.log("controller", `${this.logPrefix}querying manufacturer information`, "debug");
                const cc = new ManufacturerSpecificCC_1.ManufacturerSpecificCC(this.driver, this.id, ManufacturerSpecificCC_1.ManufacturerSpecificCommand.Get);
                const request = new SendDataMessages_1.SendDataRequest(this.driver, cc);
                try {
                    // set the priority manually, as SendData can be Application level too
                    const resp = yield this.driver.sendMessage(request, Constants_1.MessagePriority.NodeQuery);
                    if (ICommandClassContainer_1.isCommandClassContainer(resp)) {
                        const manufacturerResponse = resp.command;
                        logger_1.log("controller", `${this.logPrefix}received response for manufacturer information:`, "debug");
                        logger_1.log("controller", `${this.logPrefix}  manufacturer id: ${strings_2.num2hex(manufacturerResponse.manufacturerId)}`, "debug");
                        logger_1.log("controller", `${this.logPrefix}  product type:    ${strings_2.num2hex(manufacturerResponse.productType)}`, "debug");
                        logger_1.log("controller", `${this.logPrefix}  product id:      ${strings_2.num2hex(manufacturerResponse.productId)}`, "debug");
                    }
                }
                catch (e) {
                    logger_1.log("controller", `${this.logPrefix}  querying the manufacturer information failed: ${e.message}`, "debug");
                }
            }
            yield this.setInterviewStage(InterviewStage.ManufacturerSpecific1);
        });
    }
    /** Step #9 of the node interview */
    queryCCVersions() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log("controller", `${this.logPrefix}querying CC versions`, "debug");
            for (const [cc] of this._implementedCommandClasses.entries()) {
                // only query the ones we support a version > 1 for
                const maxImplemented = CommandClass_1.getImplementedVersion(cc);
                if (maxImplemented < 1) {
                    logger_1.log("controller", `${this.logPrefix}  skipping query for ${CommandClass_1.CommandClasses[cc]} (${strings_2.num2hex(cc)}) because max implemented version is ${maxImplemented}`, "debug");
                    continue;
                }
                const versionCC = new VersionCC_1.VersionCC(this.driver, this.id, VersionCC_1.VersionCommand.CommandClassGet, cc);
                const request = new SendDataMessages_1.SendDataRequest(this.driver, versionCC);
                try {
                    logger_1.log("controller", `${this.logPrefix}  querying the CC version for ${CommandClass_1.CommandClasses[cc]} (${strings_2.num2hex(cc)})`, "debug");
                    // query the CC version
                    const resp = yield this.driver.sendMessage(request, Constants_1.MessagePriority.NodeQuery);
                    if (ICommandClassContainer_1.isCommandClassContainer(resp)) {
                        const versionResponse = resp.command;
                        // Remember which CC version this node supports
                        const reqCC = versionResponse.requestedCC;
                        const supportedVersion = versionResponse.ccVersion;
                        this.addCC(reqCC, { version: supportedVersion });
                        logger_1.log("controller", `${this.logPrefix}  supports CC ${CommandClass_1.CommandClasses[reqCC]} (${strings_2.num2hex(reqCC)}) in version ${supportedVersion}`, "debug");
                    }
                }
                catch (e) {
                    logger_1.log("controller", `${this.logPrefix}  querying the CC version failed: ${e.message}`, "debug");
                }
            }
            yield this.setInterviewStage(InterviewStage.Versions);
        });
    }
    /** Step #10 of the node interview */
    queryEndpoints() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.supportsCC(CommandClass_1.CommandClasses["Multi Channel"])) {
                logger_1.log("controller", `${this.logPrefix}querying device endpoints`, "debug");
                const cc = new MultiChannelCC_1.MultiChannelCC(this.driver, this.id, MultiChannelCC_1.MultiChannelCommand.EndPointGet);
                const request = new SendDataMessages_1.SendDataRequest(this.driver, cc);
                try {
                    // set the priority manually, as SendData can be Application level too
                    const resp = yield this.driver.sendMessage(request, Constants_1.MessagePriority.NodeQuery);
                    if (ICommandClassContainer_1.isCommandClassContainer(resp)) {
                        const multiResponse = resp.command;
                        logger_1.log("controller", `${this.logPrefix}received response for device endpoints:`, "debug");
                        logger_1.log("controller", `${this.logPrefix}  endpoint count: ${multiResponse.endpointCount}`, "debug");
                        logger_1.log("controller", `${this.logPrefix}  dynamic:        ${multiResponse.isDynamicEndpointCount}`, "debug");
                        logger_1.log("controller", `${this.logPrefix}  identical caps: ${multiResponse.identicalCapabilities}`, "debug");
                    }
                }
                catch (e) {
                    logger_1.log("controller", `${this.logPrefix}  querying the device endpoints failed: ${e.message}`, "debug");
                }
            }
            else {
                logger_1.log("controller", `${this.logPrefix}skipping endpoint query because the device does not support it`, "debug");
            }
            yield this.setInterviewStage(InterviewStage.Endpoints);
        });
    }
    requestStaticValues() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log("controller", `${this.logPrefix}requesting static values`, "debug");
            try {
                yield this.requestState(CommandClass_1.StateKind.Static);
                logger_1.log("controller", `${this.logPrefix}  static values received`, "debug");
            }
            catch (e) {
                logger_1.log("controller", `${this.logPrefix}  requesting the static values failed: ${e.message}`, "debug");
            }
            yield this.setInterviewStage(InterviewStage.Static);
        });
    }
    //#endregion
    // TODO: Add a handler around for each CC to interpret the received data
    /** Handles an ApplicationCommandRequest sent from a node */
    handleCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (command.command) {
                case CommandClass_1.CommandClasses["Central Scene"]: {
                    // The node reported its supported versions
                    const csCC = command;
                    logger_1.log("controller", `${this.logPrefix}received CentralScene command ${JSON.stringify(csCC)}`, "debug");
                    break;
                }
                default: {
                    logger_1.log("controller", `${this.logPrefix}TODO: no handler for application command ${strings_2.stringify(command)}`, "debug");
                }
            }
        });
    }
    /**
     * Requests the state for the CCs of this node
     * @param kind The kind of state to be requested
     * @param commandClasses The command classes to request the state for. Defaults to all
     */
    requestState(kind, commandClasses = [...this._implementedCommandClasses.keys()]) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Support multiple instances
            const requests = commandClasses
                .map(cc => CommandClass_1.getCCConstructor(cc))
                .filter(cc => !!cc)
                .map(cc => cc.createStateRequest(this.driver, this, kind))
                .filter(req => !!req);
            const factories = requests
                .map(req => () => this.driver.sendMessage(req, Constants_1.MessagePriority.NodeQuery));
            yield async_1.promiseSequence(factories);
        });
    }
    /** Serializes this node in order to store static data in a cache */
    serialize() {
        return {
            id: this.id,
            interviewStage: InterviewStage[this.interviewStage],
            deviceClass: this.deviceClass && {
                basic: this.deviceClass.basic,
                generic: this.deviceClass.generic.key,
                specific: this.deviceClass.specific.key,
            },
            isListening: this.isListening,
            isFrequentListening: this.isFrequentListening,
            isRouting: this.isRouting,
            maxBaudRate: this.maxBaudRate,
            isSecure: this.isSecure,
            isBeaming: this.isBeaming,
            version: this.version,
            commandClasses: objects_1.composeObject([...this.implementedCommandClasses.entries()]
                .sort((a, b) => Math.sign(a[0] - b[0]))
                .map(([cc, info]) => {
                return [strings_2.num2hex(cc), Object.assign({ name: CommandClass_1.CommandClasses[cc] }, info)];
            })),
        };
    }
    deserialize(obj) {
        if (obj.interviewStage in InterviewStage) {
            this.interviewStage = typeof obj.interviewStage === "number"
                ? obj.interviewStage
                : InterviewStage[obj.interviewStage];
        }
        if (util_1.isObject(obj.deviceClass)) {
            const { basic, generic, specific } = obj.deviceClass;
            if (typeof basic === "number"
                && typeof generic === "number"
                && typeof specific === "number") {
                const genericDC = DeviceClass_1.GenericDeviceClass.get(generic);
                this._deviceClass = new DeviceClass_1.DeviceClass(basic, genericDC, DeviceClass_1.SpecificDeviceClass.get(genericDC.key, specific));
            }
        }
        // Parse single properties
        const tryParse = (key, type) => {
            if (typeof obj[key] === type)
                this[`_${key}`] = obj[key];
        };
        tryParse("isListening", "boolean");
        tryParse("isFrequentListening", "boolean");
        tryParse("isRouting", "boolean");
        tryParse("maxBaudRate", "number");
        tryParse("isSecure", "boolean");
        tryParse("isBeaming", "boolean");
        tryParse("version", "number");
        function enforceType(val, type) {
            return typeof val === type ? val : undefined;
        }
        // Parse CommandClasses
        if (util_1.isObject(obj.commandClasses)) {
            const ccDict = obj.commandClasses;
            for (const ccHex of Object.keys(ccDict)) {
                // First make sure this key describes a valid CC
                if (!/^0x\d+$/.test(ccHex))
                    continue;
                // tslint:disable-next-line: radix
                const ccNum = parseInt(ccHex);
                if (!(ccNum in CommandClass_1.CommandClasses))
                    continue;
                // Parse the information we have
                const { isSupported, isControlled, version } = ccDict[ccHex];
                this.addCC(ccNum, {
                    isSupported: enforceType(isSupported, "boolean"),
                    isControlled: enforceType(isControlled, "boolean"),
                    version: enforceType(version, "number"),
                });
            }
        }
    }
}
exports.ZWaveNode = ZWaveNode;
// TODO: This order is not optimal, check how OpenHAB does it
var InterviewStage;
(function (InterviewStage) {
    InterviewStage[InterviewStage["None"] = 0] = "None";
    InterviewStage[InterviewStage["ProtocolInfo"] = 1] = "ProtocolInfo";
    InterviewStage[InterviewStage["WakeUp"] = 2] = "WakeUp";
    InterviewStage[InterviewStage["Ping"] = 3] = "Ping";
    InterviewStage[InterviewStage["ManufacturerSpecific1"] = 4] = "ManufacturerSpecific1";
    InterviewStage[InterviewStage["NodeInfo"] = 5] = "NodeInfo";
    InterviewStage[InterviewStage["NodePlusInfo"] = 6] = "NodePlusInfo";
    InterviewStage[InterviewStage["SecurityReport"] = 7] = "SecurityReport";
    InterviewStage[InterviewStage["ManufacturerSpecific2"] = 8] = "ManufacturerSpecific2";
    InterviewStage[InterviewStage["Versions"] = 9] = "Versions";
    InterviewStage[InterviewStage["Endpoints"] = 10] = "Endpoints";
    InterviewStage[InterviewStage["Static"] = 11] = "Static";
    // ===== the stuff above should never change =====
    // ===== the stuff below changes frequently, so it has to be redone on every start =====
    InterviewStage[InterviewStage["CacheLoad"] = 12] = "CacheLoad";
    // 	SetWakeUp,			// [ ] * Configure wake up to point to the master controller
    InterviewStage[InterviewStage["Associations"] = 13] = "Associations";
    InterviewStage[InterviewStage["Neighbors"] = 14] = "Neighbors";
    InterviewStage[InterviewStage["Session"] = 15] = "Session";
    InterviewStage[InterviewStage["Dynamic"] = 16] = "Dynamic";
    InterviewStage[InterviewStage["Configuration"] = 17] = "Configuration";
    InterviewStage[InterviewStage["Complete"] = 18] = "Complete";
})(InterviewStage = exports.InterviewStage || (exports.InterviewStage = {}));
// export enum OpenHABInterviewStage {
// 	None,					// Query process hasn't started for this node
// 	ProtocolInfo1,			// Retrieve protocol information (IdentifyNode)
// 	Neighbors1,				// Retrieve node neighbor list
// 	// ===== the stuff below doesn't work for PC controllers =====
// 	WakeUp,					// Start wake up process if a sleeping node
// 	Ping,					// Ping device to see if alive
// 	ProtocolInfo2,			// Retrieve protocol information again (IdentifyNode)
// 	SecurityReport,			// Retrieve a list of Command Classes that require Security
// 	NodeInfo,				// Retrieve info about supported, controlled command classes
// 	ManufacturerSpecific,	// Retrieve manufacturer name and product ids if ProtocolInfo lets us
// 	Versions,				// Retrieve version information
// 	Instances,				// Retrieve information about multiple command class instances
// 	OverwriteFromDB,		// Overwrite the data with manual config files
// 	Static,					// Retrieve static information (doesn't change)
// 	Associations,			// Retrieve information about associations
// 	SetWakeUp,				// * Configure wake up to point to the master controller
// 	SetAssociations,		// * Set some associations to point to us
// 	DeleteSUCRoute,			// * For non-controller nodes delete the SUC return route if there's one
// 	AssignSUCRoute,			// * For non-controller nodes update the SUC return route if there's one
// 	Configuration,			// Retrieve configurable parameter information (only done on request)
// 	Dynamic,				// Retrieve dynamic information (changes frequently)
// 	DeleteReturnRoute,		// * delete the return route
// 	AssignReturnRoute,		// * update the return route
// 	Neighbors2,				// Retrieve updated neighbors
// 	Complete,				// Query process is completed for this node
// }
