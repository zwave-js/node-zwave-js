/**
 * @param {import("@zwave-js/cli").ScriptContext} context
 */
export default async function run(context) {
	const { driver } = context;
	const node = driver.controller.nodes.get(55);
	await node.commandClasses["Binary Switch"].set(false);
}
