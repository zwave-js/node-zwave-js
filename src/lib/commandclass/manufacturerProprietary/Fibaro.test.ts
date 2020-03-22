import { createEmptyMockDriver } from "../../../../test/mocks";
import { loadDeviceIndex } from "../../config/Devices";
import { ApplicationCommandRequest } from "../../controller/ApplicationCommandRequest";
import {
	SendDataRequest,
	SendDataRequestTransmitReport,
	TransmitStatus,
} from "../../controller/SendDataMessages";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { CommandClass } from "../CommandClass";
import { CommandClasses } from "../CommandClasses";
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

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
const node2 = new ZWaveNode(2, fakeDriver as any);
(fakeDriver as any).controller.nodes.set(2, node2);

describe("lib/commandclass/manufacturerProprietary/Fibaro => ", () => {
	beforeAll(async () => {
		const manufacturerId = 0x10f;
		node2.valueDB.setValue(getManufacturerIdValueId(), manufacturerId);

		node2.addCC(CommandClasses["Manufacturer Proprietary"], {
			isSupported: true,
			version: 1,
		});

		await loadDeviceIndex();
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

	describe("testResponse() returns the correct ResponseRole", () => {
		it("FibaroVenetianBlindCCSet => TransmitReport = final", () => {
			const ccRequest = new FibaroVenetianBlindCCSet(fakeDriver, {
				nodeId: 2,
				tilt: 7,
			});

			const msgRequest = new SendDataRequest(fakeDriver, {
				command: ccRequest,
				callbackId: 99,
			});
			const msgResponse = new SendDataRequestTransmitReport(fakeDriver, {
				transmitStatus: TransmitStatus.OK,
				callbackId: msgRequest.callbackId,
			});

			expect(msgRequest.testResponse(msgResponse)).toBe("final");
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

			const msgRequest = new SendDataRequest(fakeDriver, {
				command: ccRequest,
				callbackId: 99,
			});
			const msgResponse = new ApplicationCommandRequest(fakeDriver, {
				command: ccResponse,
			});

			expect(msgRequest.testResponse(msgResponse)).toBe("unexpected");
		});

		it("FibaroVenetianBlindCCGet => FibaroVenetianBlindCCReport = final", () => {
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

			const msgRequest = new SendDataRequest(fakeDriver, {
				command: ccRequest,
				callbackId: 99,
			});
			const msgResponse = new ApplicationCommandRequest(fakeDriver, {
				command: ccResponse,
			});

			expect(msgRequest.testResponse(msgResponse)).toBe("final");
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
