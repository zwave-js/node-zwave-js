// tslint:disable:no-unused-expression

import { expect, should } from "chai";
should();

import { CommandClass, CommandClasses } from "../commandclass/CommandClass";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import { FunctionType, MessageType } from "../message/Constants";
import { getExpectedResponse, getFunctionType, getMessageType, Message, ResponsePredicate } from "../message/Message";
import { SendDataRequest, SendDataResponse, TransmitOptions } from "./SendDataMessages";

describe("lib/controller/SendDataRequest => ", () => {
	const req = new SendDataRequest();

	it("should be a Message", () => {
		req.should.be.an.instanceof(Message);
	});
	it("with type Request", () => {
		getMessageType(req).should.equal(MessageType.Request);
	});
	it("and a function type SendData", () => {
		getFunctionType(req).should.equal(FunctionType.SendData);
	});
	it("that expects a SendDataRequest or SendDataResponse in return", () => {
		const predicate = getExpectedResponse(req) as ResponsePredicate;
		predicate.should.be.a("function");

		// TODO: Test actual response
	});

	it("should extract all properties correctly", () => {
		// an actual message from OZW
		const rawBuf = Buffer.from("010900130b0226022527ca", "hex");
		//                         payload: ID  CC  TXcb
		//                      cc payload: ------^^
		const parsed = new SendDataRequest();
		parsed.deserialize(rawBuf);

		parsed.command.should.be.an.instanceof(CommandClass);
		parsed.command.nodeId.should.equal(11);
		parsed.command.command.should.equal(CommandClasses["Multilevel Switch"]);
		parsed.command.payload.should.deep.equal(Buffer.from([0x02]));

		parsed.transmitOptions.should.equal(TransmitOptions.DEFAULT);
		parsed.callbackId.should.equal(0x27);
	});

	it("should retrieve the correct CC constructor", () => {
		// we use a NoOP message here as the other CCs aren't implemented yet
		const raw = Buffer.from("010900130d0200002515da", "hex");
		Message.getConstructor(raw).should.equal(SendDataRequest);

		const srq = new SendDataRequest();
		srq.deserialize(raw);
		srq.command.should.be.an.instanceof(NoOperationCC);
	});

	const createRequest = function*() {
		const noOp = new NoOperationCC(2);
		while (true) yield new SendDataRequest(noOp);
	}();

	it("new ones should have default transmit options and a numeric callback id", () => {
		const newOne = createRequest.next().value;
		newOne.transmitOptions.should.equal(TransmitOptions.DEFAULT);
		newOne.callbackId.should.be.a("number");
	});

	it("the automatically created callback ID should be incremented and wrap from 0xff back to 10", () => {
		let lastCallbackId: number;
		let increment = 0;
		for (const next of createRequest) {
			if (++increment > 300) throw new Error("incrementing the callback ID does not work somehow");
			if (lastCallbackId === 0xff) {
				next.callbackId.should.equal(10);
				break;
			} else if (lastCallbackId != null) {
				next.callbackId.should.equal(lastCallbackId + 1);
			}
			lastCallbackId = next.callbackId;
		}
	});

});

describe("lib/controller/SendDataResponse => ", () => {
	const res = new SendDataResponse();

	it("should be a Message", () => {
		res.should.be.an.instanceof(Message);
	});
	it("with type Response", () => {
		getMessageType(res).should.equal(MessageType.Response);
	});
	it("and a function type SendData", () => {
		getFunctionType(res).should.equal(FunctionType.SendData);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(res) == null).to.be.true;
	});

});
