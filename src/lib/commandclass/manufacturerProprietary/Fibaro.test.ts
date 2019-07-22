import { createEmptyMockDriver } from "../../../../test/mocks";
import { IDriver } from "../../driver/IDriver";
import { CommandClasses } from "../CommandClasses";
import { ManufacturerProprietaryCC } from "../ManufacturerProprietaryCC";
import { FibaroVenetianBlindCCSet } from "./Fibaro";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

describe("lib/commandclass/manufacturerProprietary/Fibaro => ", () => {
	it("the set tilt command should serialize correctly", () => {
		const mpCC = new ManufacturerProprietaryCC(fakeDriver, {
			nodeId: 1,
			manufacturerId: 0x010f,
			proprietaryCommand: new FibaroVenetianBlindCCSet({ tilt: 99 }),
		});
		const expected = Buffer.from([
			1, // node number
			8, // remaining length
			CommandClasses["Manufacturer Proprietary"], // CC
			0x01,
			0x0f,
			0x26,
			0x01,
			0x01,
			0x00,
			0x63,
		]);
		expect(mpCC.serialize()).toEqual(expected);
	});
});
