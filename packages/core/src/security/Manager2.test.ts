import test from "ava";
import * as crypto from "crypto";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { assertZWaveError } from "../test/assertZWaveError";
import { SecurityManager2 } from "./Manager2";
import { SecurityClass } from "./SecurityClass";

function dummyInit(
	man: SecurityManager2,
	options: {
		keys?: boolean;
		nodeId?: number;
		secClass?: SecurityClass;
	} = {},
): void {
	if (options.keys !== false) {
		man.setKey(SecurityClass.S0_Legacy, crypto.randomBytes(16));
		man.setKey(SecurityClass.S2_AccessControl, crypto.randomBytes(16));
		man.setKey(SecurityClass.S2_Authenticated, crypto.randomBytes(16));
		man.setKey(SecurityClass.S2_Unauthenticated, crypto.randomBytes(16));
	}
	if (options.nodeId) {
		man.initializeSPAN(
			options.nodeId,
			options.secClass ?? SecurityClass.S2_Authenticated,
			crypto.randomBytes(16),
			crypto.randomBytes(16),
		);
	}
}

test("nextNonce() -> should throw if the PRNG for the given receiver node has not been initialized", (t) => {
	const man = new SecurityManager2();
	assertZWaveError(t, () => man.nextNonce(2), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "initialized",
	});
	t.pass();
});

test("nextNonce() -> should generate a 13-byte nonce otherwise", (t) => {
	const man = new SecurityManager2();
	dummyInit(man, {
		nodeId: 2,
		secClass: SecurityClass.S2_AccessControl,
	});

	const ret = man.nextNonce(2);
	t.true(Buffer.isBuffer(ret));
	t.is(ret.length, 13);
});

test("nextNonce() -> two nonces should be different", (t) => {
	const man = new SecurityManager2();
	dummyInit(man, {
		nodeId: 2,
		secClass: SecurityClass.S2_AccessControl,
	});

	const nonce1 = man.nextNonce(2);
	const nonce2 = man.nextNonce(2);
	t.notDeepEqual(nonce1, nonce2);
});

test("initializeSPAN() -> should throw if either entropy input does not have length 16", (t) => {
	const man = new SecurityManager2();
	const nodeId = 2;
	assertZWaveError(
		t,
		() =>
			man.initializeSPAN(
				nodeId,
				SecurityClass.S2_Authenticated,
				Buffer.alloc(15),
				Buffer.alloc(16),
			),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: "16 bytes",
		},
	);

	assertZWaveError(
		t,
		() =>
			man.initializeSPAN(
				nodeId,
				SecurityClass.S2_Authenticated,
				Buffer.alloc(16),
				Buffer.alloc(1),
			),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: "16 bytes",
		},
	);
	t.pass();
});

test("initializeSPAN() -> should throw if the node has not been assigned a security class", (t) => {
	const man = new SecurityManager2();
	const nodeId = 2;
	assertZWaveError(
		t,
		() =>
			man.initializeSPAN(
				nodeId,
				SecurityClass.S2_Authenticated,
				Buffer.alloc(16),
				Buffer.alloc(16),
			),
		{
			errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
			messageMatches: "security class",
		},
	);
	t.pass();
});

test("initializeSPAN() -> should throw if the keys for the node's security class have not been set up", (t) => {
	const man = new SecurityManager2();
	const nodeId = 2;
	assertZWaveError(
		t,
		() =>
			man.initializeSPAN(
				nodeId,
				SecurityClass.S2_Authenticated,
				Buffer.alloc(16),
				Buffer.alloc(16),
			),
		{
			errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
			messageMatches: "network key",
		},
	);
	t.pass();
});

test("initializeSPAN() -> should not throw otherwise", (t) => {
	const man = new SecurityManager2();
	const nodeId = 2;
	dummyInit(man, {
		nodeId,
		secClass: SecurityClass.S2_Authenticated,
	});
	t.notThrows(() =>
		man.initializeSPAN(
			nodeId,
			SecurityClass.S2_Authenticated,
			Buffer.alloc(16),
			Buffer.alloc(16),
		),
	);
});

test("setKeys() -> throws if the network key does not have length 16", (t) => {
	const man = new SecurityManager2();
	assertZWaveError(
		t,
		() => man.setKey(SecurityClass.S2_Authenticated, Buffer.alloc(15)),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: "16 bytes",
		},
	);
	t.pass();
});

test("setKeys() -> throws if the security class is not valid", (t) => {
	const man = new SecurityManager2();
	assertZWaveError(t, () => man.setKey(-1 as any, Buffer.alloc(16)), {
		errorCode: ZWaveErrorCodes.Argument_Invalid,
		messageMatches: "security class",
	});
	t.pass();
});

test("createMulticastGroup() -> should return a different group ID for a different node set", (t) => {
	const man = new SecurityManager2();
	dummyInit(man);
	const group1 = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);
	const group2 = man.createMulticastGroup(
		[3, 4, 5],
		SecurityClass.S2_Authenticated,
	);

	t.not(group1, group2);
});

//

test("createMulticastGroup() -> should return the same group ID for a previously used node set", (t) => {
	const man = new SecurityManager2();
	dummyInit(man);
	const group1 = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);
	const group2 = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);

	t.is(group1, group2);
});

test("nextMPAN() -> should throw if the MPAN state for the given multicast group has not been initialized", (t) => {
	const man = new SecurityManager2();
	assertZWaveError(t, () => man.nextMPAN(1), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "does not exist",
	});
	t.pass();
});

test("nextMPAN() -> should throw if the multicast group has not been created", (t) => {
	const man = new SecurityManager2();
	assertZWaveError(t, () => man.nextMPAN(1), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "does not exist",
	});
	t.pass();
});

test("nextMPAN() -> should throw if the keys for the group's security class have not been set up", (t) => {
	const man = new SecurityManager2();
	const groupId = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);
	assertZWaveError(t, () => man.nextMPAN(groupId), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "network key",
	});
	t.pass();
});

test("nextMPAN() -> should generate a 16-byte buffer otherwise", (t) => {
	const man = new SecurityManager2();
	dummyInit(man);
	const groupId = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);

	const ret = man.nextMPAN(groupId);

	t.true(Buffer.isBuffer(ret));
	t.is(ret.length, 16);
});

test("nextMPAN() -> two nonces for the same group should be different", (t) => {
	const man = new SecurityManager2();
	dummyInit(man);
	const groupId = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);

	const nonce1 = man.nextMPAN(groupId);
	const nonce2 = man.nextMPAN(groupId);
	t.notDeepEqual(nonce1, nonce2);
});

test("nextMPAN() -> two nonces for different groups should be different", (t) => {
	const man = new SecurityManager2();
	dummyInit(man);
	const group1 = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);
	const group2 = man.createMulticastGroup(
		[3, 4, 5],
		SecurityClass.S2_Authenticated,
	);

	const nonce1 = man.nextMPAN(group1);
	const nonce2 = man.nextMPAN(group2);
	t.notDeepEqual(nonce1, nonce2);
});
