// @ts-check
require("reflect-metadata");

const {Driver} = require("../build/lib/driver/Driver");
const {GetControllerVersionRequest, GetControllerVersionResponse, ControllerTypes} = require("../build/lib/driver/GetControllerVersionMessages");

const d = new Driver("COM3");
d.start()
	.then(() => d.sendMessage(new GetControllerVersionRequest()))
	.then(/** @param {GetControllerVersionResponse} resp */(resp) => console.log(`version = ${resp.controllerVersion}, type = ${ControllerTypes[resp.controllerType]}`))
	.then(() => {
		d.destroy();
		process.exit(0);
	});