import { CommandClass } from "@zwave-js/cc";
import {
	FibaroVenetianBlindCCCommand,
	FibaroVenetianBlindCCGet,
	FibaroVenetianBlindCCReport,
	FibaroVenetianBlindCCSet,
} from "@zwave-js/cc/manufacturerProprietary/FibaroCC";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Manufacturer Proprietary"], // CC
			// Manufacturer ID
			0x01,
			0x0f,
			// Fibaro CC ID
			0x26,
		]),
		payload,
	]);
}

test("the Set Tilt command should serialize correctly", (t) => {
	const cc = new FibaroVenetianBlindCCSet(host, {
		nodeId: 2,
		tilt: 99,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			FibaroVenetianBlindCCCommand.Set,
			0x01, // with Tilt, no Position
			0x00, // Position
			0x63, // Tilt
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			FibaroVenetianBlindCCCommand.Report,
			0x03, // with Tilt and Position
			0x00, // Position
			0x00, // Tilt
		]),
	);
	const cc = CommandClass.from(host, {
		nodeId: 2,
		data: ccData,
	});
	t.true(cc instanceof FibaroVenetianBlindCCReport);
	t.is((cc as FibaroVenetianBlindCCReport).position, 0);
	t.is((cc as FibaroVenetianBlindCCReport).tilt, 0);
});

test("FibaroVenetianBlindCCSet should expect no response", (t) => {
	const cc = new FibaroVenetianBlindCCSet(host, {
		nodeId: 2,
		tilt: 7,
	});
	t.false(cc.expectsCCResponse());
});

test("FibaroVenetianBlindCCGet should expect a response", (t) => {
	const cc = new FibaroVenetianBlindCCGet(host, {
		nodeId: 2,
	});
	t.true(cc.expectsCCResponse());
});

test("FibaroVenetianBlindCCSet => FibaroVenetianBlindCCReport = unexpected", (t) => {
	const ccRequest = new FibaroVenetianBlindCCSet(host, {
		nodeId: 2,
		tilt: 7,
	});
	const ccResponse = new FibaroVenetianBlindCCReport(host, {
		nodeId: 2,
		data: buildCCBuffer(
			Buffer.from([
				FibaroVenetianBlindCCCommand.Report,
				0x03, // with Tilt and Position
				0x01, // Position
				0x07, // Tilt
			]),
		),
	});

	t.false(ccRequest.isExpectedCCResponse(ccResponse));
});

test("FibaroVenetianBlindCCGet => FibaroVenetianBlindCCReport = expected", (t) => {
	const ccRequest = new FibaroVenetianBlindCCGet(host, {
		nodeId: 2,
	});
	const ccResponse = new FibaroVenetianBlindCCReport(host, {
		nodeId: 2,
		data: buildCCBuffer(
			Buffer.from([
				FibaroVenetianBlindCCCommand.Report,
				0x03, // with Tilt and Position
				0x01, // Position
				0x07, // Tilt
			]),
		),
	});

	t.true(ccRequest.isExpectedCCResponse(ccResponse));
});
