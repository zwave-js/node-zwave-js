import { Driver } from "../";
const driver = new Driver("COM3");
const node = driver.controller.nodes.get(2)!;
if (node.commandClasses.Basic.get() === "unknown") {
}
