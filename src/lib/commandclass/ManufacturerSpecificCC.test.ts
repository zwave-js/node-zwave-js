import { CommandClass, getCommandClass } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";
import { ManufacturerSpecificCC } from "./ManufacturerSpecificCC";

describe.skip("lib/commandclass/ManufacturerSpecificCC => ", () => {
	const cc = new ManufacturerSpecificCC(undefined, 2);
	let serialized: Buffer;

	it("should be a CommandClass", () => {
		expect(cc).toBeInstanceOf(CommandClass);
	});
	it(`with command class "Manufacturer Specific"`, () => {
		expect(getCommandClass(cc)).toBe(CommandClasses["Manufacturer Specific"]);
	});

	it("should serialize correctly", () => {
		cc.nodeId = 2;
		serialized = cc.serialize();
		expect(serialized).toEqual(Buffer.from("020100", "hex"));
	});

	it("should deserialize correctly", () => {
		const deserialized = CommandClass.from(undefined, serialized);
		expect(deserialized).toBeInstanceOf(ManufacturerSpecificCC);
		expect(deserialized.nodeId).toBe(cc.nodeId);
	});

});
