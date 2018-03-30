// tslint:disable:no-unused-expression

import { expect, should } from "chai";
should();

import { FunctionType, getExpectedResponse, getFunctionType, getMessageType, Message, MessageType } from "../message/Message";
import { ControllerTypes, GetControllerVersionRequest, GetControllerVersionResponse } from "./GetControllerVersionMessages";

describe("lib/driver/GetControllerVersionRequest => ", () => {
	const req = new GetControllerVersionRequest();

	it("should be a Message", () => {
		req.should.be.an.instanceof(Message);
	});
	it("with type Request", () => {
		getMessageType(req).should.equal(MessageType.Request);
	});
	it("and a function type GetControllerVersion", () => {
		getFunctionType(req).should.equal(FunctionType.GetControllerVersion);
	});
	it("that expects a GetControllerVersion response", () => {
		getExpectedResponse(req).should.equal(FunctionType.GetControllerVersion);
	});

});

describe("lib/driver/GetControllerVersionResponse => ", () => {
	const res = new GetControllerVersionResponse();

	it("should be a Message", () => {
		res.should.be.an.instanceof(Message);
	});
	it("with type Response", () => {
		getMessageType(res).should.equal(MessageType.Response);
	});
	it("and a function type GetControllerVersion", () => {
		getFunctionType(res).should.equal(FunctionType.GetControllerVersion);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(res) == null).to.be.true;
	});

	// an actual message from OZW
	const rawBuf = Buffer.from("011001155a2d5761766520342e3035000197", "hex");
	const parsed = new GetControllerVersionResponse();
	parsed.deserialize(rawBuf);

	it("should extract the controller version and type", () => {
		parsed.libraryVersion.should.equal("Z-Wave 4.05");
		parsed.controllerType.should.equal(ControllerTypes["Static Controller"]);
	});

	it("its constructor should be retrieved for Response & GetControllerVersion", () => {
		const constr = Message.getConstructor(rawBuf);
		constr.should.equal(GetControllerVersionResponse);
		constr.should.not.equal(Message);
	});

});
