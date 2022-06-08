import { CommandClasses } from "./CommandClasses";
import {
	parseApplicationNodeInformation,
	parseNodeUpdatePayload,
} from "./NodeInfo";

describe("lib/node/NodeInfo", () => {
	describe("parseApplicationNodeInformation()", () => {
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

		it("should extract the correct GenericDeviceClass", () => {
			expect(eif.genericDeviceClass).toBe(0x01);
		});

		it("should extract the correct SpecificDeviceClass", () => {
			expect(eif.specificDeviceClass).toBe(0x02);
		});

		it("should report the correct CCs as supported", () => {
			expect(eif.supportedCCs).toContainAllValues([
				CommandClasses["Multi Channel"],
				CommandClasses["Multilevel Toggle Switch"],
			]);
		});
	});

	describe("parseNodeUpdatePayload()", () => {
		const payload = Buffer.from([
			5, // NodeID
			2, // CC list length
			0x03, // Slave
			0x01, // Remote Controller
			0x02, // Portable Scene Controller
			// Supported CCs
			CommandClasses["Multi Channel"],
			CommandClasses["Multilevel Toggle Switch"],
		]);
		const nup = parseNodeUpdatePayload(payload);

		it("should extract the correct node ID", () => {
			expect(nup.nodeId).toBe(5);
		});

		it("should extract the correct BasicDeviceClass", () => {
			expect(nup.basicDeviceClass).toBe(3);
		});

		it("should extract the correct GenericDeviceClass", () => {
			expect(nup.genericDeviceClass).toBe(1);
		});

		it("should extract the correct SpecificDeviceClass", () => {
			expect(nup.specificDeviceClass).toBe(2);
		});

		it("should report the correct CCs as supported", () => {
			expect(nup.supportedCCs).toContainAllValues([
				CommandClasses["Multi Channel"],
				CommandClasses["Multilevel Toggle Switch"],
			]);
		});

		it("correctly parses extended CCs", () => {
			const payload = Buffer.from([
				5, // NodeID
				6, // CC list length
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
			expect(nup.supportedCCs).toContainAllValues([
				CommandClasses["Security Mark"],
				CommandClasses["Sensor Configuration"],
				0xfedc,
				CommandClasses.Supervision,
			]);
		});
	});
});
