"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Security2CC_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Security2CCCommandsSupportedGet = exports.Security2CCCommandsSupportedReport = exports.Security2CCTransferEnd = exports.Security2CCNetworkKeyVerify = exports.Security2CCNetworkKeyGet = exports.Security2CCNetworkKeyReport = exports.Security2CCPublicKeyReport = exports.Security2CCKEXFail = exports.Security2CCKEXSet = exports.Security2CCKEXGet = exports.Security2CCKEXReport = exports.Security2CCNonceGet = exports.Security2CCNonceReport = exports.Security2CCMessageEncapsulation = exports.Security2CC = exports.Security2CCAPI = void 0;
const core_1 = require("@zwave-js/core");
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const async_1 = require("alcalzone-shared/async");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Extension_1 = require("../lib/Security2/Extension");
const shared_1 = require("../lib/Security2/shared");
const _Types_1 = require("../lib/_Types");
const MultiChannelCC_1 = require("./MultiChannelCC");
const SecurityCC_1 = require("./SecurityCC");
function securityClassToBitMask(key) {
    return (0, core_1.encodeBitMask)([key], core_1.SecurityClass.S0_Legacy, core_1.SecurityClass.S2_Unauthenticated);
}
function bitMaskToSecurityClass(buffer, offset) {
    const keys = (0, core_1.parseBitMask)(buffer.slice(offset, offset + 1), core_1.SecurityClass.S2_Unauthenticated);
    (0, core_1.validatePayload)(keys.length === 1);
    return keys[0];
}
function getAuthenticationData(sendingNodeId, destination, homeId, commandLength, unencryptedPayload) {
    const ret = Buffer.allocUnsafe(8 + unencryptedPayload.length);
    ret[0] = sendingNodeId;
    ret[1] = destination;
    ret.writeUInt32BE(homeId, 2);
    ret.writeUInt16BE(commandLength, 6);
    // This includes the sequence number and all unencrypted extensions
    unencryptedPayload.copy(ret, 8, 0);
    return ret;
}
/** Validates that a sequence number is not a duplicate and updates the SPAN table if it is accepted. Returns the previous sequence number if there is one. */
function validateSequenceNumber(sequenceNumber) {
    core_1.validatePayload.withReason("Duplicate command")(!this.host.securityManager2.isDuplicateSinglecast(this.nodeId, sequenceNumber));
    // Not a duplicate, store it
    return this.host.securityManager2.storeSequenceNumber(this.nodeId, sequenceNumber);
}
function assertSecurity(options) {
    const verb = (0, CommandClass_1.gotDeserializationOptions)(options) ? "decoded" : "sent";
    if (!this.host.ownNodeId) {
        throw new core_1.ZWaveError(`Secure commands (S2) can only be ${verb} when the controller's node id is known!`, core_1.ZWaveErrorCodes.Driver_NotReady);
    }
    else if (!this.host.securityManager2) {
        throw new core_1.ZWaveError(`Secure commands (S2) can only be ${verb} when the network keys are configured!`, core_1.ZWaveErrorCodes.Driver_NoSecurity);
    }
}
const DECRYPT_ATTEMPTS = 5;
// @noValidateArgs - Encapsulation CCs are used internally and too frequently that we
// want to pay the cost of validating each call
let Security2CCAPI = class Security2CCAPI extends API_1.CCAPI {
    supportsCommand(_cmd) {
        // All commands are mandatory
        return true;
    }
    /**
     * Sends a nonce to the node, either in response to a NonceGet request or a message that failed to decrypt. The message is sent without any retransmission etc.
     * The return value indicates whether a nonce was successfully sent
     */
    async sendNonce() {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.NonceReport);
        this.assertPhysicalEndpoint(this.endpoint);
        if (!this.applHost.securityManager2) {
            throw new core_1.ZWaveError(`Nonces can only be sent if secure communication is set up!`, core_1.ZWaveErrorCodes.Driver_NoSecurity);
        }
        const receiverEI = this.applHost.securityManager2.generateNonce(this.endpoint.nodeId);
        const cc = new Security2CCNonceReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            SOS: true,
            MOS: false,
            receiverEI,
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
                // And we need to react to
            });
        }
        catch (e) {
            if ((0, core_1.isTransmissionError)(e)) {
                // The nonce could not be sent, invalidate it
                this.applHost.securityManager2.deleteNonce(this.endpoint.nodeId);
                return false;
            }
            else {
                // Pass other errors through
                throw e;
            }
        }
        return true;
    }
    /** Notifies the target node that the MPAN state is out of sync */
    async sendMOS() {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.NonceReport);
        this.assertPhysicalEndpoint(this.endpoint);
        const cc = new Security2CCNonceReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            SOS: false,
            MOS: true,
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
                return false;
            }
            else {
                // Pass other errors through
                throw e;
            }
        }
        return true;
    }
    /** Sends the given MPAN to the node */
    async sendMPAN(groupId, innerMPANState) {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.MessageEncapsulation);
        this.assertPhysicalEndpoint(this.endpoint);
        const cc = new Security2CCMessageEncapsulation(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            extensions: [
                new Extension_1.MPANExtension({
                    groupId,
                    innerMPANState,
                }),
            ],
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
                return false;
            }
            else {
                // Pass other errors through
                throw e;
            }
        }
        return true;
    }
    /**
     * Queries the securely supported commands for the current security class
     * @param securityClass Can be used to overwrite the security class to use. If this doesn't match the current one, new nonces will need to be exchanged.
     */
    async getSupportedCommands(securityClass) {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.CommandsSupportedGet);
        let cc = new Security2CCCommandsSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        // Security2CCCommandsSupportedGet is special because we cannot reply on the applHost to do the automatic
        // encapsulation because it would use a different security class. Therefore the entire possible stack
        // of encapsulation needs to be done here
        if (MultiChannelCC_1.MultiChannelCC.requiresEncapsulation(cc)) {
            cc = MultiChannelCC_1.MultiChannelCC.encapsulate(this.applHost, cc);
        }
        cc = Security2CC.encapsulate(this.applHost, cc, { securityClass });
        const response = await this.applHost.sendCommand(cc, {
            ...this.commandOptions,
            autoEncapsulate: false,
        });
        return response?.supportedCCs;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getKeyExchangeParameters() {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.KEXGet);
        const cc = new Security2CCKEXGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "requestCSA",
                "echo",
                "supportedKEXSchemes",
                "supportedECDHProfiles",
                "requestedKeys",
            ]);
        }
    }
    /** Grants the joining node the given keys */
    async grantKeys(params) {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.KEXSet);
        const cc = new Security2CCKEXSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...params,
            echo: false,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    /** Confirms the keys that were granted to a node */
    async confirmGrantedKeys(params) {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.KEXReport);
        const cc = new Security2CCKEXReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...params,
            echo: true,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    /** Notifies the other node that the ongoing key exchange was aborted */
    async abortKeyExchange(failType) {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.KEXFail);
        const cc = new Security2CCKEXFail(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            failType,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    async sendPublicKey(publicKey) {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.PublicKeyReport);
        const cc = new Security2CCPublicKeyReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            includingNode: true,
            publicKey,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    async sendNetworkKey(securityClass, networkKey) {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.NetworkKeyReport);
        const cc = new Security2CCNetworkKeyReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            grantedKey: securityClass,
            networkKey,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    async confirmKeyVerification() {
        this.assertSupportsCommand(_Types_1.Security2Command, _Types_1.Security2Command.TransferEnd);
        const cc = new Security2CCTransferEnd(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            keyVerified: true,
            keyRequestComplete: false,
        });
        await this.applHost.sendCommand(cc, {
            ...this.commandOptions,
            // Don't wait for an ACK from the node
            transmitOptions: core_1.TransmitOptions.DEFAULT & ~core_1.TransmitOptions.ACK,
        });
    }
};
Security2CCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(core_1.CommandClasses["Security 2"])
], Security2CCAPI);
exports.Security2CCAPI = Security2CCAPI;
let Security2CC = Security2CC_1 = class Security2CC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(core_1.CommandClasses["Security 2"], applHost, endpoint).withOptions({
            priority: core_1.MessagePriority.NodeQuery,
        });
        // Only on the highest security class the response includes the supported commands
        const secClass = node.getHighestSecurityClass();
        let hasReceivedSecureCommands = false;
        let possibleSecurityClasses;
        if ((0, core_1.securityClassIsS2)(secClass)) {
            // The highest security class is known to be S2, only query that one
            possibleSecurityClasses = [secClass];
        }
        else if (endpoint.index === 0) {
            // If the highest security class isn't known, query all possible security classes
            // but only on the root device
            possibleSecurityClasses = [
                core_1.SecurityClass.S2_Unauthenticated,
                core_1.SecurityClass.S2_Authenticated,
                core_1.SecurityClass.S2_AccessControl,
            ];
        }
        else {
            // For endpoint interviews, the security class MUST be known
            applHost.controllerLog.logNode(node.id, {
                endpoint: endpoint.index,
                message: `Cannot query securely supported commands for endpoint because the node's security class isn't known...`,
                level: "error",
            });
            return;
        }
        for (const secClass of possibleSecurityClasses) {
            // We might not know all assigned security classes yet, so we work our way up from low to high and try to request the supported commands.
            // This way, each command is encrypted with the security class we're currently testing.
            // If the node does not respond, it wasn't assigned the security class.
            // If it responds with a non-empty list, we know this is the highest class it supports.
            // If the list is empty, the security class is still supported.
            // If we already know the class is not supported, skip it
            if (node.hasSecurityClass(secClass) === false)
                continue;
            // If no key is configured for this security class, skip it
            if (!this.host.securityManager2?.hasKeysForSecurityClass(secClass)) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: endpoint.index,
                    message: `Cannot query securely supported commands (${(0, safe_2.getEnumMemberName)(core_1.SecurityClass, secClass)}) - network key is not configured...`,
                    level: "warn",
                });
                continue;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: endpoint.index,
                message: `Querying securely supported commands (${(0, safe_2.getEnumMemberName)(core_1.SecurityClass, secClass)})...`,
                direction: "outbound",
            });
            // Query the supported commands but avoid remembering the wrong security class in case of a failure
            let supportedCCs;
            // Try up to 3 times on the root device. We REALLY don't want a spurious timeout or collision to cause us to discard a known good security class
            const MAX_ATTEMPTS = this.endpointIndex === 0 ? 3 : 1;
            for (let attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
                try {
                    supportedCCs = await api.getSupportedCommands(secClass);
                }
                catch (e) {
                    if ((0, core_1.isZWaveError)(e) &&
                        e.code === core_1.ZWaveErrorCodes.Security2CC_CannotDecode) {
                        // Either we were using a non-granted security class,
                        // or querying with the known highest security class had an issue
                        supportedCCs = undefined;
                    }
                    else {
                        throw e;
                    }
                }
                if (supportedCCs == undefined &&
                    possibleSecurityClasses.length === 1) {
                    if (attempts < MAX_ATTEMPTS) {
                        // We definitely know the highest security class
                        applHost.controllerLog.logNode(node.id, {
                            endpoint: endpoint.index,
                            message: `Querying securely supported commands (${(0, safe_2.getEnumMemberName)(core_1.SecurityClass, secClass)}), attempt ${attempts}/${MAX_ATTEMPTS} failed. Retrying in 500ms...`,
                            level: "warn",
                        });
                        await (0, async_1.wait)(500);
                        continue;
                    }
                    else if (endpoint.index > 0) {
                        applHost.controllerLog.logNode(node.id, {
                            endpoint: endpoint.index,
                            message: `Querying securely supported commands (${(0, safe_2.getEnumMemberName)(core_1.SecurityClass, secClass)}) failed. Assuming the endpoint supports all its mandatory CCs securely...`,
                            level: "warn",
                        });
                        // Just mark all endpoint CCs as secure. Without this we would attempt
                        // unencrypted communication with the endpoint, which will likely fail.
                        for (const [ccId] of endpoint.getCCs()) {
                            endpoint.addCC(ccId, { secure: true });
                        }
                        break;
                    }
                    else {
                        applHost.controllerLog.logNode(node.id, {
                            endpoint: endpoint.index,
                            message: `Querying securely supported commands (${(0, safe_2.getEnumMemberName)(core_1.SecurityClass, secClass)}) failed. Let's hope for the best...`,
                            level: "warn",
                        });
                        break;
                    }
                }
                else {
                    // In any other case, we can stop trying
                    break;
                }
            }
            if (supportedCCs == undefined) {
                if (endpoint.index === 0 &&
                    possibleSecurityClasses.length > 1) {
                    // No supported commands found, mark the security class as not granted
                    // unless we were sure about the security class
                    node.setSecurityClass(secClass, false);
                    applHost.controllerLog.logNode(node.id, {
                        message: `The node was NOT granted the security class ${(0, safe_2.getEnumMemberName)(core_1.SecurityClass, secClass)}`,
                        direction: "inbound",
                    });
                }
                continue;
            }
            if (endpoint.index === 0 && possibleSecurityClasses.length > 1) {
                // Mark the security class as granted unless we were sure about the security class
                node.setSecurityClass(secClass, true);
                applHost.controllerLog.logNode(node.id, {
                    message: `The node was granted the security class ${(0, safe_2.getEnumMemberName)(core_1.SecurityClass, secClass)}`,
                    direction: "inbound",
                });
            }
            if (!hasReceivedSecureCommands && supportedCCs.length > 0) {
                hasReceivedSecureCommands = true;
                const logLines = [
                    `received secure commands (${(0, safe_2.getEnumMemberName)(core_1.SecurityClass, secClass)})`,
                    "supported CCs:",
                ];
                for (const cc of supportedCCs) {
                    logLines.push(`· ${(0, core_1.getCCName)(cc)}`);
                }
                applHost.controllerLog.logNode(node.id, {
                    endpoint: endpoint.index,
                    message: logLines.join("\n"),
                    direction: "inbound",
                });
                // Remember which commands are supported securely
                for (const cc of supportedCCs) {
                    endpoint.addCC(cc, {
                        isSupported: true,
                        secure: true,
                    });
                }
            }
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    /** Tests if a command should be sent secure and thus requires encapsulation */
    static requiresEncapsulation(cc) {
        // No security flag -> no encapsulation
        if (!(cc.encapsulationFlags & safe_1.EncapsulationFlags.Security)) {
            return false;
        }
        // S0 -> no S2 encapsulation
        if (cc instanceof SecurityCC_1.SecurityCC)
            return false;
        // S2: check command
        if (cc instanceof Security2CC_1) {
            // These S2 commands need additional encapsulation
            switch (cc.ccCommand) {
                case _Types_1.Security2Command.CommandsSupportedGet:
                case _Types_1.Security2Command.CommandsSupportedReport:
                case _Types_1.Security2Command.NetworkKeyGet:
                case _Types_1.Security2Command.NetworkKeyReport:
                case _Types_1.Security2Command.NetworkKeyVerify:
                case _Types_1.Security2Command.TransferEnd:
                    return true;
                case _Types_1.Security2Command.KEXSet:
                case _Types_1.Security2Command.KEXReport:
                    // KEXSet/Report need to be encrypted for the confirmation only
                    return cc
                        .echo;
                case _Types_1.Security2Command.KEXFail: {
                    switch (cc.failType) {
                        case shared_1.KEXFailType.Decrypt:
                        case shared_1.KEXFailType.WrongSecurityLevel:
                        case shared_1.KEXFailType.KeyNotGranted:
                        case shared_1.KEXFailType.NoVerify:
                            return true;
                        default:
                            return false;
                    }
                }
            }
            return false;
        }
        // Everything that's not an S0 or S2 CC needs to be encapsulated if the CC is secure
        return true;
    }
    /** Encapsulates a command that should be sent encrypted */
    static encapsulate(host, cc, options) {
        // Determine which extensions must be used on the command
        const extensions = [];
        if (options?.multicastOutOfSync) {
            extensions.push(new Extension_1.MOSExtension());
        }
        if (options?.multicastGroupId != undefined) {
            extensions.push(new Extension_1.MGRPExtension({ groupId: options.multicastGroupId }));
        }
        // Make sure that S2 multicast uses broadcasts. While the specs mention that both multicast and broadcast
        // are possible, it has been found that devices treat multicasts like singlecast followups and respond incorrectly.
        const nodeId = cc.isMulticast() ? safe_1.NODE_ID_BROADCAST : cc.nodeId;
        const ret = new Security2CCMessageEncapsulation(host, {
            nodeId,
            encapsulated: cc,
            securityClass: options?.securityClass,
            extensions,
        });
        // Copy the encapsulation flags from the encapsulated command
        // but omit Security, since we're doing that right now
        ret.encapsulationFlags =
            cc.encapsulationFlags & ~safe_1.EncapsulationFlags.Security;
        return ret;
    }
};
Security2CC = Security2CC_1 = __decorate([
    (0, CommandClassDecorators_1.commandClass)(core_1.CommandClasses["Security 2"]),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], Security2CC);
