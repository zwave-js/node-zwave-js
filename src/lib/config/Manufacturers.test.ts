import fsExtra from "fs-extra";
import { lookupManufacturer } from "./Manufacturers";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;

describe("lib/config/Manufacturers", () => {
	describe("lookupManufacturer()", () => {
		beforeEach(() => {
			readFileMock.mockClear();
		});

		beforeAll(() => {
			readFileMock.mockResolvedValue(
				JSON.stringify({
					"0x000e": "Test",
				}),
			);
		});

		it("caches the file contents", async () => {
			await lookupManufacturer(0);
			expect(fsExtra.readFile).toBeCalledTimes(1);

			await lookupManufacturer(1);
			expect(fsExtra.readFile).toBeCalledTimes(1);
		});

		it("returns the name belonging to the manufacturer ID if it is defined", async () => {
			await expect(lookupManufacturer(0x0e)).resolves.toBe("Test");
			await expect(lookupManufacturer(0xff)).resolves.toBeUndefined();
		});
	});
});
