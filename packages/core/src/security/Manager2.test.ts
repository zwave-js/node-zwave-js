import { isUint8Array } from "@zwave-js/shared";
import * as crypto from "node:crypto";
import { test } from "vitest";
import { ZWaveErrorCodes } from "../error/ZWaveError.js";
import { assertZWaveError } from "../test/assertZWaveError.js";
import { SecurityManager2 } from "./Manager2.js";
import { SecurityClass } from "./SecurityClass.js";

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
	assertZWaveError(t.expect, () => man.nextNonce(2), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "initialized",
	});
});

test("nextNonce() -> should generate a 13-byte nonce otherwise", (t) => {
	const man = new SecurityManager2();
	dummyInit(man, {
		nodeId: 2,
		secClass: SecurityClass.S2_AccessControl,
	});

	const ret = man.nextNonce(2);
	t.expect(isUint8Array(ret)).toBe(true);
	t.expect(ret.length).toBe(13);
});

test("nextNonce() -> two nonces should be different", (t) => {
	const man = new SecurityManager2();
	dummyInit(man, {
		nodeId: 2,
		secClass: SecurityClass.S2_AccessControl,
	});

	const nonce1 = man.nextNonce(2);
	const nonce2 = man.nextNonce(2);
	t.expect(nonce1).not.toStrictEqual(nonce2);
});

test("initializeSPAN() -> should throw if either entropy input does not have length 16", (t) => {
	const man = new SecurityManager2();
	const nodeId = 2;
	assertZWaveError(
		t.expect,
		() =>
			man.initializeSPAN(
				nodeId,
				SecurityClass.S2_Authenticated,
				new Uint8Array(15),
				new Uint8Array(16),
			),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: "16 bytes",
		},
	);

	assertZWaveError(
		t.expect,
		() =>
			man.initializeSPAN(
				nodeId,
				SecurityClass.S2_Authenticated,
				new Uint8Array(16),
				new Uint8Array(1),
			),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: "16 bytes",
		},
	);
});

test("initializeSPAN() -> should throw if the node has not been assigned a security class", (t) => {
	const man = new SecurityManager2();
	const nodeId = 2;
	assertZWaveError(
		t.expect,
		() =>
			man.initializeSPAN(
				nodeId,
				SecurityClass.S2_Authenticated,
				new Uint8Array(16),
				new Uint8Array(16),
			),
		{
			errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
			messageMatches: "security class",
		},
	);
});

test("initializeSPAN() -> should throw if the keys for the node's security class have not been set up", (t) => {
	const man = new SecurityManager2();
	const nodeId = 2;
	assertZWaveError(
		t.expect,
		() =>
			man.initializeSPAN(
				nodeId,
				SecurityClass.S2_Authenticated,
				new Uint8Array(16),
				new Uint8Array(16),
			),
		{
			errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
			messageMatches: "network key",
		},
	);
});

test("initializeSPAN() -> should not throw otherwise", (t) => {
	const man = new SecurityManager2();
	const nodeId = 2;
	dummyInit(man, {
		nodeId,
		secClass: SecurityClass.S2_Authenticated,
	});
	t.expect(() =>
		man.initializeSPAN(
			nodeId,
			SecurityClass.S2_Authenticated,
			new Uint8Array(16),
			new Uint8Array(16),
		)
	).not.toThrow();
});

test("setKeys() -> throws if the network key does not have length 16", (t) => {
	const man = new SecurityManager2();
	assertZWaveError(
		t.expect,
		() => man.setKey(SecurityClass.S2_Authenticated, new Uint8Array(15)),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: "16 bytes",
		},
	);
});

test("setKeys() -> throws if the security class is not valid", (t) => {
	const man = new SecurityManager2();
	assertZWaveError(
		t.expect,
		() => man.setKey(-1 as any, new Uint8Array(16)),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: "security class",
		},
	);
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

	t.expect(group1).not.toBe(group2);
});

test("createMulticastGroup() -> should return a different group ID for a different node set for LR nodes", (t) => {
	const man = new SecurityManager2();
	dummyInit(man);
	const group1 = man.createMulticastGroup(
		[260, 261, 262],
		SecurityClass.S2_Authenticated,
	);
	const group2 = man.createMulticastGroup(
		[259, 260, 261],
		SecurityClass.S2_Authenticated,
	);

	t.expect(group1).not.toBe(group2);
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

	t.expect(group1).toBe(group2);
});

test("createMulticastGroup() -> should return the same group ID for a previously used LR node set", (t) => {
	const man = new SecurityManager2();
	dummyInit(man);
	const group1 = man.createMulticastGroup(
		[260, 261, 262],
		SecurityClass.S2_Authenticated,
	);
	const group2 = man.createMulticastGroup(
		[260, 261, 262],
		SecurityClass.S2_Authenticated,
	);

	t.expect(group1).toBe(group2);
});

test("getMulticastKeyAndIV() -> should throw if the MPAN state for the given multicast group has not been initialized", (t) => {
	const man = new SecurityManager2();
	assertZWaveError(t.expect, () => man.getMulticastKeyAndIV(1), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "does not exist",
	});
});

test("getMulticastKeyAndIV() -> should throw if the multicast group has not been created", (t) => {
	const man = new SecurityManager2();
	assertZWaveError(t.expect, () => man.getMulticastKeyAndIV(1), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "does not exist",
	});
});

test("getMulticastKeyAndIV() -> should throw if the keys for the group's security class have not been set up", (t) => {
	const man = new SecurityManager2();
	const groupId = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);
	assertZWaveError(t.expect, () => man.getMulticastKeyAndIV(groupId), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "network key",
	});
});

test("getMulticastKeyAndIV() -> should generate a 13-byte IV otherwise", (t) => {
	const man = new SecurityManager2();
	dummyInit(man);
	const groupId = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);

	const ret = man.getMulticastKeyAndIV(groupId).iv;

	t.expect(isUint8Array(ret)).toBe(true);
	t.expect(ret.length).toBe(13);
});

test("getMulticastKeyAndIV() -> two nonces for the same group should be different", (t) => {
	const man = new SecurityManager2();
	dummyInit(man);
	const groupId = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);

	const nonce1 = man.getMulticastKeyAndIV(groupId).iv;
	const nonce2 = man.getMulticastKeyAndIV(groupId).iv;

	t.expect(nonce1).not.toStrictEqual(nonce2);
});

test("getMulticastKeyAndIV() -> two nonces for different groups should be different", (t) => {
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

	const nonce1 = man.getMulticastKeyAndIV(group1).iv;
	const nonce2 = man.getMulticastKeyAndIV(group2).iv;

	t.expect(nonce1).not.toStrictEqual(nonce2);
});
