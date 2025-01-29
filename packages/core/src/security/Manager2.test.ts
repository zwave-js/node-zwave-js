import { isUint8Array } from "@zwave-js/shared";
import * as crypto from "node:crypto";
import { test } from "vitest";
import { SecurityClass } from "../definitions/SecurityClass.js";
import { ZWaveErrorCodes } from "../error/ZWaveError.js";
import { assertZWaveError } from "../test/assertZWaveError.js";
import { SecurityManager2 } from "./Manager2.js";

async function dummyInit(
	man: SecurityManager2,
	options: {
		keys?: boolean;
		nodeId?: number;
		secClass?: SecurityClass;
	} = {},
): Promise<void> {
	if (options.keys !== false) {
		await man.setKey(SecurityClass.S0_Legacy, crypto.randomBytes(16));
		await man.setKey(
			SecurityClass.S2_AccessControl,
			crypto.randomBytes(16),
		);
		await man.setKey(
			SecurityClass.S2_Authenticated,
			crypto.randomBytes(16),
		);
		await man.setKey(
			SecurityClass.S2_Unauthenticated,
			crypto.randomBytes(16),
		);
	}
	if (options.nodeId) {
		await man.initializeSPAN(
			options.nodeId,
			options.secClass ?? SecurityClass.S2_Authenticated,
			crypto.randomBytes(16),
			crypto.randomBytes(16),
		);
	}
}

test("nextNonce() -> should throw if the PRNG for the given receiver node has not been initialized", async (t) => {
	const man = await SecurityManager2.create();
	assertZWaveError(t.expect, () => man.nextNonce(2), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "initialized",
	});
});

test("nextNonce() -> should generate a 13-byte nonce otherwise", async (t) => {
	const man = await SecurityManager2.create();
	await dummyInit(man, {
		nodeId: 2,
		secClass: SecurityClass.S2_AccessControl,
	});

	const ret = await man.nextNonce(2);
	t.expect(isUint8Array(ret)).toBe(true);
	t.expect(ret.length).toBe(13);
});

test("nextNonce() -> two nonces should be different", async (t) => {
	const man = await SecurityManager2.create();
	await dummyInit(man, {
		nodeId: 2,
		secClass: SecurityClass.S2_AccessControl,
	});

	const nonce1 = await man.nextNonce(2);
	const nonce2 = await man.nextNonce(2);
	t.expect(nonce1).not.toStrictEqual(nonce2);
});

test("initializeSPAN() -> should throw if either entropy input does not have length 16", async (t) => {
	const man = await SecurityManager2.create();
	const nodeId = 2;
	assertZWaveError(
		t.expect,
		async () =>
			await man.initializeSPAN(
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
		async () =>
			await man.initializeSPAN(
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

test("initializeSPAN() -> should throw if the node has not been assigned a security class", async (t) => {
	const man = await SecurityManager2.create();
	const nodeId = 2;
	assertZWaveError(
		t.expect,
		async () =>
			await man.initializeSPAN(
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

test("initializeSPAN() -> should throw if the keys for the node's security class have not been set up", async (t) => {
	const man = await SecurityManager2.create();
	const nodeId = 2;
	assertZWaveError(
		t.expect,
		async () =>
			await man.initializeSPAN(
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

test("initializeSPAN() -> should not throw otherwise", async (t) => {
	const man = await SecurityManager2.create();
	const nodeId = 2;
	await dummyInit(man, {
		nodeId,
		secClass: SecurityClass.S2_Authenticated,
	});
	await man.initializeSPAN(
		nodeId,
		SecurityClass.S2_Authenticated,
		new Uint8Array(16),
		new Uint8Array(16),
	);
});

test("setKeys() -> throws if the network key does not have length 16", async (t) => {
	const man = await SecurityManager2.create();
	assertZWaveError(
		t.expect,
		async () =>
			await man.setKey(
				SecurityClass.S2_Authenticated,
				new Uint8Array(15),
			),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: "16 bytes",
		},
	);
});

test("setKeys() -> throws if the security class is not valid", async (t) => {
	const man = await SecurityManager2.create();
	assertZWaveError(
		t.expect,
		async () => await man.setKey(-1 as any, new Uint8Array(16)),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: "security class",
		},
	);
});

test("createMulticastGroup() -> should return a different group ID for a different node set", async (t) => {
	const man = await SecurityManager2.create();
	await dummyInit(man);
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

test("createMulticastGroup() -> should return a different group ID for a different node set for LR nodes", async (t) => {
	const man = await SecurityManager2.create();
	await dummyInit(man);
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

test("createMulticastGroup() -> should return the same group ID for a previously used node set", async (t) => {
	const man = await SecurityManager2.create();
	await dummyInit(man);
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

test("createMulticastGroup() -> should return the same group ID for a previously used LR node set", async (t) => {
	const man = await SecurityManager2.create();
	await dummyInit(man);
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

test("getMulticastKeyAndIV() -> should throw if the MPAN state for the given multicast group has not been initialized", async (t) => {
	const man = await SecurityManager2.create();
	assertZWaveError(t.expect, () => man.getMulticastKeyAndIV(1), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "does not exist",
	});
});

test("getMulticastKeyAndIV() -> should throw if the multicast group has not been created", async (t) => {
	const man = await SecurityManager2.create();
	assertZWaveError(t.expect, () => man.getMulticastKeyAndIV(1), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "does not exist",
	});
});

test("getMulticastKeyAndIV() -> should throw if the keys for the group's security class have not been set up", async (t) => {
	const man = await SecurityManager2.create();
	const groupId = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);
	assertZWaveError(t.expect, () => man.getMulticastKeyAndIV(groupId), {
		errorCode: ZWaveErrorCodes.Security2CC_NotInitialized,
		messageMatches: "network key",
	});
});

test("getMulticastKeyAndIV() -> should generate a 13-byte IV otherwise", async (t) => {
	const man = await SecurityManager2.create();
	await dummyInit(man);
	const groupId = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);

	const { iv: ret } = await man.getMulticastKeyAndIV(groupId);

	t.expect(isUint8Array(ret)).toBe(true);
	t.expect(ret.length).toBe(13);
});

test("getMulticastKeyAndIV() -> two nonces for the same group should be different", async (t) => {
	const man = await SecurityManager2.create();
	await dummyInit(man);
	const groupId = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);

	const { iv: nonce1 } = await man.getMulticastKeyAndIV(groupId);
	const { iv: nonce2 } = await man.getMulticastKeyAndIV(groupId);

	t.expect(nonce1).not.toStrictEqual(nonce2);
});

test("getMulticastKeyAndIV() -> two nonces for different groups should be different", async (t) => {
	const man = await SecurityManager2.create();
	await dummyInit(man);
	const group1 = man.createMulticastGroup(
		[2, 3, 4],
		SecurityClass.S2_Authenticated,
	);
	const group2 = man.createMulticastGroup(
		[3, 4, 5],
		SecurityClass.S2_Authenticated,
	);

	const { iv: nonce1 } = await man.getMulticastKeyAndIV(group1);
	const { iv: nonce2 } = await man.getMulticastKeyAndIV(group2);

	t.expect(nonce1).not.toStrictEqual(nonce2);
});
