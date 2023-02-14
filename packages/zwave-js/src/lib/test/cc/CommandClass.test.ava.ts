import {
	BasicCC,
	BasicCCGet,
	commandClass,
	CommandClass,
	expectedCCResponse,
	getExpectedCCResponse,
	getImplementedVersion,
	getImplementedVersionStatic,
	implementedVersion,
} from "@zwave-js/cc";
import {
	assertZWaveErrorAva,
	CommandClasses,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";
import { SendDataRequest } from "../../serialapi/transport/SendDataMessages";

const host = createTestingHost();

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
	const cc = new CommandClass(host, {
		nodeId: 2,
		ccId: 0x5d,
		ccCommand: 0x02,
		payload: Buffer.from([1, 2, 3]),
	});
	const msg = new SendDataRequest(host, {
		command: cc,
		callbackId: 0xfe,
	});
	t.deepEqual(
		msg.serialize(),
		Buffer.from("010c001302055d0201020325fe63", "hex"),
	);
});

test("from() throws CC_NotImplemented when receiving a non-implemented CC", (t) => {
	// This is a Node Provisioning CC. Change it when that CC is implemented
	assertZWaveErrorAva(
		t,
		() =>
			CommandClass.from(host, {
				data: Buffer.from("78030100", "hex"),
				nodeId: 5,
			}),
		{
			errorCode: ZWaveErrorCodes.CC_NotImplemented,
		},
	);
});

test("from() does not throw when the CC is implemented", (t) => {
	t.notThrows(() =>
		CommandClass.from(host, {
			// CRC-16 with BasicCC
			data: Buffer.from("560120024d26", "hex"),
			nodeId: 5,
		}),
	);
});

test("getImplementedVersion() should return the implemented version for a CommandClass instance", (t) => {
	const cc = new BasicCC(host, { nodeId: 1 });
	t.is(getImplementedVersion(cc), 2);
});

test("getImplementedVersion() should return the implemented version for a numeric CommandClass key", (t) => {
	const cc = CommandClasses.Basic;
	t.is(getImplementedVersion(cc), 2);
});

test("getImplementedVersion() should return 0 for a non-existing CC", (t) => {
	const cc = -1;
	t.is(getImplementedVersion(cc), 0);
});

test("getImplementedVersion() should work with inheritance", (t) => {
	const cc = new BasicCCGet(host, { nodeId: 1 });
	t.is(getImplementedVersion(cc), 2);
});

test("getImplementedVersionStatic() should return the implemented version for a CommandClass constructor", (t) => {
	t.is(getImplementedVersionStatic(BasicCC), 2);
});

test("getImplementedVersionStatic() should work on inherited classes", (t) => {
	t.is(getImplementedVersionStatic(DummyCCSubClass1), 7);
});

test("expectMoreMessages() returns false by default", (t) => {
	const cc = new DummyCC(host, { nodeId: 1 });
	t.false(cc.expectMoreMessages([]));
});

test("getExpectedCCResponse() returns the expected CC response like it was defined", (t) => {
	const cc = new DummyCCSubClass2(host, { nodeId: 1 });
	const actual = getExpectedCCResponse(cc);
	t.is(actual, DummyCCSubClass1);
});
