import { createEmptyMockDriver } from "../../../test/mocks";
import {
	SendDataRequest,
	TransmitOptions,
} from "../controller/SendDataMessages";
import { CommandClass, getCommandClass } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";
import { ZWavePlusCC, ZWavePlusCommand } from "./ZWavePlusCC";

const fakeDriver = createEmptyMockDriver();

describe("lib/commandclass/ZWavePlusCC => ", () => {
	const cc = new ZWavePlusCC(fakeDriver, { nodeId: 9 });
	let serialized: Buffer;

	it("should be a CommandClass", () => {
		expect(cc).toBeInstanceOf(CommandClass);
	});
	it(`with command class "Z-Wave Plus Info"`, () => {
		expect(getCommandClass(cc)).toBe(CommandClasses["Z-Wave Plus Info"]);
	});

	it("should serialize correctly", () => {
		const req = new SendDataRequest(fakeDriver, {
			command: cc,
			transmitOptions: TransmitOptions.DEFAULT,
			callbackId: 36,
		});
		cc.ccCommand = ZWavePlusCommand.Get;
		serialized = req.serialize();
		// A real message from OZW
		expect(serialized).toEqual(
			Buffer.from("0109001309025e012524b0", "hex"),
		);
	});
});
