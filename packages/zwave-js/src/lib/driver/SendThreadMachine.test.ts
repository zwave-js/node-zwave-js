import {
	assertZWaveError,
	SecurityManager,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import { interpret, Interpreter } from "xstate";
import { SimulatedClock } from "xstate/lib/SimulatedClock";
import { BasicCCGet, BasicCCReport, BasicCCSet } from "../commandclass/BasicCC";
import {
	SecurityCCCommandEncapsulation,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "../commandclass/SecurityCC";
import { ApplicationCommandRequest } from "../controller/ApplicationCommandRequest";
import {
	SendDataAbort,
	SendDataMulticastRequest,
	SendDataRequest,
} from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import { createEmptyMockDriver } from "../test/mocks";
import type { Driver } from "./Driver";
import {
	createSendThreadMachine,
	SendThreadContext,
	SendThreadEvent,
	SendThreadStateSchema,
} from "./SendThreadMachine";
import {
	createSendDataResolvesImmediately,
	createSendDataResolvesNever,
	dummyMessageNoResponseNoCallback,
} from "./testUtils";
import { Transaction } from "./Transaction";

jest.mock("./SerialAPICommandMachine");
const mockSerialAPIMachine = jest.requireMock("./SerialAPICommandMachine")
	.createSerialAPICommandMachine as jest.Mock;

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
const sm = new SecurityManager({ networkKey: Buffer.alloc(16, 1) });
fakeDriver.securityManager = sm;

// // We need to add a fake node 2 in order to test handshakes
// const node2 = new ZWaveNode(2, fakeDriver);
// node2.addCC(CommandClasses.Security, {
// 	isSupported: true,
// 	secure: true,
// 	version: 1,
// });
// (fakeDriver.controller.nodes as any).set(node2.id, node2);

// // We need control over what the driver sends
// (fakeDriver.sendCommand as jest.Mock).mockReset().mockImplementation(() => {
// 	return new Promise(() => {});
// });

const sendDataBasicSet = new SendDataRequest(fakeDriver, {
	command: new BasicCCSet(fakeDriver, {
		nodeId: 2,
		targetValue: 1,
	}),
});
const sendDataBasicGet = new SendDataRequest(fakeDriver, {
	command: new BasicCCGet(fakeDriver, { nodeId: 2 }),
});

const sendDataMulticastBasicSet = new SendDataMulticastRequest(fakeDriver, {
	command: new BasicCCSet(fakeDriver, {
		nodeId: [1, 2, 3],
		targetValue: 1,
	}),
});

const sendDataBasicSetSecure = new SendDataRequest(fakeDriver, {
	command: new SecurityCCCommandEncapsulation(fakeDriver, {
		nodeId: 2,
		encapsulated: new BasicCCSet(fakeDriver, {
			nodeId: 2,
			targetValue: 1,
		}),
	}),
});
sendDataBasicSetSecure.command.preTransmitHandshake = jest
	.fn()
	.mockResolvedValue(undefined);

const sendDataNonceRequest = new SendDataRequest(fakeDriver, {
	command: new SecurityCCNonceGet(fakeDriver, {
		nodeId: 2,
	}),
});

const defaultImplementations = {
	sendData: createSendDataResolvesNever(),
	createSendDataAbort: () => new SendDataAbort(fakeDriver),
};

describe("lib/driver/SendThreadMachine", () => {
	jest.setTimeout(100);

	let service:
		| undefined
		| Interpreter<
				SendThreadContext,
				SendThreadStateSchema,
				SendThreadEvent,
				any
		  >;

	function createTransaction(msg: Message) {
		return new Transaction(
			fakeDriver,
			msg,
			createDeferredPromise(),
			MessagePriority.Normal,
		);
	}

	beforeEach(() => {
		mockSerialAPIMachine.mockReset();
		(sendDataBasicSetSecure.command
			.preTransmitHandshake as jest.Mock).mockClear();
	});

	afterEach(() => {
		service?.stop();
		service = undefined;
	});

	it(`should start in the idle state`, () => {
		const testMachine = createSendThreadMachine(defaultImplementations);
		service = interpret(testMachine).start();
		expect(service.state.value).toBe("idle");
	});

	describe(`when the machine is idle, ...`, () => {
		it(`should go into "execute" state when a message is queued`, () => {
			const testMachine = createSendThreadMachine(defaultImplementations);
			service = interpret(testMachine).start();

			service.send({
				type: "add",
				transaction: createTransaction(
					dummyMessageNoResponseNoCallback,
				),
			});
			expect(service.state.value).toEqual({ sending: "execute" });
			expect(mockSerialAPIMachine).toBeCalledTimes(1);
		});

		it(`if multiple messages are queued, it should only start the serial API machine once`, () => {
			const testMachine = createSendThreadMachine(defaultImplementations);
			service = interpret(testMachine).start();

			for (let i = 1; i <= 3; i++) {
				service.send({
					type: "add",
					transaction: createTransaction(
						dummyMessageNoResponseNoCallback,
					),
				});
				expect(service.state.value).toEqual({ sending: "execute" });
				expect(mockSerialAPIMachine).toBeCalledTimes(1);
			}
		});
	});

	describe(`executing a command`, () => {
		it("when it succeeds, it should go back to idle state and the transaction should be resolved with the result", async () => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "success",
					result: "FOO",
				},
			} as any);

			const result = await transaction.promise;
			expect(result).toBe("FOO");

			// no more messages
			expect(service.state.value).toBe("idle");
		});

		it("when it fails, it should go back to idle state and the transaction should be rejected with the reason", async () => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "ACK timeout",
				},
			} as any);

			await assertZWaveError(() => transaction.promise, {
				errorCode: ZWaveErrorCodes.Controller_Timeout,
			});

			// no more messages
			expect(service.state.value).toBe("idle");
		});

		it("when it fails due to NOK response, that message should be the error context", async () => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			const result = { isOK: () => false };
			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "response NOK",
					result,
				},
			} as any);

			await assertZWaveError(() => transaction.promise, {
				errorCode: ZWaveErrorCodes.Controller_ResponseNOK,
				context: result,
			});
		});

		it("when it fails due to NOK callback, that message should be the error context", async () => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			const result = { isOK: () => false };
			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "callback NOK",
					result,
				},
			} as any);

			await assertZWaveError(() => transaction.promise, {
				errorCode: ZWaveErrorCodes.Controller_CallbackNOK,
				context: result,
			});
		});

		it("should only execute subsequent commands once the previous one was completed", async () => {
			const t1 = createTransaction(dummyMessageNoResponseNoCallback);
			const t2 = createTransaction(dummyMessageNoResponseNoCallback);
			const testMachine = createSendThreadMachine({
				...defaultImplementations,
				sendData: createSendDataResolvesImmediately(),
			});
			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();

			mockSerialAPIMachine
				.mockImplementationOnce(() => {
					setImmediate(() => {
						service!.send({
							type: "done.invoke.execute",
							data: {
								type: "success",
								result: 1,
							},
						} as any);
					});
				})
				.mockImplementationOnce(() => {
					setImmediate(() => {
						service!.send({
							type: "done.invoke.execute",
							data: {
								type: "success",
								result: 2,
							},
						} as any);
					});
				});

			service.send({ type: "add", transaction: t1 });
			service.send({ type: "add", transaction: t2 });

			clock.increment(100);

			expect(mockSerialAPIMachine).toBeCalledTimes(1);
			await expect(t1.promise).resolves.toBe(1);

			clock.increment(100);

			expect(mockSerialAPIMachine).toBeCalledTimes(2);
			await expect(t2.promise).resolves.toBe(2);
		});
	});

	describe(`executing a SendData command`, () => {
		it("should go into retryWait state if it fails (singlecast)", async () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "ACK timeout",
				},
			} as any);

			expect(service.state.value).toEqual({ sending: "retryWait" });
		});

		it("should go into retryWait state if sending fails (multicast)", async () => {
			const transaction = createTransaction(sendDataMulticastBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "response NOK",
				},
			} as any);

			expect(service.state.value).toEqual({ sending: "retryWait" });
		});

		it("Multicast commands should not be retried if one or more nodes did not respond", async () => {
			const transaction = createTransaction(sendDataMulticastBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "callback NOK",
					result: { transmitStatus: 1 },
				},
			} as any);

			await assertZWaveError(() => transaction.promise, {
				errorCode: ZWaveErrorCodes.Controller_MessageDropped,
			});

			expect(service.state.value).toEqual("idle");
		});

		it("should abort sending if the callback times out", async () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "callback timeout",
				},
			} as any);

			expect(service.state.value).toEqual({ sending: "abortSendData" });
			expect(mockSerialAPIMachine).toBeCalledTimes(2);
			expect(mockSerialAPIMachine.mock.calls[1][0]).toBeInstanceOf(
				SendDataAbort,
			);

			service.send({
				type: "done.invoke.executeSendDataAbort",
				data: {
					type: "success",
				},
			} as any);

			expect(service.state.value).toEqual({ sending: "retryWait" });
		});

		it("when aborting fails, it should still go into retryWait state", async () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "abortSendData";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.executeSendDataAbort",
				data: {
					type: "failure",
					reason: "callback timeout",
				},
			} as any);

			expect(service.state.value).toEqual({ sending: "retryWait" });
		});

		it("should go into waitForUpdate state if it succeeds and expects an update", async () => {
			const transaction = createTransaction(sendDataBasicGet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "success",
					result: 1,
				},
			} as any);

			expect(
				(service.state.value as any).sending.waitForUpdate,
			).toBeObject();
		});

		it("should go into idle state if it succeeds and expects NO update", async () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "success",
					result: 1,
				},
			} as any);

			await expect(transaction.promise).toResolve();

			expect(service.state.value).toEqual("idle");
		});
	});

	describe("retrying a SendData command...", () => {
		it("should reject the transaction and go back to idle if there are no attempts left", async () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: sendDataBasicSet.maxSendAttempts - 1,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "ACK timeout",
				},
			} as any);

			await assertZWaveError(() => transaction.promise);

			expect(service.state.value).toEqual("idle");
		});

		it("should wait until sending again", () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			const clock = new SimulatedClock();

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "retry";
			service = interpret(testMachine, { clock }).start();

			expect(service.state.value).toEqual({ sending: "retryWait" });

			// The wait time is 500ms
			clock.increment(499);
			expect(service.state.value).toEqual({ sending: "retryWait" });
			clock.increment(1);
			expect(service.state.value).toEqual({ sending: "execute" });
		});

		// it("should notify us about the retry attempt", () => {
		// 	const onRetry = jest.fn();
		// 	const testMachine = createSerialAPICommandMachine(
		// 		{} as any,
		// 		{
		// 			sendData: createSendDataResolvesNever(),
		// 			notifyRetry: onRetry,
		// 		},
		// 		{ attempts: 2 },
		// 	);
		// 	testMachine.initial = "retry";

		// 	const clock = new SimulatedClock();
		// 	service = interpret(testMachine, { clock }).start();
		// 	clock.increment(1100);
		// 	expect(onRetry).toBeCalledWith(2, 3, 1100);
		// });
	});

	describe("waiting for a node update", () => {
		it("when the expected update is received, it should go back to idle state and the transaction should be resolved with the result", async () => {
			const transaction = createTransaction(sendDataBasicGet);

			const message = new ApplicationCommandRequest(fakeDriver, {
				command: new BasicCCReport(fakeDriver, {
					nodeId: 2,
					currentValue: 50,
				}),
			});

			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "waitForUpdate";
			service = interpret(testMachine).start();

			service.onTransition((state) => {
				if (state.matches("sending.waitForUpdate.waitThread.waiting")) {
					service!.send({ type: "message", message } as any);
				}
			});

			const result = await transaction.promise;
			expect(result).toBe(message);

			// no more messages
			expect(service.state.value).toBe("idle");
		});

		it("when waiting times out, it should go into retry state", async () => {
			const transaction = createTransaction(sendDataBasicGet);

			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "waitForUpdate";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();

			// Timeout is 1600
			clock.increment(1500);
			expect(
				service.state.matches(
					"sending.waitForUpdate.waitThread.waiting",
				),
			).toBeTrue();

			clock.increment(100);
			expect(service.state.value).toEqual({ sending: "retryWait" });
		});
	});

	describe("executing a SendData command with handshake", () => {
		it(`should immediately execute the handshake transaction`, async () => {
			const transaction = createTransaction(sendDataBasicSetSecure);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			expect(
				sendDataBasicSetSecure.command.preTransmitHandshake,
			).toBeCalledTimes(1);

			expect(service.state.value).toMatchObject({
				sending: { handshake: "waitForTrigger" },
			});

			// We've intercepted the sendCommand call, so create the transaction ourselves
			const nonceGet = new Transaction(
				fakeDriver,
				sendDataNonceRequest,
				createDeferredPromise(),
				MessagePriority.PreTransmitHandshake,
			);
			service.send({
				type: "add",
				transaction: nonceGet,
			});

			expect(service.state.value).toMatchObject({
				sending: { handshake: "executeHandshake" },
			});
		});

		describe(`while waiting for a handshake trigger, all other messages should be ignored`, () => {
			it("wrong priority", () => {
				const transaction = createTransaction(sendDataBasicSetSecure);
				const testMachine = createSendThreadMachine(
					defaultImplementations,
					{
						queue: new SortedList([transaction]),
						sendDataAttempts: 0,
					},
				);

				testMachine.initial = "sending";
				service = interpret(testMachine).start();

				expect(
					sendDataBasicSetSecure.command.preTransmitHandshake,
				).toBeCalledTimes(1);

				expect(service.state.value).toMatchObject({
					sending: { handshake: "waitForTrigger" },
				});

				const transaction2 = new Transaction(
					fakeDriver,
					sendDataBasicSet,
					createDeferredPromise(),
					MessagePriority.Normal,
				);
				service.send({
					type: "add",
					transaction: transaction2,
				});

				expect(service.state.value).toMatchObject({
					sending: { handshake: "waitForTrigger" },
				});
			});

			it("wrong message type", () => {
				const transaction = createTransaction(sendDataBasicSetSecure);
				const testMachine = createSendThreadMachine(
					defaultImplementations,
					{
						queue: new SortedList([transaction]),
						sendDataAttempts: 0,
					},
				);

				testMachine.initial = "sending";
				service = interpret(testMachine).start();

				expect(
					sendDataBasicSetSecure.command.preTransmitHandshake,
				).toBeCalledTimes(1);

				expect(service.state.value).toMatchObject({
					sending: { handshake: "waitForTrigger" },
				});

				const transaction2 = new Transaction(
					fakeDriver,
					sendDataMulticastBasicSet,
					createDeferredPromise(),
					MessagePriority.PreTransmitHandshake,
				);
				service.send({
					type: "add",
					transaction: transaction2,
				});

				expect(service.state.value).toMatchObject({
					sending: { handshake: "waitForTrigger" },
				});
			});

			it("wrong node id", () => {
				const transaction = createTransaction(sendDataBasicSetSecure);
				const testMachine = createSendThreadMachine(
					defaultImplementations,
					{
						queue: new SortedList([transaction]),
						sendDataAttempts: 0,
					},
				);

				testMachine.initial = "sending";
				service = interpret(testMachine).start();

				expect(
					sendDataBasicSetSecure.command.preTransmitHandshake,
				).toBeCalledTimes(1);

				expect(service.state.value).toMatchObject({
					sending: { handshake: "waitForTrigger" },
				});

				const sendDataWrongNodeId = new SendDataRequest(fakeDriver, {
					command: new BasicCCSet(fakeDriver, {
						nodeId: 8,
						targetValue: 1,
					}),
				});

				const transaction2 = new Transaction(
					fakeDriver,
					sendDataWrongNodeId,
					createDeferredPromise(),
					MessagePriority.PreTransmitHandshake,
				);
				service.send({
					type: "add",
					transaction: transaction2,
				});

				expect(service.state.value).toMatchObject({
					sending: { handshake: "waitForTrigger" },
				});
			});
		});

		it("when the handshake API call fails, it should go into retry state", () => {
			const transaction = createTransaction(sendDataBasicSetSecure);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
					preTransmitHandshakeTransaction: new Transaction(
						fakeDriver,
						sendDataNonceRequest,
						createDeferredPromise(),
						MessagePriority.PreTransmitHandshake,
					),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "handshake";
			testMachine.states.sending.states.handshake.initial =
				"executeHandshake";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.executeHandshake",
				data: {
					type: "failure",
					reason: "ACK timeout",
				},
			} as any);

			expect(service.state.value).toMatchObject({ sending: "retryWait" });
		});

		it("when the handshake API call succeeds, it should go into waitForHandshakeResponse state", () => {
			const transaction = createTransaction(sendDataBasicSetSecure);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
					preTransmitHandshakeTransaction: new Transaction(
						fakeDriver,
						sendDataNonceRequest,
						createDeferredPromise(),
						MessagePriority.PreTransmitHandshake,
					),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "handshake";
			testMachine.states.sending.states.handshake.initial =
				"executeHandshake";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.executeHandshake",
				data: {
					type: "success",
					result: "foo",
				},
			} as any);

			expect(service.state.value).toMatchObject({
				sending: { handshake: "waitForHandshakeResponse" },
			});
		});

		it("when the expected handshake response is received, it should go into execute state", () => {
			const transaction = createTransaction(sendDataBasicSetSecure);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
					preTransmitHandshakeTransaction: new Transaction(
						fakeDriver,
						sendDataNonceRequest,
						createDeferredPromise(),
						MessagePriority.PreTransmitHandshake,
					),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "handshake";
			testMachine.states.sending.states.handshake.initial =
				"waitForHandshakeResponse";
			service = interpret(testMachine).start();

			const response = new ApplicationCommandRequest(fakeDriver, {
				command: new SecurityCCNonceReport(fakeDriver, {
					nodeId: 2,
					nonce: Buffer.allocUnsafe(8),
				}),
			});

			service.send({
				type: "message",
				message: response,
			} as any);

			expect(service.state.value).toMatchObject({
				sending: "execute",
			});
		});

		it("when the expected handshake response is not received in time, it should go into retry state", () => {
			const transaction = createTransaction(sendDataBasicSetSecure);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
					preTransmitHandshakeTransaction: new Transaction(
						fakeDriver,
						sendDataNonceRequest,
						createDeferredPromise(),
						MessagePriority.PreTransmitHandshake,
					),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "handshake";
			testMachine.states.sending.states.handshake.initial =
				"waitForHandshakeResponse";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();

			clock.increment(1500);
			expect(service.state.value).toMatchObject({
				sending: { handshake: "waitForHandshakeResponse" },
			});

			clock.increment(100);
			expect(service.state.value).toMatchObject({
				sending: "retryWait",
			});
		});

		// it("when the handshake transaction is created, ", async () => {
		// 	const transaction = createTransaction(sendDataBasicSetSecure);
		// 	const testMachine = createSendThreadMachine(
		// 		defaultImplementations,
		// 		{
		// 			queue: new SortedList([transaction]),
		// 			sendDataAttempts: 0,
		// 		},
		// 	);

		// 	testMachine.initial = "sending";
		// 	service = interpret(testMachine).start();

		// 	expect(fakeDriver.sendCommand).toBeCalledTimes(1);
		// 	expect(
		// 		(fakeDriver.sendCommand as jest.Mock).mock.calls[0][0],
		// 	).toBeInstanceOf(SecurityCCNonceGet);

		// 	expect(service.state.value).toMatchObject({
		// 		sending: { handshake: "waitForTrigger" },
		// 	});
		// });
	});
});
