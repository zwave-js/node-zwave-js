// import fsExtra from "fs-extra";

// jest.mock("fs-extra");
// const readFileMock = fsExtra.readFile as jest.Mock;
// const pathExistsMock = fsExtra.pathExists as jest.Mock;

// const dummyNotifications = {
// 	"0x0a": {
// 		name: "Dummy Notification",
// 		variables: [
// 			{
// 				name: "Some status",
// 				states: {
// 					"0x01": {
// 						label: "Status 1",
// 						description: "Some generic description",
// 						version: 2,
// 					},
// 					"0x02": {
// 						label: "Status 2",
// 						version: 4,
// 					},
// 				},
// 			},
// 		],
// 		events: {
// 			"0x03": {
// 				label: "An event",
// 				version: 1,
// 			},
// 		},
// 	},
// };

// // I don't get why these tests don't play nice with the unsuccessful ones
// // But since I see no other way, they are now in their own file

// describe("lib/config/Notifications", () => {
// 	describe("lookupNotification()", () => {
// 		let lookupNotification: typeof import("./Notifications").lookupNotification;

// 		beforeAll(() => {
// 			pathExistsMock.mockResolvedValue(true);
// 			readFileMock.mockResolvedValue(JSON.stringify(dummyNotifications));

// 			jest.isolateModules(() => {
// 				lookupNotification = require("./Notifications")
// 					.lookupNotification;
// 			});
// 		});

// 		beforeEach(() => {
// 			readFileMock.mockClear();
// 			pathExistsMock.mockClear();
// 		});

// 		it("caches the file contents", async () => {
// 			await lookupNotification(0);
// 			expect(fsExtra.readFile).toBeCalledTimes(1);
// 			expect(fsExtra.pathExists).toBeCalledTimes(1);

// 			await lookupNotification(1);
// 			expect(fsExtra.readFile).toBeCalledTimes(1);
// 			expect(fsExtra.pathExists).toBeCalledTimes(1);
// 		});

// 		it("returns the notification definition if it is defined", async () => {
// 			const test1 = await lookupNotification(0x0a);
// 			expect(test1).not.toBeUndefined();
// 			expect(test1!.name).toBe("Dummy Notification");

// 			await expect(lookupNotification(0xff)).resolves.toBeUndefined();
// 		});
// 	});

// 	describe("lookupValue()", () => {
// 		let notification: import("./Notifications").Notification;
// 		let lookupNotification: typeof import("./Notifications").lookupNotification;

// 		beforeAll(() => {
// 			pathExistsMock.mockClear();
// 			readFileMock.mockClear();
// 			pathExistsMock.mockResolvedValue(true);
// 			readFileMock.mockResolvedValue(JSON.stringify(dummyNotifications));

// 			jest.isolateModules(() => {
// 				lookupNotification = require("./Notifications")
// 					.lookupNotification;
// 			});
// 		});

// 		beforeEach(async () => {
// 			notification = (await lookupNotification(0x0a))!;
// 			expect(notification).not.toBeUndefined();
// 		});

// 		it("returns undefined if nothing was defined with the given value", async () => {
// 			const undefinedValue = await notification.lookupValue(0xffff);
// 			expect(undefinedValue).toBeUndefined();
// 		});

// 		it("returns the type of the value and its definition otherwise", async () => {
// 			const actual = await notification.lookupValue(0x01);
// 			expect(actual).toMatchObject({
// 				variableName: "Some status",
// 				value: 1,
// 				label: "Status 1",
// 				description: "Some generic description",
// 			});
// 		});
// 	});
// });
