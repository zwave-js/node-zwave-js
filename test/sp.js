// @ts-check
require("reflect-metadata");

const {getFrameTypeStatic, getFunctionTypeStatic, FrameType, FunctionType, Frame, getFrameConstructor} = require("../build/lib/frame/Frame");
const {GetControllerVersionRequest, GetControllerVersionResponse} = require("../build/lib/driver/GetControllerVersionMessages");

const constr = getFrameConstructor(FrameType.Request, FunctionType.GetControllerVersion);
console.log(new constr().serialize().toString("hex"));

process.exit(0);

var splib = require("serialport");
var sp = new splib("COM3", {autoOpen: false});
sp.open((err) => {
	// create some packet to write
	const frame = new Frame();
	frame.type = 0x00;
	frame.functionType = 0x15;
	sp.write(frame.serialize());
});
sp.on("data", /** @param {Buffer} data */ data => {
	if (data.length === 1 && data[0] === 0x6) {
		console.log("got ack");
		return;
	}
	const frame = new Frame();
	frame.deserialize(data);
	console.log(data.toString("hex"));
	console.log(frame.payload.slice(0, -1).toString("ascii").trim() + "test");
	sp.write([0x06]);
});

function cleanup() {
	sp.close();
}
process.on("exit", () => cleanup());
process.on("SIGINT", () => cleanup());
process.on("uncaughtException", () => cleanup());