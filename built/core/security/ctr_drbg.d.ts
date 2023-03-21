/*!
 * ctr-drbg.js - ctr-drbg implementation for bcrypto
 * Copyright (c) 2019, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcrypto
 *
 * Parts of this software are based on google/boringssl:
 *   https://github.com/google/boringssl
 *
 * Resources:
 *   https://csrc.nist.gov/publications/detail/sp/800-90a/archive/2012-01-23
 *   https://github.com/google/boringssl/blob/master/crypto/fipsmodule/rand/ctrdrbg.c
 *   https://github.com/google/boringssl/blob/master/crypto/fipsmodule/rand/internal.h
 *   https://github.com/openssl/openssl/blob/master/crypto/rand/drbg_lib.c
 *   https://github.com/cryptocoinjs/drbg.js/blob/master/ctr.js
 *   https://github.com/netroby/jdk9-dev/blob/master/jdk/src/java.base/share/classes/sun/security/provider/CtrDrbg.java
 */
/// <reference types="node" />
export declare class CtrDRBG {
    constructor(bits: 128, derivation: boolean, entropy?: Buffer, nonce?: Buffer, pers?: Buffer);
    /** The internal counter */
    private ctr;
    private readonly keySize;
    private readonly blkSize;
    private readonly entSize;
    private slab;
    private K;
    private V;
    private readonly derivation;
    private initialized;
    init(entropy: Buffer, nonce?: Buffer, pers?: Buffer): this;
    reseed(entropy: Buffer, add?: Buffer): this;
    private next;
    generate(len: number, add?: Buffer): Buffer;
    update(seed?: Buffer): this;
    serialize(...input: Buffer[]): Buffer;
    derive(...input: Buffer[]): Buffer;
}
//# sourceMappingURL=ctr_drbg.d.ts.map