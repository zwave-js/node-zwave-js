const { Message, messageTypes, MessageType, FunctionType } = require("../build/lib/message/Message");

// @ts-check
require("reflect-metadata");

const {Driver} = require("../build/lib/driver/Driver");
const {GetControllerVersionRequest, GetControllerVersionResponse, ControllerTypes} = require("../build/lib/driver/GetControllerVersionMessages");

const d = new Driver("COM3")
	.on("driver ready", async () => {
		const msg = new Message(MessageType.Request, FunctionType.FUNC_ID_ZW_IS_VIRTUAL_NODE, FunctionType.FUNC_ID_ZW_IS_VIRTUAL_NODE, Buffer.from([1,0,0,0]));
		const resp = await d.sendMessage(msg);
		console.log(resp.payload.toString("hex"));
		d.destroy();
		process.exit(0);
	})
	;
d.start();