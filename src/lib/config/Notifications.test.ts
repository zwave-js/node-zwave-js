import fsExtra from "fs-extra";
import {
	loadNotifications,
	lookupNotification,
	Notification,
} from "./Notifications";

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

// I don't get why these tests don't play nice with the unsuccessful ones
// But since I see no other way, they are now in their own file

describe("lib/config/Notifications", () => {
	describe("lookupNotification (with missing file)", () => {
		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(false);
			readFileMock.mockRejectedValue(new Error("File does not exist"));
			await loadNotifications();
		});

		it("does not throw", () => {
			expect(() => lookupNotification(0)).not.toThrow();
		});

		it("returns undefined", () => {
			expect(lookupNotification(0x0e)).toBeUndefined();
			expect(lookupNotification(0xff)).toBeUndefined();
		});
	});

	describe("lookupNotification (with invalid file)", () => {
		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(`{"0x01": `);

			await loadNotifications();
		});

		it("does not throw", () => {
			expect(() => lookupNotification(0x0e)).not.toThrow();
		});

		it("returns undefined", () => {
			expect(lookupNotification(0x0e)).toBeUndefined();
		});
	});

	describe("lookupNotification()", () => {
		beforeAll(async () => {
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(JSON.stringify(dummyNotifications));

			await loadNotifications();
		});

		beforeEach(() => {
			readFileMock.mockClear();
			pathExistsMock.mockClear();
		});

		it("returns the notification definition if it is defined", () => {
			const test1 = lookupNotification(0x0a);
			expect(test1).not.toBeUndefined();
			expect(test1!.name).toBe("Dummy Notification");

			expect(lookupNotification(0xff)).toBeUndefined();
		});
	});

	describe("lookupValue()", () => {
		let notification: Notification;

		beforeAll(async () => {
			pathExistsMock.mockClear();
			readFileMock.mockClear();
			pathExistsMock.mockResolvedValue(true);
			readFileMock.mockResolvedValue(JSON.stringify(dummyNotifications));

			await loadNotifications();
		});

		beforeEach(async () => {
			notification = lookupNotification(0x0a)!;
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
