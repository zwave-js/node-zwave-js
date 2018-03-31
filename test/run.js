// @ts-check
require("reflect-metadata");

const { Driver } = require("../build/lib/driver/Driver");
const { GetControllerVersionRequest, GetControllerVersionResponse, ControllerTypes } = require("../build/lib/driver/GetControllerVersionMessages");
const { Message, messageTypes, MessageType, FunctionType } = require("../build/lib/message/Message");
const { SendDataRequest } = require("../build/lib/message/SendDataMessages");
const { CommandClasses } = require("../build/lib/commandclass/CommandClass");

const d = new Driver("COM3")
	.on("driver ready", () => {
		setTimeout(async () => {
			const resp = await d.sendMessage(new SendDataRequest(
				1,
				Buffer.from([CommandClasses["No Operation"]])
			));
			console.log(JSON.stringify(resp, null, 4));
			d.destroy();
			process.exit(0);
		}, 1000);
		// const resp = await d.sendMessage(new SetSerialApiTimeoutsRequest());
	})
	;
d.start(); 