exports.Security2CC = Security2CC;
// An S2 encapsulated command may result in a NonceReport to be sent by the node if it couldn't decrypt the message
function getCCResponseForMessageEncapsulation(sent) {
    if (sent.encapsulated?.expectsCCResponse()) {
        return [
            Security2CCMessageEncapsulation,
            Security2CCNonceReport,
        ];
    }
}
function testCCResponseForMessageEncapsulation(sent, received) {
    if (received instanceof Security2CCMessageEncapsulation) {
        return "checkEncapsulated";
    }
    else {
        return received.SOS && !!received.receiverEI;
    }
}
function failNoSPAN() {
    throw core_1.validatePayload.fail(core_1.ZWaveErrorCodes.Security2CC_NoSPAN);
}
function failNoMPAN() {
    throw core_1.validatePayload.fail(core_1.ZWaveErrorCodes.Security2CC_NoMPAN);
}
let Security2CCMessageEncapsulation = class Security2CCMessageEncapsulation extends Security2CC {
    constructor(host, options) {
        super(host, options);
        // Make sure that we can send/receive secure commands
        assertSecurity.call(this, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            // Check the sequence number to avoid duplicates
            this._sequenceNumber = this.payload[0];
            const sendingNodeId = this.nodeId;
            // Ensure the node has a security class
            const securityClass = this.host.getHighestSecurityClass(sendingNodeId);
            core_1.validatePayload.withReason("No security class granted")(securityClass !== core_1.SecurityClass.None);
            const hasExtensions = !!(this.payload[1] & 0b1);
            const hasEncryptedExtensions = !!(this.payload[1] & 0b10);
            let offset = 2;
            this.extensions = [];
            const parseExtensions = (buffer) => {
                while (true) {
                    // we need to read at least the length byte
                    (0, core_1.validatePayload)(buffer.length >= offset + 1);
                    const extensionLength = Extension_1.Security2Extension.getExtensionLength(buffer.slice(offset));
                    // Parse the extension
                    const ext = Extension_1.Security2Extension.from(buffer.slice(offset, offset + extensionLength));
                    this.extensions.push(ext);
                    offset += extensionLength;
                    // Check if that was the last extension
                    if (!ext.moreToFollow)
                        break;
                }
            };
            if (hasExtensions)
                parseExtensions(this.payload);
            const ctx = (() => {
                const multicastGroupId = this.getMulticastGroupId();
                if (options.frameType === "multicast" ||
                    options.frameType === "broadcast") {
                    if (multicastGroupId == undefined) {
                        throw core_1.validatePayload.fail("Multicast frames without MGRP extension");
                    }
                    return {
                        isMulticast: true,
                        groupId: multicastGroupId,
                    };
                }
                else {
                    return { isMulticast: false, groupId: multicastGroupId };
                }
            })();
            let prevSequenceNumber;
            let mpanState;
            if (ctx.isMulticast) {
                mpanState = this.host.securityManager2.getPeerMPAN(sendingNodeId, ctx.groupId);
            }
            else {
                // Don't accept duplicate Singlecast commands
                prevSequenceNumber = validateSequenceNumber.call(this, this._sequenceNumber);
                // When a node removes a singlecast message after a multicast group was marked out of sync,
                // it must forget about the group.
                if (ctx.groupId == undefined) {
                    this.host.securityManager2.resetOutOfSyncMPANs(sendingNodeId);
                }
            }
            const unencryptedPayload = this.payload.slice(0, offset);
            const ciphertext = this.payload.slice(offset, -core_1.SECURITY_S2_AUTH_TAG_LENGTH);
            const authTag = this.payload.slice(-core_1.SECURITY_S2_AUTH_TAG_LENGTH);
            this.authTag = authTag;
            const messageLength = super.computeEncapsulationOverhead() + this.payload.length;
            const authData = getAuthenticationData(sendingNodeId, this.getDestinationIDRX(), this.host.homeId, messageLength, unencryptedPayload);
            let decrypt;
            if (ctx.isMulticast) {
                // For incoming multicast commands, make sure we have an MPAN
                if (mpanState?.type !== core_1.MPANState.MPAN) {
                    // If we don't, mark the MPAN as out of sync, so we can respond accordingly on the singlecast followup
                    this.host.securityManager2.storePeerMPAN(sendingNodeId, ctx.groupId, { type: core_1.MPANState.OutOfSync });
                    throw failNoMPAN();
                }
                decrypt = () => this.decryptMulticast(sendingNodeId, ctx.groupId, ciphertext, authData, authTag);
            }
            else {
                // Decrypt payload and verify integrity
                const spanState = this.host.securityManager2.getSPANState(sendingNodeId);
                // If we are not able to establish an SPAN yet, fail the decryption
                if (spanState.type === core_1.SPANState.None) {
                    throw failNoSPAN();
                }
                else if (spanState.type === core_1.SPANState.RemoteEI) {
                    // TODO: The specs are not clear how to handle this case
                    // For now, do the same as if we didn't have any EI
                    throw failNoSPAN();
                }
                decrypt = () => this.decryptSinglecast(sendingNodeId, prevSequenceNumber, ciphertext, authData, authTag, securityClass, spanState);
            }
            let plaintext;
            let authOK = false;
            let key;
            let iv;
            // If the Receiver is unable to authenticate the singlecast message with the current SPAN,
            // the Receiver SHOULD try decrypting the message with one or more of the following SPAN values,
            // stopping when decryption is successful or the maximum number of iterations is reached.
            for (let i = 0; i < DECRYPT_ATTEMPTS; i++) {
                ({ plaintext, authOK, key, iv } = decrypt());
                if (!!authOK && !!plaintext)
                    break;
            }
            // If authentication fails, do so with an error code that instructs the
            // applHost to tell the node we have no nonce
            if (!authOK || !plaintext) {
                if (ctx.isMulticast) {
                    // Mark the MPAN as out of sync
                    this.host.securityManager2.storePeerMPAN(sendingNodeId, ctx.groupId, { type: core_1.MPANState.OutOfSync });
                    throw core_1.validatePayload.fail(core_1.ZWaveErrorCodes.Security2CC_CannotDecodeMulticast);
                }
                else {
                    throw core_1.validatePayload.fail(core_1.ZWaveErrorCodes.Security2CC_CannotDecode);
                }
            }
            else if (!ctx.isMulticast && ctx.groupId != undefined) {
                // After reception of a singlecast followup, the MPAN state must be increased
                this.host.securityManager2.tryIncrementPeerMPAN(sendingNodeId, ctx.groupId);
            }
            offset = 0;
            if (hasEncryptedExtensions)
                parseExtensions(plaintext);
            // Not every S2 message includes an encapsulated CC
            const decryptedCCBytes = plaintext.slice(offset);
            if (decryptedCCBytes.length > 0) {
                // make sure this contains a complete CC command that's worth splitting
                (0, core_1.validatePayload)(decryptedCCBytes.length >= 2);
                // and deserialize the CC
                this.encapsulated = CommandClass_1.CommandClass.from(this.host, {
                    data: decryptedCCBytes,
                    fromEncapsulation: true,
                    encapCC: this,
                    frameType: options.frameType,
                });
            }
            this.key = key;
            this.iv = iv;
        }
        else {
            if (!options.encapsulated && !options.extensions?.length) {
                throw new core_1.ZWaveError("Security S2 encapsulation requires an encapsulated CC and/or extensions", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this._securityClass = options.securityClass;
            if (options.encapsulated) {
                this.encapsulated = options.encapsulated;
                options.encapsulated.encapsulatingCC = this;
            }
            this.extensions = options.extensions ?? [];
            if (typeof this.nodeId !== "number" &&
                !this.extensions.some((e) => e instanceof Extension_1.MGRPExtension)) {
                throw new core_1.ZWaveError("Multicast Security S2 encapsulation requires the MGRP extension", core_1.ZWaveErrorCodes.Security2CC_MissingExtension);
            }
        }
    }
    /**
     * Return the sequence number of this command.
     *
     * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
     * When sending messages, this should only happen immediately before serializing.
     */
    get sequenceNumber() {
        if (this._sequenceNumber == undefined) {
            if (this.isSinglecast()) {
                this._sequenceNumber =
                    this.host.securityManager2.nextSequenceNumber(this.nodeId);
            }
            else {
                const groupId = this.getDestinationIDTX();
                return this.host.securityManager2.nextMulticastSequenceNumber(groupId);
            }
        }
        return this._sequenceNumber;
    }
    prepareRetransmission() {
        super.prepareRetransmission();
        this._sequenceNumber = undefined;
    }
    getDestinationIDTX() {
        if (this.isSinglecast())
            return this.nodeId;
        const mgrpExtension = this.extensions.find((e) => e instanceof Extension_1.MGRPExtension);
        if (mgrpExtension)
            return mgrpExtension.groupId;
        throw new core_1.ZWaveError("Multicast Security S2 encapsulation requires the MGRP extension", core_1.ZWaveErrorCodes.Security2CC_MissingExtension);
    }
    getDestinationIDRX() {
        return this.getMulticastGroupId() ?? this.host.ownNodeId;
    }
    getMGRPExtension() {
        return this.extensions.find((e) => e instanceof Extension_1.MGRPExtension);
    }
    getMulticastGroupId() {
        const mgrpExtension = this.getMGRPExtension();
        return mgrpExtension?.groupId;
    }
    hasMOSExtension() {
        return this.extensions.some((e) => e instanceof Extension_1.MOSExtension);
    }
    /** Returns the Sender's Entropy Input if this command contains an SPAN extension */
    getSenderEI() {
        const spanExtension = this.extensions.find((e) => e instanceof Extension_1.SPANExtension);
        return spanExtension?.senderEI;
    }
    maybeAddSPANExtension() {
        if (!this.isSinglecast())
            return;
        const receiverNodeId = this.nodeId;
        const spanState = this.host.securityManager2.getSPANState(receiverNodeId);
        if (spanState.type === core_1.SPANState.None ||
            spanState.type === core_1.SPANState.LocalEI) {
            // Can't do anything here if we don't have the receiver's EI
            throw new core_1.ZWaveError(`Security S2 CC requires the receiver's nonce to be sent!`, core_1.ZWaveErrorCodes.Security2CC_NoSPAN);
        }
        else if (spanState.type === core_1.SPANState.RemoteEI) {
            // We have the receiver's EI, generate our input and send it over
            // With both, we can create an SPAN
            const senderEI = this.host.securityManager2.generateNonce(undefined);
            const receiverEI = spanState.receiverEI;
            // While bootstrapping a node, the controller only sends commands encrypted
            // with the temporary key
            if (this.host.securityManager2.tempKeys.has(receiverNodeId)) {
                this.host.securityManager2.initializeTempSPAN(receiverNodeId, senderEI, receiverEI);
            }
            else {
                const securityClass = this._securityClass ??
                    this.host.getHighestSecurityClass(receiverNodeId);
                if (securityClass == undefined) {
                    throw new core_1.ZWaveError("No security class defined for this command!", core_1.ZWaveErrorCodes.Security2CC_NoSPAN);
                }
                this.host.securityManager2.initializeSPAN(receiverNodeId, securityClass, senderEI, receiverEI);
            }
            // Add or update the SPAN extension
            let spanExtension = this.extensions.find((e) => e instanceof Extension_1.SPANExtension);
            if (spanExtension) {
                spanExtension.senderEI = senderEI;
            }
            else {
                spanExtension = new Extension_1.SPANExtension({ senderEI });
                this.extensions.push(spanExtension);
            }
        }
    }
    serialize() {
        // Include Sender EI in the command if we only have the receiver's EI
        this.maybeAddSPANExtension();
        const unencryptedExtensions = this.extensions.filter((e) => !e.isEncrypted());
        const encryptedExtensions = this.extensions.filter((e) => e.isEncrypted());
        const unencryptedPayload = Buffer.concat([
            Buffer.from([
                this.sequenceNumber,
                (encryptedExtensions.length > 0 ? 0b10 : 0) |
                    (unencryptedExtensions.length > 0 ? 1 : 0),
            ]),
            ...unencryptedExtensions.map((e, index) => e.serialize(index < unencryptedExtensions.length - 1)),
        ]);
        const serializedCC = this.encapsulated?.serialize() ?? Buffer.from([]);
        const plaintextPayload = Buffer.concat([
            ...encryptedExtensions.map((e, index) => e.serialize(index < encryptedExtensions.length - 1)),
            serializedCC,
        ]);
        // Generate the authentication data for CCM encryption
        const destinationTag = this.getDestinationIDTX();
        const messageLength = this.computeEncapsulationOverhead() + serializedCC.length;
        const authData = getAuthenticationData(this.host.ownNodeId, destinationTag, this.host.homeId, messageLength, unencryptedPayload);
        let key;
        let iv;
        if (this.isSinglecast()) {
            // Singlecast:
            // Generate a nonce for encryption, and remember it to attempt decryption
            // of potential in-flight messages from the target node.
            iv = this.host.securityManager2.nextNonce(this.nodeId, true);
            const { keyCCM } = 
            // Prefer the overridden security class if it was given
            this._securityClass != undefined
                ? this.host.securityManager2.getKeysForSecurityClass(this._securityClass)
                : this.host.securityManager2.getKeysForNode(this.nodeId);
            key = keyCCM;
        }
        else {
            // Multicast:
            const keyAndIV = this.host.securityManager2.getMulticastKeyAndIV(destinationTag);
            key = keyAndIV.key;
            iv = keyAndIV.iv;
        }
        const { ciphertext: ciphertextPayload, authTag } = (0, core_1.encryptAES128CCM)(key, iv, plaintextPayload, authData, core_1.SECURITY_S2_AUTH_TAG_LENGTH);
        // Remember key and IV for debugging purposes
        this.key = key;
        this.iv = iv;
        this.authData = authData;
        this.authTag = authTag;
        this.ciphertext = ciphertextPayload;
        this.payload = Buffer.concat([
            unencryptedPayload,
            ciphertextPayload,
            authTag,
        ]);
        return super.serialize();
    }
    computeEncapsulationOverhead() {
        // Security S2 adds:
        // * 1 byte sequence number
        // * 1 byte control
        // * N bytes extensions
        // * SECURITY_S2_AUTH_TAG_LENGTH bytes auth tag
        const extensionBytes = this.extensions
            .map((e) => e.computeLength())
            .reduce((a, b) => a + b, 0);
        return (super.computeEncapsulationOverhead() +
            2 +
            core_1.SECURITY_S2_AUTH_TAG_LENGTH +
            extensionBytes);
    }
    toLogEntry(applHost) {
        const message = {
            "sequence number": this.sequenceNumber,
        };
        if (this.extensions.length > 0) {
            message.extensions = this.extensions
                .map((e) => e.toLogEntry())
                .join("");
        }
        // Log the used keys in integration tests
        if (process.env.NODE_ENV === "test" ||
            process.env.NODE_ENV === "development") {
            if (this.key) {
                message.key = (0, safe_2.buffer2hex)(this.key);
            }
            if (this.iv) {
                message.IV = (0, safe_2.buffer2hex)(this.iv);
            }
            if (this.ciphertext) {
                message.ciphertext = (0, safe_2.buffer2hex)(this.ciphertext);
            }
            if (this.authData) {
                message["auth data"] = (0, safe_2.buffer2hex)(this.authData);
            }
            if (this.authTag) {
                message["auth tag"] = (0, safe_2.buffer2hex)(this.authTag);
            }
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
    decryptSinglecast(sendingNodeId, prevSequenceNumber, ciphertext, authData, authTag, securityClass, spanState) {
        const decryptWithNonce = (nonce) => {
            const { keyCCM: key } = this.host.securityManager2.getKeysForNode(sendingNodeId);
            const iv = nonce;
            return {
                key,
                iv,
                ...(0, core_1.decryptAES128CCM)(key, iv, ciphertext, authData, authTag),
            };
        };
        const getNonceAndDecrypt = () => {
            const iv = this.host.securityManager2.nextNonce(sendingNodeId);
            return decryptWithNonce(iv);
        };
        if (spanState.type === core_1.SPANState.SPAN) {
            // There SHOULD be a shared SPAN between both parties. But experience has shown that both could have
            // sent a command at roughly the same time, using the same SPAN for encryption.
            // To avoid a nasty desync and both nodes trying to resync at the same time, causing message loss,
            // we accept commands encrypted with the previous SPAN under very specific circumstances:
            if (
            // The previous SPAN is still known, i.e. the node didn't send another command that was successfully decrypted
            !!spanState.currentSPAN &&
                // it is still valid
                spanState.currentSPAN.expires > (0, core_1.highResTimestamp)() &&
                // The received command is exactly the next, expected one
                prevSequenceNumber != undefined &&
                this["_sequenceNumber"] === ((prevSequenceNumber + 1) & 0xff) &&
                // And in case of a mock-based test, do this only on the controller
                !this.host.__internalIsMockNode) {
                const nonce = spanState.currentSPAN.nonce;
                spanState.currentSPAN = undefined;
                return decryptWithNonce(nonce);
            }
            else {
                // forgetting the current SPAN shouldn't be necessary but better be safe than sorry
                spanState.currentSPAN = undefined;
            }
            // This can only happen if the security class is known
            return getNonceAndDecrypt();
        }
        else if (spanState.type === core_1.SPANState.LocalEI) {
            // We've sent the other our receiver's EI and received its sender's EI,
            // meaning we can now establish an SPAN
            const senderEI = this.getSenderEI();
            if (!senderEI)
                throw failNoSPAN();
            const receiverEI = spanState.receiverEI;
            // How we do this depends on whether we know the security class of the other node
            if (this.host.securityManager2.tempKeys.has(sendingNodeId)) {
                // We're currently bootstrapping the node, it might be using a temporary key
                this.host.securityManager2.initializeTempSPAN(sendingNodeId, senderEI, receiverEI);
                const ret = getNonceAndDecrypt();
                // Decryption with the temporary key worked
                if (ret.authOK)
                    return ret;
                // Reset the SPAN state and try with the recently granted security class
                this.host.securityManager2.setSPANState(sendingNodeId, spanState);
            }
            if (securityClass != undefined) {
                this.host.securityManager2.initializeSPAN(sendingNodeId, securityClass, senderEI, receiverEI);
                return getNonceAndDecrypt();
            }
            else {
                // Not knowing it can happen if we just took over an existing network
                // Try multiple security classes
                const possibleSecurityClasses = core_1.securityClassOrder
                    .filter((s) => (0, core_1.securityClassIsS2)(s))
                    .filter((s) => this.host.hasSecurityClass(sendingNodeId, s) !==
                    false);
                for (const secClass of possibleSecurityClasses) {
                    // Initialize an SPAN with that security class
                    this.host.securityManager2.initializeSPAN(sendingNodeId, secClass, senderEI, receiverEI);
                    const ret = getNonceAndDecrypt();
                    // It worked, return the result and remember the security class
                    if (ret.authOK) {
                        this.host.setSecurityClass(sendingNodeId, secClass, true);
                        return ret;
                    }
                    // Reset the SPAN state and try with the next security class
                    this.host.securityManager2.setSPANState(sendingNodeId, spanState);
                }
            }
        }
        // Nothing worked, fail the decryption
        return { plaintext: Buffer.from([]), authOK: false };
    }
    decryptMulticast(sendingNodeId, groupId, ciphertext, authData, authTag) {
        const iv = this.host.securityManager2.nextPeerMPAN(sendingNodeId, groupId);
        const { keyCCM: key } = this.host.securityManager2.getKeysForNode(sendingNodeId);
        return {
            key,
            iv,
            ...(0, core_1.decryptAES128CCM)(key, iv, ciphertext, authData, authTag),
        };
    }
};
Security2CCMessageEncapsulation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.MessageEncapsulation),
    (0, CommandClassDecorators_1.expectedCCResponse)(getCCResponseForMessageEncapsulation, testCCResponseForMessageEncapsulation)
], Security2CCMessageEncapsulation);
exports.Security2CCMessageEncapsulation = Security2CCMessageEncapsulation;
let Security2CCNonceReport = class Security2CCNonceReport extends Security2CC {
    constructor(host, options) {
        super(host, options);
        // Make sure that we can send/receive secure commands
        assertSecurity.call(this, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this._sequenceNumber = this.payload[0];
            // Don't accept duplicate commands
            validateSequenceNumber.call(this, this._sequenceNumber);
            this.MOS = !!(this.payload[1] & 0b10);
            this.SOS = !!(this.payload[1] & 0b1);
            (0, core_1.validatePayload)(this.MOS || this.SOS);
            if (this.SOS) {
                // If the SOS flag is set, the REI field MUST be included in the command
                (0, core_1.validatePayload)(this.payload.length >= 18);
                this.receiverEI = this.payload.slice(2, 18);
                // In that case we also need to store it, so the next sent command
                // can use it for encryption
                this.host.securityManager2.storeRemoteEI(this.nodeId, this.receiverEI);
            }
        }
        else {
            this.SOS = options.SOS;
            this.MOS = options.MOS;
            if (options.SOS)
                this.receiverEI = options.receiverEI;
        }
    }
    /**
     * Return the sequence number of this command.
     *
     * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
     * When sending messages, this should only happen immediately before serializing.
     */
    get sequenceNumber() {
        if (this._sequenceNumber == undefined) {
            this._sequenceNumber =
                this.host.securityManager2.nextSequenceNumber(this.nodeId);
        }
        return this._sequenceNumber;
    }
    serialize() {
        this.payload = Buffer.from([
            this.sequenceNumber,
            (this.MOS ? 0b10 : 0) + (this.SOS ? 0b1 : 0),
        ]);
        if (this.SOS) {
            this.payload = Buffer.concat([this.payload, this.receiverEI]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "sequence number": this.sequenceNumber,
            SOS: this.SOS,
            MOS: this.MOS,
        };
        if (this.receiverEI) {
            message["receiver entropy"] = (0, safe_2.buffer2hex)(this.receiverEI);
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
Security2CCNonceReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.NonceReport)
], Security2CCNonceReport);
exports.Security2CCNonceReport = Security2CCNonceReport;
let Security2CCNonceGet = class Security2CCNonceGet extends Security2CC {
    constructor(host, options) {
        super(host, options);
        // Make sure that we can send/receive secure commands
        assertSecurity.call(this, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this._sequenceNumber = this.payload[0];
            // Don't accept duplicate commands
            validateSequenceNumber.call(this, this._sequenceNumber);
        }
        else {
            // No options here
        }
    }
    /**
     * Return the sequence number of this command.
     *
     * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
     * When sending messages, this should only happen immediately before serializing.
     */
    get sequenceNumber() {
        if (this._sequenceNumber == undefined) {
            this._sequenceNumber =
                this.host.securityManager2.nextSequenceNumber(this.nodeId);
        }
        return this._sequenceNumber;
    }
    serialize() {
        this.payload = Buffer.from([this.sequenceNumber]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "sequence number": this.sequenceNumber },
        };
    }
};
Security2CCNonceGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.NonceGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(Security2CCNonceReport)
], Security2CCNonceGet);
exports.Security2CCNonceGet = Security2CCNonceGet;
let Security2CCKEXReport = class Security2CCKEXReport extends Security2CC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 4);
            this.requestCSA = !!(this.payload[0] & 0b10);
            this.echo = !!(this.payload[0] & 0b1);
            // The bit mask starts at 0, but bit 0 is not used
            this.supportedKEXSchemes = (0, core_1.parseBitMask)(this.payload.slice(1, 2), 0).filter((s) => s !== 0);
            this.supportedECDHProfiles = (0, core_1.parseBitMask)(this.payload.slice(2, 3), shared_1.ECDHProfiles.Curve25519);
            this.requestedKeys = (0, core_1.parseBitMask)(this.payload.slice(3, 4), core_1.SecurityClass.S2_Unauthenticated);
        }
        else {
            this.requestCSA = options.requestCSA;
            this.echo = options.echo;
            this.supportedKEXSchemes = options.supportedKEXSchemes;
            this.supportedECDHProfiles = options.supportedECDHProfiles;
            this.requestedKeys = options.requestedKeys;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([(this.requestCSA ? 0b10 : 0) + (this.echo ? 0b1 : 0)]),
            // The bit mask starts at 0, but bit 0 is not used
            (0, core_1.encodeBitMask)(this.supportedKEXSchemes, 7, 0),
            (0, core_1.encodeBitMask)(this.supportedECDHProfiles, 7, shared_1.ECDHProfiles.Curve25519),
            (0, core_1.encodeBitMask)(this.requestedKeys, core_1.SecurityClass.S0_Legacy, core_1.SecurityClass.S2_Unauthenticated),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                echo: this.echo,
                "supported schemes": this.supportedKEXSchemes
                    .map((s) => `\n· ${(0, safe_2.getEnumMemberName)(shared_1.KEXSchemes, s)}`)
                    .join(""),
                "supported ECDH profiles": this.supportedECDHProfiles
                    .map((s) => `\n· ${(0, safe_2.getEnumMemberName)(shared_1.ECDHProfiles, s)}`)
                    .join(""),
                "CSA requested": this.requestCSA,
                "requested security classes": this.requestedKeys
                    .map((s) => `\n· ${(0, safe_2.getEnumMemberName)(core_1.SecurityClass, s)}`)
                    .join(""),
            },
        };
    }
};
Security2CCKEXReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.KEXReport)
], Security2CCKEXReport);
exports.Security2CCKEXReport = Security2CCKEXReport;
let Security2CCKEXGet = class Security2CCKEXGet extends Security2CC {
};
Security2CCKEXGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.KEXGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(Security2CCKEXReport)
], Security2CCKEXGet);
exports.Security2CCKEXGet = Security2CCKEXGet;
let Security2CCKEXSet = class Security2CCKEXSet extends Security2CC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 4);
            this.permitCSA = !!(this.payload[0] & 0b10);
            this.echo = !!(this.payload[0] & 0b1);
            // The bit mask starts at 0, but bit 0 is not used
            const selectedKEXSchemes = (0, core_1.parseBitMask)(this.payload.slice(1, 2), 0).filter((s) => s !== 0);
            (0, core_1.validatePayload)(selectedKEXSchemes.length === 1);
            this.selectedKEXScheme = selectedKEXSchemes[0];
            const selectedECDHProfiles = (0, core_1.parseBitMask)(this.payload.slice(2, 3), shared_1.ECDHProfiles.Curve25519);
            (0, core_1.validatePayload)(selectedECDHProfiles.length === 1);
            this.selectedECDHProfile = selectedECDHProfiles[0];
            this.grantedKeys = (0, core_1.parseBitMask)(this.payload.slice(3, 4), core_1.SecurityClass.S2_Unauthenticated);
        }
        else {
            this.permitCSA = options.permitCSA;
            this.echo = options.echo;
            this.selectedKEXScheme = options.selectedKEXScheme;
            this.selectedECDHProfile = options.selectedECDHProfile;
            this.grantedKeys = options.grantedKeys;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([(this.permitCSA ? 0b10 : 0) + (this.echo ? 0b1 : 0)]),
            // The bit mask starts at 0, but bit 0 is not used
            (0, core_1.encodeBitMask)([this.selectedKEXScheme], 7, 0),
            (0, core_1.encodeBitMask)([this.selectedECDHProfile], 7, shared_1.ECDHProfiles.Curve25519),
            (0, core_1.encodeBitMask)(this.grantedKeys, core_1.SecurityClass.S0_Legacy, core_1.SecurityClass.S2_Unauthenticated),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                echo: this.echo,
                "selected scheme": (0, safe_2.getEnumMemberName)(shared_1.KEXSchemes, this.selectedKEXScheme),
                "selected ECDH profile": (0, safe_2.getEnumMemberName)(shared_1.ECDHProfiles, this.selectedECDHProfile),
                "CSA permitted": this.permitCSA,
                "granted security classes": this.grantedKeys
                    .map((s) => `\n· ${(0, safe_2.getEnumMemberName)(core_1.SecurityClass, s)}`)
                    .join(""),
            },
        };
    }
};
Security2CCKEXSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.KEXSet)
], Security2CCKEXSet);
exports.Security2CCKEXSet = Security2CCKEXSet;
let Security2CCKEXFail = class Security2CCKEXFail extends Security2CC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.failType = this.payload[0];
        }
        else {
            this.failType = options.failType;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.failType]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { reason: (0, safe_2.getEnumMemberName)(shared_1.KEXFailType, this.failType) },
        };
    }
};
Security2CCKEXFail = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.KEXFail)
], Security2CCKEXFail);
exports.Security2CCKEXFail = Security2CCKEXFail;
let Security2CCPublicKeyReport = class Security2CCPublicKeyReport extends Security2CC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 17);
            this.includingNode = !!(this.payload[0] & 0b1);
            this.publicKey = this.payload.slice(1);
        }
        else {
            this.includingNode = options.includingNode;
            this.publicKey = options.publicKey;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.includingNode ? 1 : 0]),
            this.publicKey,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "is including node": this.includingNode,
                "public key": (0, safe_2.buffer2hex)(this.publicKey),
            },
        };
    }
};
Security2CCPublicKeyReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.PublicKeyReport)
], Security2CCPublicKeyReport);
exports.Security2CCPublicKeyReport = Security2CCPublicKeyReport;
let Security2CCNetworkKeyReport = class Security2CCNetworkKeyReport extends Security2CC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.grantedKey = options.grantedKey;
            this.networkKey = options.networkKey;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            securityClassToBitMask(this.grantedKey),
            this.networkKey,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "security class": (0, safe_2.getEnumMemberName)(core_1.SecurityClass, this.grantedKey),
                // This shouldn't be logged, so users can safely post their logs online
                // "network key": buffer2hex(this.networkKey),
            },
        };
    }
};
Security2CCNetworkKeyReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.NetworkKeyReport)
], Security2CCNetworkKeyReport);
exports.Security2CCNetworkKeyReport = Security2CCNetworkKeyReport;
let Security2CCNetworkKeyGet = class Security2CCNetworkKeyGet extends Security2CC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.requestedKey = bitMaskToSecurityClass(this.payload, 0);
        }
        else {
            this.requestedKey = options.requestedKey;
        }
    }
    serialize() {
        this.payload = securityClassToBitMask(this.requestedKey);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "security class": (0, safe_2.getEnumMemberName)(core_1.SecurityClass, this.requestedKey),
            },
        };
    }
};
Security2CCNetworkKeyGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.NetworkKeyGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(Security2CCNetworkKeyReport)
], Security2CCNetworkKeyGet);
exports.Security2CCNetworkKeyGet = Security2CCNetworkKeyGet;
let Security2CCNetworkKeyVerify = class Security2CCNetworkKeyVerify extends Security2CC {
};
Security2CCNetworkKeyVerify = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.NetworkKeyVerify)
], Security2CCNetworkKeyVerify);
exports.Security2CCNetworkKeyVerify = Security2CCNetworkKeyVerify;
let Security2CCTransferEnd = class Security2CCTransferEnd extends Security2CC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.keyVerified = !!(this.payload[0] & 0b10);
            this.keyRequestComplete = !!(this.payload[0] & 0b1);
        }
        else {
            this.keyVerified = options.keyVerified;
            this.keyRequestComplete = options.keyRequestComplete;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            (this.keyVerified ? 0b10 : 0) + (this.keyRequestComplete ? 0b1 : 0),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "key verified": this.keyVerified,
                "request complete": this.keyRequestComplete,
            },
        };
    }
};
Security2CCTransferEnd = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.TransferEnd)
], Security2CCTransferEnd);
exports.Security2CCTransferEnd = Security2CCTransferEnd;
let Security2CCCommandsSupportedReport = class Security2CCCommandsSupportedReport extends Security2CC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            const CCs = (0, core_1.parseCCList)(this.payload);
            // SDS13783: A sending node MAY terminate the list of supported command classes with the
            // COMMAND_CLASS_MARK command class identifier.
            // A receiving node MUST stop parsing the list of supported command classes if it detects the
            // COMMAND_CLASS_MARK command class identifier in the Security 2 Commands Supported Report
            this.supportedCCs = CCs.supportedCCs;
        }
        else {
            this.supportedCCs = options.supportedCCs;
        }
    }
    serialize() {
        this.payload = (0, safe_1.encodeCCList)(this.supportedCCs, []);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                supportedCCs: this.supportedCCs
                    .map((cc) => (0, core_1.getCCName)(cc))
                    .map((cc) => `\n· ${cc}`)
                    .join(""),
            },
        };
    }
};
Security2CCCommandsSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.CommandsSupportedReport)
], Security2CCCommandsSupportedReport);
exports.Security2CCCommandsSupportedReport = Security2CCCommandsSupportedReport;
let Security2CCCommandsSupportedGet = class Security2CCCommandsSupportedGet extends Security2CC {
};
Security2CCCommandsSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.Security2Command.CommandsSupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(Security2CCCommandsSupportedReport)
], Security2CCCommandsSupportedGet);
exports.Security2CCCommandsSupportedGet = Security2CCCommandsSupportedGet;
//# sourceMappingURL=Security2CC.js.map