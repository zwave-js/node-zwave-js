// Updates the toLogEntry implementation status table in issue 54

// @ts-check
/// <reference path="../bot-scripts/types.d.ts" />

const c = require("ansi-colors");
const exec = require("@actions/exec");

const ISSUE_NUMBER = 54;

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;

	let result = "";

	/** @type {exec.ExecOptions} */
	const options = {
		listeners: {
			stderr: (data) => {
				result += data.toString();
			},
		},
	};

	await exec.exec("yarn", ["run", "toLogEntryOverview"], options);

	const {
		data: { body: oldBody },
	} = await github.rest.issues.get({
		...context.repo,
		issue_number: ISSUE_NUMBER,
	});

	const newBody = `current implementation status:

${result}`;

	if (oldBody !== newBody) {
		await github.rest.issues.update({
			...context.repo,
			issue_number: ISSUE_NUMBER,
			body: newBody,
			// Auto-close or open the issue when everything is done (or not)
			state: result.trim().endsWith(":)") ? "closed" : "open",
		});
		console.error(c.green("The implementation status was updated!"));
	} else {
		console.error(c.yellow("No changes to the implementation status!"));
	}
}
module.exports = main;
