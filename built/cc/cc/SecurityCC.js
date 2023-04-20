"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityCCCommandsSupportedGet = exports.SecurityCCCommandsSupportedReport = exports.SecurityCCNetworkKeySet = exports.SecurityCCNetworkKeyVerify = exports.SecurityCCSchemeInherit = exports.SecurityCCSchemeGet = exports.SecurityCCSchemeReport = exports.SecurityCCCommandEncapsulationNonceGet = exports.SecurityCCCommandEncapsulation = exports.SecurityCCNonceGet = exports.SecurityCCNonceReport = exports.SecurityCC = exports.SecurityCCAPI = void 0;
const core_1 = require("@zwave-js/core");
const safe_1 = require("@zwave-js/shared/safe");
const async_1 = require("alcalzone-shared/async");
const crypto_1 = require("crypto");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const _Types_1 = require("../lib/_Types");
const Security2CC_1 = require("./Security2CC");
// @noSetValueAPI This is an encapsulation CC
function getAuthenticationData(senderNonce, receiverNonce, ccCommand, sendingNodeId, receivingNodeId, encryptedPayload) {
    return Buffer.concat([
        senderNonce,
        receiverNonce,
        Buffer.from([
            ccCommand,
            sendingNodeId,
            receivingNodeId,
            encryptedPayload.length,
        ]),
        encryptedPayload,
    ]);
}
function throwNoNonce(reason) {
    let message = `Security CC requires a nonce to be sent!`;
    if (reason)
        message += ` Reason: ${reason}`;
    throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.SecurityCC_NoNonce);
}
const HALF_NONCE_SIZE = 8;
// TODO: Ignore commands if received via multicast
// @noValidateArgs - Encapsulation CCs are used internally and too frequently that we
// want to pay the cost of validating each call
let SecurityCCAPI = class SecurityCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(_cmd) {
        // All commands are mandatory
        return true;
    }
    async sendEncapsulated(encapsulated, requestNextNonce = false) {
        if (requestNextNonce) {
            this.assertSupportsCommand(_Types_1.SecurityCommand, _Types_1.SecurityCommand.CommandEncapsulation);
        }
        else {
            this.assertSupportsCommand(_Types_1.SecurityCommand, _Types_1.SecurityCommand.CommandEncapsulationNonceGet);
        }
        const cc = new (requestNextNonce
            ? SecurityCCCommandEncapsulationNonceGet
            : SecurityCCCommandEncapsulation)(this.applHost, {
            nodeId: this.endpoint.nodeId,
            encapsulated,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    /**
     * Requests a new nonce for Security CC encapsulation which is not directly linked to a specific command.
     */
    async getNonce() {
        this.assertSupportsCommand(_Types_1.SecurityCommand, _Types_1.SecurityCommand.NonceGet);
        const cc = new SecurityCCNonceGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, {
            ...this.commandOptions,
            // Nonce requests must be handled immediately
            priority: core_1.MessagePriority.Nonce,
            // Only try getting a nonce once
            maxSendAttempts: 1,
        });
        if (!response)
            return;
        const nonce = response.nonce;
        const secMan = this.applHost.securityManager;
        secMan.setNonce({
            issuer: this.endpoint.nodeId,
            nonceId: secMan.getNonceId(nonce),
        }, { nonce, receiver: this.applHost.ownNodeId }, { free: true });
        return nonce;
    }
    /**
     * Responds to a NonceGet request. The message is sent without any retransmission etc.
     * The return value indicates whether a nonce was successfully sent
     */
    async sendNonce() {
        this.assertSupportsCommand(_Types_1.SecurityCommand, _Types_1.SecurityCommand.NonceReport);
        if (!this.applHost.securityManager) {
            throw new core_1.ZWaveError(`Nonces can only be sent if secure communication is set up!`, core_1.ZWaveErrorCodes.Driver_NoSecurity);
        }
        const nonce = this.applHost.securityManager.generateNonce(this.endpoint.nodeId, HALF_NONCE_SIZE);
        const nonceId = this.applHost.securityManager.getNonceId(nonce);
        const cc = new SecurityCCNonceReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            nonce,
        });
        try {
            await this.applHost.sendCommand(cc, {
                ...this.commandOptions,
                // Seems we need these options or some nodes won't accept the nonce
                transmitOptions: core_1.TransmitOptions.ACK | core_1.TransmitOptions.AutoRoute,
                // Only try sending a nonce once
                maxSendAttempts: 1,
                // Nonce requests must be handled immediately
                priority: core_1.MessagePriority.Nonce,
                // We don't want failures causing us to treat the node as asleep or dead
                changeNodeStatusOnMissingACK: false,
            });
        }
        catch (e) {
            if ((0, core_1.isTransmissionError)(e)) {
                // The nonce could not be sent, invalidate it
                this.applHost.securityManager.deleteNonce(nonceId);
                return false;
            }
            else {
                // Pass other errors through
                throw e;
            }
        }
        return true;
    }
    async getSecurityScheme() {
        this.assertSupportsCommand(_Types_1.SecurityCommand, _Types_1.SecurityCommand.SchemeGet);
        const cc = new SecurityCCSchemeGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
        // There is only one scheme, so we hardcode it
        return [0];
    }
    async inheritSecurityScheme() {
        this.assertSupportsCommand(_Types_1.SecurityCommand, _Types_1.SecurityCommand.SchemeInherit);
        const cc = new SecurityCCSchemeInherit(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
        // There is only one scheme, so we don't return anything here
    }
    async setNetworkKey(networkKey) {
        this.assertSupportsCommand(_Types_1.SecurityCommand, _Types_1.SecurityCommand.NetworkKeySet);
        const keySet = new SecurityCCNetworkKeySet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            networkKey,
        });
        const cc = new SecurityCCCommandEncapsulation(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            encapsulated: keySet,
            alternativeNetworkKey: Buffer.alloc(16, 0),
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSupportedCommands() {
        this.assertSupportsCommand(_Types_1.SecurityCommand, _Types_1.SecurityCommand.CommandsSupportedGet);
        const cc = new SecurityCCCommandsSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_1.pick)(response, ["supportedCCs", "controlledCCs"]);
        }
    }
};
SecurityCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(core_1.CommandClasses.Security)
], SecurityCCAPI);
exports.SecurityCCAPI = SecurityCCAPI;
let SecurityCC = class SecurityCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(core_1.CommandClasses.Security, applHost, endpoint).withOptions({
            priority: core_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            message: "Querying securely supported commands (S0)...",
            direction: "outbound",
        });
        let supportedCCs;
        let controlledCCs;
        // Try up to 3 times on the root device. We REALLY don't want a spurious timeout or collision to cause us to discard a known good security class
        const MAX_ATTEMPTS = this.endpointIndex === 0 ? 3 : 1;
        for (let attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
            const resp = await api.getSupportedCommands();
            if (resp) {
                supportedCCs = resp.supportedCCs;
                controlledCCs = resp.controlledCCs;
                break;
            }
            else if (attempts < MAX_ATTEMPTS) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `Querying securely supported commands (S0), attempt ${attempts}/${MAX_ATTEMPTS} failed. Retrying in 500ms...`,
                    level: "warn",
                });
                await (0, async_1.wait)(500);
            }
        }
        if (!supportedCCs || !controlledCCs) {
            if (node.hasSecurityClass(core_1.SecurityClass.S0_Legacy) === true) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "Querying securely supported commands (S0) failed",
                    level: "warn",
                });
                // TODO: Abort interview?
            }
            else {
                // We didn't know if the node was secure and it didn't respond,
                // assume that it doesn't have the S0 security class
                applHost.controllerLog.logNode(node.id, `The node was not granted the S0 security class. Continuing interview non-securely.`);
                node.setSecurityClass(core_1.SecurityClass.S0_Legacy, false);
            }
            return;
        }
        const logLines = [
            "received secure commands (S0)",
            "supported CCs:",
        ];
        for (const cc of supportedCCs) {
            logLines.push(`· ${(0, core_1.getCCName)(cc)}`);
        }
        logLines.push("controlled CCs:");
        for (const cc of controlledCCs) {
            logLines.push(`· ${(0, core_1.getCCName)(cc)}`);
        }
        applHost.controllerLog.logNode(node.id, {
            message: logLines.join("\n"),
            direction: "inbound",
        });
        // Remember which commands are supported securely
        for (const cc of supportedCCs) {
            endpoint.addCC(cc, { isSupported: true, secure: true });
        }
        for (const cc of controlledCCs) {
            endpoint.addCC(cc, { isControlled: true, secure: true });
        }
        // We know for sure that the node is included securely
        if (node.hasSecurityClass(core_1.SecurityClass.S0_Legacy) !== true) {
            node.setSecurityClass(core_1.SecurityClass.S0_Legacy, true);
            applHost.controllerLog.logNode(node.id, `The node was granted the S0 security class`);
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    /** Tests if a command should be sent secure and thus requires encapsulation */
    static requiresEncapsulation(cc) {
        return (!!(cc.encapsulationFlags & core_1.EncapsulationFlags.Security) &&
            // Already encapsulated (SecurityCCCommandEncapsulationNonceGet is a subclass)
            !(cc instanceof Security2CC_1.Security2CC) &&
            !(cc instanceof SecurityCCCommandEncapsulation) &&
            // Cannot be sent encapsulated
            !(cc instanceof SecurityCCNonceGet) &&
            !(cc instanceof SecurityCCNonceReport) &&
            !(cc instanceof SecurityCCSchemeGet) &&
            !(cc instanceof SecurityCCSchemeReport));
    }
    /** Encapsulates a command that should be sent encrypted */
    static encapsulate(host, cc) {
        // TODO: When to return a SecurityCCCommandEncapsulationNonceGet?
        const ret = new SecurityCCCommandEncapsulation(host, {
            nodeId: cc.nodeId,
            encapsulated: cc,
        });
        // Copy the encapsulation flags from the encapsulated command
        // but omit Security, since we're doing that right now
        ret.encapsulationFlags =
            cc.encapsulationFlags & ~core_1.EncapsulationFlags.Security;
        return ret;
    }
};
SecurityCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(core_1.CommandClasses.Security),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], SecurityCC);
exports.SecurityCC = SecurityCC;
let SecurityCCNonceReport = class SecurityCCNonceReport extends SecurityCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            core_1.validatePayload.withReason("Invalid nonce length")(this.payload.length === HALF_NONCE_SIZE);
            this.nonce = this.payload;
        }
        else {
            if (options.nonce.length !== HALF_NONCE_SIZE) {
                throw new core_1.ZWaveError(`Nonce must have length ${HALF_NONCE_SIZE}!`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.nonce = options.nonce;
        }
    }
    serialize() {
        this.payload = this.nonce;
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { nonce: (0, safe_1.buffer2hex)(this.nonce) },
        };
    }
};
SecurityCCNonceReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.NonceReport)
], SecurityCCNonceReport);
exports.SecurityCCNonceReport = SecurityCCNonceReport;
let SecurityCCNonceGet = class SecurityCCNonceGet extends SecurityCC {
};
SecurityCCNonceGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.NonceGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(SecurityCCNonceReport)
], SecurityCCNonceGet);
exports.SecurityCCNonceGet = SecurityCCNonceGet;
function getCCResponseForCommandEncapsulation(sent) {
    if (sent.encapsulated.expectsCCResponse()) {
        return SecurityCCCommandEncapsulation;
    }
}
let SecurityCCCommandEncapsulation = class SecurityCCCommandEncapsulation extends SecurityCC {
    constructor(host, options) {
        super(host, options);
        const verb = (0, CommandClass_1.gotDeserializationOptions)(options) ? "decoded" : "sent";
        if (!this.host.ownNodeId) {
            throw new core_1.ZWaveError(`Secure commands (S0) can only be ${verb} when the controller's node id is known!`, core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        else if (!this.host.securityManager) {
            throw new core_1.ZWaveError(`Secure commands (S0) can only be ${verb} when the network key for the applHost is set`, core_1.ZWaveErrorCodes.Driver_NoSecurity);
        }
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // HALF_NONCE_SIZE bytes iv, 1 byte frame control, at least 1 CC byte, 1 byte nonce id, 8 bytes auth code
            (0, core_1.validatePayload)(this.payload.length >= HALF_NONCE_SIZE + 1 + 1 + 1 + 8);
            const iv = this.payload.slice(0, HALF_NONCE_SIZE);
            const encryptedPayload = this.payload.slice(HALF_NONCE_SIZE, -9);
            const nonceId = this.payload[this.payload.length - 9];
            const authCode = this.payload.slice(-8);
            // Retrieve the used nonce from the nonce store
            const nonce = this.host.securityManager.getNonce(nonceId);
            // Only accept the message if the nonce hasn't expired
            core_1.validatePayload.withReason(`Nonce ${(0, safe_1.num2hex)(nonceId)} expired, cannot decode security encapsulated command.`)(!!nonce);
            // and mark the nonce as used
            this.host.securityManager.deleteNonce(nonceId);
            this.authKey = this.host.securityManager.authKey;
            this.encryptionKey = this.host.securityManager.encryptionKey;
            // Validate the encrypted data
            const authData = getAuthenticationData(iv, nonce, this.ccCommand, this.nodeId, this.host.ownNodeId, encryptedPayload);
            const expectedAuthCode = (0, core_1.computeMAC)(authData, this.authKey);
            // Only accept messages with a correct auth code
            core_1.validatePayload.withReason("Invalid auth code, won't accept security encapsulated command.")(authCode.equals(expectedAuthCode));
            // Decrypt the encapsulated CC
            const frameControlAndDecryptedCC = (0, core_1.decryptAES128OFB)(encryptedPayload, this.encryptionKey, Buffer.concat([iv, nonce]));
            const frameControl = frameControlAndDecryptedCC[0];
            this.sequenceCounter = frameControl & 0b1111;
            this.sequenced = !!(frameControl & 16);
            this.secondFrame = !!(frameControl & 32);
            this.decryptedCCBytes = frameControlAndDecryptedCC.slice(1);
        }
        else {
            this.encapsulated = options.encapsulated;
            options.encapsulated.encapsulatingCC = this;
            if (options.alternativeNetworkKey) {
                this.authKey = (0, core_1.generateAuthKey)(options.alternativeNetworkKey);
                this.encryptionKey = (0, core_1.generateEncryptionKey)(options.alternativeNetworkKey);
            }
            else {
                this.authKey = this.host.securityManager.authKey;
                this.encryptionKey = this.host.securityManager.encryptionKey;
            }
        }
    }
    get nonceId() {
        if (!this.nonce)
            return undefined;
        return this.host.securityManager.getNonceId(this.nonce);
    }
    getPartialCCSessionId() {
        if (this.sequenced) {
            return {
                // Treat Encapsulation and EncapsulationNonceGet as one
                ccCommand: undefined,
                sequence: this.sequenceCounter,
            };
        }
        else {
            return {
                // Treat Encapsulation and EncapsulationNonceGet as one
                ccCommand: undefined,
            };
        }
    }
    expectMoreMessages() {
        return !!this.sequenced && !this.secondFrame;
    }
    mergePartialCCs(applHost, partials) {
        // Concat the CC buffers
        this.decryptedCCBytes = Buffer.concat([...partials, this].map((cc) => cc.decryptedCCBytes));
        // make sure this contains a complete CC command that's worth splitting
        (0, core_1.validatePayload)(this.decryptedCCBytes.length >= 2);
        // and deserialize the CC
        this.encapsulated = CommandClass_1.CommandClass.from(this.host, {
            data: this.decryptedCCBytes,
            fromEncapsulation: true,
            encapCC: this,
        });
    }
    serialize() {
        if (!this.nonce)
            throwNoNonce();
        if (this.nonce.length !== HALF_NONCE_SIZE)
            throwNoNonce("Invalid nonce size");
        const serializedCC = this.encapsulated.serialize();
        const plaintext = Buffer.concat([
            Buffer.from([0]),
            serializedCC,
        ]);
        // Encrypt the payload
        const senderNonce = (0, crypto_1.randomBytes)(HALF_NONCE_SIZE);
        const iv = Buffer.concat([senderNonce, this.nonce]);
        const ciphertext = (0, core_1.encryptAES128OFB)(plaintext, this.encryptionKey, iv);
        // And generate the auth code
        const authData = getAuthenticationData(senderNonce, this.nonce, this.ccCommand, this.host.ownNodeId, this.nodeId, ciphertext);
        const authCode = (0, core_1.computeMAC)(authData, this.authKey);
        this.payload = Buffer.concat([
            senderNonce,
            ciphertext,
            Buffer.from([this.nonceId]),
            authCode,
        ]);
        return super.serialize();
    }
    computeEncapsulationOverhead() {
        // Security CC adds 8 bytes IV, 1 byte frame control, 1 byte nonce ID, 8 bytes MAC
        return super.computeEncapsulationOverhead() + 18;
    }
    toLogEntry(applHost) {
        const message = {};
        if (this.nonceId != undefined) {
            message["nonce id"] = this.nonceId;
        }
        if (this.sequenced != undefined) {
            message.sequenced = this.sequenced;
            if (this.sequenced) {
                if (this.secondFrame != undefined) {
                    message["second frame"] = this.secondFrame;
                }
                if (this.sequenceCounter != undefined) {
                    message["sequence counter"] = this.sequenceCounter;
                }
            }
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
SecurityCCCommandEncapsulation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.CommandEncapsulation),
    (0, CommandClassDecorators_1.expectedCCResponse)(getCCResponseForCommandEncapsulation, () => "checkEncapsulated")
], SecurityCCCommandEncapsulation);
exports.SecurityCCCommandEncapsulation = SecurityCCCommandEncapsulation;
// This is the same message, but with another CC command
let SecurityCCCommandEncapsulationNonceGet = class SecurityCCCommandEncapsulationNonceGet extends SecurityCCCommandEncapsulation {
};
SecurityCCCommandEncapsulationNonceGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.CommandEncapsulationNonceGet)
], SecurityCCCommandEncapsulationNonceGet);
exports.SecurityCCCommandEncapsulationNonceGet = SecurityCCCommandEncapsulationNonceGet;
let SecurityCCSchemeReport = class SecurityCCSchemeReport extends SecurityCC {
    constructor(host, options) {
        super(host, options);
        (0, core_1.validatePayload)(this.payload.length >= 1, 
        // Since it is unlikely that any more schemes will be added to S0, we hardcode the default scheme here (bit 0 = 0)
        (this.payload[0] & 0b1) === 0);
    }
};
SecurityCCSchemeReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.SchemeReport)
], SecurityCCSchemeReport);
exports.SecurityCCSchemeReport = SecurityCCSchemeReport;
let SecurityCCSchemeGet = class SecurityCCSchemeGet extends SecurityCC {
    constructor(host, options) {
        super(host, options);
        // Don't care, we won't get sent this and we have no options
    }
    serialize() {
        // Since it is unlikely that any more schemes will be added to S0, we hardcode the default scheme here (bit 0 = 0)
        this.payload = Buffer.from([0]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            // Hide the default payload line
            message: undefined,
        };
    }
};
SecurityCCSchemeGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.SchemeGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(SecurityCCSchemeReport)
], SecurityCCSchemeGet);
exports.SecurityCCSchemeGet = SecurityCCSchemeGet;
let SecurityCCSchemeInherit = class SecurityCCSchemeInherit extends SecurityCC {
    constructor(host, options) {
        super(host, options);
        // Don't care, we won't get sent this and we have no options
    }
    serialize() {
        // Since it is unlikely that any more schemes will be added to S0, we hardcode the default scheme here (bit 0 = 0)
        this.payload = Buffer.from([0]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            // Hide the default payload line
            message: undefined,
        };
    }
};
SecurityCCSchemeInherit = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.SchemeInherit),
    (0, CommandClassDecorators_1.expectedCCResponse)(SecurityCCSchemeReport)
], SecurityCCSchemeInherit);
exports.SecurityCCSchemeInherit = SecurityCCSchemeInherit;
let SecurityCCNetworkKeyVerify = class SecurityCCNetworkKeyVerify extends SecurityCC {
};
SecurityCCNetworkKeyVerify = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.NetworkKeyVerify)
], SecurityCCNetworkKeyVerify);
exports.SecurityCCNetworkKeyVerify = SecurityCCNetworkKeyVerify;
let SecurityCCNetworkKeySet = class SecurityCCNetworkKeySet extends SecurityCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.networkKey.length !== 16) {
                throw new core_1.ZWaveError(`The network key must have length 16!`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.networkKey = options.networkKey;
        }
    }
    serialize() {
        this.payload = this.networkKey;
        return super.serialize();
    }
};
SecurityCCNetworkKeySet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.NetworkKeySet),
    (0, CommandClassDecorators_1.expectedCCResponse)(SecurityCCNetworkKeyVerify)
], SecurityCCNetworkKeySet);
exports.SecurityCCNetworkKeySet = SecurityCCNetworkKeySet;
let SecurityCCCommandsSupportedReport = class SecurityCCCommandsSupportedReport extends SecurityCC {
    constructor(host, options) {
        super(host, options);
        (0, core_1.validatePayload)(this.payload.length >= 1);
        this.reportsToFollow = this.payload[0];
        const list = (0, core_1.parseCCList)(this.payload.slice(1));
        this._supportedCCs = list.supportedCCs;
        this._controlledCCs = list.controlledCCs;
    }
    getPartialCCSessionId() {
        // Nothing special we can distinguish sessions with
        return {};
    }
    expectMoreMessages() {
        return this.reportsToFollow > 0;
    }
    get supportedCCs() {
        return this._supportedCCs;
    }
    get controlledCCs() {
        return this._controlledCCs;
    }
    mergePartialCCs(applHost, partials) {
        // Concat the lists of CCs
        this._supportedCCs = [...partials, this]
            .map((report) => report._supportedCCs)
            .reduce((prev, cur) => prev.concat(...cur), []);
        this._controlledCCs = [...partials, this]
            .map((report) => report._controlledCCs)
            .reduce((prev, cur) => prev.concat(...cur), []);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                reportsToFollow: this.reportsToFollow,
                supportedCCs: this._supportedCCs
                    .map((cc) => (0, core_1.getCCName)(cc))
                    .map((cc) => `\n· ${cc}`)
                    .join(""),
                controlledCCs: this._controlledCCs
                    .map((cc) => (0, core_1.getCCName)(cc))
                    .map((cc) => `\n· ${cc}`)
                    .join(""),
            },
        };
    }
};
SecurityCCCommandsSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.CommandsSupportedReport)
], SecurityCCCommandsSupportedReport);
exports.SecurityCCCommandsSupportedReport = SecurityCCCommandsSupportedReport;
let SecurityCCCommandsSupportedGet = class SecurityCCCommandsSupportedGet extends SecurityCC {
};
SecurityCCCommandsSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SecurityCommand.CommandsSupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(SecurityCCCommandsSupportedReport)
], SecurityCCCommandsSupportedGet);
exports.SecurityCCCommandsSupportedGet = SecurityCCCommandsSupportedGet;
//# sourceMappingURL=SecurityCC.js.map