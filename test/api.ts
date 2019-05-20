import { Driver } from "../";
const driver = new Driver("COM3");
const node = driver.controller.nodes.get(2)!;
(async () => {
	const foo = await node.commandClasses.Basic.get();
	await node.commandClasses.Basic.set(2);
	await node.getValue(1, 2, "3");

	if (foo.currentValue === "unknown") {
		console.log(foo);
	}
})();
