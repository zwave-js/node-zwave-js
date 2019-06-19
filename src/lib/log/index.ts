import * as controller from "./Controller";
import * as driver from "./Driver";
import * as serial from "./Serial";

const logger = Object.freeze({
	serial,
	driver,
	controller,
});

export default logger;
