"use strict";
/** Management class and utils for Security S0 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityManager = exports.generateEncryptionKey = exports.generateAuthKey = void 0;
const crypto_1 = require("crypto");
const ZWaveError_1 = require("../error/ZWaveError");
const crypto_2 = require("./crypto");
const authKeyBase = Buffer.alloc(16, 0x55);
const encryptionKeyBase = Buffer.alloc(16, 0xaa);
function generateAuthKey(networkKey) {
    return (0, crypto_2.encryptAES128ECB)(authKeyBase, networkKey);
}
exports.generateAuthKey = generateAuthKey;
function generateEncryptionKey(networkKey) {
    return (0, crypto_2.encryptAES128ECB)(encryptionKeyBase, networkKey);
}
exports.generateEncryptionKey = generateEncryptionKey;
class SecurityManager {
    constructor(options) {
        this._nonceStore = new Map();
        this._freeNonceIDs = new Set();
        this._nonceTimers = new Map();
        this.networkKey = options.networkKey;
        this.ownNodeId = options.ownNodeId;
        this.nonceTimeout = options.nonceTimeout;
    }
    get networkKey() {
        return this._networkKey;
    }
    set networkKey(v) {
        if (v.length !== 16) {
            throw new ZWaveError_1.ZWaveError(`The network key must be 16 bytes long!`, ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
        }
        this._networkKey = v;
        this._authKey = generateAuthKey(this._networkKey);
        this._encryptionKey = generateEncryptionKey(this._networkKey);
    }
    get authKey() {
        return this._authKey;
    }
    get encryptionKey() {
        return this._encryptionKey;
    }
    normalizeId(id) {
        let ret;
        if (typeof id === "number") {
            ret = {
                issuer: this.ownNodeId,
                nonceId: id,
            };
        }
        else {
            ret = {
                issuer: id.issuer,
                nonceId: id.nonceId,
            };
        }
        return JSON.stringify(ret);
    }
    /** Generates a nonce for the current node */
    generateNonce(receiver, length) {
        let nonce;
        let nonceId;
        do {
            nonce = (0, crypto_1.randomBytes)(length);
            nonceId = this.getNonceId(nonce);
        } while (this.hasNonce(nonceId));
        this.setNonce(nonceId, { receiver, nonce }, { free: false });
        return nonce;
    }
    getNonceId(nonce) {
        return nonce[0];
    }
    setNonce(id, entry, { free = true } = {}) {
        const key = this.normalizeId(id);
        if (this._nonceTimers.has(key)) {
            clearTimeout(this._nonceTimers.get(key));
        }
        this._nonceStore.set(key, entry);
        if (free)
            this._freeNonceIDs.add(key);
        this._nonceTimers.set(key, setTimeout(() => {
            this.expireNonce(key);
        }, this.nonceTimeout).unref());
    }
    /** Deletes ALL nonces that were issued for a given node */
    deleteAllNoncesForReceiver(receiver) {
        for (const [key, entry] of this._nonceStore) {
            if (entry.receiver === receiver) {
                this.deleteNonceInternal(key);
            }
        }
    }
    deleteNonce(id) {
        const key = this.normalizeId(id);
        const nonceReceiver = this._nonceStore.get(key)?.receiver;
        // Delete the nonce that was requested to be deleted
        this.deleteNonceInternal(key);
        // And all others for the same receiver aswell
        if (nonceReceiver) {
            this.deleteAllNoncesForReceiver(nonceReceiver);
        }
    }
    deleteNonceInternal(key) {
        if (this._nonceTimers.has(key)) {
            clearTimeout(this._nonceTimers.get(key));
        }
        this._nonceStore.delete(key);
        this._nonceTimers.delete(key);
        this._freeNonceIDs.delete(key);
    }
    expireNonce(key) {
        this.deleteNonceInternal(key);
    }
    getNonce(id) {
        return this._nonceStore.get(this.normalizeId(id))?.nonce;
    }
    hasNonce(id) {
        return this._nonceStore.has(this.normalizeId(id));
    }
    getFreeNonce(nodeId) {
        // Iterate through the known free nonce IDs to find one for the given node
        for (const key of this._freeNonceIDs) {
            const nonceKey = JSON.parse(key);
            if (nonceKey.issuer === nodeId) {
                this._freeNonceIDs.delete(key);
                return this._nonceStore.get(key)?.nonce;
            }
        }
    }
}
exports.SecurityManager = SecurityManager;
//# sourceMappingURL=Manager.js.map