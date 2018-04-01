// tslint:disable:no-unused-expression

import { expect, should } from "chai";
should();

import { Constructable } from "../message/Message";
import { NoOperationCC } from "./NoOperationCC";
import { CommandClasses, getCommandClass, SendDataRequest, TransmitOptions } from "./SendDataMessages";

describe("lib/commandclass/NoOperationCC => ", () => {
	const cc = new NoOperationCC();
	let serialized: Buffer;
	// tslint:disable-next-line:variable-name
	let Deserialized: Constructable<SendDataRequest>;

	it("should be a SendDataRequest", () => {
		cc.should.be.an.instanceof(SendDataRequest);
	});
	it(`with command class "No Operation"`, () => {
		getCommandClass(cc).should.equal(CommandClasses["No Operation"]);
	});

	it("should serialize correctly", () => {
		cc.nodeId = 2;
		cc.callbackId = 0xff;
		cc.transmitOptions = TransmitOptions.DEFAULT;
		serialized = cc.serialize();
		serialized.should.deep.equal(Buffer.from("0108001302010025ff3d", "hex"));
	});

	it("should detect the correct constructor from a raw Buffer", () => {
		Deserialized = SendDataRequest.getConstructor(serialized);
		Deserialized.should.equal(NoOperationCC);
	});

	it("should deserialize correctly", () => {
		// and the correct data should be deserialized
		const parsed = new Deserialized() as NoOperationCC;
		parsed.deserialize(serialized);
		parsed.nodeId.should.equal(cc.nodeId);
		parsed.callbackId.should.equal(cc.callbackId);
		parsed.transmitOptions.should.equal(cc.transmitOptions);
	});

});
