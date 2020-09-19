import {
	assertZWaveError,
	CommandClasses,
	SecurityManager,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import { interpret, Interpreter, Machine } from "xstate";
import { SimulatedClock } from "xstate/lib/SimulatedClock";
import { BasicCCGet, BasicCCReport, BasicCCSet } from "../commandclass/BasicCC";
import { NoOperationCC } from "../commandclass/NoOperationCC";
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
import { ZWaveNode } from "../node/Node";
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
} from "../test/messages";
import { Transaction } from "./Transaction";

jest.mock("./SerialAPICommandMachine");
const mockSerialAPIMachine = jest.requireMock("./SerialAPICommandMachine")
	.createSerialAPICommandMachine as jest.Mock;

jest.mock("./CommandQueueMachine");
const mockCommandQueueMachine = jest.requireMock("./CommandQueueMachine")
	.createCommandQueueMachine as jest.Mock;

const emptyMachine = Machine<any, any, any>({
	initial: "empty",
	states: { empty: {} },
});
mockCommandQueueMachine.mockReturnValue(emptyMachine);

describe("lib/driver/SendThreadMachine", () => {
	jest.setTimeout(100);

	const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
	const sm = new SecurityManager({
		ownNodeId: 1,
		nonceTimeout: 500,
		networkKey: Buffer.alloc(16, 1),
	});
	(fakeDriver as any).securityManager = sm;

	// We need to add a fake node 3 in order to test whether the queue should stay idle
	const node3 = new ZWaveNode(3, fakeDriver);
	node3.addCC(CommandClasses["Wake Up"], {
		isSupported: true,
		version: 1,
	});
	(fakeDriver.controller.nodes as any).set(node3.id, node3);
	// And one more to test the send queue sorting (two different sleeping nodes)
	const node4 = new ZWaveNode(4, fakeDriver);
	node4.addCC(CommandClasses["Wake Up"], {
		isSupported: true,
		version: 1,
	});
	(fakeDriver.controller.nodes as any).set(node4.id, node4);

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

	const sendDataNonceResponse = new SendDataRequest(fakeDriver, {
		command: new SecurityCCNonceReport(fakeDriver, {
			nodeId: 2,
			nonce: Buffer.allocUnsafe(8),
		}),
	});

	const defaultImplementations = {
		sendData: createSendDataResolvesNever(),
		createSendDataAbort: () => new SendDataAbort(fakeDriver),
		notifyUnsolicited: () => {},
	};

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
		mockSerialAPIMachine.mockClear();
		mockCommandQueueMachine.mockClear();
		(sendDataBasicSetSecure.command
			.preTransmitHandshake as jest.Mock).mockClear();
	});

	afterAll(() => {
		service?.stop();
		service = undefined;
		node3.destroy();
		node4.destroy();
	});

	describe(`when the machine is started, ...`, () => {
		it(`it should be in the idle state`, () => {
			const testMachine = createSendThreadMachine(defaultImplementations);
			service = interpret(testMachine).start();
			expect(service.state.value).toBe("idle");
		});

		it("should start a CommandQueueMachine", () => {
			const testMachine = createSendThreadMachine(defaultImplementations);
			service = interpret(testMachine).start();
			expect(mockCommandQueueMachine).toBeCalledTimes(1);
		});
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

		it("...but only if the node is awake", () => {
			const testMachine = createSendThreadMachine(defaultImplementations);
			service = interpret(testMachine).start();

			const sendDataBasicGet3 = new SendDataRequest(fakeDriver, {
				command: new BasicCCGet(fakeDriver, { nodeId: 3 }),
			});
			const transaction = createTransaction(sendDataBasicGet3);
			node3.markAsAsleep();

			service.send({ type: "add", transaction });
			expect(service.state.value).toEqual("idle");
		});

		it("...or if the message is a ping", () => {
			const testMachine = createSendThreadMachine(defaultImplementations);
			service = interpret(testMachine).start();

			const sendDataPing = new SendDataRequest(fakeDriver, {
				command: new NoOperationCC(fakeDriver, { nodeId: 3 }),
			});
			const transaction = createTransaction(sendDataPing);
			node3.markAsAsleep(); // still asleep, but we may send this

			service.send({ type: "add", transaction });
			expect(service.state.value).toEqual({ sending: "execute" });
		});

		it("...or if the message is a response to a handshake request from a node", () => {
			const testMachine = createSendThreadMachine(defaultImplementations);
			service = interpret(testMachine).start();

			const sendDataBasicGet3 = new SendDataRequest(fakeDriver, {
				command: new BasicCCGet(fakeDriver, { nodeId: 3 }),
			});
			const transaction = createTransaction(sendDataBasicGet3);
			transaction.priority = MessagePriority.Handshake;
			node3.markAsAsleep(); // still asleep, but we may send this

			service.send({ type: "add", transaction });
			expect(service.state.value).toEqual({ sending: "execute" });
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

		// TODO: This does not work with the mocked SerialAPIMachine
		// it.only(`if an unexpected message is received while waiting, it should call the notifyUnsolicited service`, (done) => {
		// 	jest.setTimeout(100000);
		// 	const sendData = jest.fn().mockImplementation(() => {
		// 		console.warn("called");
		// 		return new Promise(() => {});
		// 	});

		// 	const transaction = createTransaction(
		// 		dummyMessageNoResponseNoCallback,
		// 	);
		// 	const notifyUnsolicited = jest.fn();
		// 	const testMachine = createSendThreadMachine(
		// 		{ ...defaultImplementations, sendData, notifyUnsolicited },
		// 		{
		// 			queue: new SortedList([transaction]),
		// 		},
		// 	);

		// 	testMachine.initial = "sending";
		// 	service = interpret(testMachine).start();

		// 	let didSend = false;
		// 	service.onTransition((state) => {
		// 		console.log(state.value);
		// 		// if (state.matches("sending.execute") && !didSend) {
		// 		// 	didSend = true;
		// 		// 	service!.send({
		// 		// 		type: "message",
		// 		// 		message: dummyMessageWithResponseNoCallback,
		// 		// 	});
		// 		// 	expect(notifyUnsolicited).toBeCalledWith(
		// 		// 		dummyMessageWithResponseNoCallback,
		// 		// 	);
		// 		// 	done();
		// 		// }
		// 	});
		// });
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
					result: { transmitStatus: 0x02 },
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

		it("should resolve the current transaction if it is a ping and a NIF was received from the target node", async () => {
			const sendDataPing = new SendDataRequest(fakeDriver, {
				command: new NoOperationCC(fakeDriver, {
					nodeId: 2,
				}),
			});

			const transaction = createTransaction(sendDataPing);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();
			service.onTransition((state) => {
				if (state.matches("sending.execute")) {
					service!.send({ type: "NIF", nodeId: 2 });
				}
			});

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

		it("should notify us about the retry attempt", () => {
			const onRetry = jest.fn();
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				{ ...defaultImplementations, notifyRetry: onRetry },
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 2,
				},
			);

			const clock = new SimulatedClock();

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "retry";
			service = interpret(testMachine, { clock }).start();

			clock.increment(500);
			expect(onRetry).toBeCalledWith(
				"SendData",
				transaction.message,
				2,
				3,
				500,
			);
		});
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

		it("... but only after a pending handshake request was answered", (done) => {
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

			let step = 0;
			service.onTransition((state) => {
				if (
					step === 0 &&
					state.matches("sending.waitForUpdate.waitThread.waiting")
				) {
					step = 1;

					// First, make the service respond to a handshake
					service!.send({
						type: "add",
						transaction: new Transaction(
							fakeDriver,
							sendDataNonceResponse,
							createDeferredPromise(),
							MessagePriority.Handshake,
						),
					});

					// Then send it the reply
					service!.send({ type: "message", message } as any);
				} else if (
					step === 1 &&
					state.matches(
						"sending.waitForUpdate.handshakeServer.responding",
					)
				) {
					step = 2;
					service!.send({
						type: "done.invoke.executeHandshakeResponse",
						data: {
							type: "success",
							result: 1,
						},
					} as any);
				} else if (state.matches("idle")) {
					expect(step).toBe(2);
					done();
				}
			});
		});

		it(`if an unexpected message is received while waiting, it should call the notifyUnsolicited service`, (done) => {
			const transaction = createTransaction(sendDataBasicSet);
			const notifyUnsolicited = jest.fn();
			const testMachine = createSendThreadMachine(
				{ ...defaultImplementations, notifyUnsolicited },
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "waitForUpdate";
			service = interpret(testMachine).start();

			let didSend = false;
			service.onTransition((state) => {
				if (
					state.matches("sending.waitForUpdate.waitThread.waiting") &&
					!didSend
				) {
					didSend = true;
					service!.send({
						type: "message",
						message: sendDataBasicGet,
					});
					expect(notifyUnsolicited).toBeCalledWith(sendDataBasicGet);
					done();
				}
			});
		});

		it("when replying to a handshake fails with a callback timeout, it should abort sending", () => {
			const transaction = createTransaction(sendDataBasicGet);

			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "waitForUpdate";
			service = interpret(testMachine).start();

			// Make the service respond to a handshake
			service.send({
				type: "add",
				transaction: new Transaction(
					fakeDriver,
					sendDataNonceResponse,
					createDeferredPromise(),
					MessagePriority.Handshake,
				),
			});
			expect(service.state.value).toMatchObject({
				sending: { waitForUpdate: { handshakeServer: "responding" } },
			});

			service.send({
				type: "done.invoke.executeHandshakeResponse",
				data: {
					type: "failure",
					reason: "callback timeout",
				},
			} as any);
			expect(service.state.value).toMatchObject({
				sending: {
					waitForUpdate: { handshakeServer: "abortResponding" },
				},
			});
		});

		it("when replying to a handshake fails with different error, it should go back to idle", () => {
			const transaction = createTransaction(sendDataBasicGet);

			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "waitForUpdate";
			service = interpret(testMachine).start();

			const handshakeResponse = new Transaction(
				fakeDriver,
				sendDataNonceResponse,
				createDeferredPromise(),
				MessagePriority.Handshake,
			);
			handshakeResponse.promise.catch(() => {
				/* ignore */
			});

			// Make the service respond to a handshake
			service.send({
				type: "add",
				transaction: handshakeResponse,
			});
			expect(service.state.value).toMatchObject({
				sending: { waitForUpdate: { handshakeServer: "responding" } },
			});

			service.send({
				type: "done.invoke.executeHandshakeResponse",
				data: {
					type: "failure",
					reason: "ACK timeout",
				},
			} as any);
			expect(service.state.value).toMatchObject({
				sending: {
					waitForUpdate: { handshakeServer: "idle" },
				},
			});
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

		it("if all attempts have been exhausted, the current transaction should be rejected", (done) => {
			const transaction = createTransaction(sendDataBasicGet);

			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 3,
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "waitForUpdate";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();

			assertZWaveError(() => transaction.promise, {
				errorCode: ZWaveErrorCodes.Controller_NodeTimeout,
				messageMatches: "Timed out",
			}).then(() => {
				expect(service!.state.value).toEqual("idle");
				done();
			});

			// Timeout is 1600
			clock.increment(1700);
		});

		it("when aborting the handshake response fails, it should go back to idle", (done) => {
			const transaction = createTransaction(sendDataBasicGet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "waitForUpdate";
			testMachine.states.sending.states.waitForUpdate.states.waitThread.initial =
				"done";
			testMachine.states.sending.states.waitForUpdate.states.handshakeServer.initial =
				"abortResponding";
			service = interpret(testMachine).start();

			service.onTransition((state) => {
				if (
					state.matches(
						"sending.waitForUpdate.handshakeServer.abortResponding",
					)
				) {
					service!.send({
						type: "done.invoke.executeSendDataAbort",
						data: {
							type: "failure",
							reason: "ACK timeout",
						},
					} as any);
				} else if (state.matches("idle")) {
					done();
				}
			});
		});

		it("when aborting the handshake response succeeds, it should go back to idle", (done) => {
			const transaction = createTransaction(sendDataBasicGet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "waitForUpdate";
			testMachine.states.sending.states.waitForUpdate.states.waitThread.initial =
				"done";
			testMachine.states.sending.states.waitForUpdate.states.handshakeServer.initial =
				"abortResponding";
			service = interpret(testMachine).start();

			service.onTransition((state) => {
				if (
					state.matches(
						"sending.waitForUpdate.handshakeServer.abortResponding",
					)
				) {
					service!.send({
						type: "done.invoke.executeSendDataAbort",
						data: {
							type: "success",
							result: 1,
						},
					} as any);
				} else if (state.matches("idle")) {
					done();
				}
			});
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

			expect(service.state.toStrings()).toInclude(
				"sending.handshake.working.executeThread.waitForTrigger",
			);

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

			expect(service.state.toStrings()).toInclude(
				"sending.handshake.working.executeThread.executeHandshake",
			);
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

				expect(service.state.toStrings()).toInclude(
					"sending.handshake.working.executeThread.waitForTrigger",
				);

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

				expect(service.state.toStrings()).toInclude(
					"sending.handshake.working.executeThread.waitForTrigger",
				);
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

				expect(service.state.toStrings()).toInclude(
					"sending.handshake.working.executeThread.waitForTrigger",
				);

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

				expect(service.state.toStrings()).toInclude(
					"sending.handshake.working.executeThread.waitForTrigger",
				);
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

				expect(service.state.toStrings()).toInclude(
					"sending.handshake.working.executeThread.waitForTrigger",
				);

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

				expect(service.state.toStrings()).toInclude(
					"sending.handshake.working.executeThread.waitForTrigger",
				);
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
			testMachine.states.sending.states.handshake.states.working.states.executeThread.initial =
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
			testMachine.states.sending.states.handshake.states.working.states.executeThread.initial =
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
				sending: {
					handshake: {
						working: { executeThread: "waitForHandshakeResponse" },
					},
				},
			});
		});

		it("when the expected handshake response is received AND the preTransmit handshake call is resolved, it should go into execute state", () => {
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
			testMachine.states.sending.states.handshake.states.working.states.executeThread.initial =
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
				sending: { handshake: {} },
			});

			service.send({
				type: "done.invoke.kickOffPreTransmitHandshake",
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
			testMachine.states.sending.states.handshake.states.working.states.executeThread.initial =
				"waitForHandshakeResponse";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();

			clock.increment(1500);
			expect(service.state.value).toMatchObject({
				sending: {
					handshake: {
						working: { executeThread: "waitForHandshakeResponse" },
					},
				},
			});

			clock.increment(100);
			expect(service.state.value).toMatchObject({
				sending: "retryWait",
			});
		});

		it("if all attempts have been exhausted, the current transaction should be rejected", (done) => {
			const transaction = createTransaction(sendDataBasicSetSecure);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 3,
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
			testMachine.states.sending.states.handshake.states.working.states.executeThread.initial =
				"waitForHandshakeResponse";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();

			assertZWaveError(() => transaction.promise, {
				errorCode: ZWaveErrorCodes.Controller_NodeTimeout,
				messageMatches: "Timed out",
			}).then(() => {
				expect(service!.state.value).toEqual("idle");
				done();
			});

			// Timeout is 1600
			clock.increment(1700);
		});
	});

	it(`the "sortQueue" event should cause the send queue to get sorted and trigger sending`, async () => {
		// This one is tricky. We start with two sleeping nodes, then set node the
		// latter message is for to be awake and trigger a sorting.
		// This should cause the latter message to be sent

		const sendDataBasicGet3 = new SendDataRequest(fakeDriver, {
			command: new BasicCCGet(fakeDriver, { nodeId: 3 }),
		});
		const sendDataBasicGet4 = new SendDataRequest(fakeDriver, {
			command: new BasicCCGet(fakeDriver, { nodeId: 4 }),
		});

		node3.markAsAsleep();
		node4.markAsAsleep();

		const transaction3 = createTransaction(sendDataBasicGet3);
		const transaction4 = createTransaction(sendDataBasicGet4);
		transaction3.priority = MessagePriority.WakeUp;
		transaction4.priority = MessagePriority.WakeUp;

		const testMachine = createSendThreadMachine(defaultImplementations, {
			queue: new SortedList([transaction3, transaction4]),
			sendDataAttempts: 0,
		});

		service = interpret(testMachine).start();

		expect(service.state.context.queue.toArray()).toEqual([
			transaction3,
			transaction4,
		]);

		node4.markAsAwake();

		service.send("sortQueue");

		expect(service.state.value).toEqual({ sending: "execute" });
		expect(service.state.context.queue.toArray()).toEqual([transaction3]);
	});

	describe(`"reduce" event`, () => {
		it("should call the given reducer function for each transaction in the queue and the current one", () => {
			const sendDataBasicGet3 = new SendDataRequest(fakeDriver, {
				command: new BasicCCGet(fakeDriver, { nodeId: 3 }),
			});
			const sendDataBasicGet4 = new SendDataRequest(fakeDriver, {
				command: new BasicCCGet(fakeDriver, { nodeId: 4 }),
			});

			node3.markAsAsleep();
			node4.markAsAsleep();

			const transaction1 = createTransaction(sendDataBasicGet);
			const transaction2 = createTransaction(sendDataBasicGet);
			const transaction3 = createTransaction(sendDataBasicGet3);
			const transaction4 = createTransaction(sendDataBasicGet4);
			transaction3.priority = MessagePriority.WakeUp;
			transaction4.priority = MessagePriority.WakeUp;

			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([
						transaction1,
						transaction2,
						transaction3,
						transaction4,
					]),
					sendDataAttempts: 0,
				},
			);

			service = interpret(testMachine).start();

			const reducer = jest.fn().mockReturnValue({ type: "keep" });
			service.send({ type: "reduce", reducer });

			expect(reducer).toBeCalledWith(transaction1, "current");
			expect(reducer).toBeCalledWith(transaction2, "queue");
			expect(reducer).toBeCalledWith(transaction3, "queue");
			expect(reducer).toBeCalledWith(transaction4, "queue");
		});

		it("should stop sending if the current transaction should not be kept (drop)", () => {
			const transaction = createTransaction(sendDataBasicGet);

			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			service = interpret(testMachine).start();

			const reducer = jest.fn().mockReturnValue({ type: "drop" });
			service.send({ type: "reduce", reducer });

			expect(service.state.value).toEqual("idle");
		});

		it("should stop sending if the current transaction should not be kept (reject)", async () => {
			const transaction = createTransaction(sendDataBasicGet);

			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			service = interpret(testMachine).start();

			const message = "error message";
			const code = ZWaveErrorCodes.Controller_MessageDropped;

			// This test will reject the promise, so catch the error
			transaction.promise.catch(() => {});

			const reducer = jest
				.fn()
				.mockReturnValue({ type: "reject", message, code });
			service.send({ type: "reduce", reducer });

			expect(service.state.value).toEqual("idle");
		});

		// Need to find out how to test this, since requeuing will cause the sending to restart immediately
		it.todo(
			"should stop sending if the current transaction should not be kept (requeue)",
		);

		it("should perform the correct actions", async () => {
			const sendDataBasicGet3 = new SendDataRequest(fakeDriver, {
				command: new BasicCCGet(fakeDriver, { nodeId: 3 }),
			});
			const sendDataBasicGet4 = new SendDataRequest(fakeDriver, {
				command: new BasicCCGet(fakeDriver, { nodeId: 4 }),
			});

			node3.markAsAsleep();
			node4.markAsAsleep();

			const t1 = createTransaction(sendDataBasicGet);
			const t2 = createTransaction(sendDataBasicGet);
			const t3 = createTransaction(sendDataBasicGet3);
			const t4 = createTransaction(sendDataBasicGet4);
			const t5 = createTransaction(sendDataBasicSet);
			t3.priority = MessagePriority.WakeUp;
			t4.priority = MessagePriority.WakeUp;

			// Give the transactions IDs so test errors are easier to understand
			(t1 as any).id = "t1";
			(t2 as any).id = "t2";
			(t3 as any).id = "t3";
			(t4 as any).id = "t4";
			(t5 as any).id = "t5";

			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([t1, t2, t3, t4, t5]),
					sendDataAttempts: 0,
				},
			);

			service = interpret(testMachine).start();

			const reducer = jest.fn().mockImplementation((t, _source) => {
				if (t === t1) return { type: "requeue" };
				if (t === t2)
					return { type: "requeue", priority: MessagePriority.Ping };
				if (t === t3) return { type: "keep" };
				if (t === t4) return { type: "drop" };
				if (t === t5)
					return {
						type: "reject",
						message: "foo",
						code: ZWaveErrorCodes.SupervisionCC_CommandFailed,
					};
			});

			service.send({ type: "reduce", reducer });

			await assertZWaveError(() => t5.promise, {
				messageMatches: "foo",
				errorCode: ZWaveErrorCodes.SupervisionCC_CommandFailed,
			});

			// Requeuing t1 puts it behind t2 due to the lower priority
			const newTransactions = [
				service.state.context.currentTransaction!,
				...service.state.context.queue.toArray(),
			].map((t: any) => t.id);
			expect(newTransactions).toEqual(["t2", "t1", "t3"]);

			expect(t2.priority).toBe(MessagePriority.Ping);
		});
	});
});
