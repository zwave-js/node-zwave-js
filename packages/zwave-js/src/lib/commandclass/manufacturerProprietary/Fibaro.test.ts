import { CommandClasses } from "@zwave-js/core";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createEmptyMockDriver } from "../../test/mocks";
import { CommandClass } from "../CommandClass";
import {
	getManufacturerIdValueId,
	getProductIdValueId,
	getProductTypeValueId,
} from "../ManufacturerSpecificCC";
import { MANUFACTURERID_FIBARO } from "./Constants";
import {
	FibaroCCIDs,
	FibaroVenetianBlindCCCommand,
	FibaroVenetianBlindCCGet,
	FibaroVenetianBlindCCReport,
	FibaroVenetianBlindCCSet,
} from "./Fibaro";

describe("lib/commandclass/manufacturerProprietary/Fibaro => ", () => {
	let fakeDriver: Driver;
	let node2: ZWaveNode;

	beforeAll(async () => {
		fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
		node2 = new ZWaveNode(2, fakeDriver as any);
		(fakeDriver.controller.nodes as any).set(node2.id, node2);
		await fakeDriver.configManager.loadDeviceIndex();
	}, 60000);

	afterAll(() => {
		node2.destroy();
	});

	beforeAll(async () => {
		const manufacturerId = 0x10f;
		node2.valueDB.setValue(getManufacturerIdValueId(), manufacturerId);

		node2.addCC(CommandClasses["Manufacturer Proprietary"], {
			isSupported: true,
			version: 1,
		});
	});

	it("the set tilt command should serialize correctly", () => {
		const blindCC = new FibaroVenetianBlindCCSet(fakeDriver, {
			nodeId: 2,
			tilt: 99,
		});
		const expected = Buffer.from([
			CommandClasses["Manufacturer Proprietary"], // CC
			0x01,
			0x0f,
			0x26,
			0x01,
			0x01,
			0x00,
			0x63,
		]);
		expect(blindCC.serialize()).toEqual(expected);
	});

	it("FibaroVenetianBlindCCReport should be deserialized correctly", () => {
		const data = Buffer.from("91010f2603030000", "hex");
		const cc = CommandClass.from(fakeDriver as any, { nodeId: 2, data });
		expect(cc).toBeInstanceOf(FibaroVenetianBlindCCReport);
	});

	describe("responses should be detected correctly", () => {
		it("FibaroVenetianBlindCCSet should expect no response", () => {
			const cc = new FibaroVenetianBlindCCSet(fakeDriver, {
				nodeId: 2,
				tilt: 7,
			});
			expect(cc.expectsCCResponse()).toBeFalse();
		});

		it("FibaroVenetianBlindCCGet should expect a response", () => {
			const cc = new FibaroVenetianBlindCCGet(fakeDriver, {
				nodeId: 2,
			});
			expect(cc.expectsCCResponse()).toBeTrue();
		});

		it("FibaroVenetianBlindCCSet => FibaroVenetianBlindCCReport = unexpected", () => {
			const ccRequest = new FibaroVenetianBlindCCSet(fakeDriver, {
				nodeId: 2,
				tilt: 7,
			});
			const ccResponse = new FibaroVenetianBlindCCReport(fakeDriver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses["Manufacturer Specific"],
					MANUFACTURERID_FIBARO >>> 8,
					MANUFACTURERID_FIBARO & 0xff,
					FibaroCCIDs.VenetianBlind,
					FibaroVenetianBlindCCCommand.Report,
					0x03,
					1,
					7,
				]),
			});

			expect(ccRequest.isExpectedCCResponse(ccResponse)).toBeFalse();
		});

		it("FibaroVenetianBlindCCGet => FibaroVenetianBlindCCReport = expected", () => {
			const ccRequest = new FibaroVenetianBlindCCGet(fakeDriver, {
				nodeId: 2,
			});
			const ccResponse = new FibaroVenetianBlindCCReport(fakeDriver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses["Manufacturer Specific"],
					MANUFACTURERID_FIBARO >>> 8,
					MANUFACTURERID_FIBARO & 0xff,
					FibaroCCIDs.VenetianBlind,
					FibaroVenetianBlindCCCommand.Report,
					0x03,
					1,
					7,
				]),
			});

			expect(ccRequest.isExpectedCCResponse(ccResponse)).toBeTrue();
		});
	});

	describe("Fibaro FGR222 should support this CC", () => {
		beforeAll(async () => {
			const productType = 0x0302;
			const productId = 0x1000;
			const firmwareVersion = "25.25";

			node2.valueDB.setValue(getProductTypeValueId(), productType);
			node2.valueDB.setValue(getProductIdValueId(), productId);
			node2.valueDB.setValue(
				{
					commandClass: CommandClasses.Version,
					property: "firmwareVersion",
				},
				firmwareVersion,
			);

			await (node2 as any).loadDeviceConfig();

			(fakeDriver.sendCommand as jest.Mock).mockClear();
		});

		it("loads the correct device config", () => {
			const CCs = node2.deviceConfig?.proprietary?.fibaroCCs ?? [];
			expect(CCs).toContain(0x26);
		});

		it("does the interview correctly", () => {
			const cc = node2.createCCInstance(
				CommandClasses["Manufacturer Proprietary"],
			)!;

			cc.interview().catch(() => {
				// we expect an error, since there will be no response
			});

			expect(fakeDriver.sendCommand).toHaveBeenCalledTimes(1);
			expect(
				(fakeDriver.sendCommand as jest.Mock).mock.calls[0][0],
			).toBeInstanceOf(FibaroVenetianBlindCCGet);
		});
	});
});
