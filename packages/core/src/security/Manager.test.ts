import { isUint8Array } from "@zwave-js/shared";
import { randomBytes } from "node:crypto";
import sinon from "sinon";
import { test, vi } from "vitest";
import { SecurityManager } from "./Manager.js";

const networkKey = Uint8Array.from([
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	12,
	13,
	14,
	15,
	16,
]);
const ownNodeId = 1;
const options = { networkKey, ownNodeId, nonceTimeout: 500 };

vi.mock("node:crypto", async () => {
	const originalCrypto = await vi.importActual("node:crypto");
	return {
		...originalCrypto,
	};
});

test("constructor() -> should set the network key, auth key and encryption key", async (t) => {
	const man = new SecurityManager(options);
	t.expect(man.networkKey).toStrictEqual(networkKey);
	const authKey = await man.getAuthKey();
	const encryptionKey = await man.getEncryptionKey();
	t.expect(isUint8Array(authKey)).toBe(true);
	t.expect(authKey).toHaveLength(16);
	t.expect(isUint8Array(encryptionKey)).toBe(true);
	t.expect(encryptionKey).toHaveLength(16);
});

test("constructor() -> should throw if the network key doesn't have length 16", (t) => {
	t.expect(
		() =>
			new SecurityManager({
				networkKey: new Uint8Array(),
				ownNodeId: 1,
				nonceTimeout: 500,
			}),
	).toThrowError("16 bytes");
});

test("generateNonce() should return a random Buffer of the given length", (t) => {
	const man = new SecurityManager(options);
	// I know, this is not really checking if the value is random
	const nonce1 = man.generateNonce(2, 8);
	const nonce2 = man.generateNonce(2, 8);
	const nonce3 = man.generateNonce(2, 8);

	t.expect(isUint8Array(nonce1)).toBe(true);
	t.expect(isUint8Array(nonce2)).toBe(true);
	t.expect(isUint8Array(nonce3)).toBe(true);

	t.expect(nonce1.length).toBe(8);
	t.expect(nonce2.length).toBe(8);
	t.expect(nonce3.length).toBe(8);
});

test("generateNonce() -> should ensure that no collisions happen", async (t) => {
	// No collisions means that it is possible to generate 256 nonces without reusing the first byte
	const man = new SecurityManager(options);
	const generatedNonceIds = new Set<number>();
	for (let i = 0; i <= 255; i++) {
		const nonce = man.generateNonce(2, 8);
		const nonceId = nonce[0];
		t.expect(generatedNonceIds.has(nonceId)).toBe(false);
		generatedNonceIds.add(nonceId);
	}
});

test("generateNonce() should store nonces for the current node id", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(2, 8);
	const nonce2 = man.generateNonce(2, 8);
	const nonce3 = man.generateNonce(2, 8);

	t.expect(
		man.getNonce({ issuer: 2, nonceId: man.getNonceId(nonce1) }),
	).toBeUndefined();
	t.expect(
		man.getNonce({ issuer: 2, nonceId: man.getNonceId(nonce2) }),
	).toBeUndefined();
	t.expect(
		man.getNonce({ issuer: 2, nonceId: man.getNonceId(nonce3) }),
	).toBeUndefined();
});

test("generateNonce() -> the nonces should expire after the given timeout", (t) => {
	const clock = sinon.useFakeTimers(Date.now());
	const man = new SecurityManager(options);
	const nonce = man.generateNonce(2, 8);
	const nonceId = nonce[0];
	t.expect(man.getNonce(nonceId)).toStrictEqual(nonce);
	clock.tick(options.nonceTimeout + 50);
	t.expect(man.getNonce(nonceId)).toBeUndefined();

	clock.restore();
});

test(`generateNonce() -> should be marked as "reserved"`, (t) => {
	const man = new SecurityManager(options);
	man.generateNonce(2, 8);
	t.expect(man.getFreeNonce(ownNodeId)).toBeUndefined();
});

test("getNonceId() -> should return the first byte of the nonce", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(2, 8);
	const nonce2 = man.generateNonce(2, 8);
	const nonce3 = man.generateNonce(2, 8);

	t.expect(man.getNonceId(nonce1)).toBe(nonce1[0]);
	t.expect(man.getNonceId(nonce2)).toBe(nonce2[0]);
	t.expect(man.getNonceId(nonce3)).toBe(nonce3[0]);
});

test("getNonce() should return a previously generated nonce with the same id", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(2, 8);
	const nonce2 = man.generateNonce(2, 8);
	const nonce3 = man.generateNonce(2, 8);

	const nonceId1 = man.getNonceId(nonce1);
	const nonceId2 = man.getNonceId(nonce2);
	const nonceId3 = man.getNonceId(nonce3);

	t.expect(nonce1).toStrictEqual(man.getNonce(nonceId1));
	t.expect(nonce2).toStrictEqual(man.getNonce(nonceId2));
	t.expect(nonce3).toStrictEqual(man.getNonce(nonceId3));
});

test("setNonce() -> should store a given nonce to be retrieved later", (t) => {
	const man = new SecurityManager(options);

	t.expect(man.getNonce(1)).toBeUndefined();
	const nonce = randomBytes(8);
	nonce[0] = 1;
	man.setNonce(1, { nonce, receiver: 2 });
	t.expect(man.getNonce(1)).toStrictEqual(nonce);
});

