// tslint:disable:no-unused-expression

import { expect, should } from "chai";
import { stub } from "sinon";
should();

import { Message } from "../message/Message";
import { AddNodeToNetworkRequest, AddNodeType } from "./AddNodeToNetworkRequest";

describe("lib/controller/AddNodeToNetworkRequest => ", () => {
	it("should serialize correctly", () => {
		const msg1 = new AddNodeToNetworkRequest(
			undefined,
			AddNodeType.Any,
			false, false,
		);
		let payload = Message.getPayload(msg1.serialize());
		payload.should.deep.equal(Buffer.from([0x01]));

		const msg2 = new AddNodeToNetworkRequest(
			undefined,
			AddNodeType.Any,
			true, false,
		);
		payload = Message.getPayload(msg2.serialize());
		payload.should.deep.equal(Buffer.from([0x81]));

		const msg3 = new AddNodeToNetworkRequest(
			undefined,
			AddNodeType.Any,
			false, true,
		);
		payload = Message.getPayload(msg3.serialize());
		payload.should.deep.equal(Buffer.from([0x41]));

		const msg4 = new AddNodeToNetworkRequest(
			undefined,
			AddNodeType.Any,
			true, true,
		);
		payload = Message.getPayload(msg4.serialize());
		payload.should.deep.equal(Buffer.from([0xc1]));

		const msg5 = new AddNodeToNetworkRequest(
			undefined,
			AddNodeType.Stop,
			true, true,
		);
		payload = Message.getPayload(msg5.serialize());
		payload.should.deep.equal(Buffer.from([0xc5]));
	});
});
