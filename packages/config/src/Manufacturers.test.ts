import fsExtra from "fs-extra";
import { loadManufacturers, lookupManufacturer } from "./Manufacturers";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

describe("lib/config/Manufacturers", () => {
	describe("lookupManufacturer (with missing file)", () => {
		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(false);
			readFileMock.mockRejectedValue(new Error("File does not exist"));
			await loadManufacturers();
		});

		it("does not throw", () => {
			expect(() => lookupManufacturer(0)).not.toThrow();
		});

		it("returns undefined", async () => {
			expect(lookupManufacturer(0x0e)).toBeUndefined();
			expect(lookupManufacturer(0xff)).toBeUndefined();
		});
	});

	describe("lookupManufacturer (with invalid file)", () => {
		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(`{"0x000e": `);
			await loadManufacturers();
		});

		it("does not throw", () => {
			expect(() => lookupManufacturer(0x0e)).not.toThrow();
		});

		it("returns undefined", () => {
			expect(lookupManufacturer(0x0e)).toBeUndefined();
		});
	});

	describe("lookupManufacturer()", () => {
		beforeAll(async () => {
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(
				JSON.stringify({
					"0x000e": "Test",
				}),
			);
			await loadManufacturers();
		});

		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockClear();
		});

		it("returns the name belonging to the manufacturer ID if it is defined", () => {
			expect(lookupManufacturer(0x0e)).toBe("Test");
			expect(lookupManufacturer(0xff)).toBeUndefined();
		});
	});
});
