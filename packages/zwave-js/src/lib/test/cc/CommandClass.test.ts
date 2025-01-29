import {
	BasicCC,
	BasicCCGet,
	CommandClass,
	commandClass,
	expectedCCResponse,
	getExpectedCCResponse,
	getImplementedVersion,
	getImplementedVersionStatic,
	implementedVersion,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { SendDataRequest } from "@zwave-js/serial/serialapi";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

@implementedVersion(7)
@commandClass(0xffff as any)
class DummyCC extends CommandClass {}
class DummyCCSubClass1 extends DummyCC {
	private x: any;
}
@expectedCCResponse(DummyCCSubClass1)
class DummyCCSubClass2 extends DummyCC {
	private y: any;
}

test(`creating and serializing should work for unspecified commands`, async (t) => {
	// Repro for #1219
	const cc = new CommandClass({
		nodeId: 2,
		ccId: 0x5d,
		ccCommand: 0x02,
		payload: Uint8Array.from([1, 2, 3]),
	});
	const msg = new SendDataRequest({
		command: cc,
		callbackId: 0xfe,
	});
	await t.expect(
		msg.serialize({} as any),
	).resolves.toStrictEqual(Bytes.from("010c001302055d0201020325fe63", "hex"));
});

test("parse() returns an un-specialized instance when receiving a non-implemented CC", async (t) => {
	// This is a Node Provisioning CC. Change it when that CC is implemented
	const cc = await CommandClass.parse(
		Bytes.from("78030100", "hex"),
		{ sourceNodeId: 5 } as any,
	);
	t.expect(cc.constructor).toBe(CommandClass);
	t.expect(cc.nodeId).toBe(5);
	t.expect(cc.ccId).toBe(0x78);
	t.expect(cc.ccCommand).toBe(0x03);
	t.expect(cc.payload).toStrictEqual(Bytes.from([0x01, 0x00]));
});

test("parse() does not throw when the CC is implemented", (t) => {
	t.expect(async () =>
		// CRC-16 with BasicCC
		await CommandClass.parse(
			Bytes.from("560120024d26", "hex"),
			{ sourceNodeId: 5 } as any,
		)
	).not.toThrow();
});

test("getImplementedVersion() should return the implemented version for a CommandClass instance", (t) => {
	const cc = new BasicCC({ nodeId: 1 });
	t.expect(getImplementedVersion(cc)).toBe(2);
});

test("getImplementedVersion() should return the implemented version for a numeric CommandClass key", (t) => {
	const cc = CommandClasses.Basic;
	t.expect(getImplementedVersion(cc)).toBe(2);
});

test("getImplementedVersion() should return 0 for a non-existing CC", (t) => {
	const cc = -1;
	t.expect(getImplementedVersion(cc as any)).toBe(0);
});

test("getImplementedVersion() should work with inheritance", (t) => {
	const cc = new BasicCCGet({ nodeId: 1 });
	t.expect(getImplementedVersion(cc)).toBe(2);
});

test("getImplementedVersionStatic() should return the implemented version for a CommandClass constructor", (t) => {
	t.expect(getImplementedVersionStatic(BasicCC)).toBe(2);
});

test("getImplementedVersionStatic() should work on inherited classes", (t) => {
	t.expect(getImplementedVersionStatic(DummyCCSubClass1)).toBe(7);
});

test("expectMoreMessages() returns false by default", (t) => {
	const cc = new DummyCC({ nodeId: 1 });
	t.expect(cc.expectMoreMessages([])).toBe(false);
});

test("getExpectedCCResponse() returns the expected CC response like it was defined", (t) => {
	const cc = new DummyCCSubClass2({ nodeId: 1 });
	const actual = getExpectedCCResponse(cc);
	t.expect(actual).toBe(DummyCCSubClass1);
});
