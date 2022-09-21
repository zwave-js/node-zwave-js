import test from "ava";
import crypto, { randomBytes } from "crypto";
import sinon from "sinon";
import { SecurityManager } from "./Manager";

// prettier-ignore
const networkKey = Buffer.from([
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
]);
const ownNodeId = 1;
const options = { networkKey, ownNodeId, nonceTimeout: 500 };

test("constructor() -> should set the network key, auth key and encryption key", (t) => {
	const man = new SecurityManager(options);
	t.deepEqual(man.networkKey, networkKey);
	t.true(Buffer.isBuffer(man.authKey));
	t.is(man.authKey.length, 16);
	t.true(Buffer.isBuffer(man.encryptionKey));
	t.is(man.encryptionKey.length, 16);
});

test("constructor() -> should throw if the network key doesn't have length 16", (t) => {
	t.throws(
		() =>
			new SecurityManager({
				networkKey: Buffer.from([]),
				ownNodeId: 1,
				nonceTimeout: 500,
			}),
		{ message: /16 bytes/ },
	);
});

test("generateNonce() should return a random Buffer of the given length", (t) => {
	const man = new SecurityManager(options);
	// I know, this is not really checking if the value is random
	const nonce1 = man.generateNonce(2, 8);
	const nonce2 = man.generateNonce(2, 8);
	const nonce3 = man.generateNonce(2, 8);

	t.true(Buffer.isBuffer(nonce1));
	t.true(Buffer.isBuffer(nonce2));
	t.true(Buffer.isBuffer(nonce3));

	t.is(nonce1.length, 8);
	t.is(nonce2.length, 8);
	t.is(nonce3.length, 8);
});

test("generateNonce() -> should ensure that no collisions happen", (t) => {
	const buf1a = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
	const buf1b = Buffer.from([1, 2, 3, 4, 5, 6, 7, 9]); // has the same nonce id
	const buf2 = Buffer.from([2, 2, 3, 4, 5, 6, 7, 8]);

	const fakeRandomBytes = sinon
		.stub()
		.onFirstCall()
		.returns(buf1a)
		.onSecondCall()
		.returns(buf1b)
		.onThirdCall()
		.returns(buf2);
	sinon.replace(crypto, "randomBytes", fakeRandomBytes);

	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const SM: typeof SecurityManager = require("./Manager").SecurityManager;

	const man = new SM(options);
	const nonce1 = man.generateNonce(2, 8);
	const nonce2 = man.generateNonce(2, 8);
	t.deepEqual(nonce1, buf1a);
	t.deepEqual(nonce2, buf2);

	t.deepEqual(man.getNonce(1), buf1a);
	t.deepEqual(man.getNonce(2), buf2);

	sinon.restore();
});

test("generateNonce() should store nonces for the current node id", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(2, 8);
	const nonce2 = man.generateNonce(2, 8);
	const nonce3 = man.generateNonce(2, 8);

	t.is(
		man.getNonce({ issuer: 2, nonceId: man.getNonceId(nonce1) }),
		undefined,
	);
	t.is(
		man.getNonce({ issuer: 2, nonceId: man.getNonceId(nonce2) }),
		undefined,
	);
	t.is(
		man.getNonce({ issuer: 2, nonceId: man.getNonceId(nonce3) }),
		undefined,
	);
});

test("generateNonce() -> the nonces should expire after the given timeout", (t) => {
	const clock = sinon.useFakeTimers(Date.now());
	const man = new SecurityManager(options);
	const nonce = man.generateNonce(2, 8);
	const nonceId = nonce[0];
	t.deepEqual(man.getNonce(nonceId), nonce);
	clock.tick(options.nonceTimeout + 50);
	t.is(man.getNonce(nonceId), undefined);

	clock.restore();
});

test(`generateNonce() -> should be marked as "reserved"`, (t) => {
	const man = new SecurityManager(options);
	man.generateNonce(2, 8);
	t.is(man.getFreeNonce(ownNodeId), undefined);
});

test("getNonceId() -> should return the first byte of the nonce", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(2, 8);
	const nonce2 = man.generateNonce(2, 8);
	const nonce3 = man.generateNonce(2, 8);

	t.is(man.getNonceId(nonce1), nonce1[0]);
	t.is(man.getNonceId(nonce2), nonce2[0]);
	t.is(man.getNonceId(nonce3), nonce3[0]);
});

test("getNonce() should return a previously generated nonce with the same id", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(2, 8);
	const nonce2 = man.generateNonce(2, 8);
	const nonce3 = man.generateNonce(2, 8);

	const nonceId1 = man.getNonceId(nonce1);
	const nonceId2 = man.getNonceId(nonce2);
	const nonceId3 = man.getNonceId(nonce3);

	t.deepEqual(nonce1, man.getNonce(nonceId1));
	t.deepEqual(nonce2, man.getNonce(nonceId2));
	t.deepEqual(nonce3, man.getNonce(nonceId3));
});

