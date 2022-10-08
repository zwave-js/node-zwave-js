import test from "ava";
import { CommandClasses } from "./CommandClasses";
import {
	parseApplicationNodeInformation,
	parseNodeUpdatePayload,
} from "./NodeInfo";

test("parseApplicationNodeInformation() should parse correctly", (t) => {
	const payload = Buffer.from([
		0x01, // Remote Controller
		0x02, // Portable Scene Controller
		// Supported CCs
		CommandClasses["Multi Channel"],
		CommandClasses["Multilevel Toggle Switch"],
		0xef, // ======
		// Controlled CCs (ignored in Application Node Info)
		CommandClasses["Multilevel Toggle Switch"],
	]);
	const eif = parseApplicationNodeInformation(payload);

	t.is(eif.genericDeviceClass, 0x01);
	t.is(eif.specificDeviceClass, 0x02);
	t.deepEqual(eif.supportedCCs, [
		CommandClasses["Multi Channel"],
		CommandClasses["Multilevel Toggle Switch"],
	]);
});

test("parseNodeUpdatePayload() should parse correctly", (t) => {
	const payload = Buffer.from([
		5, // NodeID
		5, // remaining length
		0x03, // Slave
		0x01, // Remote Controller
		0x02, // Portable Scene Controller
		// Supported CCs
		CommandClasses["Multi Channel"],
		CommandClasses["Multilevel Toggle Switch"],
	]);
	const nup = parseNodeUpdatePayload(payload);

	t.is(nup.nodeId, 5);
	t.is(nup.basicDeviceClass, 3);
	t.is(nup.genericDeviceClass, 1);
	t.is(nup.specificDeviceClass, 2);

	t.deepEqual(nup.supportedCCs, [
		CommandClasses["Multi Channel"],
		CommandClasses["Multilevel Toggle Switch"],
	]);
});

test("parseNodeUpdatePayload() parses extended CCs correctly", (t) => {
	const payload = Buffer.from([
		5, // NodeID
		9, // remaining length
		0x03,
		0x01,
		0x02, // Portable Scene Controller
		// Supported CCs
		// --> Security Mark
		0xf1,
		0x00,
		CommandClasses["Sensor Configuration"],
		CommandClasses.Supervision,
		// --> some hypothetical CC
		0xfe,
		0xdc,
	]);

	const nup = parseNodeUpdatePayload(payload);
	t.deepEqual(nup.supportedCCs, [
		CommandClasses["Security Mark"],
		CommandClasses["Sensor Configuration"],
		CommandClasses.Supervision,
		0xfedc,
	]);
});
