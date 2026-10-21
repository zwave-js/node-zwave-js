import {
	CommandClasses,
	ControllerStatus,
	InterviewStage,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import {
	GetControllerIdRequest,
	GetNodeProtocolInfoRequest,
	GetRoutingInfoRequest,
	RequestNodeNeighborUpdateRequest,
	isSendData,
} from "@zwave-js/serial/serialapi";
import { getDefaultMockControllerCapabilities } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";

import { integrationTest } from "../integrationTestSuite.js";

for (const operation of [
	"interview protocol info query",
	"interview ping",
	"network route rebuilding",
	"node route rebuilding",
	"firmware update",
] as const) {
	integrationTest.sequential(
		`failed reconnection destroys the driver during ${operation}`,
		{
			connectViaTCP: true,
			controllerCapabilities: {
				supportedFunctionTypes: [
					...getDefaultMockControllerCapabilities()
						.supportedFunctionTypes,
					FunctionType.GetRoutingInfo,
					FunctionType.RequestNodeNeighborUpdate,
				],
			},
			nodeCapabilities: {
				isListening: true,
			},
			additionalDriverOptions: {
				testingHooks: {
					skipNodeInterview: true,
				},
				timeouts: {
					ack: 400,
				},
				attempts: {
					controller: 1,
					openSerialPort: 1,
				},
			},

			async testBody(
				t,
				driver,
				node,
				mockController,
				_mockNode,
				context,
			) {
				t.expect(node.interviewStage).toBe(InterviewStage.None);
				if (operation !== "interview protocol info query") {
					await node["queryProtocolInfo"]();
				}
				if (operation === "firmware update") {
					node.addCC(CommandClasses["Firmware Update Meta Data"], {
						isSupported: true,
						version: 1,
					});
				}

				// Keep the established connection open, but refuse reconnection
				context.tcpServer!.close();
				mockController.autoAckHostMessages = false;
				mockController.defineBehavior({
					onHostMessage: () => true,
				});

				const unresponsive = createDeferredPromise<void>();
				driver.controller.on("status changed", (status) => {
					if (status === ControllerStatus.Unresponsive) {
						unresponsive.resolve();
					}
				});
				const driverError = createDeferredPromise<Error>();
				driver.on("error", (error) => driverError.resolve(error));

				const command = driver
					.sendMessage(new GetControllerIdRequest(), {
						supportCheck: false,
					})
					.catch((error: unknown) => error);

				await unresponsive;
				let task: Promise<unknown>;
				if (operation === "network route rebuilding") {
					t.expect(driver.controller.beginRebuildingRoutes()).toBe(
						true,
					);
					task = driver.scheduler.findTask(
						(task) => task.tag?.id === "rebuild-routes",
					)!;
				} else if (operation === "node route rebuilding") {
					task = driver.controller.rebuildNodeRoutes(node.id);
				} else if (operation === "firmware update") {
					task = node.updateFirmware([{ data: new Uint8Array([1]) }]);
				} else {
					task = driver.interviewNodeInternal(node);
				}
				const taskResult = task.catch((error: unknown) => error);
				try {
					// Recovery holds normal transactions until the controller responds
					await t.expect
						.poll(() =>
							driver["queue"].find(({ message }) => {
								switch (operation) {
									case "interview protocol info query":
										return (
											message
											instanceof GetNodeProtocolInfoRequest
										);
									case "interview ping":
									case "firmware update":
										return isSendData(message);
									case "network route rebuilding":
										return (
											message
											instanceof GetRoutingInfoRequest
										);
									case "node route rebuilding":
										return (
											message
											instanceof RequestNodeNeighborUpdateRequest
										);
								}
							}),
						)
						.toBeDefined();

					assertZWaveError(t.expect, await command, {
						errorCode: ZWaveErrorCodes.Controller_Timeout,
						context: "ACK",
					});
					assertZWaveError(t.expect, await driverError, {
						errorCode: ZWaveErrorCodes.Driver_Failed,
					});

					const destroyed = await Promise.race([
						driver.destroy().then(() => true),
						wait(1000).then(() => false),
					]);
					t.expect(destroyed).toBe(true);
					const result = await taskResult;
					if (!operation.startsWith("interview ")) {
						assertZWaveError(t.expect, result, {
							errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
						});
					} else {
						t.expect(result).toBeUndefined();
					}
					t.expect(driver["serial"]).toBeUndefined();
					t.expect(driver["_controller"]).toBeUndefined();
				} finally {
					// Release a blocked task even when the shutdown assertion fails
					await driver.rejectTransactions(
						() => true,
						"Test finished",
						ZWaveErrorCodes.Driver_TaskRemoved,
					);
				}
			},
		},
	);
}
