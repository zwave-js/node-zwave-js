import { Driver } from "../";
const driver = new Driver("COM3");
const node = driver.controller.nodes.get(2)!;
(async () => {
	await node.commandClasses.Configuration.set(1, 5, 4);
	node.commandClasses.Configuration.scanParameters();
})();
