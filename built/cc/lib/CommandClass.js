"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertValidCCs = exports.InvalidCC = exports.CommandClass = exports.gotDeserializationOptions = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const CommandClassDecorators_1 = require("./CommandClassDecorators");
const EncapsulatingCommandClass_1 = require("./EncapsulatingCommandClass");
const ICommandClassContainer_1 = require("./ICommandClassContainer");
const Values_1 = require("./Values");
function gotDeserializationOptions(options) {
    return "data" in options && Buffer.isBuffer(options.data);
}
exports.gotDeserializationOptions = gotDeserializationOptions;
function gotCCCommandOptions(options) {
    return typeof options.nodeId === "number" || (0, typeguards_1.isArray)(options.nodeId);
}
// @publicAPI
class CommandClass {
    // empty constructor to parse messages
    constructor(host, options) {
        /**
         * Which encapsulation CCs this CC is/was/should be encapsulated with.
         *
         * Don't use this directly, this is used internally.
         */
        this.encapsulationFlags = core_1.EncapsulationFlags.None;
        this.host = host;
        // Extract the cc from declared metadata if not provided by the CC constructor
        this.ccId =
            "ccId" in options && options.ccId != undefined
                ? options.ccId
                : (0, CommandClassDecorators_1.getCommandClass)(this);
        // Default to the root endpoint - Inherited classes may override this behavior
        this.endpointIndex =
            ("endpoint" in options ? options.endpoint : undefined) ?? 0;
        // We cannot use @ccValue for non-derived classes, so register interviewComplete as an internal value here
        // this.registerValue("interviewComplete", { internal: true });
        if (gotDeserializationOptions(options)) {
            // For deserialized commands, try to invoke the correct subclass constructor
            const CCConstructor = (0, CommandClassDecorators_1.getCCConstructor)(CommandClass.getCommandClass(options.data)) ??
                CommandClass;
            const ccCommand = CCConstructor.getCCCommand(options.data);
            if (ccCommand != undefined) {
                const CommandConstructor = (0, CommandClassDecorators_1.getCCCommandConstructor)(this.ccId, ccCommand);
                if (CommandConstructor &&
                    new.target !== CommandConstructor) {
                    return new CommandConstructor(host, options);
                }
            }
            // If the constructor is correct or none was found, fall back to normal deserialization
            if (options.fromEncapsulation) {
                // Propagate the node ID and endpoint index from the encapsulating CC
                this.nodeId = options.encapCC.nodeId;
                if (!this.endpointIndex && options.encapCC.endpointIndex) {
                    this.endpointIndex = options.encapCC.endpointIndex;
                }
                // And remember which CC encapsulates this CC
                this.encapsulatingCC = options.encapCC;
            }
            else {
                this.nodeId = options.nodeId;
            }
            ({
                ccId: this.ccId,
                ccCommand: this.ccCommand,
                payload: this.payload,
            } = this.deserialize(options.data));
        }
        else if (gotCCCommandOptions(options)) {
            const { nodeId, ccCommand = (0, CommandClassDecorators_1.getCCCommand)(this), payload = Buffer.allocUnsafe(0), } = options;
            this.nodeId = nodeId;
            this.ccCommand = ccCommand;
            this.payload = payload;
        }
        if (this instanceof InvalidCC)
            return;
        if (options.origin !== serial_1.MessageOrigin.Host && this.isSinglecast()) {
            // For singlecast CCs, set the CC version as high as possible
            this.version = this.host.getSafeCCVersionForNode(this.ccId, this.nodeId, this.endpointIndex);
            // But remember which version the node supports
            this._knownVersion = this.host.getSupportedCCVersionForEndpoint(this.ccId, this.nodeId, this.endpointIndex);
            // Send secure commands if necessary
            this.toggleEncapsulationFlag(core_1.EncapsulationFlags.Security, this.host.isCCSecure(this.ccId, this.nodeId, this.endpointIndex));
        }
        else {
            // For multicast and broadcast CCs, we just use the highest implemented version to serialize
            // Older nodes will ignore the additional fields
            this.version = (0, CommandClassDecorators_1.getImplementedVersion)(this.ccId);
            this._knownVersion = this.version;
        }
    }
    get ccName() {
        return (0, core_1.getCCName)(this.ccId);
    }
    /** Activates or deactivates the given encapsulation flag(s) */
    toggleEncapsulationFlag(flag, active) {
        if (active) {
            this.encapsulationFlags |= flag;
        }
        else {
            this.encapsulationFlags &= ~flag;
        }
    }
    /** Returns true if this CC is an extended CC (0xF100..0xFFFF) */
    isExtended() {
        return this.ccId >= 0xf100;
    }
    /** Whether the interview for this CC was previously completed */
    isInterviewComplete(applHost) {
        return !!this.getValueDB(applHost).getValue({
            commandClass: this.ccId,
            endpoint: this.endpointIndex,
            property: "interviewComplete",
        });
    }
    /** Marks the interview for this CC as complete or not */
    setInterviewComplete(applHost, complete) {
        this.getValueDB(applHost).setValue({
            commandClass: this.ccId,
            endpoint: this.endpointIndex,
            property: "interviewComplete",
        }, complete);
    }
    /**
     * Deserializes a CC from a buffer that contains a serialized CC
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    deserialize(data) {
        const ccId = CommandClass.getCommandClass(data);
        const ccIdLength = this.isExtended() ? 2 : 1;
        if (data.length > ccIdLength) {
            // This is not a NoOp CC (contains command and payload)
            const ccCommand = data[ccIdLength];
            const payload = data.slice(ccIdLength + 1);
            return {
                ccId,
                ccCommand,
                payload,
            };
        }
        else {
            // NoOp CC (no command, no payload)
            const payload = Buffer.allocUnsafe(0);
            return { ccId, payload };
        }
    }
    /**
     * Serializes this CommandClass to be embedded in a message payload or another CC
     */
    serialize() {
        // NoOp CCs have no command and no payload
        if (this.ccId === core_1.CommandClasses["No Operation"])
            return Buffer.from([this.ccId]);
        else if (this.ccCommand == undefined) {
            throw new core_1.ZWaveError("Cannot serialize a Command Class without a command", core_1.ZWaveErrorCodes.CC_Invalid);
        }
        const payloadLength = this.payload.length;
        const ccIdLength = this.isExtended() ? 2 : 1;
        const data = Buffer.allocUnsafe(ccIdLength + 1 + payloadLength);
        data.writeUIntBE(this.ccId, 0, ccIdLength);
        data[ccIdLength] = this.ccCommand;
        if (payloadLength > 0 /* implies payload != undefined */) {
            this.payload.copy(data, 1 + ccIdLength);
        }
        return data;
    }
    prepareRetransmission() {
        // Do nothing by default
    }
    /** Extracts the CC id from a buffer that contains a serialized CC */
    static getCommandClass(data) {
        return (0, core_1.parseCCId)(data).ccId;
    }
    /** Extracts the CC command from a buffer that contains a serialized CC  */
    static getCCCommand(data) {
        if (data[0] === 0)
            return undefined; // NoOp
        const isExtendedCC = data[0] >= 0xf1;
        return isExtendedCC ? data[2] : data[1];
    }
    /**
     * Retrieves the correct constructor for the CommandClass in the given Buffer.
     * It is assumed that the buffer only contains the serialized CC. This throws if the CC is not implemented.
     */
    static getConstructor(ccData) {
        // Encapsulated CCs don't have the two header bytes
        const cc = CommandClass.getCommandClass(ccData);
        const ret = (0, CommandClassDecorators_1.getCCConstructor)(cc);
        if (!ret) {
            const ccName = (0, core_1.getCCName)(cc);
            throw new core_1.ZWaveError(`The command class ${ccName} is not implemented`, core_1.ZWaveErrorCodes.CC_NotImplemented);
        }
        return ret;
    }
    /**
     * Creates an instance of the CC that is serialized in the given buffer
     */
    static from(host, options) {
        // Fall back to unspecified command class in case we receive one that is not implemented
        const Constructor = CommandClass.getConstructor(options.data);
        try {
            const ret = new Constructor(host, options);
            return ret;
        }
        catch (e) {
            // Indicate invalid payloads with a special CC type
            if ((0, core_1.isZWaveError)(e) &&
                e.code === core_1.ZWaveErrorCodes.PacketFormat_InvalidPayload) {
                const nodeId = options.fromEncapsulation
                    ? options.encapCC.nodeId
                    : options.nodeId;
                let ccName;
                const ccId = CommandClass.getCommandClass(options.data);
                const ccCommand = CommandClass.getCCCommand(options.data);
                if (ccCommand != undefined) {
                    ccName = (0, CommandClassDecorators_1.getCCCommandConstructor)(ccId, ccCommand)?.name;
                }
                // Fall back to the unspecified CC if the command cannot be determined
                if (!ccName) {
                    ccName = `${(0, core_1.getCCName)(ccId)} CC`;
                }
                // Preserve why the command was invalid
                let reason;
                if (typeof e.context === "string" ||
                    (typeof e.context === "number" &&
                        core_1.ZWaveErrorCodes[e.context] != undefined)) {
                    reason = e.context;
                }
                const ret = new InvalidCC(host, {
                    nodeId,
                    ccId,
                    ccName,
                    reason,
                });
                if (options.fromEncapsulation) {
                    ret.encapsulatingCC = options.encapCC;
                }
                return ret;
            }
            throw e;
        }
    }
    /**
     * Create an instance of the given CC without checking whether it is supported.
     * If the CC is implemented, this returns an instance of the given CC which is linked to the given endpoint.
     *
     * **INTERNAL:** Applications should not use this directly.
     */
    static createInstanceUnchecked(host, endpoint, cc) {
        const Constructor = typeof cc === "number" ? (0, CommandClassDecorators_1.getCCConstructor)(cc) : cc;
        if (Constructor) {
            return new Constructor(host, {
                nodeId: endpoint.nodeId,
                endpoint: endpoint.index,
            });
        }
    }
    /** Generates a representation of this CC for the log */
    toLogEntry(_applHost) {
        let tag = this.constructor.name;
        const message = {};
        if (this.constructor === CommandClass) {
            tag = `${(0, shared_1.getEnumMemberName)(core_1.CommandClasses, this.ccId)} CC (not implemented)`;
            if (this.ccCommand != undefined) {
                message.command = (0, shared_1.num2hex)(this.ccCommand);
            }
        }
        if (this.payload.length > 0) {
            message.payload = (0, shared_1.buffer2hex)(this.payload);
        }
        return {
            tags: [tag],
            message,
        };
    }
    /** Generates the JSON representation of this CC */
    toJSON() {
        return this.toJSONInternal();
    }
    toJSONInternal() {
        const ret = {
            nodeId: this.nodeId,
            ccId: core_1.CommandClasses[this.ccId] || (0, shared_1.num2hex)(this.ccId),
        };
        if (this.ccCommand != undefined) {
            ret.ccCommand = (0, shared_1.num2hex)(this.ccCommand);
        }
        if (this.payload.length > 0) {
            ret.payload = "0x" + this.payload.toString("hex");
        }
        return ret;
    }
    throwMissingCriticalInterviewResponse() {
        throw new core_1.ZWaveError(`The node did not respond to a critical interview query in time.`, core_1.ZWaveErrorCodes.Controller_NodeTimeout);
    }
    /**
     * Performs the interview procedure for this CC according to SDS14223
     */
    async interview(_applHost) {
        // This needs to be overwritten per command class. In the default implementation, don't do anything
    }
    /**
     * Refreshes all dynamic values of this CC
     */
    async refreshValues(_applHost) {
        // This needs to be overwritten per command class. In the default implementation, don't do anything
    }
    /**
     * Checks if the CC values need to be manually refreshed.
     * This should be called regularly and when sleeping nodes wake up
     */
    shouldRefreshValues(_applHost) {
        // This needs to be overwritten per command class.
        // In the default implementation, don't require a refresh
        return false;
    }
    /** Determines which CC interviews must be performed before this CC can be interviewed */
    determineRequiredCCInterviews() {
        // By default, all CCs require the VersionCC interview
        // There are two exceptions to this rule:
        // * ManufacturerSpecific must be interviewed first
        // * VersionCC itself must be done after that
        // These exceptions are defined in the overrides of this method of each corresponding CC
        return [core_1.CommandClasses.Version];
    }
    /**
     * Whether the endpoint interview may be skipped by a CC. Can be overwritten by a subclass.
     */
    skipEndpointInterview() {
        // By default no interview may be skipped
        return false;
    }
    /**
     * Maps a BasicCC value to a more specific CC implementation. Returns true if the value was mapped, false otherwise.
     * @param _value The value of the received BasicCC
     */
    setMappedBasicValue(_applHost, _value) {
        // By default, don't map
        return false;
    }
    isSinglecast() {
        return (typeof this.nodeId === "number" && this.nodeId !== core_1.NODE_ID_BROADCAST);
    }
    isMulticast() {
        return (0, typeguards_1.isArray)(this.nodeId);
    }
    isBroadcast() {
        return this.nodeId === core_1.NODE_ID_BROADCAST;
    }
    /**
     * Returns the node this CC is linked to. Throws if the controller is not yet ready.
     */
    getNode(applHost) {
        if (this.isSinglecast()) {
            return applHost.nodes.get(this.nodeId);
        }
    }
    /**
     * @internal
     * Returns the node this CC is linked to (or undefined if the node doesn't exist)
     */
    getNodeUnsafe(applHost) {
        try {
            return this.getNode(applHost);
        }
        catch (e) {
            // This was expected
            if ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Driver_NotReady) {
                return undefined;
            }
            // Something else happened
            throw e;
        }
    }
    getEndpoint(applHost) {
        return this.getNode(applHost)?.getEndpoint(this.endpointIndex);
    }
    /** Returns the value DB for this CC's node */
    getValueDB(applHost) {
        if (this.isSinglecast()) {
            try {
                return applHost.getValueDB(this.nodeId);
            }
            catch {
                throw new core_1.ZWaveError("The node for this CC does not exist or the driver is not ready yet", core_1.ZWaveErrorCodes.Driver_NotReady);
            }
        }
        throw new core_1.ZWaveError("Cannot retrieve the value DB for non-singlecast CCs", core_1.ZWaveErrorCodes.CC_NoNodeID);
    }
    /**
     * Ensures that the metadata for the given CC value exists in the Value DB or creates it if it does not.
     * The endpoint index of the current CC instance is automatically taken into account.
     * @param meta Will be used in place of the predefined metadata when given
     */
    ensureMetadata(applHost, ccValue, meta) {
        const valueDB = this.getValueDB(applHost);
        const valueId = ccValue.endpoint(this.endpointIndex);
        if (!valueDB.hasMetadata(valueId)) {
            valueDB.setMetadata(valueId, meta ?? ccValue.meta);
        }
    }
    /**
     * Removes the metadata for the given CC value from the value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    removeMetadata(applHost, ccValue) {
        const valueDB = this.getValueDB(applHost);
        const valueId = ccValue.endpoint(this.endpointIndex);
        valueDB.setMetadata(valueId, undefined);
    }
    /**
     * Writes the metadata for the given CC value into the Value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     * @param meta Will be used in place of the predefined metadata when given
     */
    setMetadata(applHost, ccValue, meta) {
        const valueDB = this.getValueDB(applHost);
        const valueId = ccValue.endpoint(this.endpointIndex);
        valueDB.setMetadata(valueId, meta ?? ccValue.meta);
    }
    /**
     * Reads the metadata for the given CC value from the Value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    getMetadata(applHost, ccValue) {
        const valueDB = this.getValueDB(applHost);
        const valueId = ccValue.endpoint(this.endpointIndex);
        return valueDB.getMetadata(valueId);
    }
    /**
     * Stores the given value under the value ID for the given CC value in the value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    setValue(applHost, ccValue, value) {
        const valueDB = this.getValueDB(applHost);
        const valueId = ccValue.endpoint(this.endpointIndex);
        valueDB.setValue(valueId, value);
    }
    /**
     * Removes the value for the given CC value from the value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    removeValue(applHost, ccValue) {
        const valueDB = this.getValueDB(applHost);
        const valueId = ccValue.endpoint(this.endpointIndex);
        valueDB.removeValue(valueId);
    }
    /**
     * Reads the value stored for the value ID of the given CC value from the value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    getValue(applHost, ccValue) {
        const valueDB = this.getValueDB(applHost);
        const valueId = ccValue.endpoint(this.endpointIndex);
        return valueDB.getValue(valueId);
    }
    /**
     * Reads when the value stored for the value ID of the given CC value was last updated in the value DB.
     * The endpoint index of the current CC instance is automatically taken into account.
     */
    getValueTimestamp(applHost, ccValue) {
        const valueDB = this.getValueDB(applHost);
        const valueId = ccValue.endpoint(this.endpointIndex);
        return valueDB.getTimestamp(valueId);
    }
    /** Returns the CC value definition for the current CC which matches the given value ID */
    getCCValue(valueId) {
        const ccValues = (0, CommandClassDecorators_1.getCCValues)(this);
        if (!ccValues)
            return;
        for (const value of Object.values(ccValues)) {
            if (value?.is(valueId)) {
                return value;
            }
        }
    }
    getAllCCValues() {
        return Object.values((0, CommandClassDecorators_1.getCCValues)(this) ?? {});
    }
    getCCValueForValueId(properties) {
        return this.getAllCCValues().find((value) => value.is({
            commandClass: this.ccId,
            ...properties,
        }));
    }
    shouldAutoCreateValue(applHost, value) {
        return (value.options.autoCreate === true ||
            (typeof value.options.autoCreate === "function" &&
                value.options.autoCreate(applHost, this.getEndpoint(applHost))));
    }
    /** Returns a list of all value names that are defined for this CommandClass */
    getDefinedValueIDs(applHost) {
        // In order to compare value ids, we need them to be strings
        const ret = new Map();
        const addValueId = (property, propertyKey) => {
            const valueId = {
                commandClass: this.ccId,
                endpoint: this.endpointIndex,
                property,
                propertyKey,
            };
            const dbKey = (0, core_1.valueIdToString)(valueId);
            if (!ret.has(dbKey))
                ret.set(dbKey, valueId);
        };
        // Return all value IDs for this CC...
        const valueDB = this.getValueDB(applHost);
        // ...which either have metadata or a value
        const existingValueIds = [
            ...valueDB.getValues(this.ccId),
            ...valueDB.getAllMetadata(this.ccId),
        ];
        // ...or which are statically defined using @ccValues(...)
        for (const value of Object.values((0, CommandClassDecorators_1.getCCValues)(this) ?? {})) {
            // Skip dynamic CC values - they need a specific subclass instance to be evaluated
            if (!value || typeof value === "function")
                continue;
            // Skip those values that are only supported in higher versions of the CC
            if (value.options.minVersion != undefined &&
                value.options.minVersion > this._knownVersion) {
                continue;
            }
            // Skip internal values
            if (value.options.internal)
                continue;
            // And determine if this value should be automatically "created"
            if (!this.shouldAutoCreateValue(applHost, value))
                continue;
            existingValueIds.push(value.endpoint(this.endpointIndex));
        }
        // TODO: this is a bit awkward for the statically defined ones
        const ccValues = this.getAllCCValues();
        for (const valueId of existingValueIds) {
            // ...belonging to the current endpoint
            if ((valueId.endpoint ?? 0) !== this.endpointIndex)
                continue;
            // Hard-coded: interviewComplete is always internal
            if (valueId.property === "interviewComplete")
                continue;
            // ... which don't have a CC value definition
            // ... or one that does not mark the value ID as internal
            const ccValue = ccValues.find((value) => value.is(valueId));
            if (!ccValue || !ccValue.options.internal) {
                addValueId(valueId.property, valueId.propertyKey);
            }
        }
        return [...ret.values()];
    }
    /** Determines if the given value is an internal value */
    isInternalValue(properties) {
        // Hard-coded: interviewComplete is always internal
        if (properties.property === "interviewComplete")
            return true;
        const ccValue = this.getCCValueForValueId(properties);
        return ccValue?.options.internal ?? Values_1.defaultCCValueOptions.internal;
    }
    /** Determines if the given value is an secret value */
    isSecretValue(properties) {
        const ccValue = this.getCCValueForValueId(properties);
        return ccValue?.options.secret ?? Values_1.defaultCCValueOptions.secret;
    }
    /** Determines if the given value should be persisted or represents an event */
    isStatefulValue(properties) {
        const ccValue = this.getCCValueForValueId(properties);
        return ccValue?.options.stateful ?? Values_1.defaultCCValueOptions.stateful;
    }
    /**
     * Persists all values for this CC instance into the value DB which are annotated with @ccValue.
     * Returns `true` if the process succeeded, `false` if the value DB cannot be accessed.
     */
    persistValues(applHost) {
        let valueDB;
        try {
            valueDB = this.getValueDB(applHost);
        }
        catch {
            return false;
        }
        // Get all properties of this CC which are annotated with a @ccValue decorator and store them.
        for (const [prop, _value] of (0, CommandClassDecorators_1.getCCValueProperties)(this)) {
            // Evaluate dynamic CC values first
            const value = typeof _value === "function" ? _value(this) : _value;
            // Skip those values that are only supported in higher versions of the CC
            if (value.options.minVersion != undefined &&
                value.options.minVersion > this.version) {
                continue;
            }
            const valueId = value.endpoint(this.endpointIndex);
            const sourceValue = this[prop];
            // Metadata gets created for non-internal values...
            const createMetadata = !value.options.internal &&
                // ... but only if the value is included in the report we are persisting
                (sourceValue != undefined ||
                    // ... or if we know which CC version the node supports
                    // and the value may be automatically created
                    (this._knownVersion >= value.options.minVersion &&
                        this.shouldAutoCreateValue(applHost, value)));
            if (createMetadata && !valueDB.hasMetadata(valueId)) {
                valueDB.setMetadata(valueId, value.meta);
            }
            // The value only gets written if it is not undefined
            if (sourceValue == undefined)
                continue;
            valueDB.setValue(valueId, sourceValue, {
                stateful: value.options.stateful,
            });
        }
        return true;
    }
    /**
     * When a CC supports to be split into multiple partial CCs, this can be used to identify the
     * session the partial CCs belong to.
     * If a CC expects `mergePartialCCs` to be always called, you should return an empty object here.
     */
    getPartialCCSessionId() {
        return undefined; // Only select CCs support to be split
    }
    /**
     * When a CC supports to be split into multiple partial CCs, this indicates that the last report hasn't been received yet.
     * @param _session The previously received set of messages received in this partial CC session
     */
    expectMoreMessages(_session) {
        return false; // By default, all CCs are monolithic
    }
    /** Include previously received partial responses into a final CC */
    /* istanbul ignore next */
    mergePartialCCs(_applHost, _partials) {
        // This is highly CC dependent
        // Overwrite this in derived classes, by default do nothing
    }
    /** Tests whether this CC expects at least one command in return */
    expectsCCResponse() {
        let expected = (0, CommandClassDecorators_1.getExpectedCCResponse)(this);
        // Evaluate dynamic CC responses
        if (typeof expected === "function" &&
            !(0, shared_1.staticExtends)(expected, CommandClass)) {
            expected = expected(this);
        }
        if (expected === undefined)
            return false;
        if ((0, typeguards_1.isArray)(expected)) {
            return expected.every((cc) => (0, shared_1.staticExtends)(cc, CommandClass));
        }
        else {
            return (0, shared_1.staticExtends)(expected, CommandClass);
        }
    }
    isExpectedCCResponse(received) {
        if (received.nodeId !== this.nodeId)
            return false;
        let expected = (0, CommandClassDecorators_1.getExpectedCCResponse)(this);
        // Evaluate dynamic CC responses
        if (typeof expected === "function" &&
            !(0, shared_1.staticExtends)(expected, CommandClass)) {
            expected = expected(this);
        }
        if (expected == undefined) {
            // Fallback, should not happen if the expected response is defined correctly
            return false;
        }
        else if ((0, typeguards_1.isArray)(expected) &&
            expected.every((cc) => (0, shared_1.staticExtends)(cc, CommandClass))) {
            // The CC always expects a response from the given list, check if the received
            // message is in that list
            if (expected.every((base) => !(received instanceof base))) {
                return false;
            }
        }
        else if ((0, shared_1.staticExtends)(expected, CommandClass)) {
            // The CC always expects the same single response, check if this is the one
            if (!(received instanceof expected))
                return false;
        }
        // If the CC wants to test the response, let it
        const predicate = (0, CommandClassDecorators_1.getCCResponsePredicate)(this);
        const ret = predicate?.(this, received) ?? true;
        if (ret === "checkEncapsulated") {
            if ((0, EncapsulatingCommandClass_1.isEncapsulatingCommandClass)(this) &&
                (0, EncapsulatingCommandClass_1.isEncapsulatingCommandClass)(received)) {
                return this.encapsulated.isExpectedCCResponse(received.encapsulated);
            }
            else {
                // Fallback, should not happen if the expected response is defined correctly
                return false;
            }
        }
        return ret;
    }
    /**
     * Translates a property identifier into a speaking name for use in an external API
     * @param property The property identifier that should be translated
     * @param _propertyKey The (optional) property key the translated name may depend on
     */
    translateProperty(_applHost, property, _propertyKey) {
        // Overwrite this in derived classes, by default just return the property key
        return property.toString();
    }
    /**
     * Translates a property key into a speaking name for use in an external API
     * @param _property The property the key in question belongs to
     * @param propertyKey The property key for which the speaking name should be retrieved
     */
    translatePropertyKey(_applHost, _property, propertyKey) {
        // Overwrite this in derived classes, by default just return the property key
        return propertyKey.toString();
    }
    /** Returns the number of bytes that are added to the payload by this CC */
    computeEncapsulationOverhead() {
        // Default is ccId (+ ccCommand):
        return (this.isExtended() ? 2 : 1) + 1;
    }
    /** Computes the maximum net payload size that can be transmitted inside this CC */
    getMaxPayloadLength(baseLength) {
        let ret = baseLength;
        let cur = this;
        while (cur) {
            ret -= cur.computeEncapsulationOverhead();
            cur = (0, EncapsulatingCommandClass_1.isEncapsulatingCommandClass)(cur)
                ? cur.encapsulated
                : undefined;
        }
        return ret;
    }
    /** Checks whether this CC is encapsulated with one that has the given CC id and (optionally) CC Command */
    isEncapsulatedWith(ccId, ccCommand) {
        let cc = this;
        // Check whether there was a S0 encapsulation
        while (cc.encapsulatingCC) {
            cc = cc.encapsulatingCC;
            if (cc.ccId === ccId &&
                (ccCommand === undefined || cc.ccCommand === ccCommand)) {
                return true;
            }
        }
        return false;
    }
    /** Traverses the encapsulation stack of this CC outwards and returns the one that has the given CC id and (optionally) CC Command if that exists. */
    getEncapsulatingCC(ccId, ccCommand) {
        let cc = this;
        while (cc.encapsulatingCC) {
            cc = cc.encapsulatingCC;
            if (cc.ccId === ccId &&
                (ccCommand === undefined || cc.ccCommand === ccCommand)) {
                return cc;
            }
        }
    }
    /** Traverses the encapsulation stack of this CC inwards and returns the one that has the given CC id and (optionally) CC Command if that exists. */
    getEncapsulatedCC(ccId, ccCommand) {
        const predicate = (cc) => cc.ccId === ccId &&
            (ccCommand === undefined || cc.ccCommand === ccCommand);
        if ((0, EncapsulatingCommandClass_1.isEncapsulatingCommandClass)(this)) {
            if (predicate(this.encapsulated))
                return this.encapsulated;
            return this.encapsulated.getEncapsulatedCC(ccId, ccCommand);
        }
        else if ((0, EncapsulatingCommandClass_1.isMultiEncapsulatingCommandClass)(this)) {
            for (const encapsulated of this.encapsulated) {
                if (predicate(encapsulated))
                    return encapsulated;
                const ret = encapsulated.getEncapsulatedCC(ccId, ccCommand);
                if (ret)
                    return ret;
            }
        }
    }
}
exports.CommandClass = CommandClass;
class InvalidCC extends CommandClass {
    constructor(host, options) {
        super(host, options);
        this._ccName = options.ccName;
        // Numeric reasons are used internally to communicate problems with a CC
        // without ignoring them entirely
        this.reason = options.reason;
    }
    get ccName() {
        return this._ccName;
    }
    toLogEntry() {
        return {
            tags: [this.ccName, "INVALID"],
            message: this.reason != undefined
                ? {
                    error: typeof this.reason === "string"
                        ? this.reason
                        : (0, shared_1.getEnumMemberName)(core_1.ZWaveErrorCodes, this.reason),
                }
                : undefined,
        };
    }
}
exports.InvalidCC = InvalidCC;
/** @publicAPI */
function assertValidCCs(container) {
    if (container.command instanceof InvalidCC) {
        if (typeof container.command.reason === "number") {
            throw new core_1.ZWaveError("The message payload failed validation!", container.command.reason);
        }
        else {
            throw new core_1.ZWaveError("The message payload is invalid!", core_1.ZWaveErrorCodes.PacketFormat_InvalidPayload, container.command.reason);
        }
    }
    else if ((0, ICommandClassContainer_1.isCommandClassContainer)(container.command)) {
        assertValidCCs(container.command);
    }
}
exports.assertValidCCs = assertValidCCs;
//# sourceMappingURL=CommandClass.js.map