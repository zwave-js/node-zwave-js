// Updates the CC implementation status table in issue 6

// @ts-check
/// <reference path="../bot-scripts/types.d.ts" />

const c = require("ansi-colors");
const exec = require("@actions/exec");

const ISSUE_NUMBER = 6;

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;

	let ccTable = "";

	const options = {};
	options.listeners = {
		stdout: (data) => {
			ccTable += data.toString();
		},
	};

	await exec.exec(
		"yarn",
		["run", "implemented_ccs", "--flavor=github"],
		options,
	);

	ccTable = ccTable
		.split("\n")
		.filter((line) => line.startsWith("| "))
		.join("\n");
	ccTable = c.stripColor(ccTable);

	const {
		data: { body: oldBody },
	} = await github.rest.issues.get({
		...context.repo,
		issue_number: ISSUE_NUMBER,
	});

	const newBody = ccTable;

	if (oldBody !== newBody) {
		await github.rest.issues.update({
			...context.repo,
			issue_number: ISSUE_NUMBER,
			body: newBody,
		});
		console.error(c.green("The implementation table was updated!"));
	} else {
		console.error(c.yellow("No changes to the implementation table!"));
	}
}
module.exports = main;
