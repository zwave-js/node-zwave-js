import * as fsExtra from "fs-extra";
import * as path from "path";
import { lookupDevice } from "./Devices";
import { configDir } from "./utils";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

describe("lib/config/Devices", () => {
	describe("lookupDevice()", () => {
		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockReset();
		});

		it("tests if the corresponding file exists", async () => {
			pathExistsMock.mockResolvedValue(false);
			await lookupDevice(1, 2, 3);
			expect(pathExistsMock).toBeCalledTimes(1);
			const expectedPath = path.join(
				configDir,
				"devices/0x0001/0x0002/0x0003.json",
			);
			expect(pathExistsMock.mock.calls[0][0]).toBe(expectedPath);
		});

		it("tests the file with a firmware suffix first if a firmware version is provided", async () => {
			pathExistsMock.mockResolvedValue(false);
			await lookupDevice(1, 2, 3, "1.5");
			expect(pathExistsMock).toBeCalledTimes(2);

			const expectedPathWithVersion = path.join(
				configDir,
				"devices/0x0001/0x0002/0x0003_1.5.json",
			);
			expect(pathExistsMock.mock.calls[0][0]).toBe(
				expectedPathWithVersion,
			);

			const expectedPathFallback = path.join(
				configDir,
				"devices/0x0001/0x0002/0x0003.json",
			);
			expect(pathExistsMock.mock.calls[1][0]).toBe(expectedPathFallback);
		});

		it("returns the contents of a found file, parsed as JSON5", async () => {
			// The first attempt at reading the file should succeed
			pathExistsMock.mockResolvedValue(true);
			// Return a dummy file that must be parsed as JSON5
			readFileMock.mockResolvedValue(
				`// Aeotec ZW100 MultiSensor 6
{
	"name": "MultiSensor 6",
	"configuration": {
		"paramInformation": {
			"2": { /* nothing here */}
		}
	}
}`,
			);

			const result = await lookupDevice(1, 2, 3, "1.5");
			expect(result).toBeDefined();
			expect(result!.name).toBe("MultiSensor 6");
		});
	});
});
