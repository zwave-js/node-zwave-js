/// <reference types="jest-extended" />
import { assertZWaveError } from "../../../test/util";
import { BasicCC, BasicCommand } from "../commandclass/BasicCC";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { FunctionType, MessageType } from "../message/Constants";
import {
	getExpectedResponse,
	getFunctionType,
	getMessageType,
	Message,
	ResponsePredicate,
} from "../message/Message";
import {
	SendDataRequest,
	SendDataRequestBase,
	SendDataResponse,
	TransmitOptions,
} from "./SendDataMessages";

function createSendDataMessage(
	type: MessageType,
	payload?: Buffer,
): SendDataRequestBase | SendDataResponse {
	const msg = new Message(
		undefined as any,
		type,
		FunctionType.SendData,
		undefined as any,
		payload,
	);
	const data = msg.serialize();
	const ret =
		type === MessageType.Request
			? new SendDataRequestBase(undefined as any, data)
			: new SendDataResponse(undefined as any, data);
	return ret;
}

describe("lib/controller/SendDataRequest => ", () => {
	const req = new SendDataRequest(undefined as any, undefined as any);

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
	});
	it("and a function type SendData", () => {
		expect(getFunctionType(req)).toBe(FunctionType.SendData);
	});
	it("that expects a SendDataRequest or SendDataResponse in return", () => {
		const predicate = getExpectedResponse(req) as ResponsePredicate;
		expect(predicate).toBeInstanceOf(Function);

		const controllerFail = createSendDataMessage(
			MessageType.Response,
			Buffer.from([0]),
		);
		// "A SendDataResponse with wasSent=false was not detected as fatal_controller!"
		expect(predicate(undefined as any, controllerFail)).toBe(
			"fatal_controller",
		);

		const controllerSuccess = createSendDataMessage(
			MessageType.Response,
			Buffer.from([1]),
		);
		// "A SendDataResponse with wasSent=true was not detected as confirmation!"
		expect(predicate(undefined as any, controllerSuccess)).toBe(
			"confirmation",
		);

		const nodeFail = createSendDataMessage(
			MessageType.Request,
			Buffer.from([0, 1]),
		);
		// "A SendDataRequest with isFailed=true was not detected as fatal_node!"
		expect(predicate(undefined as any, nodeFail)).toBe("fatal_node");

		const nodeSuccess = createSendDataMessage(
			MessageType.Request,
			Buffer.from([0, 0]),
		);
		// "A SendDataRequest with isFailed=false was not detected as final!"
		expect(predicate(undefined as any, nodeSuccess)).toBe("final");

		const somethingElse = new Message(
			undefined as any,
			MessageType.Request,
			FunctionType.ApplicationCommand,
			undefined as any,
			undefined,
		);
		// "An unrelated message was not detected as unexpected!"
		expect(predicate(undefined as any, somethingElse)).toBe("unexpected");
	});

	// We cannot parse these kinds of messages atm.
	// it.skip("should extract all properties correctly", () => {
	// 	// an actual message from OZW
	// 	const rawBuf = Buffer.from("010900130b0226022527ca", "hex");
	// 	//                         payload: ID  CC  TXcb
	// 	//                      cc payload: ------^^
	// 	const parsed = new SendDataRequest(undefined);
	// 	parsed.deserialize(rawBuf);

	// 	expect(parsed.command).toBeInstanceOf(CommandClass);
	// 	expect(parsed.command.nodeId).toBe(11);
	// 	expect(parsed.command.ccCommand).toBe(
	// 		CommandClasses["Multilevel Switch"],
	// 	);
	// 	expect(parsed.command.payload).toEqual(Buffer.from([0x02]));

	// 	expect(parsed.transmitOptions).toBe(TransmitOptions.DEFAULT);
	// 	expect(parsed.callbackId).toBe(0x27);
	// });

	// TODO: This should be in the ApplicationCommandRequest tests
	// it.skip("should retrieve the correct CC constructor", () => {
	// 	// we use a NoOP message here as the other CCs aren't implemented yet
	// 	const raw = Buffer.from("010900130d0200002515da", "hex");
	// 	expect(Message.getConstructor(raw)).toBe(SendDataRequest);

	// 	const srq = new SendDataRequest(undefined as any);
	// 	srq.deserialize(raw);
	// 	expect(srq.command).toBeInstanceOf(NoOperationCC);
	// });

	const createRequest = (function*() {
		const noOp = new NoOperationCC({} as any, 2);
		while (true) yield new SendDataRequest(undefined as any, noOp);
	})();

	it("new ones should have default transmit options and a numeric callback id", () => {
		const newOne = createRequest.next().value;
		expect(newOne.transmitOptions).toBe(TransmitOptions.DEFAULT);
		expect(newOne.callbackId).toBeNumber();
	});

	it("the automatically created callback ID should be incremented and wrap from 0xff back to 10", () => {
		let lastCallbackId: number | undefined;
		let increment = 0;
		for (const next of createRequest) {
			if (++increment > 300)
				throw new Error(
					"incrementing the callback ID does not work somehow",
				);
			if (lastCallbackId === 0xff) {
				expect(next.callbackId).toBe(10);
				break;
			} else if (lastCallbackId != null) {
				expect(next.callbackId).toBe(lastCallbackId + 1);
			}
			lastCallbackId = next.callbackId;
		}
	});

	it("serialize() should concatenate the serialized CC with transmit options and callback ID", () => {
		const cc = new BasicCC({} as any, 1, BasicCommand.Get);
		const serializedCC = cc.serialize();

		const msg = new SendDataRequest(
			undefined as any,
			cc,
			TransmitOptions.DEFAULT,
			66,
		);
		msg.serialize();
		// we don't care about the frame, only the message payload itself
		const serializedMsg = msg.payload;

		const expected = Buffer.concat([
			serializedCC,
			Buffer.from([TransmitOptions.DEFAULT, 66]),
		]);
		expect(serializedMsg).toEqual(expected);
	});

	it("serialize() should throw when there is no CC", () => {
		const msg = new SendDataRequest(undefined as any, undefined as any);
		assertZWaveError(() => msg.serialize(), {
			messageMatches: "without a command",
			errorCode: ZWaveErrorCodes.PacketFormat_Invalid,
		});
	});
});

describe("lib/controller/SendDataResponse => ", () => {
	const res = new SendDataResponse(undefined as any, undefined as any);

	it("should be a Message", () => {
		expect(res).toBeInstanceOf(Message);
	});
	it("with type Response", () => {
		expect(getMessageType(res)).toBe(MessageType.Response);
	});
	it("and a function type SendData", () => {
		expect(getFunctionType(res)).toBe(FunctionType.SendData);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(res) == null).toBeTruthy();
	});
});
