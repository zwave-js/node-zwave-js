import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import { GetControllerVersionRequest } from "@zwave-js/serial/serialapi";
import { wait } from "alcalzone-shared/async";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { vi } from "vitest";

import { TaskPriority } from "../../driver/Task.js";
import { integrationTest } from "../integrationTestSuite.js";

for (const state of ["queued", "waiting for ACK"] as const) {
	integrationTest.sequential(
		`shutdown completes when a blocking task's transaction is ${state}`,
		{
			additionalDriverOptions: {
				testingHooks: {
					skipNodeInterview: true,
				},
			},

			async testBody(t, driver, _node, mockController) {
				if (state === "queued") {
					driver["pauseSendQueue"]();
				} else {
					mockController.autoAckHostMessages = false;
					mockController.defineBehavior({
						onHostMessage: () => true,
					});
				}

				const started = createDeferredPromise<void>();
				const cleanup = vi.fn(async () => {});
				const task = driver.scheduler
					.queueTask({
						priority: TaskPriority.Normal,
						// oxlint-disable-next-line require-yield - Model a task that blocks the scheduler on a transaction
						async *task() {
							const command = driver.sendMessage(
								new GetControllerVersionRequest(),
								{ supportCheck: false },
							);
							started.resolve();
							await command;
						},
						cleanup,
					})
					.catch((error: unknown) => error);

				await started;
				if (state === "queued") {
					await t.expect.poll(() => driver["queue"].length).toBe(1);
				} else {
					await mockController.expectHostMessage(
						(msg) =>
							msg.functionType
							=== FunctionType.GetControllerVersion,
						{ preventDefault: true },
					);
				}

				// Exercise production transaction rejection during shutdown
				vi.stubEnv("NODE_ENV", "production");
				try {
					const destroyed = await Promise.race([
						Promise.all([driver.destroy(), driver.destroy()]).then(
							() => true,
						),
						wait(500).then(() => false),
					]);
					t.expect(destroyed).toBe(true);
					assertZWaveError(t.expect, await task, {
						errorCode: ZWaveErrorCodes.Driver_Destroyed,
					});
					t.expect(cleanup).toHaveBeenCalledOnce();
					t.expect(driver["serial"]).toBeUndefined();
					t.expect(driver["_controller"]).toBeUndefined();
				} finally {
					try {
						// Release the task after a failed shutdown assertion
						await driver.rejectTransactions(
							() => true,
							"Test finished",
							ZWaveErrorCodes.Driver_Destroyed,
						);
						driver["destroySerialAPIQueue"](
							"Test finished",
							ZWaveErrorCodes.Driver_Destroyed,
						);
						await driver.destroy();
					} finally {
						vi.unstubAllEnvs();
					}
				}
			},
		},
	);
}
