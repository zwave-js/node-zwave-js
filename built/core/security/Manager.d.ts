/** Management class and utils for Security S0 */
/// <reference types="node" />
export declare function generateAuthKey(networkKey: Buffer): Buffer;
export declare function generateEncryptionKey(networkKey: Buffer): Buffer;
interface NonceKey {
    /** The node that has created this nonce */
    issuer: number;
    nonceId: number;
}
interface NonceEntry {
    nonce: Buffer;
    /** The node this nonce was created for */
    receiver: number;
}
export interface SecurityManagerOptions {
    networkKey: Buffer;
    ownNodeId: number;
    nonceTimeout: number;
}
export interface SetNonceOptions {
    free?: boolean;
}
export declare class SecurityManager {
    constructor(options: SecurityManagerOptions);
    private ownNodeId;
    private nonceTimeout;
    private _networkKey;
    get networkKey(): Buffer;
    set networkKey(v: Buffer);
    private _authKey;
    get authKey(): Buffer;
    private _encryptionKey;
    get encryptionKey(): Buffer;
    private _nonceStore;
    private _freeNonceIDs;
    private _nonceTimers;
    private normalizeId;
    /** Generates a nonce for the current node */
    generateNonce(receiver: number, length: number): Buffer;
    getNonceId(nonce: Buffer): number;
    setNonce(id: number | NonceKey, entry: NonceEntry, { free }?: SetNonceOptions): void;
    /** Deletes ALL nonces that were issued for a given node */
    deleteAllNoncesForReceiver(receiver: number): void;
    deleteNonce(id: number | NonceKey): void;
    private deleteNonceInternal;
    private expireNonce;
    getNonce(id: number | NonceKey): Buffer | undefined;
    hasNonce(id: number | NonceKey): boolean;
    getFreeNonce(nodeId: number): Buffer | undefined;
}
export {};
//# sourceMappingURL=Manager.d.ts.map