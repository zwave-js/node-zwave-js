"use strict";
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
const ZWavePlusCC_1 = require("../commandclass/ZWavePlusCC");
const Manufacturers_1 = require("../config/Manufacturers");
const ApplicationUpdateRequest_1 = require("../controller/ApplicationUpdateRequest");
const GetNodeProtocolInfoMessages_1 = require("../controller/GetNodeProtocolInfoMessages");
const GetRoutingInfoMessages_1 = require("../controller/GetRoutingInfoMessages");
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
        /** @internal */
        this.logPrefix = `[Node ${strings_1.padStart(this.id.toString(), 3, "0")}] `;
        this._implementedCommandClasses = new Map();
        this.nodeInfoReceived = false;
        this._valueDB = new ValueDB_1.ValueDB();
        /** This tells us which interview stage was last completed */
        this.interviewStage = InterviewStage.None;
        this.isSendingNoMoreInformation = false;
        this._valueDB = new ValueDB_1.ValueDB();
        this._valueDB.on("value added", this.emit.bind(this, "value added"));
        this._valueDB.on("value updated", this.emit.bind(this, "value updated"));
        this._valueDB.on("value removed", this.emit.bind(this, "value removed"));
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
    /** The IDs of all direct neighbors of this node */
    get neighbors() {
        return this._neighbors;
    }
    /** @internal */
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
        return this._implementedCommandClasses.has(cc) && !!this._implementedCommandClasses.get(cc).isSupported;
    }
    /** Tests if this node controls the given CommandClass */
    controlsCC(cc) {
        return this._implementedCommandClasses.has(cc) && !!this._implementedCommandClasses.get(cc).isControlled;
    }
    /** Checks the supported version of a given CommandClass */
    getCCVersion(cc) {
        const ccInfo = this._implementedCommandClasses.get(cc);
        return ccInfo && ccInfo.version || 0;
    }
    /** Creates an instance of the given CC linked to this node */
    // wotan-disable no-misused-generics
    createCCInstance(cc) {
        if (!this.supportsCC(cc)) {
            throw new ZWaveError_1.ZWaveError(`Cannot create an instance of the unsupported CC ${CommandClass_1.CommandClasses[cc]} (${strings_2.num2hex(cc)})`, ZWaveError_1.ZWaveErrorCodes.CC_NotSupported);
        }
        // tslint:disable-next-line: variable-name
        const Constructor = CommandClass_1.getCCConstructor(cc);
        return new Constructor(this.driver, this.id);
    }
    //#region --- interview ---
    async interview() {
        logger_1.log("controller", `${this.logPrefix}beginning interview... last completed step: ${InterviewStage[this.interviewStage]}`, "debug");
        // before each step check if it is necessary
        if (this.interviewStage === InterviewStage.None) {
            // do a full interview starting with the protocol info
            logger_1.log("controller", `${this.logPrefix}new Node, doing a full interview...`, "debug");
            await this.queryProtocolInfo();
        }
        if (this.interviewStage === InterviewStage.ProtocolInfo) {
            // Make sure the device answers
            await this.ping();
        }
        // TODO: Ping should not be a separate stage
        if (this.interviewStage === InterviewStage.Ping) {
            await this.queryNodeInfo();
        }
        if (this.interviewStage === InterviewStage.NodeInfo) {
            await this.queryNodePlusInfo();
        }
        if (this.interviewStage === InterviewStage.NodePlusInfo) {
            // Request Manufacturer specific data
            await this.queryManufacturerSpecific();
            // TODO: Overwrite the reported config with configuration files (like OZW does)
        }
        // TODO:
        // SecurityReport,			// [ ] Retrieve a list of Command Classes that require Security
        if (this.interviewStage === InterviewStage.ManufacturerSpecific /* TODO: change .ManufacturerSpecific to .SecurityReport */) {
            await this.queryCCVersions();
        }
        if (this.interviewStage === InterviewStage.Versions) {
            await this.queryEndpoints();
        }
        if (this.interviewStage === InterviewStage.Endpoints) {
            await this.requestStaticValues();
        }
        // At this point the interview of new nodes is done. Start here when re-interviewing known nodes
        if (this.interviewStage === InterviewStage.RestartFromCache) {
            // Make sure the device answers
            await this.ping(InterviewStage.RestartFromCache);
        }
        if (this.interviewStage === InterviewStage.RestartFromCache
            || this.interviewStage === InterviewStage.Static) {
            // Configure the device so it notifies us of a wakeup
            await this.configureWakeup();
        }
        // TODO: Associations
        if (this.interviewStage === InterviewStage.WakeUp) { // TODO: change this to associations
            // Request a list of this node's neighbors
            await this.queryNeighbors();
        }
        // for testing purposes we skip to the end
        await this.setInterviewStage(InterviewStage.Complete);
        logger_1.log("controller", `${this.logPrefix}interview completed`, "debug");
        // TODO: Tell sleeping nodes to go to sleep
        this.emit("interview completed", this);
    }
    /** Updates this node's interview stage and saves to cache when appropriate */
    async setInterviewStage(completedStage) {
        this.interviewStage = completedStage;
        // Also save to the cache after certain stages
        switch (completedStage) {
            case InterviewStage.ProtocolInfo:
            case InterviewStage.ManufacturerSpecific:
            case InterviewStage.NodeInfo:
            case InterviewStage.NodePlusInfo:
            case InterviewStage.Versions:
            case InterviewStage.Endpoints:
            case InterviewStage.Static:
            case InterviewStage.Complete:
                await this.driver.saveNetworkToCache();
        }
    }
    /** Step #1 of the node interview */
    async queryProtocolInfo() {
        logger_1.log("controller", `${this.logPrefix}querying protocol info`, "debug");
        const resp = await this.driver.sendMessage(new GetNodeProtocolInfoMessages_1.GetNodeProtocolInfoRequest(this.driver, this.id));
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
            this.setAwake(true);
        }
        await this.setInterviewStage(InterviewStage.ProtocolInfo);
    }
    /** Step #3 of the node interview */
    async ping(targetInterviewStage = InterviewStage.Ping) {
        if (this.isControllerNode()) {
            logger_1.log("controller", `${this.logPrefix}not pinging the controller...`, "debug");
        }
        else {
            logger_1.log("controller", `${this.logPrefix}pinging the node...`, "debug");
            try {
                const request = new SendDataMessages_1.SendDataRequest(this.driver, new NoOperationCC_1.NoOperationCC(this.driver, this.id));
                // Don't retry sending ping packets
                request.maxSendAttempts = 1;
                // set the priority manually, as SendData can be Application level too
                await this.driver.sendMessage(request, Constants_1.MessagePriority.NodeQuery);
                logger_1.log("controller", `${this.logPrefix}  ping succeeded`, "debug");
                // TODO: time out the ping
            }
            catch (e) {
                logger_1.log("controller", `${this.logPrefix}  ping failed: ${e.message}`, "debug");
            }
        }
        await this.setInterviewStage(targetInterviewStage);
    }
    /** Step #5 of the node interview */
    async queryNodeInfo() {
        if (this.isControllerNode()) {
            logger_1.log("controller", `${this.logPrefix}not querying node info from the controller...`, "debug");
        }
        else {
            logger_1.log("controller", `${this.logPrefix}querying node info`, "debug");
            const resp = await this.driver.sendMessage(new RequestNodeInfoMessages_1.RequestNodeInfoRequest(this.driver, this.id));
            if (resp instanceof RequestNodeInfoMessages_1.RequestNodeInfoResponse && !resp.wasSent
                || resp instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequest && resp.updateType === ApplicationUpdateRequest_1.ApplicationUpdateTypes.NodeInfo_RequestFailed) {
                logger_1.log("controller", `${this.logPrefix}  querying the node info failed`, "debug");
            }
            else if (resp instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequest) {
                logger_1.log("controller", `${this.logPrefix}  received the node info`, "debug");
                this.updateNodeInfo(resp.nodeInformation);
                // TODO: Save the received values
            }
        }
        await this.setInterviewStage(InterviewStage.NodeInfo);
    }
    /** Step #6 of the node interview */
    async queryNodePlusInfo() {
        if (!this.supportsCC(CommandClass_1.CommandClasses["Z-Wave Plus Info"])) {
            logger_1.log("controller", `${this.logPrefix}skipping Z-Wave+ query because the device does not support it`, "debug");
        }
        else {
            logger_1.log("controller", `${this.logPrefix}querying Z-Wave+ information`, "debug");
            const cc = new ZWavePlusCC_1.ZWavePlusCC(this.driver, this.id, ZWavePlusCC_1.ZWavePlusCommand.Get);
            const request = new SendDataMessages_1.SendDataRequest(this.driver, cc);
            try {
                // set the priority manually, as SendData can be Application level too
                const resp = await this.driver.sendMessage(request, Constants_1.MessagePriority.NodeQuery);
                if (ICommandClassContainer_1.isCommandClassContainer(resp)) {
                    const zwavePlusResponse = resp.command;
                    zwavePlusResponse.persistValues();
                    logger_1.log("controller", `${this.logPrefix}received response for Z-Wave+ information:`, "debug");
                    logger_1.log("controller", `${this.logPrefix}  Z-Wave+ version: ${zwavePlusResponse.zwavePlusVersion}`, "debug");
                    logger_1.log("controller", `${this.logPrefix}  role type:       ${ZWavePlusCC_1.ZWavePlusRoleType[zwavePlusResponse.roleType]}`, "debug");
                    logger_1.log("controller", `${this.logPrefix}  node type:       ${ZWavePlusCC_1.ZWavePlusNodeType[zwavePlusResponse.nodeType]}`, "debug");
                    logger_1.log("controller", `${this.logPrefix}  installer icon:  ${strings_2.num2hex(zwavePlusResponse.installerIcon)}`, "debug");
                    logger_1.log("controller", `${this.logPrefix}  user icon:       ${strings_2.num2hex(zwavePlusResponse.userIcon)}`, "debug");
                }
            }
            catch (e) {
                logger_1.log("controller", `${this.logPrefix}  querying the Z-Wave+ information failed: ${e.message}`, "debug");
            }
        }
        await this.setInterviewStage(InterviewStage.NodePlusInfo);
    }
    async queryManufacturerSpecific() {
        if (this.isControllerNode()) {
            logger_1.log("controller", `${this.logPrefix}not querying manufacturer information from the controller...`, "debug");
        }
        else {
            logger_1.log("controller", `${this.logPrefix}querying manufacturer information`, "debug");
            const cc = new ManufacturerSpecificCC_1.ManufacturerSpecificCC(this.driver, this.id, ManufacturerSpecificCC_1.ManufacturerSpecificCommand.Get);
            const request = new SendDataMessages_1.SendDataRequest(this.driver, cc);
            try {
                // set the priority manually, as SendData can be Application level too
                const resp = await this.driver.sendMessage(request, Constants_1.MessagePriority.NodeQuery);
                if (ICommandClassContainer_1.isCommandClassContainer(resp)) {
                    const mfResp = resp.command;
                    mfResp.persistValues();
                    logger_1.log("controller", `${this.logPrefix}received response for manufacturer information:`, "debug");
                    logger_1.log("controller", `${this.logPrefix}  manufacturer: ${await Manufacturers_1.lookupManufacturer(mfResp.manufacturerId) || "unknown"} (${strings_2.num2hex(mfResp.manufacturerId)})`, "debug");
                    logger_1.log("controller", `${this.logPrefix}  product type: ${strings_2.num2hex(mfResp.productType)}`, "debug");
                    logger_1.log("controller", `${this.logPrefix}  product id:   ${strings_2.num2hex(mfResp.productId)}`, "debug");
                }
            }
            catch (e) {
                logger_1.log("controller", `${this.logPrefix}  querying the manufacturer information failed: ${e.message}`, "debug");
            }
        }
        await this.setInterviewStage(InterviewStage.ManufacturerSpecific);
    }
    /** Step #9 of the node interview */
    async queryCCVersions() {
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
                const resp = await this.driver.sendMessage(request, Constants_1.MessagePriority.NodeQuery);
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
        await this.setInterviewStage(InterviewStage.Versions);
    }
    /** Step #10 of the node interview */
    async queryEndpoints() {
        if (this.supportsCC(CommandClass_1.CommandClasses["Multi Channel"])) {
            logger_1.log("controller", `${this.logPrefix}querying device endpoints`, "debug");
            const cc = new MultiChannelCC_1.MultiChannelCC(this.driver, this.id, MultiChannelCC_1.MultiChannelCommand.EndPointGet);
            const request = new SendDataMessages_1.SendDataRequest(this.driver, cc);
            try {
                // set the priority manually, as SendData can be Application level too
                const resp = await this.driver.sendMessage(request, Constants_1.MessagePriority.NodeQuery);
                if (ICommandClassContainer_1.isCommandClassContainer(resp)) {
                    const multiResponse = resp.command;
                    multiResponse.persistValues();
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
        await this.setInterviewStage(InterviewStage.Endpoints);
    }
    /** Step #2 of the node interview */
    async configureWakeup() {
        if (this.supportsCC(CommandClass_1.CommandClasses["Wake Up"])) {
            if (this.isControllerNode()) {
                logger_1.log("controller", `${this.logPrefix}skipping wakeup configuration for the controller`, "debug");
            }
            else if (this.isFrequentListening) {
                logger_1.log("controller", `${this.logPrefix}skipping wakeup configuration for frequent listening device`, "debug");
            }
            else {
                try {
                    const getWakeupRequest = new SendDataMessages_1.SendDataRequest(this.driver, new WakeUpCC_1.WakeUpCC(this.driver, this.id, WakeUpCC_1.WakeUpCommand.IntervalGet));
                    logger_1.log("controller", `${this.logPrefix}retrieving wakeup interval from the device`, "debug");
                    const getWakeupResp = await this.driver.sendMessage(getWakeupRequest, Constants_1.MessagePriority.NodeQuery);
                    if (!ICommandClassContainer_1.isCommandClassContainer(getWakeupResp)) {
                        throw new ZWaveError_1.ZWaveError("Invalid response received!", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
                    }
                    const wakeupResp = getWakeupResp.command;
                    logger_1.log("controller", `${this.logPrefix}received wakeup configuration:`, "debug");
                    logger_1.log("controller", `${this.logPrefix}  wakeup interval: ${wakeupResp.wakeupInterval} seconds`, "debug");
                    logger_1.log("controller", `${this.logPrefix}  controller node: ${wakeupResp.controllerNodeId}`, "debug");
                    logger_1.log("controller", `${this.logPrefix}configuring wakeup destination`, "debug");
                    const setWakeupRequest = new SendDataMessages_1.SendDataRequest(this.driver, new WakeUpCC_1.WakeUpCC(this.driver, this.id, WakeUpCC_1.WakeUpCommand.IntervalSet, wakeupResp.wakeupInterval, this.driver.controller.ownNodeId));
                    await this.driver.sendMessage(setWakeupRequest, Constants_1.MessagePriority.NodeQuery);
                    logger_1.log("controller", `${this.logPrefix}  done!`, "debug");
                }
                catch (e) {
                    logger_1.log("controller", `${this.logPrefix}  configuring the device wakeup failed: ${e.message}`, "debug");
                }
            }
        }
        else {
            logger_1.log("controller", `${this.logPrefix}skipping wakeup for non-sleeping device`, "debug");
        }
        await this.setInterviewStage(InterviewStage.WakeUp);
    }
    async requestStaticValues() {
        logger_1.log("controller", `${this.logPrefix}requesting static values`, "debug");
        try {
            await this.requestState(CommandClass_1.StateKind.Static);
            logger_1.log("controller", `${this.logPrefix}  static values received`, "debug");
        }
        catch (e) {
            logger_1.log("controller", `${this.logPrefix}  requesting the static values failed: ${e.message}`, "debug");
        }
        await this.setInterviewStage(InterviewStage.Static);
    }
    async queryNeighbors() {
        logger_1.log("controller", `${this.logPrefix}requesting node neighbors`, "debug");
        try {
            const resp = await this.driver.sendMessage(new GetRoutingInfoMessages_1.GetRoutingInfoRequest(this.driver, this.id, false, false));
            this._neighbors = resp.nodeIds;
            logger_1.log("controller", `${this.logPrefix}  node neighbors received: ${this._neighbors.join(", ")}`, "debug");
        }
        catch (e) {
            logger_1.log("controller", `${this.logPrefix}  requesting the node neighbors failed: ${e.message}`, "debug");
        }
        await this.setInterviewStage(InterviewStage.Neighbors);
    }
    //#endregion
    // TODO: Add a handler around for each CC to interpret the received data
    /** Handles an ApplicationCommandRequest sent from a node */
    async handleCommand(command) {
        switch (command.ccId) {
            case CommandClass_1.CommandClasses["Central Scene"]: {
                const csCC = command;
                logger_1.log("controller", `${this.logPrefix}received CentralScene command ${JSON.stringify(csCC)}`, "debug");
                return;
            }
            case CommandClass_1.CommandClasses["Wake Up"]: {
                const wakeupCC = command;
                if (wakeupCC.wakeupCommand === WakeUpCC_1.WakeUpCommand.WakeUpNotification) {
                    logger_1.log("controller", `${this.logPrefix}received wake up notification`, "debug");
                    this.setAwake(true);
                    return;
                }
            }
        }
        logger_1.log("controller", `${this.logPrefix}TODO: no handler for application command ${strings_2.stringify(command)}`, "debug");
    }
    /**
     * Requests the state for the CCs of this node
     * @param kind The kind of state to be requested
     * @param commandClasses The command classes to request the state for. Defaults to all
     */
    async requestState(kind, commandClasses = [...this._implementedCommandClasses.keys()]) {
        // TODO: Support multiple instances
        const requests = commandClasses
            .map(cc => CommandClass_1.getCCConstructor(cc))
            .filter(cc => !!cc)
            .map(cc => cc.createStateRequest(this.driver, this, kind))
            .filter(req => !!req);
        const factories = requests
            .map(req => () => this.driver.sendMessage(req, Constants_1.MessagePriority.NodeQuery));
        await async_1.promiseSequence(factories);
    }
    /** Serializes this node in order to store static data in a cache */
    serialize() {
        return {
            id: this.id,
            interviewStage: this.interviewStage >= InterviewStage.RestartFromCache
                ? InterviewStage[InterviewStage.Complete]
                : InterviewStage[this.interviewStage],
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
    updateNodeInfo(nodeInfo) {
        if (!this.nodeInfoReceived) {
            for (const cc of nodeInfo.supportedCCs)
                this.addCC(cc, { isSupported: true });
            for (const cc of nodeInfo.controlledCCs)
                this.addCC(cc, { isControlled: true });
            this.nodeInfoReceived = true;
        }
        // As the NIF is sent on wakeup, treat this as a sign that the node is awake
        this.setAwake(true);
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
                if (!/^0x[0-9a-fA-F]+$/.test(ccHex))
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
    setAwake(awake, emitEvent = true) {
        if (!this.supportsCC(CommandClass_1.CommandClasses["Wake Up"])) {
            throw new ZWaveError_1.ZWaveError("This node does not support the Wake Up CC", ZWaveError_1.ZWaveErrorCodes.CC_NotSupported);
        }
        if (awake !== this.isAwake()) {
            WakeUpCC_1.WakeUpCC.setAwake(this.driver, this, awake);
            if (emitEvent)
                this.emit(awake ? "wake up" : "sleep", this);
        }
    }
    isAwake() {
        const isAsleep = this.supportsCC(CommandClass_1.CommandClasses["Wake Up"]) && !WakeUpCC_1.WakeUpCC.isAwake(this.driver, this);
        return !isAsleep;
    }
    async sendNoMoreInformation() {
        // Avoid calling this method more than once
        if (this.isSendingNoMoreInformation)
            return false;
        this.isSendingNoMoreInformation = true;
        let msgSent = false;
        if (this.isAwake() && this.interviewStage === InterviewStage.Complete) {
            logger_1.log("controller", `${this.logPrefix}Sending node back to sleep`, "debug");
            const wakeupCC = new WakeUpCC_1.WakeUpCC(this.driver, this.id, WakeUpCC_1.WakeUpCommand.NoMoreInformation);
            const request = new SendDataMessages_1.SendDataRequest(this.driver, wakeupCC);
            await this.driver.sendMessage(request, Constants_1.MessagePriority.WakeUp);
            logger_1.log("controller", `${this.logPrefix}  Node asleep`, "debug");
            msgSent = true;
        }
        this.isSendingNoMoreInformation = false;
        return msgSent;
    }
}
exports.ZWaveNode = ZWaveNode;
// TODO: This order is not optimal, check how OpenHAB does it
var InterviewStage;
(function (InterviewStage) {
    InterviewStage[InterviewStage["None"] = 0] = "None";
    InterviewStage[InterviewStage["ProtocolInfo"] = 1] = "ProtocolInfo";
    InterviewStage[InterviewStage["Ping"] = 2] = "Ping";
    InterviewStage[InterviewStage["NodeInfo"] = 3] = "NodeInfo";
    InterviewStage[InterviewStage["NodePlusInfo"] = 4] = "NodePlusInfo";
    InterviewStage[InterviewStage["ManufacturerSpecific"] = 5] = "ManufacturerSpecific";
    InterviewStage[InterviewStage["SecurityReport"] = 6] = "SecurityReport";
    InterviewStage[InterviewStage["Versions"] = 7] = "Versions";
    InterviewStage[InterviewStage["Endpoints"] = 8] = "Endpoints";
    InterviewStage[InterviewStage["Static"] = 9] = "Static";
    // ===== the stuff above should never change =====
    InterviewStage[InterviewStage["RestartFromCache"] = 10] = "RestartFromCache";
    // 						   RestartFromCache and later stages will be serialized as "Complete" in the cache
    // 						   [✓] Ping each device upon restarting with cached config
    // ===== the stuff below changes frequently, so it has to be redone on every start =====
    // TODO: Heal network
    InterviewStage[InterviewStage["WakeUp"] = 11] = "WakeUp";
    InterviewStage[InterviewStage["Associations"] = 12] = "Associations";
    InterviewStage[InterviewStage["Neighbors"] = 13] = "Neighbors";
    InterviewStage[InterviewStage["Session"] = 14] = "Session";
    InterviewStage[InterviewStage["Dynamic"] = 15] = "Dynamic";
    InterviewStage[InterviewStage["Configuration"] = 16] = "Configuration";
    InterviewStage[InterviewStage["Complete"] = 17] = "Complete";
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
