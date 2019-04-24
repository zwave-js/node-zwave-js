import { CommandClass, getCommandClass } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";
import {
	ManufacturerSpecificCC,
	ManufacturerSpecificCCGet,
} from "./ManufacturerSpecificCC";

describe("lib/commandclass/ManufacturerSpecificCC => ", () => {
	const cc = new ManufacturerSpecificCCGet(undefined as any, { nodeId: 2 });
	let serialized: Buffer;

	it("should be a CommandClass", () => {
		expect(cc).toBeInstanceOf(CommandClass);
	});
	it(`with command class "Manufacturer Specific"`, () => {
		expect(getCommandClass(cc)).toBe(
			CommandClasses["Manufacturer Specific"],
		);
	});

	it("should serialize correctly", () => {
		serialized = cc.serialize();
		expect(serialized).toEqual(Buffer.from("02027204", "hex"));
	});

	it("should deserialize correctly", () => {
		const deserialized = CommandClass.from(undefined as any, serialized);
		expect(deserialized).toBeInstanceOf(ManufacturerSpecificCC);
		expect(deserialized.nodeId).toBe(cc.nodeId);
	});
});
