// tslint:disable:no-unused-expression

import { expect, should } from "chai";
should();

import { FunctionType, getExpectedResponse, getFunctionType, getMessageType, Message, MessageType } from "../message/Message";
import { NoOperationCC } from "./NoOperationCC";
import { CommandClasses, SendDataRequest, SendDataResponse, TransmitOptions } from "./SendDataMessages";

describe("lib/commandclass/SendDataRequest => ", () => {
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
	it("that expects a SendData response", () => {
		getExpectedResponse(req).should.equal(FunctionType.SendData);
	});

	it("should extract all properties correctly", () => {
		// an actual message from OZW
		const rawBuf = Buffer.from("010900130b0226022527ca", "hex");
		//                         payload: ID  CC  TXcb
		//                      cc payload: ------^^
		const parsed = new SendDataRequest();
		parsed.deserialize(rawBuf);

		parsed.nodeId.should.equal(11);
		parsed.cc.should.equal(CommandClasses["Multilevel Switch"]);
		parsed.ccPayload.should.deep.equal(Buffer.from([0x02]));
		parsed.transmitOptions.should.equal(TransmitOptions.DEFAULT);
		parsed.callbackId.should.equal(0x27);
	});

	it("should retrieve the correct CC constructor", () => {
		// we use a NoOP message here as the other CCs aren't implemented yet
		const noop = Buffer.from("010900130d0200002515da", "hex");
		SendDataRequest.isSendDataRequest(noop).should.be.true;
		const constr = SendDataRequest.getConstructor(noop);
		constr.should.equal(NoOperationCC);
		constr.should.not.equal(Message);
		constr.should.not.equal(SendDataRequest);
	});

	const createRequest = function *() {
		while (true) yield new SendDataRequest(1, CommandClasses["No Operation"]);
	}();

	it("new ones should have an empty CC payload, default transmit options and a numeric callback id", () => {
		const newOne = createRequest.next().value;
		newOne.ccPayload.should.deep.equal(Buffer.from([]));
		newOne.transmitOptions.should.equal(TransmitOptions.DEFAULT);
		newOne.callbackId.should.be.a("number");
	});

	it("the automatically created callback ID should be incremented and wrap from 0xff back to 0x01", () => {
		let lastCallbackId: number;
		let increment = 0;
		for (const next of createRequest) {
			if (++increment > 300) throw new Error("incrementing the callback ID does not work somehow");
			if (lastCallbackId === 0xff) {
				next.callbackId.should.equal(1);
				break;
			} else if (lastCallbackId != null) {
				next.callbackId.should.equal(lastCallbackId + 1);
			}
			lastCallbackId = next.callbackId;
		}
	});

});

describe("lib/driver/SendDataResponse => ", () => {
	const res = new SendDataResponse();

	it("should be a Message", () => {
		res.should.be.an.instanceof(Message);
	});
	it("with type Response", () => {
		getMessageType(res).should.equal(MessageType.Response);
	});
	it("and a function type GetControllerVersion", () => {
		getFunctionType(res).should.equal(FunctionType.SendData);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(res) == null).to.be.true;
	});

});
