import { BasicCCSet } from "@zwave-js/cc/BasicCC";
import {
	TransactionState,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import {
	GetControllerVersionRequest,
	isSendData,
} from "@zwave-js/serial/serialapi";
import { wait } from "alcalzone-shared/async";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { vi } from "vitest";

import { integrationTest } from "../integrationTestSuite.js";

integrationTest.sequential(
	"Serial API commands added after shutdown reject immediately",
	{
		additionalDriverOptions: {
			testingHooks: { skipNodeInterview: true },
		},
		async testBody(t, driver, _node, mockController) {
			await driver.destroy();
			const result = await Promise.race([
				driver["queueSerialAPICommand"](
					new GetControllerVersionRequest(),
				).catch((error: unknown) => error),
				wait(500).then(() => "still pending"),
			]);
			assertZWaveError(t.expect, result, {
				errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
			});
			t.expect(driver["serialAPIQueue"].length).toBe(0);
			t.expect(mockController.receivedHostMessages).toHaveLength(0);
		},
	},
);

integrationTest.sequential(
	"shutdown rejects a generated command that resumes after the queues close",
	{
		additionalDriverOptions: {
			testingHooks: { skipNodeInterview: true },
		},
		async testBody(t, driver, node, mockController) {
			const validating = createDeferredPromise<void>();
			const release = createDeferredPromise<void>();
			const finalized = vi.spyOn(driver["queue"], "finalizeTransaction");
			vi.spyOn(driver, "exceedsMaxPayloadLength").mockImplementationOnce(
				async () => {
					validating.resolve();
					await release;
					return false;
				},
			);
			const command = driver
				.sendCommand(
					new BasicCCSet({ nodeId: node.id, targetValue: 1 }),
					{
						autoEncapsulate: false,
						useSupervision: false,
						supportCheck: false,
					},
				)
				.catch((error: unknown) => error);
			await validating;

			vi.stubEnv("NODE_ENV", "production");
			try {
				await driver.destroy();
				release.resolve();
				const result = await Promise.race([
					command,
					wait(500).then(() => "still pending"),
				]);
				assertZWaveError(t.expect, result, {
					errorCode: ZWaveErrorCodes.Driver_Destroyed,
				});
				await t.expect.poll(() => finalized.mock.calls.length).toBe(1);
				t.expect(
					mockController.receivedHostMessages.some(isSendData),
				).toBe(false);
				t.expect(driver["serialAPIQueue"].length).toBe(0);
			} finally {
				release.resolve();
				vi.unstubAllEnvs();
			}
		},
	},
);

integrationTest.sequential(
	"shutdown rejects commands retried from rejection callbacks",
	{
		additionalDriverOptions: {
			testingHooks: { skipNodeInterview: true },
		},
		async testBody(t, driver, _node, mockController) {
			driver["pauseSendQueue"]();
			let synchronousRetry: Promise<unknown> | undefined;
			let internalRetry: Promise<unknown> | undefined;
			const command = driver
				.sendMessage(new GetControllerVersionRequest(), {
					onProgress: ({ state }) => {
						if (state === TransactionState.Failed) {
							synchronousRetry = driver
								.sendMessage(new GetControllerVersionRequest())
								.catch((error: unknown) => error);
							internalRetry = driver["queueSerialAPICommand"](
								new GetControllerVersionRequest(),
							).catch((error: unknown) => error);
						}
					},
				})
				.catch((error: unknown) => error);
			const asynchronousRetry = command.then(() =>
				driver
					.sendMessage(new GetControllerVersionRequest())
					.catch((error: unknown) => error),
			);

			vi.stubEnv("NODE_ENV", "production");
			try {
				await driver.destroy();
				assertZWaveError(t.expect, await command, {
					errorCode: ZWaveErrorCodes.Driver_Destroyed,
				});
				for (const retry of [synchronousRetry, asynchronousRetry]) {
					t.expect(retry).toBeDefined();
					assertZWaveError(t.expect, await retry, {
						errorCode: ZWaveErrorCodes.Driver_NotReady,
					});
				}
				t.expect(internalRetry).toBeDefined();
				const internalResult = await Promise.race([
					internalRetry,
					wait(500).then(() => "still pending"),
				]);
				assertZWaveError(t.expect, internalResult, {
					errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
				});
				t.expect(driver["queue"].length).toBe(0);
				t.expect(driver["immediateQueue"].length).toBe(0);
				t.expect(driver["serialAPIQueue"].length).toBe(0);
				t.expect(mockController.receivedHostMessages).toHaveLength(0);
			} finally {
				vi.unstubAllEnvs();
			}
		},
	},
);

for (const trigger of ["queued", "superseded"] as const) {
	integrationTest.sequential(
		`shutdown during ${trigger} progress rejects the in-flight enqueue`,
		{
			additionalDriverOptions: {
				testingHooks: { skipNodeInterview: true },
			},
			async testBody(t, driver, node, mockController) {
				driver["pauseSendQueue"]();
				let destroyed: Promise<void> | undefined;
				const options = {
					autoEncapsulate: false,
					useSupervision: false,
					supportCheck: false,
				} as const;

				vi.stubEnv("NODE_ENV", "production");
				try {
					let command = driver
						.sendCommand(
							new BasicCCSet({ nodeId: node.id, targetValue: 1 }),
							{
								...options,
								onProgress: ({ state }) => {
									if (
										state
										=== (trigger === "queued"
											? TransactionState.Queued
											: TransactionState.Failed)
									) {
										destroyed = driver.destroy();
									}
								},
							},
						)
						.catch((error: unknown) => error);
					if (trigger === "superseded") {
						const original = command;
						command = driver
							.sendCommand(
								new BasicCCSet({
									nodeId: node.id,
									targetValue: 2,
								}),
								options,
							)
							.catch((error: unknown) => error);
						assertZWaveError(t.expect, await original, {
							errorCode:
								ZWaveErrorCodes.Controller_MessageSuperseded,
						});
					}

					t.expect(destroyed).toBeDefined();
					const result = await Promise.race([
						Promise.all([command, destroyed]).then(
							([result]) => result,
						),
						wait(500).then(() => "still pending"),
					]);
					assertZWaveError(t.expect, result, {
						errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
					});
					t.expect(driver["queue"].length).toBe(0);
					t.expect(driver["serialAPIQueue"].length).toBe(0);
					t.expect(mockController.receivedHostMessages).toHaveLength(
						0,
					);
				} finally {
					vi.unstubAllEnvs();
				}
			},
		},
	);
}
