/**
 * @param {import("@zwave-js/cli").ScriptContext} context
 */
export default async function run(context) {
	await context.showSuccess("Hello World!");
	await context.showSuccess("Bye!");
}