test("setNonce -> the nonces should timeout after the given timeout", (t) => {
	const clock = sinon.useFakeTimers(Date.now());
	const man = new SecurityManager(options);
	const nonce = randomBytes(8);
	const nonceId = nonce[0];
	man.setNonce(nonceId, { nonce, receiver: 2 });
	t.expect(man.getNonce(nonceId)).toStrictEqual(nonce);
	clock.tick(options.nonceTimeout + 50);
	t.expect(man.getNonce(nonceId)).toBeUndefined();

	clock.restore();
});

test("setNonce -> should mark the nonce as free", (t) => {
	const man = new SecurityManager(options);
	const nonce = randomBytes(8);
	nonce[0] = 1;
	man.setNonce(
		{
			issuer: 2,
			nonceId: 1,
		},
		{ nonce, receiver: options.ownNodeId },
	);
	// Wrong node
	t.expect(man.getFreeNonce(1)).toBeUndefined();
	t.expect(man.getFreeNonce(2)).toStrictEqual(nonce);
});

test("setNonce -> when a free nonce expires, it should no longer be free", (t) => {
	const clock = sinon.useFakeTimers(Date.now());
	const man = new SecurityManager(options);
	const nonce = randomBytes(8);
	man.setNonce(
		{
			issuer: 2,
			nonceId: 1,
		},
		{ nonce, receiver: options.ownNodeId },
	);

	clock.tick(options.nonceTimeout + 50);
	t.expect(man.getFreeNonce(2)).toBeUndefined();

	clock.restore();
});

test("hasNonce() -> should return whether a nonce id is in the database", (t) => {
	const man = new SecurityManager(options);

	// Manually set
	t.expect(man.hasNonce(1)).toBe(false);
	const nonce1 = randomBytes(8);
	nonce1[0] = 1;
	man.setNonce(1, { nonce: nonce1, receiver: 2 });
	t.expect(man.hasNonce(1)).toBe(true);

	// And generated
	const nonce2 = man.generateNonce(2, 8);
	const nonceId2 = man.getNonceId(nonce2);
	t.expect(man.hasNonce(nonceId2)).toBe(true);
});

test("deleteNonce() -> should remove a nonce from the database", (t) => {
	const man = new SecurityManager(options);

	const nonce = man.generateNonce(2, 8);
	const nonceId = man.getNonceId(nonce);

	man.deleteNonce(nonceId);
	t.expect(man.getNonce(nonceId)).toBeUndefined();
	t.expect(man.hasNonce(nonceId)).toBe(false);
});

test("deleteNonce() -> and all other nonces that were created for the same receiver", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(2, 8);
	const nonceId1 = man.getNonceId(nonce1);
	const nonce2 = man.generateNonce(2, 8);
	const nonceId2 = man.getNonceId(nonce2);

	man.deleteNonce(nonceId1);
	t.expect(man.getNonce(nonceId1)).toBeUndefined();
	t.expect(man.hasNonce(nonceId1)).toBe(false);
	t.expect(man.getNonce(nonceId2)).toBeUndefined();
	t.expect(man.hasNonce(nonceId2)).toBe(false);
});

test("deleteAllNoncesForReceiver -> should only delete the nonces for the given receiver", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(2, 8);
	const nonceId1 = man.getNonceId(nonce1);
	const nonce2 = man.generateNonce(2, 8);
	const nonceId2 = man.getNonceId(nonce2);
	// different receiver
	const nonce3 = man.generateNonce(3, 8);
	const nonceId3 = man.getNonceId(nonce3);

	man.deleteAllNoncesForReceiver(2);
	t.expect(man.getNonce(nonceId1)).toBeUndefined();
	t.expect(man.hasNonce(nonceId1)).toBe(false);
	t.expect(man.getNonce(nonceId2)).toBeUndefined();
	t.expect(man.hasNonce(nonceId2)).toBe(false);
	t.expect(man.getNonce(nonceId3)).toBeDefined();
	t.expect(man.hasNonce(nonceId3)).toBe(true);
});

test("getFreeNonce() -> should reserve the nonce", (t) => {
	const man = new SecurityManager(options);
	const nonce = randomBytes(8);
	nonce[0] = 1;
	man.setNonce(
		{
			issuer: 2,
			nonceId: 1,
		},
		{ nonce, receiver: options.ownNodeId },
	);
	t.expect(man.getFreeNonce(2)).toStrictEqual(nonce);
	t.expect(man.getFreeNonce(2)).toBeUndefined();
});

test("nonces should be stored separately for each node", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(3, 8);
	const nonceId1 = man.getNonceId(nonce1);
	// Create a nonce with the same nonceId but with another issuer
	const nonce2 = randomBytes(8);
	nonce2[0] = nonceId1;

	const id2 = { issuer: 4, nonceId: nonceId1 };
	t.expect(man.hasNonce(id2)).toBe(false);
	t.expect(man.getNonce(id2)).toBeUndefined();

	man.setNonce(id2, { nonce: nonce2, receiver: 1 });
	t.expect(man.hasNonce(id2)).toBe(true);
	t.expect(man.getNonce(id2)).toStrictEqual(nonce2);
});
