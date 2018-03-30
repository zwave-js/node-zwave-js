// @ts-check
require("reflect-metadata");

const {Driver} = require("../build/lib/driver/Driver");
const {GetControllerVersionRequest, GetControllerVersionResponse, ControllerTypes} = require("../build/lib/driver/GetControllerVersionMessages");
const { Message, messageTypes, MessageType, FunctionType } = require("../build/lib/message/Message");
const {GetNodeProtocolInfoRequest} = require("../build/lib/node/GetNodeProtocolInfoMessages");

const d = new Driver("COM3", {timeouts: {ack: 1}})
	.on("driver ready", async () => {
		// const resp = await d.sendMessage(new SetSerialApiTimeoutsRequest());
		d.destroy();
		process.exit(0);
	})
	;
d.start(); 