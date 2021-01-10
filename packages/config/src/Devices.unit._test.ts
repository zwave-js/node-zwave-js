// FIXME: These tests are incompatible with auto-generating the index file

// import fsExtra from "fs-extra";
// import path from "path";
// import { ConfigManager } from "./ConfigManager";
// import { configDir } from "./utils";

// jest.mock("fs-extra");
// const readFileMock = fsExtra.readFile as jest.Mock;
// const pathExistsMock = fsExtra.pathExists as jest.Mock;

// describe("lib/config/Devices", () => {
// 	describe("lookupDevice (with missing index)", () => {
// 		let configManager: ConfigManager;

// 		beforeAll(async () => {
// 			pathExistsMock.mockClear();
// 			readFileMock.mockClear();
// 			pathExistsMock.mockResolvedValue(false);
// 			readFileMock.mockRejectedValue(new Error("File does not exist"));

// 			configManager = new ConfigManager();
// 			await configManager.loadDeviceIndex();
// 		});

// 		it("returns undefined instead of throwing", async () => {
// 			await expect(
// 				configManager.lookupDevice(1, 2, 3),
// 			).resolves.toBeUndefined();
// 			await expect(
// 				configManager.lookupDevice(1, 2, 5),
// 			).resolves.toBeUndefined();
// 		});
// 	});

// 	describe("lookupDevice (with missing file)", () => {
// 		let configManager: ConfigManager;

// 		beforeAll(async () => {
// 			pathExistsMock.mockClear();
// 			readFileMock.mockClear();
// 			pathExistsMock.mockResolvedValueOnce(true).mockResolvedValue(false);
// 			readFileMock
// 				.mockResolvedValueOnce(
// 					// Index
// 					JSON.stringify([
// 						{
// 							manufacturerId: "0x0abc",
// 							productType: "0x0001",
// 							productId: "0x0023",
// 							firmwareVersion: {
// 								min: "0.0",
// 								max: "255.255",
// 							},
// 							filename: "0x0abc/abcdef.json",
// 						},
// 					]),
// 				)
// 				.mockRejectedValue(new Error("File does not exist"));

// 			configManager = new ConfigManager();
// 			await configManager.loadDeviceIndex();
// 		});

// 		it("returns undefined instead of throwing", async () => {
// 			await expect(
// 				configManager.lookupDevice(0x0abc, 0x0001, 0x0023),
// 			).resolves.toBeUndefined();
// 		});
// 	});

// 	describe("lookupManufacturer (with invalid file)", () => {
// 		let configManager: ConfigManager;

// 		beforeAll(async () => {
// 			pathExistsMock.mockClear();
// 			readFileMock.mockClear();
// 			pathExistsMock.mockResolvedValue(true);
// 			readFileMock
// 				.mockResolvedValueOnce(
// 					// Index
// 					JSON.stringify([
// 						{
// 							manufacturerId: "0x0abc",
// 							productType: "0x0001",
// 							productId: "0x0023",
// 							firmwareVersion: {
// 								min: "0.0",
// 								max: "255.255",
// 							},
// 							filename: "0x0abc/abcdef.json",
// 						},
// 					]),
// 				)
// 				.mockResolvedValueOnce(`{`);

// 			configManager = new ConfigManager();
// 			await configManager.loadDeviceIndex();
// 		});

// 		it("returns undefined instead of throwing", async () => {
// 			await expect(
// 				configManager.lookupDevice(0x0abc, 0x0001, 0x0023),
// 			).resolves.toBeUndefined();
// 		});
// 	});

// 	describe("lookupDevice()", () => {
// 		let configManager: ConfigManager;

// 		beforeAll(async () => {
// 			readFileMock.mockReset();
// 			readFileMock.mockResolvedValueOnce(
// 				// Index
// 				JSON.stringify([
// 					{
// 						manufacturerId: "0x0abc",
// 						productType: "0x0001",
// 						productId: "0x0023",
// 						firmwareVersion: {
// 							min: "0.0",
// 							max: "255.255",
// 						},
// 						filename: "0x0abc/abcdef.json",
// 					},
// 					{
// 						manufacturerId: "0x0abc",
// 						productType: "0x0001",
// 						productId: "0x0034",
// 						firmwareVersion: {
// 							min: "0.0",
// 							max: "1.255",
// 						},
// 						filename: "0x0abc/123456.json",
// 					},
// 					{
// 						manufacturerId: "0x0abc",
// 						productType: "0x0001",
// 						productId: "0x0034",
// 						firmwareVersion: {
// 							min: "2.0",
// 							max: "255.255",
// 						},
// 						filename: "0x0abc/123456-8.json",
// 					},
// 				]),
// 			);
// 			pathExistsMock.mockReset();
// 			pathExistsMock.mockResolvedValueOnce(true);

// 			configManager = new ConfigManager();
// 			await configManager.loadDeviceIndex();
// 		});

// 		beforeEach(() => {
// 			readFileMock.mockClear();
// 			pathExistsMock.mockClear();
// 		});

// 		it("tests if the corresponding file exists", async () => {
// 			pathExistsMock.mockResolvedValue(false);
// 			await configManager.lookupDevice(0x0abc, 0x0001, 0x0023);
// 			expect(pathExistsMock).toBeCalledTimes(1);
// 			const expectedPath = path.join(
// 				configDir,
// 				"devices/0x0abc/abcdef.json",
// 			);
// 			expect(pathExistsMock.mock.calls[0][0]).toBe(expectedPath);
// 		});

// 		it("looks up the file with the correct firmware version", async () => {
// 			pathExistsMock.mockResolvedValue(true);
// 			await configManager.lookupDevice(0x0abc, 0x0001, 0x0034, "2.1");
// 			expect(pathExistsMock).toBeCalledTimes(1);
// 			const expectedPath = path.join(
// 				configDir,
// 				"devices/0x0abc/123456-8.json",
// 			);
// 			expect(pathExistsMock.mock.calls[0][0]).toBe(expectedPath);
// 		});

// 		it("returns the contents of a found file, parsed as JSON5", async () => {
// 			// The first attempt at reading the file should succeed
// 			pathExistsMock.mockResolvedValue(true);
// 			// Return a dummy file that must be parsed as JSON5
// 			readFileMock.mockResolvedValue(
// 				`// This is a minimal valid device config
// {
// 	"manufacturer": "Test manufacturer",
// 	"manufacturerId": "0x0abc",
// 	"label": "LABEL",
// 	"description": "desc rip tion",
// 	"devices": [
// 		{
// 			"productType": "0x0001",
// 			"productId": "0x0001"
// 		}
// 	],
// 	"firmwareVersion": {
// 		"min": "0.0",
// 		"max": "255.255"
// 	}
// }`,
// 			);

// 			const result = await configManager.lookupDevice(
// 				0x0abc,
// 				0x0001,
// 				0x0034,
// 				"2.1",
// 			);
// 			expect(result).toBeDefined();
// 			expect(result!.manufacturer).toBe("Test manufacturer");
// 		});

// 		it("does not throw if the JSON file is invalid", async () => {
// 			// The first attempt at reading the file should succeed
// 			pathExistsMock.mockResolvedValue(true);
// 			// Return an invalid JSON file
// 			readFileMock.mockResolvedValue(`{"name": }`);

// 			// return undefined instead of throwing
// 			await expect(
// 				configManager.lookupDevice(0x0abc, 0x0001, 0x0034, "2.1"),
// 			).resolves.toBeUndefined();
// 		});
// 	});
// });
