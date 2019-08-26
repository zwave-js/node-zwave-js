import fsExtra from "fs-extra";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

describe("lib/config/Manufacturers", () => {
	describe("lookupManufacturer()", () => {
		let lookupManufacturer: typeof import("./Manufacturers").lookupManufacturer;

		beforeAll(() => {
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(
				JSON.stringify({
					"0x000e": "Test",
				}),
			);
			jest.isolateModules(() => {
				lookupManufacturer = require("./Manufacturers")
					.lookupManufacturer;
			});
		});

		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockClear();
		});

		it("caches the file contents", async () => {
			await lookupManufacturer(0);
			expect(fsExtra.readFile).toBeCalledTimes(1);
			expect(fsExtra.pathExists).toBeCalledTimes(1);

			await lookupManufacturer(1);
			expect(fsExtra.readFile).toBeCalledTimes(1);
			expect(fsExtra.pathExists).toBeCalledTimes(1);
		});

		it("returns the name belonging to the manufacturer ID if it is defined", async () => {
			await expect(lookupManufacturer(0x0e)).resolves.toBe("Test");
			await expect(lookupManufacturer(0xff)).resolves.toBeUndefined();
		});
	});

	describe("lookupManufacturer (with missing file)", () => {
		let lookupManufacturer: typeof import("./Manufacturers").lookupManufacturer;

		beforeAll(() => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(false);
			readFileMock.mockRejectedValue(new Error("File does not exist"));
			jest.isolateModules(() => {
				lookupManufacturer = require("./Manufacturers")
					.lookupManufacturer;
			});
		});

		it("does not throw", async () => {
			await expect(lookupManufacturer(0)).not.toReject();
		});

		it("tries finding the file only once", async () => {
			await lookupManufacturer(0);
			expect(fsExtra.readFile).toBeCalledTimes(0);
			expect(fsExtra.pathExists).toBeCalledTimes(1);

			await lookupManufacturer(1);
			expect(fsExtra.readFile).toBeCalledTimes(0);
			expect(fsExtra.pathExists).toBeCalledTimes(1);
		});

		it("returns undefined", async () => {
			await expect(lookupManufacturer(0x0e)).resolves.toBeUndefined();
			await expect(lookupManufacturer(0xff)).resolves.toBeUndefined();
		});
	});

	describe("lookupManufacturer (with invalid file)", () => {
		let lookupManufacturer: typeof import("./Manufacturers").lookupManufacturer;

		beforeAll(() => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(`{"0x000e": `);
			jest.isolateModules(() => {
				lookupManufacturer = require("./Manufacturers")
					.lookupManufacturer;
			});
		});

		it("does not throw", async () => {
			await expect(lookupManufacturer(0x0e)).not.toReject();
		});

		it("tries loading the file only once", async () => {
			await lookupManufacturer(0);
			expect(fsExtra.readFile).toBeCalledTimes(1);

			await lookupManufacturer(1);
			expect(fsExtra.readFile).toBeCalledTimes(1);
		});

		it("returns undefined", async () => {
			await expect(lookupManufacturer(0x0e)).resolves.toBeUndefined();
		});
	});
});
