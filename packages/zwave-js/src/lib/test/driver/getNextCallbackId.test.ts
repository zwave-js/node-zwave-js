import ava, { type TestFn } from "ava";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";

interface TestContext {
	driver: Driver;
}

const test = ava as TestFn<TestContext>;

test.beforeEach(async (t) => {
	t.timeout(30000);
	const { driver } = await createAndStartTestingDriver({
		loadConfiguration: false,
		skipControllerIdentification: true,
		skipNodeInterview: true,
	});
	t.context.driver = driver;
});

test.afterEach.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

test("the automatically created callback ID should be incremented and wrap from 0xff back to 1", (t) => {
	const { driver } = t.context;
	let lastCallbackId: number | undefined;
	for (let i = 0; i <= 300; i++) {
		if (i === 300) {
			throw new Error(
				"incrementing the callback ID does not work somehow",
			);
		}
		const nextCallbackId = driver.getNextCallbackId();
		if (lastCallbackId === 0xff) {
			t.is(nextCallbackId, 1);
			break;
		} else if (lastCallbackId != null) {
			t.is(nextCallbackId, lastCallbackId + 1);
		}
		lastCallbackId = nextCallbackId;
	}
});
