import { createEmptyMockDriver } from "../../../../test/mocks";
import { IDriver } from "../../driver/IDriver";
import { CommandClasses } from "../CommandClasses";
import { FibaroVenetianBlindCCSet } from "./Fibaro";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

describe("lib/commandclass/manufacturerProprietary/Fibaro => ", () => {
	it("the set tilt command should serialize correctly", () => {
		const blindCC = new FibaroVenetianBlindCCSet(fakeDriver, {
			nodeId: 1,
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
});
