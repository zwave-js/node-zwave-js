import { createEmptyMockDriver } from "../../../../test/mocks";
import { ApplicationCommandRequest } from "../../controller/ApplicationCommandRequest";
import { SendDataRequest, SendDataRequestTransmitReport, TransmitStatus } from "../../controller/SendDataMessages";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { CommandClasses } from "../CommandClasses";
import { MANUFACTURERID_FIBARO } from "./Constants";
import { FibaroCCIDs, FibaroVenetianBlindCCCommand, FibaroVenetianBlindCCGet, FibaroVenetianBlindCCReport, FibaroVenetianBlindCCSet } from "./Fibaro";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
const node2 = new ZWaveNode(2, fakeDriver as any);
(fakeDriver.controller!.nodes as any).set(2, node2);

describe("lib/commandclass/manufacturerProprietary/Fibaro => ", () => {
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

		it("FibaroVenetianBlindCCGet => FibaroVenetianBlindCCReport = unexpected", () => {
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

			expect(msgRequest.testResponse(msgResponse)).toBe("unexpected");
		});
	});
});
