import fsExtra from "fs-extra";
import { ConfigManager } from "./ConfigManager";
import type { Notification } from "./Notifications";

jest.mock("fs-extra");
const readFileMock = fsExtra.readFile as jest.Mock;
const pathExistsMock = fsExtra.pathExists as jest.Mock;

const dummyNotifications = {
	"0x0a": {
		name: "Dummy Notification",
		variables: [
			{
				name: "Some status",
				states: {
					"0x01": {
						label: "Status 1",
						description: "Some generic description",
						version: 2,
					},
					"0x02": {
						label: "Status 2",
						version: 4,
					},
				},
			},
		],
		events: {
			"0x03": {
				label: "An event",
				version: 1,
			},
		},
	},
};

describe("lib/config/Notifications", () => {
	describe("lookupNotification (with missing file)", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(false);
			readFileMock.mockRejectedValue(new Error("File does not exist"));

			configManager = new ConfigManager();
			await configManager.loadNotifications();
		});

		it("does not throw", () => {
			expect(() => configManager.lookupNotification(0)).not.toThrow();
		});

		it("returns undefined", () => {
			expect(configManager.lookupNotification(0x0e)).toBeUndefined();
			expect(configManager.lookupNotification(0xff)).toBeUndefined();
		});
	});

	describe("lookupNotification (with invalid file)", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(`{"0x01": `);

			configManager = new ConfigManager();
			await configManager.loadNotifications();
		});

		it("does not throw", () => {
			expect(() => configManager.lookupNotification(0x0e)).not.toThrow();
		});

		it("returns undefined", () => {
			expect(configManager.lookupNotification(0x0e)).toBeUndefined();
		});
	});

	describe("lookupNotification()", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(JSON.stringify(dummyNotifications));

			configManager = new ConfigManager();
			await configManager.loadNotifications();
		});

		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockClear();
		});

		it("returns the notification definition if it is defined", () => {
			const test1 = configManager.lookupNotification(0x0a);
			expect(test1).not.toBeUndefined();
			expect(test1!.name).toBe("Dummy Notification");

			expect(configManager.lookupNotification(0xff)).toBeUndefined();
		});
	});

	describe("lookupValue()", () => {
		let notification: Notification;

		let configManager: ConfigManager;

		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(JSON.stringify(dummyNotifications));

			configManager = new ConfigManager();
			await configManager.loadNotifications();
		});

		beforeEach(async () => {
			notification = configManager.lookupNotification(0x0a)!;
			expect(notification).not.toBeUndefined();
		});

		it("returns undefined if nothing was defined with the given value", () => {
			const undefinedValue = notification.lookupValue(0xffff);
			expect(undefinedValue).toBeUndefined();
		});

		it("returns the type of the value and its definition otherwise", () => {
			const actual = notification.lookupValue(0x01);
			expect(actual).toMatchObject({
				variableName: "Some status",
				value: 1,
				label: "Status 1",
				description: "Some generic description",
			});
		});
	});
});
