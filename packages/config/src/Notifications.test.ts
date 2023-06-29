import test, { type ExecutionContext } from "ava";
import fsExtra from "fs-extra";
import sinon from "sinon";
import { ConfigManager } from "./ConfigManager";
import type { Notification } from "./Notifications";

const readFileStub = sinon.stub(fsExtra, "readFile");
const pathExistsStub = sinon.stub(fsExtra, "pathExists");

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

{
	async function prepareTest(t: ExecutionContext): Promise<ConfigManager> {
		// Loading configuration may take a while on CI
		t.timeout(30000);

		pathExistsStub.reset();
		readFileStub.reset();
		pathExistsStub.resolves(false);
		readFileStub.rejects(new Error("File does not exist"));

		const configManager = new ConfigManager();
		await configManager.loadNotifications();
		return configManager;
	}

	test.serial(
		"lookupNotification (with missing file) does not throw",
		async (t) => {
			const configManager = await prepareTest(t);
			t.notThrows(() => configManager.lookupNotification(0));
		},
	);

	test.serial(
		"lookupNotification (with missing file) returns undefined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.is(configManager.lookupNotification(0x0e), undefined);
			t.is(configManager.lookupNotification(0xff), undefined);
		},
	);
}

{
	async function prepareTest(t: ExecutionContext): Promise<ConfigManager> {
		// Loading configuration may take a while on CI
		t.timeout(30000);

		pathExistsStub.reset();
		readFileStub.reset();
		pathExistsStub.resolves(true);
		readFileStub.resolves(`{"0x01": ` as any);

		const configManager = new ConfigManager();
		await configManager.loadNotifications();
		return configManager;
	}

	test.serial(
		"lookupNotification (with invalid file) does not throw",
		async (t) => {
			const configManager = await prepareTest(t);
			t.notThrows(() => configManager.lookupNotification(0x0e));
		},
	);

	test.serial(
		"lookupNotification (with invalid file) returns undefined",
		async (t) => {
			const configManager = await prepareTest(t);
			t.is(configManager.lookupNotification(0x0e), undefined);
		},
	);
}

{
	async function prepareTest(t: ExecutionContext): Promise<ConfigManager> {
		// Loading configuration may take a while on CI
		t.timeout(30000);

		readFileStub.reset();
		pathExistsStub.reset();
		pathExistsStub.resolves(true);
		readFileStub.resolves(JSON.stringify(dummyNotifications) as any);

		const configManager = new ConfigManager();
		await configManager.loadNotifications();
		return configManager;
	}

	test.serial(
		"lookupNotification() returns the notification definition if it is defined",
		async (t) => {
			const configManager = await prepareTest(t);
			const test1 = configManager.lookupNotification(0x0a);
			t.not(test1, undefined);
			t.is(test1!.name, "Dummy Notification");

			t.is(configManager.lookupNotification(0xff), undefined);
		},
	);
}

{
	async function prepareTest(t: ExecutionContext): Promise<Notification> {
		// Loading configuration may take a while on CI
		t.timeout(30000);

		pathExistsStub.reset();
		readFileStub.reset();
		pathExistsStub.resolves(true);
		readFileStub.resolves(JSON.stringify(dummyNotifications) as any);

		const configManager = new ConfigManager();
		await configManager.loadNotifications();

		const notification = configManager.lookupNotification(0x0a)!;
		t.not(notification, undefined);

		return notification;
	}

	test.serial(
		"lookupValue() returns undefined if nothing was defined with the given value",
		async (t) => {
			const notification = await prepareTest(t);
			const undefinedValue = notification.lookupValue(0xffff);
			t.is(undefinedValue, undefined);
		},
	);

	test.serial(
		"lookupValue() returns the type of the value and its definition otherwise",
		async (t) => {
			const notification = await prepareTest(t);
			const actual = notification.lookupValue(0x01);
			t.like(actual, {
				variableName: "Some status",
				value: 1,
				label: "Status 1",
				description: "Some generic description",
			});
		},
	);
}
