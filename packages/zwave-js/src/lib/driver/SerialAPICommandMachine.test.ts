import { highResTimestamp } from "@zwave-js/core";
import { interpret, Interpreter } from "xstate";
import { SimulatedClock } from "xstate/lib/SimulatedClock";
import { MessageType } from "../message/Constants";
import {
	createSerialAPICommandMachine,
	SerialAPICommandContext,
	SerialAPICommandEvent,
	SerialAPICommandStateSchema,
} from "./SerialAPICommandMachine";
import {
	createSendDataRejectsImmediately,
	createSendDataResolvesImmediately,
	createSendDataResolvesNever,
	dummyMessageNoResponseNoCallback,
	dummyMessageWithResponseNoCallback,
} from "./testUtils";

jest.mock("@zwave-js/core");

describe("lib/driver/SerialAPICommandMachine", () => {
	jest.setTimeout(100);

	let service:
		| undefined
		| Interpreter<
				SerialAPICommandContext,
				SerialAPICommandStateSchema,
				SerialAPICommandEvent,
				any
		  >;
	afterEach(() => {
		service?.stop();
		service = undefined;
	});

	describe("sending...", () => {
		it(`should start immediately`, () => {
			// The send service is a promise that never resolves
			const sendData = createSendDataResolvesNever();
			const msg = Buffer.from([1, 2, 3]);

			const testMachine = createSerialAPICommandMachine(
				dummyMessageNoResponseNoCallback,
				{ sendData },
			);

			service = interpret(testMachine).start();
			expect(service.state.value).toBe("sending");
			expect(sendData).toBeCalledWith(msg);
		});

		it(`should increase the attempts`, () => {
			// The send service is a promise that never resolves
			const sendData = createSendDataResolvesNever();

			const testMachine = createSerialAPICommandMachine(
				dummyMessageNoResponseNoCallback,
				{ sendData },
				{
					attempts: 1,
				},
			);

			service = interpret(testMachine).start();
			expect(service.state.context.attempts).toBe(2);
		});
		it("should go into waitForACK state when successful", (done) => {
			const sendData = createSendDataResolvesImmediately();

			const testMachine = createSerialAPICommandMachine(
				dummyMessageNoResponseNoCallback,
				{ sendData },
			);

			service = interpret(testMachine)
				.onTransition((state) => {
					if (state.matches("waitForACK")) done();
				})
				.start();
		});

		it("should go into retryWait state when it fails", (done) => {
			const sendData = createSendDataRejectsImmediately();

			const testMachine = createSerialAPICommandMachine(
				dummyMessageNoResponseNoCallback,
				{ sendData },
			);

			service = interpret(testMachine)
				.onTransition((state) => {
					if (state.matches("retryWait")) done();
				})
				.start();
		});

		it("should set the lastError context when it fails", (done) => {
			const sendData = createSendDataRejectsImmediately();

			const testMachine = createSerialAPICommandMachine(
				dummyMessageNoResponseNoCallback,
				{ sendData },
			);

			service = interpret(testMachine)
				.onTransition((state) => {
					if (state.matches("retryWait")) {
						expect(state.context.lastError).toBe("send failure");
						done();
					}
				})
				.start();
		});
	});

	describe("waiting for an ACK...", () => {
		it("should go into retryWait state when a CAN is received instead of an ACK", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
			);
			service = interpret(testMachine).start("waitForACK");
			service.send("CAN");
			expect(service.state.value).toBe("retryWait");
		});

		it("should set the lastError context when a CAN is received instead of an ACK", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
			);
			service = interpret(testMachine).start("waitForACK");
			service.send("CAN");
			expect(service.state.context.lastError).toBe("CAN");
		});

		it("should go into retryWait state when a NAK is received instead of an ACK", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
			);
			service = interpret(testMachine).start("waitForACK");
			service.send("NAK");
			expect(service.state.value).toBe("retryWait");
		});

		it("should set the lastError context when a NAK is received instead of an ACK", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
			);
			service = interpret(testMachine).start("waitForACK");
			service.send("NAK");
			expect(service.state.context.lastError).toBe("NAK");
		});

		it("should go into retryWait state when waiting for ACK times out", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
			);
			testMachine.initial = "waitForACK";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();
			clock.increment(1600);
			expect(service.state.value).toBe("retryWait");
		});

		it("should set the lastError context when it fails", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
			);
			testMachine.initial = "waitForACK";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();
			clock.increment(1600);
			expect(service.state.context.lastError).toBe("ACK timeout");
		});
	});

	describe("retrying...", () => {
		it("should immediately transition to failure if there are no attempts left", (done) => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{
					sendData: createSendDataResolvesNever(),
				},
				{ attempts: 3 },
			);
			testMachine.initial = "retry";

			service = interpret(testMachine)
				.onTransition((state) => {
					if (state.matches("failure")) done();
				})
				.start();
		});

		it("should wait until sending again", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{
					sendData: createSendDataResolvesNever(),
				},
				{ attempts: 1 },
			);
			testMachine.initial = "retry";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();
			// After the first attempt, the wait time is 100ms
			clock.increment(50);
			expect(service.state.value).toBe("retryWait");
			clock.increment(50);
			expect(service.state.value).toBe("sending");
		});

		it("after each attempt, the wait time should be longer", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{
					sendData: createSendDataResolvesNever(),
				},
				{ attempts: 2 },
			);
			testMachine.initial = "retry";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();
			// After the second attempt, the wait time is 1100ms
			clock.increment(1050);
			expect(service.state.value).toBe("retryWait");
			clock.increment(50);
			expect(service.state.value).toBe("sending");
		});

		it("should notify us about the retry attempt", () => {
			const onRetry = jest.fn();
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{
					sendData: createSendDataResolvesNever(),
					notifyRetry: onRetry,
				},
				{ attempts: 2 },
			);
			testMachine.initial = "retry";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();
			clock.increment(1100);
			expect(onRetry).toBeCalledWith(2, 3, 1100);
		});
	});

	describe("when the ACK is received in time, ...", () => {
		it("should go into waitForResponse state a response is expected", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: true,
				},
			);
			testMachine.initial = "waitForACK";
			service = interpret(testMachine).start();
			service.send("ACK");
			expect(service.state.value).toBe("waitForResponse");
		});

		it("should go into waitForCallback state if no response but a callback is expected", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: false,
					expectsCallback: true,
				},
			);
			testMachine.initial = "waitForACK";
			service = interpret(testMachine).start();
			service.send("ACK");
			expect(service.state.value).toBe("waitForCallback");
		});

		it("should go into success state if no response and no callback is expected", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: false,
					expectsCallback: false,
				},
			);
			testMachine.initial = "waitForACK";
			service = interpret(testMachine).start();
			service.send("ACK");
			expect(service.state.value).toBe("success");
		});
	});

	describe("while waiting for a response, ...", () => {
		it("should go into retry state when the timeout elapses", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: true,
				},
			);
			testMachine.initial = "waitForResponse";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();
			clock.increment(1600);
			expect(service.state.value).toBe("retryWait");
		});

		it("should set the lastError context when the timeout elapses", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: true,
				},
			);
			testMachine.initial = "waitForResponse";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();
			clock.increment(1600);
			expect(service.state.context.lastError).toBe("response timeout");
		});

		it("should respond with an UNSOLICITED event and keep waiting if the message is not expected", (done) => {
			const testMachine = createSerialAPICommandMachine(
				{
					...dummyMessageWithResponseNoCallback,
					isExpectedResponse: () => false,
				} as any,
				{} as any,
				{
					expectsResponse: true,
				},
			);
			testMachine.initial = "waitForResponse";

			const message = {
				type: MessageType.Response,
				functionType: 0xfe,
			} as any;

			service = interpret(testMachine)
				.onEvent((evt) => {
					if (evt.type === "unsolicited") {
						expect((evt as any).message).toBe(message);
						expect(service?.state.value).toBe("waitForResponse");
						done();
					}
				})
				.start();

			service.send({
				type: "message",
				message,
			});
		});

		it("should go into retry state if the response is NOK", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: true,
				},
			);
			testMachine.initial = "waitForResponse";

			service = interpret(testMachine).start();
			service.send({
				type: "response",
				message: { isOK: () => false } as any,
			});

			expect(service.state.value).toBe("retryWait");
		});

		it("should set the lastError context if the response is NOK", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: true,
				},
			);
			testMachine.initial = "waitForResponse";

			service = interpret(testMachine).start();
			const message = { isOK: () => false } as any;
			service.send({
				type: "response",
				message,
			});

			expect(service.state.context.lastError).toBe("response NOK");
			expect(service.state.context.result).toBe(message);
		});

		it("if the last retry failed, the failure reason should be set", (done) => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: true,
					attempts: 3,
					maxAttempts: 3,
				},
			);
			testMachine.initial = "waitForResponse";

			service = interpret(testMachine)
				.onDone((evt) => {
					expect(evt.data.reason).toBe("response NOK");
					done();
				})
				.start();
			service.send({
				type: "response",
				message: { isOK: () => false } as any,
			});
		});

		it("should go into waitForCallback state if response is OK and a callback is expected", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: true,
					expectsCallback: true,
				},
			);
			testMachine.initial = "waitForResponse";

			service = interpret(testMachine).start();
			service.send({
				type: "response",
				message: { isOK: () => true } as any,
			});

			expect(service.state.value).toBe("waitForCallback");
		});

		it("should go into success state if response is OK and no callback is expected", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: true,
					expectsCallback: false,
				},
			);
			testMachine.initial = "waitForResponse";

			service = interpret(testMachine).start();
			service.send({
				type: "response",
				message: { isOK: () => true } as any,
			});

			expect(service.state.value).toBe("success");
		});

		it("on success, the last received message (response) should be returned", (done) => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsResponse: true,
					expectsCallback: false,
				},
			);
			testMachine.initial = "waitForResponse";

			const message = { isOK: () => true } as any;

			service = interpret(testMachine)
				.onDone((evt) => {
					expect(evt.data?.result).toBe(message);
					done();
				})
				.start();

			service.send({
				type: "response",
				message,
			});
		});
	});

	describe("while waiting for a callback, ...", () => {
		it("should go into failure state if the callback is NOK", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsCallback: true,
				},
			);
			testMachine.initial = "waitForCallback";

			service = interpret(testMachine).start();
			service.send({
				type: "callback",
				message: { isOK: () => false } as any,
			});

			expect(service.state.value).toBe("failure");
		});

		it("should set the lastError and result context if the callback is NOK", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsCallback: true,
				},
			);
			testMachine.initial = "waitForCallback";

			service = interpret(testMachine).start();
			const message = { isOK: () => false } as any;
			service.send({
				type: "callback",
				message,
			});

			expect(service.state.context.lastError).toBe("callback NOK");
			expect(service.state.context.result).toBe(message);
		});

		it("should go into success state if callback is OK", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsCallback: true,
				},
			);
			testMachine.initial = "waitForCallback";

			service = interpret(testMachine).start();
			service.send({
				type: "callback",
				message: { isOK: () => true } as any,
			});

			expect(service.state.value).toBe("success");
		});

		it("should go back to waiting if callback is OK but not final", (done) => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsCallback: true,
				},
			);
			testMachine.initial = "waitForCallback";

			service = interpret(testMachine).start();
			let isInitialTransition = true;
			service.onTransition((state) => {
				expect(state.value).toBe("waitForCallback");
				if (isInitialTransition) {
					isInitialTransition = false;
				} else {
					done();
				}
			});
			service.send({
				type: "callback",
				message: { isOK: () => true, isFinal: () => false } as any,
			});
		});

		it("on success, the last received message (callback) should be returned", (done) => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsCallback: true,
				},
			);
			testMachine.initial = "waitForCallback";

			const message = { isOK: () => true } as any;

			service = interpret(testMachine)
				.onDone((evt) => {
					expect(evt.data?.result).toBe(message);
					done();
				})
				.start();

			service.send({
				type: "callback",
				message,
			});
		});

		it("should reset the timeout when the intermediate callback is received", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsCallback: true,
				},
			);
			testMachine.initial = "waitForCallback";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();
			clock.increment(64999);
			service.send({
				type: "callback",
				message: { isOK: () => true, isFinal: () => false } as any,
			});
			expect(service.state.value).toBe("waitForCallback");

			// Now a full timeout has elapsed, but we shouldn't be in the failure state yet
			clock.increment(1);
			expect(service.state.value).toBe("waitForCallback");
			// still...
			clock.increment(64998);
			expect(service.state.value).toBe("waitForCallback");
			// now!
			clock.increment(1);
			expect(service.state.value).toBe("failure");
		});

		it("should go into failure state if the timeout elapses", (done) => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsCallback: true,
				},
			);
			testMachine.initial = "waitForCallback";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock })
				.onDone((evt) => {
					expect(service!.state.value).toBe("failure");
					expect(evt.data.reason).toBe("callback timeout");
					done();
				})
				.start();
			clock.increment(65000);
		});

		it("should set the lastError context when the timeout elapses", () => {
			const testMachine = createSerialAPICommandMachine(
				{} as any,
				{} as any,
				{
					expectsCallback: true,
				},
			);
			testMachine.initial = "waitForCallback";

			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();
			clock.increment(65000);
			expect(service.state.context.lastError).toBe("callback timeout");
		});
	});

	it("on success, the TX timestamp should be returned", (done) => {
		(highResTimestamp as jest.Mock)
			.mockReturnValueOnce(10)
			.mockReturnValueOnce(30);
		const testMachine = createSerialAPICommandMachine(
			dummyMessageNoResponseNoCallback,
			{
				sendData: createSendDataResolvesImmediately(),
			} as any,
		);

		service = interpret(testMachine)
			.onTransition((state) => {
				if (state.value === "waitForACK") {
					service!.send("ACK");
				}
			})
			.onDone((evt) => {
				expect(evt.data?.txTimestamp).toBe(10);
				done();
			})
			.start();
	});
});