test("setNonce() -> should store a given nonce to be retrieved later", (t) => {
	const man = new SecurityManager(options);

	t.is(man.getNonce(1), undefined);
	const nonce: Buffer = randomBytes(8);
	nonce[0] = 1;
	man.setNonce(1, { nonce, receiver: 2 });
	t.deepEqual(man.getNonce(1), nonce);
});

test("setNonce -> the nonces should timeout after the given timeout", (t) => {
	const clock = sinon.useFakeTimers(Date.now());
	const man = new SecurityManager(options);
	const nonce: Buffer = randomBytes(8);
	const nonceId = nonce[0];
	man.setNonce(nonceId, { nonce, receiver: 2 });
	t.deepEqual(man.getNonce(nonceId), nonce);
	clock.tick(options.nonceTimeout + 50);
	t.is(man.getNonce(nonceId), undefined);

	clock.restore();
});

test("setNonce -> should mark the nonce as free", (t) => {
	const man = new SecurityManager(options);
	const nonce: Buffer = randomBytes(8);
	nonce[0] = 1;
	man.setNonce(
		{
			issuer: 2,
			nonceId: 1,
		},
		{ nonce, receiver: options.ownNodeId },
	);
	// Wrong node
	t.is(man.getFreeNonce(1), undefined);
	t.deepEqual(man.getFreeNonce(2), nonce);
});

test("setNonce -> when a free nonce expires, it should no longer be free", (t) => {
	const clock = sinon.useFakeTimers(Date.now());
	const man = new SecurityManager(options);
	const nonce: Buffer = randomBytes(8);
	man.setNonce(
		{
			issuer: 2,
			nonceId: 1,
		},
		{ nonce, receiver: options.ownNodeId },
	);

	clock.tick(options.nonceTimeout + 50);
	t.is(man.getFreeNonce(2), undefined);

	clock.restore();
});

test("hasNonce() -> should return whether a nonce id is in the database", (t) => {
	const man = new SecurityManager(options);

	// Manually set
	t.false(man.hasNonce(1));
	const nonce1: Buffer = randomBytes(8);
	nonce1[0] = 1;
	man.setNonce(1, { nonce: nonce1, receiver: 2 });
	t.true(man.hasNonce(1));

	// And generated
	const nonce2 = man.generateNonce(2, 8);
	const nonceId2 = man.getNonceId(nonce2);
	t.true(man.hasNonce(nonceId2));
});

test("deleteNonce() -> should remove a nonce from the database", (t) => {
	const man = new SecurityManager(options);

	const nonce = man.generateNonce(2, 8);
	const nonceId = man.getNonceId(nonce);

	man.deleteNonce(nonceId);
	t.is(man.getNonce(nonceId), undefined);
	t.false(man.hasNonce(nonceId));
});

test("deleteNonce() -> and all other nonces that were created for the same receiver", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(2, 8);
	const nonceId1 = man.getNonceId(nonce1);
	const nonce2 = man.generateNonce(2, 8);
	const nonceId2 = man.getNonceId(nonce2);

	man.deleteNonce(nonceId1);
	t.is(man.getNonce(nonceId1), undefined);
	t.false(man.hasNonce(nonceId1));
	t.is(man.getNonce(nonceId2), undefined);
	t.false(man.hasNonce(nonceId2));
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
	t.is(man.getNonce(nonceId1), undefined);
	t.false(man.hasNonce(nonceId1));
	t.is(man.getNonce(nonceId2), undefined);
	t.false(man.hasNonce(nonceId2));
	t.not(man.getNonce(nonceId3), undefined);
	t.true(man.hasNonce(nonceId3));
});

test("getFreeNonce() -> should reserve the nonce", (t) => {
	const man = new SecurityManager(options);
	const nonce: Buffer = randomBytes(8);
	nonce[0] = 1;
	man.setNonce(
		{
			issuer: 2,
			nonceId: 1,
		},
		{ nonce, receiver: options.ownNodeId },
	);
	t.deepEqual(man.getFreeNonce(2), nonce);
	t.is(man.getFreeNonce(2), undefined);
});

test("nonces should be stored separately for each node", (t) => {
	const man = new SecurityManager(options);

	const nonce1 = man.generateNonce(3, 8);
	const nonceId1 = man.getNonceId(nonce1);
	// Create a nonce with the same nonceId but with another issuer
	const nonce2: Buffer = randomBytes(8);
	nonce2[0] = nonceId1;

	const id2 = { issuer: 4, nonceId: nonceId1 };
	t.false(man.hasNonce(id2));
	t.is(man.getNonce(id2), undefined);

	man.setNonce(id2, { nonce: nonce2, receiver: 1 });
	t.true(man.hasNonce(id2));
	t.deepEqual(man.getNonce(id2), nonce2);
});
