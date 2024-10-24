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
import test from "ava";

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

test(`creating and serializing should work for unspecified commands`, (t) => {
	// Repro for #1219
	const cc = new CommandClass({
		nodeId: 2,
		ccId: 0x5d,
		ccCommand: 0x02,
		payload: Buffer.from([1, 2, 3]),
	});
	const msg = new SendDataRequest({
		command: cc,
		callbackId: 0xfe,
	});
	t.deepEqual(
		msg.serialize({} as any),
		Buffer.from("010c001302055d0201020325fe63", "hex"),
	);
});

test("parse() returns an un-specialized instance when receiving a non-implemented CC", (t) => {
	// This is a Node Provisioning CC. Change it when that CC is implemented
	const cc = CommandClass.parse(
		Buffer.from("78030100", "hex"),
		{ sourceNodeId: 5 } as any,
	);
	t.is(cc.constructor, CommandClass);
	t.is(cc.nodeId, 5);
	t.is(cc.ccId, 0x78);
	t.is(cc.ccCommand, 0x03);
	t.deepEqual(cc.payload, Buffer.from([0x01, 0x00]));
});

test("parse() does not throw when the CC is implemented", (t) => {
	t.notThrows(() =>
		// CRC-16 with BasicCC
		CommandClass.parse(
			Buffer.from("560120024d26", "hex"),
			{ sourceNodeId: 5 } as any,
		)
	);
});

test("getImplementedVersion() should return the implemented version for a CommandClass instance", (t) => {
	const cc = new BasicCC({ nodeId: 1 });
	t.is(getImplementedVersion(cc), 2);
});

test("getImplementedVersion() should return the implemented version for a numeric CommandClass key", (t) => {
	const cc = CommandClasses.Basic;
	t.is(getImplementedVersion(cc), 2);
});

test("getImplementedVersion() should return 0 for a non-existing CC", (t) => {
	const cc = -1;
	t.is(getImplementedVersion(cc as any), 0);
});

test("getImplementedVersion() should work with inheritance", (t) => {
	const cc = new BasicCCGet({ nodeId: 1 });
	t.is(getImplementedVersion(cc), 2);
});

test("getImplementedVersionStatic() should return the implemented version for a CommandClass constructor", (t) => {
	t.is(getImplementedVersionStatic(BasicCC), 2);
});

test("getImplementedVersionStatic() should work on inherited classes", (t) => {
	t.is(getImplementedVersionStatic(DummyCCSubClass1), 7);
});

test("expectMoreMessages() returns false by default", (t) => {
	const cc = new DummyCC({ nodeId: 1 });
	t.false(cc.expectMoreMessages([]));
});

test("getExpectedCCResponse() returns the expected CC response like it was defined", (t) => {
	const cc = new DummyCCSubClass2({ nodeId: 1 });
	const actual = getExpectedCCResponse(cc);
	t.is(actual, DummyCCSubClass1);
});
