import { test as baseTest } from "vitest";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";

interface LocalTestContext {
	context: {
		driver: Driver;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			const { driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				skipControllerIdentification: true,
				skipNodeInterview: true,
			});
			context.driver = driver;

			// Run tests
			await use(context);

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();
		},
		{ auto: true },
	],
});

test("the automatically created callback ID should be incremented and wrap from 0xff back to 1", ({ context, expect }) => {
	const { driver } = context;
	let lastCallbackId: number | undefined;
	for (let i = 0; i <= 300; i++) {
		if (i === 300) {
			throw new Error(
				"incrementing the callback ID does not work somehow",
			);
		}
		const nextCallbackId = driver.getNextCallbackId();
		if (lastCallbackId === 0xff) {
			expect(nextCallbackId).toBe(1);
			break;
		} else if (lastCallbackId != null) {
			expect(nextCallbackId).toBe(lastCallbackId + 1);
		}
		lastCallbackId = nextCallbackId;
	}
});
